import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Info, Map as MapIcon, MapPin, Plus, Save, RotateCcw, Zap, ChevronRight, Bus, Loader2, GripVertical } from 'lucide-react';
import { Reorder, AnimatePresence } from 'framer-motion';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Assets & Icons ---
const BusStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
});

// --- Map Helpers ---

const MapEvents = ({ onMapClick }) => {
    useMapEvents({ click(e) { onMapClick(e.latlng); } });
    return null;
};

const FitBounds = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
            map.fitBounds(bounds, { padding: [40, 40], animate: true });
        }
    }, [points, map]);
    return null;
};

const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

const RouteStudio = () => {
    const [routes, setRoutes] = useState([]);
    const [allStops, setAllStops] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [shapePoints, setShapePoints] = useState([]);
    const [assignedStops, setAssignedStops] = useState([]); // [{stop_id, stop, sequence}]
    
    const [activeTab, setActiveTab] = useState('metadata');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [routing, setRouting] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => { refreshData(); }, []);

    const refreshAllData = async () => {
        const [rRes, aRes, sRes] = await Promise.all([
            api.get('/routes'), api.get('/agencies'), api.get('/stops')
        ]);
        setRoutes(rRes.data || []);
        setAgencies(aRes.data || []);
        setAllStops(sRes.data || []);
    };

    const refreshData = async () => {
        setLoading(true);
        await refreshAllData();
        setLoading(false);
    };

    const handleSelectRoute = async (route) => {
        setSelectedRoute(route);
        setActiveTab('metadata');
        setMessage(null);
        try {
            const [tripsRes, stopsRes] = await Promise.all([
                api.get('/trips'), api.get(`/routes/${route.id}/stops`)
            ]);
            setAssignedStops(stopsRes.data || []);
            const trip = tripsRes.data.find(t => t.route_id === route.id);
            if (trip?.shape_id) {
                const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                setShapePoints((shapeRes.data || []).sort((a, b) => a.sequence - b.sequence));
            } else { setShapePoints([]); }
        } catch (e) { console.error(e); }
    };

    const saveMetadata = async () => {
        setSaving(true);
        try {
            await api.put(`/routes/${selectedRoute.id}`, selectedRoute);
            await refreshAllData();
            setMessage({ type: 'success', text: 'Info updated' });
        } finally { setSaving(false); }
    };

    const saveShape = async () => {
        setSaving(true);
        const sId = `SHP_${selectedRoute.short_name.toUpperCase()}`;
        try {
            await api.put(`/shapes/${sId}`, shapePoints.map(p => ({ ...p, shape_id: sId })));
            const trips = await api.get('/trips');
            if (!trips.data.find(t => t.route_id === selectedRoute.id)) {
                await api.post('/trips', { route_id: selectedRoute.id, headsign: selectedRoute.long_name, shape_id: sId });
            }
            setMessage({ type: 'success', text: 'Path saved' });
        } finally { setSaving(false); }
    };

    const saveStops = async () => {
        setSaving(true);
        try { 
            // Re-map sequences based on drag order
            const reordered = assignedStops.map((s, i) => ({ ...s, sequence: i + 1 }));
            await api.put(`/routes/${selectedRoute.id}/stops`, reordered);
            setMessage({ type: 'success', text: 'Sequence updated' });
        }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex h-screen items-center justify-center font-medium text-system-gray">Initializing Route Studio...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-black/5 flex flex-col shrink-0">
                <div className="p-6 border-b border-black/5 flex justify-between items-center">
                    <h1 className="text-xl font-bold tracking-tight">Routes</h1>
                    <button className="p-2 bg-system-blue text-white rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-system-blue/20">
                        <Plus size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {routes.map(r => (
                        <div 
                            key={r.id} 
                            onClick={() => handleSelectRoute(r)}
                            className={`p-3 rounded-hig cursor-pointer flex items-center group transition-all ${selectedRoute?.id === r.id ? 'bg-system-blue text-white shadow-md' : 'hover:bg-black/5'}`}
                        >
                            <div className={`w-3 h-3 rounded-full mr-3 border-2 border-white/20`} style={{ backgroundColor: selectedRoute?.id === r.id ? 'white' : `#${r.color}` }}></div>
                            <div className="flex-1">
                                <div className="font-bold text-sm leading-tight">{r.short_name}</div>
                                <div className={`text-[11px] font-medium mt-0.5 ${selectedRoute?.id === r.id ? 'text-white/70' : 'text-system-gray'}`}>{r.long_name}</div>
                            </div>
                            <ChevronRight size={14} className={selectedRoute?.id === r.id ? 'text-white' : 'text-black/10 group-hover:text-black/30'} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 bg-system-background flex flex-col overflow-hidden">
                {!selectedRoute ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
                        <Bus size={80} className="mb-4 text-system-blue" />
                        <p className="text-lg font-bold">Select a route line to start mapping</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 px-6 flex items-center justify-between bg-white/80 backdrop-blur border-b border-black/5 z-10">
                            <div className="segmented-control w-[420px]">
                                <div onClick={() => setActiveTab('metadata')} className={`segmented-item ${activeTab === 'metadata' ? 'active' : ''}`}>Metadata</div>
                                <div onClick={() => setActiveTab('shape')} className={`segmented-item ${activeTab === 'shape' ? 'active' : ''}`}>Geometry</div>
                                <div onClick={() => setActiveTab('stops')} className={`segmented-item ${activeTab === 'stops' ? 'active' : ''}`}>Stop Sequence</div>
                            </div>
                            <div className="flex items-center gap-4">
                                {message && <span className={`text-xs font-bold ${message.type === 'success' ? 'text-green-600' : 'text-red-500'} animate-pulse`}>{message.text}</span>}
                                <button 
                                    onClick={activeTab === 'metadata' ? saveMetadata : activeTab === 'shape' ? saveShape : saveStops}
                                    className="px-6 py-2 bg-system-blue text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-system-blue/30 hover:bg-blue-600 transition-all active:scale-[0.98]"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save changes
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex p-6 gap-6 overflow-hidden">
                            {/* Panel */}
                            <div className="w-96 flex flex-col gap-6 overflow-y-auto shrink-0">
                                {activeTab === 'metadata' && (
                                    <div className="hig-card p-5 space-y-5">
                                        <h3 className="text-xs font-bold text-system-gray uppercase tracking-widest">Metadata Config</h3>
                                        <div>
                                            <label className="text-[11px] font-bold mb-1.5 block opacity-60">SHORT NAME</label>
                                            <input className="hig-input" value={selectedRoute.short_name} onChange={e => setSelectedRoute({...selectedRoute, short_name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold mb-1.5 block opacity-60">FULL DESCRIPTION</label>
                                            <input className="hig-input" value={selectedRoute.long_name} onChange={e => setSelectedRoute({...selectedRoute, long_name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold mb-1.5 block opacity-60">SYSTEM COLOR</label>
                                            <div className="flex gap-3">
                                                <input className="hig-input font-mono" value={selectedRoute.color} onChange={e => setSelectedRoute({...selectedRoute, color: e.target.value})} />
                                                <div className="w-12 h-12 rounded-xl shrink-0 shadow-inner border-2 border-white" style={{backgroundColor: `#${selectedRoute.color}`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'shape' && (
                                    <div className="hig-card p-5 space-y-5">
                                        <h3 className="text-xs font-bold text-system-gray uppercase tracking-widest">Path Construction</h3>
                                        <div className="space-y-2">
                                            <button 
                                                onClick={async () => {
                                                    if (shapePoints.length < 2) return;
                                                    setRouting(true);
                                                    const coords = shapePoints.map(p => `${p.lon},${p.lat}`).join(';');
                                                    const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
                                                    setShapePoints(res.data.routes[0].geometry.coordinates.map((c, i) => ({ lat: c[1], lon: c[0], sequence: i + 1 })));
                                                    setRouting(false);
                                                }}
                                                className="w-full py-3 bg-black text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg"
                                            >
                                                {routing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                                SMART SNAP TO ROADS
                                            </button>
                                            <button onClick={() => setShapePoints([])} className="w-full py-2.5 text-red-500 font-bold text-xs border border-red-500/10 rounded-xl hover:bg-red-50 transition-colors">
                                                RESET ALL PATH NODES
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-system-gray leading-relaxed font-medium bg-black/[0.03] p-3 rounded-lg border border-black/5">
                                            Drop anchor nodes on the map. Smart Snap uses OSRM data to trace the exact road geometry between anchors.
                                        </p>
                                    </div>
                                )}

                                {activeTab === 'stops' && (
                                    <div className="flex flex-col gap-6 flex-1 overflow-hidden">
                                        <div className="hig-card p-5 flex-1 overflow-hidden flex flex-col">
                                            <h3 className="text-xs font-bold text-system-gray uppercase tracking-widest mb-4">Sequence Layout</h3>
                                            <Reorder.Group axis="y" values={assignedStops} onReorder={setAssignedStops} className="flex-1 overflow-y-auto pr-2 space-y-2">
                                                {assignedStops.map((rs, i) => (
                                                    <Reorder.Item key={rs.stop_id} value={rs} className="flex items-center gap-3 p-3 bg-system-background rounded-xl cursor-grab active:cursor-grabbing border border-black/5 hover:border-black/10 transition-colors">
                                                        <GripVertical size={14} className="text-black/20" />
                                                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-extrabold shadow-sm shrink-0">{i+1}</div>
                                                        <div className="flex-1 font-bold text-xs truncate uppercase tracking-tight">{rs.stop?.name}</div>
                                                        <button onClick={() => setAssignedStops(assignedStops.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 font-bold p-1">&times;</button>
                                                    </Reorder.Item>
                                                ))}
                                            </Reorder.Group>
                                        </div>
                                        <div className="hig-card p-5 flex-1 overflow-hidden flex flex-col">
                                            <h3 className="text-xs font-bold text-system-gray uppercase tracking-widest mb-4">Stop Library</h3>
                                            <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                                                {allStops.filter(s => !assignedStops.find(rs => rs.stop_id === s.id)).map(s => (
                                                    <div key={s.id} className="flex items-center justify-between p-2.5 hover:bg-black/5 rounded-lg cursor-pointer group" onClick={() => setAssignedStops([...assignedStops, {stop_id: s.id, stop: s, sequence: assignedStops.length+1}])}>
                                                        <span className="text-xs font-bold text-black/60 group-hover:text-system-blue transition-colors uppercase tracking-tight">{s.name}</span>
                                                        <Plus size={14} className="text-system-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Map */}
                            <div className="flex-1 bg-white rounded-[24px] overflow-hidden shadow-2xl relative border-4 border-white ring-1 ring-black/5">
                                <MapContainer center={[-7.393, 109.360]} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                                    <RecenterMap center={shapePoints.length > 0 ? [shapePoints[0].lat, shapePoints[0].lon] : [-7.393, 109.360]} />
                                    {selectedRoute && <FitBounds points={shapePoints} />}
                                    
                                    {activeTab === 'shape' && <MapEvents onMapClick={l => setShapePoints([...shapePoints, {lat: l.lat, lon: l.lng, sequence: shapePoints.length+1}])} />}

                                    <Polyline positions={shapePoints.map(p => [p.lat, p.lon])} color={`#${selectedRoute.color}`} weight={6} lineCap="round" lineJoin="round" opacity={0.8} />
                                    
                                    {activeTab === 'shape' && shapePoints.map((p, i) => (
                                        <Marker key={`p-${i}`} position={[p.lat, p.lon]} icon={L.divIcon({ className: 'bg-white border-2 border-system-blue w-3 h-3 rounded-full shadow-lg', iconSize: [12, 12] })} />
                                    ))}

                                    {assignedStops.map((rs, i) => (
                                        <Marker key={`s-${i}`} position={[rs.stop.lat, rs.stop.lon]} icon={BusStopIcon}>
                                            <Popup><div className="font-bold text-xs">#{i+1} {rs.stop.name}</div></Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RouteStudio;