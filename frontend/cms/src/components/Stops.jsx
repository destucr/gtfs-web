import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Plus, Trash2, Search, Filter, Loader2, CheckCircle2, ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
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
    
    // Form State
    const [formData, setFormData] = useState({ name: '', lat: '', lon: '' });
    const [editingId, setEditingId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [isNaming, setIsNaming] = useState(false);
    const [mapCenter, setMapCenter] = useState([-7.393, 109.360]);
    const [selectedRouteIds, setSelectedRouteIds] = useState([]);
    const [routeShapes, setRouteShapes] = useState({});
    
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeAssignment, setActiveAssignment] = useState({ stop: null, routeIds: [] });

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
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
    };

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

    const toggleRouteFilter = async (routeId) => {
        const id = parseInt(routeId);
        if (selectedRouteIds.includes(id)) {
            setSelectedRouteIds(selectedRouteIds.filter(rid => rid !== id));
        } else {
            setSelectedRouteIds([...selectedRouteIds, id]);
            if (!routeShapes[id]) {
                const tripsRes = await api.get('/trips');
                const routeTrips = tripsRes.data.filter(t => t.route_id === id);
                if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                    const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                    setRouteShapes(prev => ({ ...prev, [id]: shapeRes.data.sort((a,b)=>a.sequence-b.sequence).map(p=>[p.lat, p.lon]) }));
                }
            }
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        const payload = { ...formData, lat: parseFloat(formData.lat), lon: parseFloat(formData.lon) };
        if (editingId) await api.put(`/stops/${editingId}`, payload);
        else await api.post('/stops', payload);
        setFormData({ name: '', lat: '', lon: '' });
        setEditingId(null);
        fetchInitialData();
    };

    const saveAssignments = async () => {
        await api.put(`/stops/${activeAssignment.stop.id}/routes`, activeAssignment.routeIds);
        setShowAssignModal(false);
        fetchInitialData();
    };

    const filteredStops = stops.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading && stops.length === 0) return <div className="flex h-screen items-center justify-center text-system-gray font-bold animate-pulse">SYNCHRONIZING INVENTORY...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-system-background relative">
            
            {/* Sidebar (Resizable in feel) */}
            <div className={`${sidebarOpen ? 'w-[450px]' : 'w-0'} bg-white border-r border-black/5 flex flex-col transition-all duration-300 overflow-hidden shrink-0 shadow-2xl z-20`}>
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                    <h1 className="text-xl font-black tracking-tight">Stops Inventory</h1>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
                </div>

                {/* Quick Register Area */}
                <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                    <h3 className="text-xs font-bold text-system-blue uppercase tracking-widest mb-4">
                        {editingId ? 'Modify Selection' : 'Create New Station'}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-3">
                        <div className="relative">
                            <input className="hig-input text-sm pr-10" placeholder="Location Label..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            {isNaming && <Loader2 size={14} className="animate-spin absolute right-3 top-3 text-system-blue" />}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" step="any" className="hig-input text-xs font-mono" placeholder="Lat" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} required />
                            <input type="number" step="any" className="hig-input text-xs font-mono" placeholder="Lon" value={formData.lon} onChange={e => setFormData({...formData, lon: e.target.value})} required />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-system-blue text-white py-2.5 rounded-lg font-bold text-xs shadow-lg shadow-system-blue/20">
                                {editingId ? 'Apply Changes' : 'Register Point'}
                            </button>
                            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'', lat:'', lon:''})}} className="px-4 bg-white border border-black/10 rounded-lg text-xs font-bold">Cancel</button>}
                        </div>
                    </form>
                </div>

                {/* Search & List */}
                <div className="p-4 border-b border-black/5 bg-white sticky top-0 z-10">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-3 text-system-gray" />
                        <input className="hig-input text-sm pl-9 py-2" placeholder="Search inventory..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredStops.map(stop => (
                        <div 
                            key={stop.id} 
                            className={`p-4 hover:bg-black/[0.02] cursor-pointer transition-colors group ${editingId === stop.id ? 'bg-system-blue/5' : ''}`}
                            onClick={() => { setEditingId(stop.id); setFormData({name: stop.name, lat: stop.lat, lon: stop.lon}); setMapCenter([stop.lat, stop.lon]); }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-sm text-black">{stop.name}</div>
                                    <div className="text-[10px] font-mono text-system-gray uppercase tracking-tighter">POINT #{stop.id} &bull; {stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}</div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveAssignment({ stop, routeIds: (stopRouteMap[stop.id] || []).map(r=>r.id) }); setShowAssignModal(true); }} className="p-1.5 bg-system-blue/10 text-system-blue rounded-md hover:bg-system-blue hover:text-white"><Plus size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete stop?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-500 hover:text-white"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(stopRouteMap[stop.id] || []).map(r => (
                                    <span key={r.id} className="px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: `#${r.color}` }}>{r.short_name}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toggle Sidebar Button (when closed) */}
            {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-4 z-[1001] p-3 bg-white shadow-xl rounded-full border border-black/5 hover:scale-110 active:scale-95 transition-all text-system-blue">
                    <ChevronRight size={24}/>
                </button>
            )}

            {/* Main Map Content */}
            <div className="flex-1 relative">
                <MapContainer center={mapCenter} zoom={14} zoomControl={false} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                    <LocationPicker onLocationSelect={handleMapClick} />
                    <RecenterMap center={mapCenter} />
                    
                    {/* Visual Overlays */}
                    {selectedRouteIds.map(rid => (
                        <Polyline key={rid} positions={routeShapes[rid] || []} color={`#${routes.find(r => r.id === rid)?.color}`} weight={4} opacity={0.5} dashArray="10, 10" />
                    ))}

                    {/* All Stops Preview (Small Dots) */}
                    {stops.map(s => (
                        <Marker 
                            key={`preview-${s.id}`} 
                            position={[s.lat, s.lon]} 
                            icon={L.divIcon({ 
                                className: `bg-white border-2 ${editingId === s.id ? 'border-system-blue scale-150 z-[1000]' : 'border-black/20'} w-2 h-2 rounded-full shadow-sm transition-transform`, 
                                iconSize: [8, 8] 
                            })} 
                        />
                    ))}

                    {/* Active Edit Marker */}
                    {formData.lat && formData.lon && <EditMarker position={[formData.lat, formData.lon]} onDragEnd={l => setFormData(p=>({...p, lat: l.lat, lon: l.lng}))} />}
                </MapContainer>

                {/* Floating HUD: Route Filters */}
                <div className="absolute top-6 right-6 z-[1000] max-w-sm flex flex-col items-end gap-3">
                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-black/5">
                        <h3 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Filter size={12} /> Active Path Overlays
                        </h3>
                        <div className="flex flex-wrap justify-end gap-2">
                            {routes.map(r => (
                                <button 
                                    key={r.id} 
                                    onClick={() => toggleRouteFilter(r.id)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${selectedRouteIds.includes(r.id) ? 'bg-system-blue text-white border-system-blue shadow-lg' : 'bg-white text-system-gray border-black/10 hover:border-black/20'}`}
                                >
                                    {r.short_name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-black/90 text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-xl border border-white/10 flex items-center gap-2">
                        <LocateFixed size={12} className="text-system-blue animate-pulse" />
                        TAP MAP TO DROP ANCHOR
                    </div>
                </div>
            </div>

            {/* Global Modal: Assignment */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="hig-card w-full max-w-md shadow-2xl p-8 bg-white animate-in fade-in zoom-in duration-200">
                        <h3 className="text-2xl font-black mb-2">Route Binding</h3>
                        <p className="text-system-gray text-sm mb-8 font-medium">Which service lines pass through <span className="text-black font-bold underline">{activeAssignment.stop?.name}</span>?</p>
                        
                        <div className="space-y-2 mb-10 max-h-80 overflow-y-auto pr-2">
                            {routes.map(r => (
                                <div 
                                    key={r.id} 
                                    onClick={() => {
                                        const ids = activeAssignment.routeIds.includes(r.id) ? activeAssignment.routeIds.filter(id => id !== r.id) : [...activeAssignment.routeIds, r.id];
                                        setActiveAssignment({ ...activeAssignment, routeIds: ids });
                                    }}
                                    className={`p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all border-2 ${activeAssignment.routeIds.includes(r.id) ? 'border-system-blue bg-system-blue/5' : 'border-transparent bg-black/5 hover:bg-black-[0.08]'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `#${r.color}` }}></div>
                                        <span className="font-bold text-sm">{r.short_name} - {r.long_name}</span>
                                    </div>
                                    {activeAssignment.routeIds.includes(r.id) && <CheckCircle2 size={20} className="text-system-blue" />}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={saveAssignments} className="flex-1 bg-system-blue text-white py-4 rounded-xl font-black shadow-xl shadow-system-blue/30 hover:bg-blue-600">APPLY BINDINGS</button>
                            <button onClick={() => setShowAssignModal(false)} className="px-8 bg-black/5 text-system-gray font-black rounded-xl">DISMISS</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stops;