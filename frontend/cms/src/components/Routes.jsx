import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Info, Map as MapIcon, MapPin, Plus, Save, RotateCcw, Zap, ChevronRight, ChevronLeft, Bus, Loader2, GripVertical, Undo2, Layers, Settings2, Search } from 'lucide-react';
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
            map.fitBounds(bounds, { padding: [100, 100], animate: true });
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
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [shapePoints, setShapePoints] = useState([]);
    const [assignedStops, setAssignedStops] = useState([]);
    const [history, setHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [activeTab, setActiveTab] = useState('metadata'); // metadata, shape, stops
    const [globalLoading, setGlobalLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [saving, setSaving] = useState(false);
    const [routing, setRouting] = useState(false);
    const [message, setMessage] = useState(null);

    // --- Undo Logic ---
    const pushToHistory = (newPoints) => {
        setHistory(prev => [...prev.slice(-19), shapePoints]);
        setShapePoints(newPoints);
    };

    const undo = () => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        setShapePoints(lastState);
        setHistory(prev => prev.slice(0, -1));
    };

    const refreshAllData = useCallback(async () => {
        const [rRes, sRes] = await Promise.all([
            api.get('/routes'), api.get('/stops')
        ]);
        setRoutes(rRes.data || []);
        setAllStops(sRes.data || []);
    }, []);

    const refreshData = useCallback(async () => {
        setGlobalLoading(true);
        await refreshAllData();
        setGlobalLoading(false);
    }, [refreshAllData]);

    useEffect(() => { refreshData(); }, [refreshData]);

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

    const saveCurrentTask = async () => {
        setSaving(true);
        try {
            if (activeTab === 'metadata') {
                await api.put(`/routes/${selectedRoute.id}`, selectedRoute);
                await refreshAllData();
            } else if (activeTab === 'shape') {
                const sId = `SHP_${selectedRoute.short_name.toUpperCase()}`;
                await api.put(`/shapes/${sId}`, shapePoints.map(p => ({ ...p, shape_id: sId })));
                const trips = await api.get('/trips');
                if (!trips.data.find(t => t.route_id === selectedRoute.id)) {
                    await api.post('/trips', { route_id: selectedRoute.id, headsign: selectedRoute.long_name, shape_id: sId });
                }
            } else {
                const reordered = assignedStops.map((s, i) => ({ ...s, sequence: i + 1 }));
                await api.put(`/routes/${selectedRoute.id}/stops`, reordered);
            }
            setMessage({ type: 'success', text: 'Changes synced to database' });
        } finally { setSaving(false); }
    };

    const filteredRoutes = routes.filter(r => 
        r.short_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.long_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (globalLoading) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse flex-col gap-4"><Loader2 className="animate-spin" size={32} /> INITIALIZING STUDIO...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-system-background relative">
            
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-[450px]' : 'w-0'} bg-white border-r border-black/5 flex flex-col transition-all duration-300 overflow-hidden shrink-0 shadow-2xl z-20`}>
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-system-blue rounded-lg flex items-center justify-center text-white shadow-lg shadow-system-blue/20">
                            <Layers size={18}/>
                        </div>
                        <h1 className="text-xl font-black tracking-tight">Route Studio</h1>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
                </div>

                {selectedRoute ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Contextual Editor Header */}
                        <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-1">Editing Line</div>
                                    <h2 className="text-lg font-black leading-tight">{selectedRoute.short_name} &mdash; {selectedRoute.long_name}</h2>
                                </div>
                                <button onClick={() => setSelectedRoute(null)} className="text-[10px] font-bold text-system-gray hover:text-black uppercase">Close</button>
                            </div>
                            
                            <div className="segmented-control mb-4">
                                <div onClick={() => setActiveTab('metadata')} className={`segmented-item ${activeTab === 'metadata' ? 'active' : ''}`}>Info</div>
                                <div onClick={() => setActiveTab('shape')} className={`segmented-item ${activeTab === 'shape' ? 'active' : ''}`}>Path</div>
                                <div onClick={() => setActiveTab('stops')} className={`segmented-item ${activeTab === 'stops' ? 'active' : ''}`}>Stops</div>
                            </div>

                            <button onClick={saveCurrentTask} disabled={saving} className="w-full py-3 bg-system-blue text-white rounded-xl font-bold text-xs shadow-xl shadow-system-blue/20 flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95">
                                {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                                {activeTab === 'metadata' ? 'UPDATE INFO' : activeTab === 'shape' ? 'SAVE GEOMETRY' : 'UPDATE SEQUENCE'}
                            </button>
                        </div>

                        {/* Tab Specific Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'metadata' && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-2 block">Route Identifier</label>
                                        <input className="hig-input" value={selectedRoute.short_name} onChange={e => setSelectedRoute({...selectedRoute, short_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-2 block">Display Description</label>
                                        <input className="hig-input" value={selectedRoute.long_name} onChange={e => setSelectedRoute({...selectedRoute, long_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-2 block">System Color</label>
                                        <div className="flex gap-3">
                                            <input className="hig-input font-mono uppercase" value={selectedRoute.color} onChange={e => setSelectedRoute({...selectedRoute, color: e.target.value})} />
                                            <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md shrink-0" style={{backgroundColor: `#${selectedRoute.color}`}}></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'shape' && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-black/5 rounded-xl border border-black/5">
                                        <h4 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3">Construction Tools</h4>
                                        <button 
                                            onClick={async () => {
                                                if (shapePoints.length < 2) return;
                                                setRouting(true);
                                                const coords = shapePoints.map(p => `${p.lon},${p.lat}`).join(';');
                                                const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
                                                pushToHistory(res.data.routes[0].geometry.coordinates.map((c, i) => ({ lat: c[1], lon: c[0], sequence: i + 1 })));
                                                setRouting(false);
                                            }}
                                            className="w-full py-3 bg-black text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg mb-2"
                                        >
                                            {routing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                            SMART SNAP TO ROAD NETWORK
                                        </button>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={undo} disabled={history.length === 0} className="py-2 bg-white border border-black/10 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 disabled:opacity-30"><Undo2 size={12}/> UNDO</button>
                                            <button onClick={() => pushToHistory([])} className="py-2 bg-white border border-black/10 rounded-lg text-[10px] font-black text-red-500 flex items-center justify-center gap-1.5"><RotateCcw size={12}/> RESET</button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-system-gray leading-relaxed font-medium">Click map to drop nodes. Right-click node to delete. Smart Snap calculates real street geometry.</p>
                                </div>
                            )}

                            {activeTab === 'stops' && (
                                <div className="space-y-8 flex flex-col h-full">
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <h4 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3">Active Sequence</h4>
                                        <Reorder.Group axis="y" values={assignedStops} onReorder={setAssignedStops} className="flex-1 overflow-y-auto space-y-2 pr-2">
                                            {assignedStops.map((rs, i) => (
                                                <Reorder.Item key={rs.stop_id} value={rs} className="flex items-center gap-3 p-3 bg-system-background rounded-xl cursor-grab active:cursor-grabbing border border-black/5 hover:border-black/10 shadow-sm transition-all">
                                                    <GripVertical size={14} className="text-black/20" />
                                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-extrabold shadow-sm shrink-0">{i+1}</div>
                                                    <div className="flex-1 font-bold text-xs truncate uppercase">{rs.stop?.name}</div>
                                                    <button onClick={() => setAssignedStops(assignedStops.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 font-bold p-1">&times;</button>
                                                </Reorder.Item>
                                            ))}
                                        </Reorder.Group>
                                    </div>
                                    <div className="flex-1 flex flex-col overflow-hidden border-t border-black/5 pt-6">
                                        <h4 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3">Library Picker</h4>
                                        <div className="flex-1 overflow-y-auto space-y-1 pr-2 font-bold text-[11px]">
                                            {allStops.filter(s => !assignedStops.find(rs => rs.stop_id === s.id)).map(s => (
                                                <div key={s.id} className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg cursor-pointer group" onClick={() => setAssignedStops([...assignedStops, {stop_id: s.id, stop: s, sequence: assignedStops.length+1}])}>
                                                    <span className="text-black/60 group-hover:text-system-blue uppercase">{s.name}</span>
                                                    <Plus size={14} className="text-system-blue opacity-0 group-hover:opacity-100" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 px-6 border-b border-black/5 bg-white flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search size={14} className="absolute left-3 top-3 text-system-gray" />
                                <input className="hig-input text-sm pl-9 py-2" placeholder="Search service lines..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                            {filteredRoutes.map(r => (
                                <div key={r.id} onClick={() => handleSelectRoute(r)} className="p-6 hover:bg-black/[0.02] cursor-pointer group transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: `#${r.color}` }}>
                                            <Bus size={24}/>
                                        </div>
                                        <div>
                                            <div className="text-lg font-black tracking-tight">{r.short_name}</div>
                                            <div className="text-sm font-bold text-system-gray uppercase tracking-wider">{r.long_name}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-black/10 group-hover:text-system-blue transition-all group-hover:translate-x-1" />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Immersive Map Content */}
            <div className="flex-1 relative">
                {!sidebarOpen && (
                    <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-4 z-[1001] p-3 bg-white shadow-xl rounded-full border border-black/5 hover:scale-110 active:scale-95 transition-all text-system-blue">
                        <ChevronRight size={24}/>
                    </button>
                )}

                <MapContainer center={[-7.393, 109.360]} zoom={14} zoomControl={false} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                    {activeTab === 'shape' && selectedRoute && <MapEvents onMapClick={l => pushToHistory([...shapePoints, {lat: l.lat, lon: l.lng, sequence: shapePoints.length+1}])} />}
                    {selectedRoute && <FitBounds points={shapePoints} />}
                    <RecenterMap center={shapePoints.length > 0 ? [shapePoints[0].lat, shapePoints[0].lon] : null} />

                    {/* Polyline */}
                    {shapePoints.length > 1 && (
                        <Polyline positions={shapePoints.map(p => [p.lat, p.lon])} color={selectedRoute ? `#${selectedRoute.color}` : '#007AFF'} weight={6} lineCap="round" lineJoin="round" opacity={0.8} />
                    )}

                    {/* Path Nodes (only in shape tab) */}
                    {activeTab === 'shape' && shapePoints.map((p, i) => (
                        <Marker key={`p-${i}`} position={[p.lat, p.lon]} icon={L.divIcon({ className: 'bg-white border-2 border-system-blue w-3 h-3 rounded-full shadow-lg', iconSize: [12, 12] })} eventHandlers={{ contextmenu: () => pushToHistory(shapePoints.filter((_, idx) => idx !== i).map((pt, ix) => ({...pt, sequence: ix+1}))) }} />
                    ))}

                    {/* Assigned Stops */}
                    {assignedStops.map((rs, i) => (
                        <Marker key={`rs-${i}`} position={[rs.stop.lat, rs.stop.lon]} icon={BusStopIcon}>
                            <Popup><div className="p-1 font-black text-[10px] uppercase">#{i+1} {rs.stop.name}</div></Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Info HUD */}
                {selectedRoute && (
                    <div className="absolute top-6 right-6 z-[1000] flex flex-col items-end gap-3">
                        <div className="bg-black/90 text-white px-5 py-2 rounded-full text-[10px] font-black shadow-2xl border border-white/10 flex items-center gap-2 tracking-widest uppercase">
                            <Settings2 size={12} className="text-system-blue" />
                            {activeTab} MODE ACTIVE
                        </div>
                        {message && (
                            <div className="bg-white px-4 py-2 rounded-xl text-[10px] font-black shadow-xl border border-black/5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <span className={message.type === 'success' ? 'text-green-600' : 'text-red-500'}>&bull; {message.text.toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteStudio;
