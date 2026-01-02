import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Plus, Trash2, Search, Filter, Loader2, CheckCircle2, ChevronLeft, ChevronRight, LocateFixed, Save, X, Minimize2, Maximize2, Layers, EyeOff, Eye } from 'lucide-react';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow,
    iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Helper Components ---

const LocationPicker = ({ onLocationSelect }) => {
    useMapEvents({ click(e) { onLocationSelect(e.latlng); } });
    return null;
};

const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => { if (center?.[0]) map.setView(center, map.getZoom()); }, [center, map]);
    return null;
};

const EditMarker = ({ position, onDragEnd }) => {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker != null) onDragEnd(marker.getLatLng());
        },
    }), [onDragEnd]);

    return <Marker draggable={true} eventHandlers={eventHandlers} position={position} ref={markerRef} />;
};

const Stops = () => {
    const [stops, setStops] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [stopRouteMap, setStopRouteMap] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    
    // Form & UI States
    const [formData, setFormData] = useState({ name: '', lat: '', lon: '' });
    const [editingId, setEditingId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [addFormOpen, setAddFormOpen] = useState(true);
    const [hudMinimized, setHudMinimized] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [isNaming, setIsNaming] = useState(false);
    const [mapCenter, setMapCenter] = useState([-7.393, 109.360]);
    const [focusedRouteId, setFocusedRouteId] = useState(null); // Primary filter
    const [selectedRouteIds, setSelectedRouteIds] = useState([]); // Map overlays
    const [routeShapes, setRouteShapes] = useState({});
    
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeAssignment, setActiveAssignment] = useState({ stop: null, routeIds: [] });
    const [inlineEdit, setInlineEdit] = useState(null);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [sRes, rRes, srRes] = await Promise.all([
                api.get('/stops'), api.get('/routes'), api.get('/stop-routes')
            ]);
            setStops(sRes.data || []);
            setRoutes(rRes.data || []);
            const map = {};
            (srRes.data || []).forEach(assoc => {
                if (!map[assoc.stop_id]) map[assoc.stop_id] = [];
                const r = (rRes.data || []).find(rt => rt.id === assoc.route_id);
                if (r) map[assoc.stop_id].push(r);
            });
            setStopRouteMap(map);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const handleSave = useCallback(async (e) => {
        if (e) e.preventDefault();
        if (!formData.lat || !formData.lon) return;
        const payload = { ...formData, lat: parseFloat(formData.lat), lon: parseFloat(formData.lon) };
        try {
            if (editingId) await api.put(`/stops/${editingId}`, payload);
            else await api.post('/stops', payload);
            setFormData({ name: '', lat: '', lon: '' });
            setEditingId(null);
            fetchInitialData();
        } catch (err) { console.error(err); }
    }, [formData, editingId, fetchInitialData]);

    const handleMapClick = async (latlng) => {
        setFormData(prev => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
        if (!editingId) {
            setIsNaming(true);
            try {
                const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
                if (res.data) setFormData(prev => ({ ...prev, name: res.data.name || res.data.display_name.split(',')[0] }));
            } finally { setIsNaming(false); }
        }
    };

    const toggleRouteFocus = async (routeId) => {
        const id = parseInt(routeId);
        if (focusedRouteId === id) {
            setFocusedRouteId(null);
            setSelectedRouteIds(prev => prev.filter(rid => rid !== id));
        } else {
            setFocusedRouteId(id);
            setAddFormOpen(false); // Hide add form when focusing on a line
            if (!selectedRouteIds.includes(id)) {
                setSelectedRouteIds(prev => [...prev, id]);
                if (!routeShapes[id]) {
                    const tripsRes = await api.get('/trips');
                    const routeTrips = tripsRes.data.filter(t => t.route_id === id);
                    if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                        const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                        setRouteShapes(prev => ({ ...prev, [id]: shapeRes.data.sort((a,b)=>a.sequence-b.sequence).map(p=>[p.lat, p.lon]) }));
                    }
                }
            }
        }
    };

    const saveAssignments = async () => {
        await api.put(`/stops/${activeAssignment.stop.id}/routes`, activeAssignment.routeIds);
        setShowAssignModal(false);
        fetchInitialData();
    };

    const handleInlineSave = async (stop, field, value) => {
        const updatedStop = { ...stop, [field]: field === 'name' ? value : parseFloat(value) };
        await api.put(`/stops/${stop.id}`, updatedStop);
        setStops(stops.map(s => s.id === stop.id ? updatedStop : s));
        setInlineEdit(null);
    };

    // Filter Logic
    const filteredStops = stops.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRoute = focusedRouteId ? (stopRouteMap[s.id] || []).some(r => r.id === focusedRouteId) : true;
        return matchesSearch && matchesRoute;
    });

    if (loading && stops.length === 0) return <div className="flex h-screen items-center justify-center font-black text-system-gray animate-pulse">SYNCHRONIZING INVENTORY...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-system-background relative">
            
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-[450px]' : 'w-0'} bg-white border-r border-black/5 flex flex-col transition-all duration-300 overflow-hidden shrink-0 shadow-2xl z-20`}>
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                    <h1 className="text-xl font-black tracking-tight">Stops Inventory</h1>
                    <div className="flex gap-2">
                        <button onClick={() => setAddFormOpen(!addFormOpen)} className={`p-2 rounded-lg transition-colors ${addFormOpen ? 'bg-system-blue text-white' : 'hover:bg-black/5 text-system-gray'}`} title="Toggle New Stop Form">
                            <Plus size={20}/>
                        </button>
                        <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray transition-colors">
                            <ChevronLeft size={20}/>
                        </button>
                    </div>
                </div>

                {/* Add/Edit Form Area */}
                <div className={`transition-all duration-500 overflow-hidden ${addFormOpen ? 'max-h-[400px]' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                        <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">
                            {editingId ? 'Modify Record' : 'Register New Station'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-3 font-bold">
                            <div className="relative">
                                <input className="hig-input text-sm pr-10" placeholder="Point Label..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                {isNaming && <Loader2 size={14} className="animate-spin absolute right-3 top-3 text-system-blue" />}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" step="any" className="hig-input text-xs font-mono" placeholder="Lat" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} required />
                                <input type="number" step="any" className="hig-input text-xs font-mono" placeholder="Lon" value={formData.lon} onChange={e => setFormData({...formData, lon: e.target.value})} required />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button type="submit" className="flex-1 bg-system-blue text-white py-2.5 rounded-lg font-black text-[10px] shadow-lg shadow-system-blue/20 transition-transform active:scale-95">
                                    {editingId ? 'COMMIT ADJUSTMENTS' : 'REGISTER POINT'}
                                </button>
                                {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'', lat:'', lon:''})}} className="px-4 bg-white border border-black/10 rounded-lg text-[10px] font-black uppercase">Cancel</button>}
                            </div>
                        </form>
                    </div>
                </div>

                <div className="p-4 border-b border-black/5 bg-white sticky top-0 z-10">
                    <div className="relative font-bold">
                        <Search size={14} className="absolute left-3 top-3 text-system-gray" />
                        <input className="hig-input text-sm pl-9 py-2" placeholder={focusedRouteId ? "Search stops on line..." : "Search inventory..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    {focusedRouteId && (
                        <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-system-blue/10 text-system-blue border-none px-2 py-1 text-[10px] font-black flex items-center gap-1.5 uppercase">
                                    <Filter size={10}/> Filtering by Line {routes.find(r=>r.id===focusedRouteId)?.short_name}
                                </Badge>
                            </div>
                            <button onClick={() => setFocusedRouteId(null)} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear Filter</button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredStops.map(stop => (
                        <div key={stop.id} className={`p-4 hover:bg-black/[0.02] cursor-pointer transition-colors group ${editingId === stop.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => { setEditingId(stop.id); setFormData({name: stop.name, lat: stop.lat, lon: stop.lon}); setMapCenter([stop.lat, stop.lon]); }}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div onDoubleClick={(e) => { e.stopPropagation(); setInlineEdit({ id: stop.id, field: 'name', value: stop.name }); }}>
                                        {inlineEdit?.id === stop.id && inlineEdit?.field === 'name' ? (
                                            <input autoFocus className="hig-input py-1 h-8" value={inlineEdit.value} onClick={e => e.stopPropagation()} onChange={e => setInlineEdit({...inlineEdit, value: e.target.value})} onBlur={() => handleInlineSave(stop, 'name', inlineEdit.value)} onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(stop, 'name', inlineEdit.value)} />
                                        ) : (
                                            <div className="font-black text-sm text-black uppercase tracking-tight">{stop.name}</div>
                                        )}
                                    </div>
                                    <div className="text-[9px] font-mono text-system-gray uppercase tracking-widest mt-0.5">{stop.lat.toFixed(6)}, {stop.lon.toFixed(6)}</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveAssignment({ stop, routeIds: (stopRouteMap[stop.id] || []).map(r=>r.id) }); setShowAssignModal(true); }} className="p-1.5 bg-system-blue/10 text-system-blue rounded-md hover:bg-system-blue hover:text-white transition-all shadow-sm"><Plus size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete point?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1">{(stopRouteMap[stop.id] || []).map(r => (<span key={r.id} className={`px-2 py-0.5 rounded text-[8px] font-black text-white shadow-sm uppercase tracking-tighter ${focusedRouteId === r.id ? 'ring-2 ring-black/20 scale-110' : ''}`} style={{ backgroundColor: `#${r.color}` }}>{r.short_name}</span>))}</div>
                        </div>
                    ))}
                    {filteredStops.length === 0 && <div className="p-12 text-center text-system-gray font-black uppercase text-xs opacity-40 tracking-widest">No matching stations found</div>}
                </div>
            </div>

            {/* Main Map */}
            <div className="flex-1 relative">
                {!sidebarOpen && (
                    <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-4 z-[1001] p-3 bg-white shadow-xl rounded-full border border-black/5 hover:scale-110 text-system-blue transition-transform"><ChevronRight size={24}/></button>
                )}

                <MapContainer center={mapCenter} zoom={14} zoomControl={false} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                    <LocationPicker onLocationSelect={handleMapClick} />
                    <RecenterMap center={mapCenter} />
                    {selectedRouteIds.map(rid => ( <Polyline key={rid} positions={routeShapes[rid] || []} color={`#${routes.find(r => r.id === rid)?.color}`} weight={focusedRouteId === rid ? 8 : 4} opacity={focusedRouteId === rid ? 0.8 : 0.3} dashArray={focusedRouteId === rid ? "" : "10, 10"} /> ))}
                    {stops.map(s => ( 
                        <Marker 
                            key={`preview-${s.id}`} 
                            position={[s.lat, s.lon]} 
                            icon={L.divIcon({ 
                                className: `bg-white border-2 ${editingId === s.id ? 'border-system-blue scale-150 z-[1000]' : (stopRouteMap[s.id] || []).some(r=>r.id === focusedRouteId) ? 'border-black scale-125 z-[999]' : 'border-black/20 opacity-40'} w-2 h-2 rounded-full shadow-sm transition-all`, 
                                iconSize: [8, 8] 
                            })} 
                        /> 
                    ))}
                    {formData.lat && formData.lon && <EditMarker position={[formData.lat, formData.lon]} onDragEnd={l => setFormData(p=>({...p, lat: l.lat, lon: l.lng}))} />}
                </MapContainer>

                {/* Minimizable HUD */}
                <div className={`absolute top-6 right-6 z-[1000] flex flex-col items-end gap-3 transition-all duration-500 ${hudMinimized ? 'w-12 h-12' : 'max-w-sm'}`}>
                    <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-black/5 overflow-hidden transition-all ${hudMinimized ? 'p-0 w-12 h-12 flex items-center justify-center' : 'p-4'}`}>
                        {hudMinimized ? (
                            <button onClick={() => setHudMinimized(false)} className="p-3 text-system-blue"><Layers size={20}/></button>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-[10px] font-black text-system-gray uppercase tracking-widest flex items-center gap-2"><Filter size={12} /> Focus Station List</h3>
                                    <button onClick={() => setHudMinimized(true)} className="p-1 hover:bg-black/5 rounded text-system-gray"><Minimize2 size={12}/></button>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2">
                                    {routes.map(r => ( 
                                        <button 
                                            key={r.id} 
                                            onClick={() => toggleRouteFocus(r.id)} 
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${focusedRouteId === r.id ? 'bg-black text-white border-black scale-110 shadow-xl' : 'bg-white text-system-gray border-black/10 hover:border-black/20'}`}
                                        >
                                            {r.short_name}
                                        </button> 
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="hig-card w-full max-w-md shadow-2xl p-8 bg-white animate-in fade-in zoom-in duration-200">
                        <h3 className="text-2xl font-black mb-2">Route Binding</h3>
                        <p className="text-system-gray text-sm mb-8 font-medium">Which lines pass through <span className="text-black font-black underline">{activeAssignment.stop?.name}</span>?</p>
                        <div className="space-y-2 mb-10 max-h-80 overflow-y-auto pr-2">
                            {routes.map(r => (
                                <div key={r.id} onClick={() => { const ids = activeAssignment.routeIds.includes(r.id) ? activeAssignment.routeIds.filter(id => id !== r.id) : [...activeAssignment.routeIds, r.id]; setActiveAssignment({ ...activeAssignment, routeIds: ids }); }} className={`p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all border-2 ${activeAssignment.routeIds.includes(r.id) ? 'border-system-blue bg-system-blue/5' : 'border-transparent bg-black/5 hover:bg-black-[0.08]'}`}>
                                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }}></div><span className="font-bold text-sm tracking-tight">{r.short_name} - {r.long_name}</span></div>
                                    {activeAssignment.routeIds.includes(r.id) && <CheckCircle2 size={20} className="text-system-blue" />}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={saveAssignments} className="flex-1 bg-system-blue text-white py-4 rounded-xl font-black shadow-xl shadow-system-blue/30 hover:bg-blue-600 transition-all active:scale-95 uppercase tracking-tighter">Apply Bindings</button>
                            <button onClick={() => setShowAssignModal(false)} className="px-8 bg-black/5 text-system-gray font-black rounded-xl hover:text-black uppercase tracking-tighter">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stops;