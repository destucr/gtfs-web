import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Plus, Trash2, Search, Filter, Loader2, Map as MapIcon, CheckCircle2 } from 'lucide-react';
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
    
    const [formData, setFormData] = useState({ name: '', lat: '', lon: '' });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isNaming, setIsNaming] = useState(false);
    const [mapCenter, setMapCenter] = useState([-7.393, 109.360]);
    const [selectedRouteIds, setSelectedRouteIds] = useState([]);
    const [routeShapes, setRouteShapes] = useState({});
    
    const [showModal, setShowModal] = useState(false);
    const [activeAssignment, setActiveAssignment] = useState({ stop: null, routeIds: [] });
    const [inlineEdit, setInlineEdit] = useState(null);

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
        e.preventDefault();
        const payload = { ...formData, lat: parseFloat(formData.lat), lon: parseFloat(formData.lon) };
        if (editingId) await api.put(`/stops/${editingId}`, payload);
        else await api.post('/stops', payload);
        setFormData({ name: '', lat: '', lon: '' });
        setEditingId(null);
        fetchInitialData();
    };

    const handleInlineSave = async (stop, field, value) => {
        const updatedStop = { ...stop, [field]: field === 'name' ? value : parseFloat(value) };
        await api.put(`/stops/${stop.id}`, updatedStop);
        setStops(stops.map(s => s.id === stop.id ? updatedStop : s));
        setInlineEdit(null);
    };

    const saveAssignments = async () => {
        await api.put(`/stops/${activeAssignment.stop.id}/routes`, activeAssignment.routeIds);
        setShowModal(false);
        fetchInitialData();
    };

    if (loading && stops.length === 0) return <div className="flex h-screen items-center justify-center text-system-gray font-medium">Initializing Inventory...</div>;

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-black text-primary">Stops & Assignments</h1>
                    <p className="text-system-gray mt-1 font-medium">Map-based inventory management for transit points.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xs font-bold text-system-gray uppercase">Database Status</div>
                        <div className="text-sm font-semibold text-green-600 flex items-center gap-1 justify-end">
                            <CheckCircle2 size={14} /> {stops.length} Points Synchronized
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Side Editor */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="hig-card p-6 shadow-sm">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <MapPin size={20} className="text-system-blue" />
                            {editingId ? 'Adjust Location' : 'Drop New Stop'}
                        </h3>
                        
                        <div className="h-64 rounded-xl overflow-hidden border border-black/5 mb-6 shadow-inner relative group">
                            <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                                <LocationPicker onLocationSelect={handleMapClick} />
                                <RecenterMap center={mapCenter} />
                                {selectedRouteIds.map(rid => (
                                    <Polyline key={rid} positions={routeShapes[rid] || []} color={`#${routes.find(r => r.id === rid)?.color}`} weight={3} opacity={0.4} dashArray="8, 8" />
                                ))}
                                {formData.lat && formData.lon && <EditMarker position={[formData.lat, formData.lon]} onDragEnd={l => setFormData(p=>({...p, lat: l.lat, lon: l.lng}))} />}
                            </MapContainer>
                            <div className="absolute bottom-3 right-3 z-[1000] bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-system-gray shadow-sm">INTERACTIVE CANVAS</div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-system-gray uppercase mb-2 flex justify-between">
                                    Label {isNaming && <Loader2 size={12} className="animate-spin text-system-blue" />}
                                </label>
                                <input className="hig-input" placeholder="Point name..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-system-gray uppercase mb-1 block">Latitude</label>
                                    <input type="number" step="any" className="hig-input text-xs font-mono" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-system-gray uppercase mb-1 block">Longitude</label>
                                    <input type="number" step="any" className="hig-input text-xs font-mono" value={formData.lon} onChange={e => setFormData({...formData, lon: e.target.value})} required />
                                </div>
                            </div>
                            <div className="pt-2 flex gap-2">
                                <button type="submit" className="flex-1 bg-system-blue text-white py-3 rounded-lg font-bold shadow-lg shadow-system-blue/20 hover:bg-blue-600 transition-all active:scale-[0.98]">
                                    {editingId ? 'Update Point' : 'Add to Database'}
                                </button>
                                {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'', lat:'', lon:''})}} className="px-4 bg-black/5 rounded-lg text-system-gray hover:text-black">Cancel</button>}
                            </div>
                        </form>
                    </div>

                    <div className="hig-card p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-system-gray uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Filter size={14} /> Overlay Reference
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {routes.map(r => (
                                <button 
                                    key={r.id} 
                                    onClick={() => toggleRouteFilter(r.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedRouteIds.includes(r.id) ? 'bg-system-blue text-white border-system-blue shadow-md' : 'bg-white text-system-gray border-black/10 hover:border-black/20'}`}
                                    style={selectedRouteIds.includes(r.id) ? {} : { borderColor: `#${r.color}40` }}
                                >
                                    {r.short_name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="lg:col-span-8">
                    <div className="hig-card overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/[0.02] border-b border-black/5">
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider">Point Metadata</th>
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider">Assigned Routes</th>
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {stops.map(stop => (
                                    <tr key={stop.id} className="group hover:bg-black/[0.01] transition-colors cursor-pointer" onClick={() => { if(inlineEdit?.id !== stop.id) { setEditingId(stop.id); setFormData({name: stop.name, lat: stop.lat, lon: stop.lon}); setMapCenter([stop.lat, stop.lon]); } }}>
                                        <td className="px-6 py-4">
                                            <div onDoubleClick={(e) => { e.stopPropagation(); setInlineEdit({ id: stop.id, field: 'name', value: stop.name }); }}>
                                                {inlineEdit?.id === stop.id && inlineEdit?.field === 'name' ? (
                                                    <input autoFocus className="hig-input py-1 h-8" value={inlineEdit.value} onClick={e => e.stopPropagation()} onChange={e => setInlineEdit({...inlineEdit, value: e.target.value})} onBlur={() => handleInlineSave(stop, 'name', inlineEdit.value)} onKeyDown={e => e.key === 'Enter' && handleInlineSave(stop, 'name', inlineEdit.value)} />
                                                ) : (
                                                    <div>
                                                        <div className="font-bold text-black">{stop.name}</div>
                                                        <div className="text-[10px] font-mono text-system-gray mt-0.5">{stop.lat.toFixed(6)}, {stop.lon.toFixed(6)}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {(stopRouteMap[stop.id] || []).map(r => (
                                                    <span key={r.id} className="px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: `#${r.color}` }}>{r.short_name}</span>
                                                ))}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setActiveAssignment({ stop, routeIds: (stopRouteMap[stop.id] || []).map(r=>r.id) }); setShowModal(true); }}
                                                    className="w-5 h-5 rounded-full bg-system-blue/10 text-system-blue flex items-center justify-center text-sm font-bold hover:bg-system-blue hover:text-white transition-colors ms-1"
                                                >+</button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Remove stop?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Assignment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="hig-card w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-2">Route Assignment</h3>
                        <p className="text-system-gray text-sm mb-6 font-medium">Link <span className="text-black font-bold">{activeAssignment.stop?.name}</span> to active routes.</p>
                        
                        <div className="space-y-2 mb-8 max-h-80 overflow-y-auto pr-2">
                            {routes.map(r => (
                                <div 
                                    key={r.id} 
                                    onClick={() => {
                                        const ids = activeAssignment.routeIds.includes(r.id) 
                                            ? activeAssignment.routeIds.filter(id => id !== r.id) 
                                            : [...activeAssignment.routeIds, r.id];
                                        setActiveAssignment({ ...activeAssignment, routeIds: ids });
                                    }}
                                    className={`p-4 rounded-lg flex items-center justify-between cursor-pointer transition-all border-2 ${activeAssignment.routeIds.includes(r.id) ? 'border-system-blue bg-system-blue/5' : 'border-transparent bg-black/5 hover:bg-black-[0.08]'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `#${r.color}` }}></div>
                                        <span className="font-bold text-sm">{r.short_name} - {r.long_name}</span>
                                    </div>
                                    {activeAssignment.routeIds.includes(r.id) && <CheckCircle2 size={18} className="text-system-blue animate-in zoom-in" />}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={saveAssignments} className="flex-1 bg-system-blue text-white py-3 rounded-lg font-bold shadow-lg shadow-system-blue/20">Apply Changes</button>
                            <button onClick={() => setShowModal(false)} className="px-6 bg-black/5 text-system-gray font-bold rounded-lg">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stops;