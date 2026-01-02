import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Info, Map as MapIcon, MapPin, Plus, Save, RotateCcw, Zap, ChevronRight, Bus, Loader2 } from 'lucide-react';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Assets & Icons ---
const BusStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
});

const MapEvents = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        },
    });
    return null;
};

const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center]);
    return null;
};

const RouteStudio = () => {
    const [routes, setRoutes] = useState([]);
    const [allStops, setAllStops] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [shapePoints, setShapePoints] = useState([]);
    const [assignedStops, setAssignedStops] = useState([]);
    
    const [activeTab, setActiveTab] = useState('metadata'); // metadata | shape | stops
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [routing, setRouting] = useState(false);
    const [mapCenter, setMapCenter] = useState([-7.393, 109.360]);

    useEffect(() => { refreshData(); }, []);

    const refreshAll = async () => {
        const [rRes, aRes, sRes] = await Promise.all([
            api.get('/routes'), api.get('/agencies'), api.get('/stops')
        ]);
        setRoutes(rRes.data || []);
        setAgencies(aRes.data || []);
        setAllStops(sRes.data || []);
    };

    const refreshData = async () => {
        setLoading(true);
        await refreshAll();
        setLoading(false);
    };

    const handleSelectRoute = async (route) => {
        setSelectedRoute(route);
        setActiveTab('metadata');
        try {
            const [tripsRes, stopsRes] = await Promise.all([
                api.get('/trips'), api.get(`/routes/${route.id}/stops`)
            ]);
            setAssignedStops(stopsRes.data || []);
            const trip = tripsRes.data.find(t => t.route_id === route.id);
            if (trip?.shape_id) {
                const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                const sorted = (shapeRes.data || []).sort((a, b) => a.sequence - b.sequence);
                setShapePoints(sorted);
                if (sorted.length > 0) setMapCenter([sorted[0].lat, sorted[0].lon]);
            } else { setShapePoints([]); }
        } catch (e) { console.error(e); }
    };

    const saveMetadata = async () => {
        setSaving(true);
        try {
            await api.put(`/routes/${selectedRoute.id}`, selectedRoute);
            await refreshAll();
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
        } finally { setSaving(false); }
    };

    const saveStops = async () => {
        setSaving(true);
        try { await api.put(`/routes/${selectedRoute.id}/stops`, assignedStops); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex h-screen items-center justify-center font-medium text-system-gray">Initializing Studio...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-black/5 flex flex-col">
                <div className="p-6 border-b border-black/5 flex justify-between items-center">
                    <h1 className="text-xl font-bold tracking-tight">Route Studio</h1>
                    <button className="p-2 bg-system-blue text-white rounded-full hover:scale-105 active:scale-95 transition-transform">
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
                            <div className={`w-3 h-3 rounded-full mr-3 shadow-sm`} style={{ backgroundColor: selectedRoute?.id === r.id ? 'white' : `#${r.color}` }}></div>
                            <div className="flex-1">
                                <div className="font-semibold text-sm">{r.short_name}</div>
                                <div className={`text-xs ${selectedRoute?.id === r.id ? 'text-white/80' : 'text-system-gray'}`}>{r.long_name}</div>
                            </div>
                            <ChevronRight size={14} className={selectedRoute?.id === r.id ? 'text-white' : 'text-black/20 group-hover:text-black/40'} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 bg-system-background flex flex-col overflow-hidden">
                {!selectedRoute ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                        <Zap size={64} className="mb-4" />
                        <p className="text-lg font-medium">Select a route to begin editing</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 flex items-center justify-between bg-white border-b border-black/5 shadow-sm z-10">
                            <div className="segmented-control w-[480px]">
                                <div onClick={() => setActiveTab('metadata')} className={`segmented-item flex items-center justify-center gap-2 ${activeTab === 'metadata' ? 'active' : ''}`}>
                                    <Info size={14} /> Information
                                </div>
                                <div onClick={() => setActiveTab('shape')} className={`segmented-item flex items-center justify-center gap-2 ${activeTab === 'shape' ? 'active' : ''}`}>
                                    <MapIcon size={14} /> Path Shape
                                </div>
                                <div onClick={() => setActiveTab('stops')} className={`segmented-item flex items-center justify-center gap-2 ${activeTab === 'stops' ? 'active' : ''}`}>
                                    <MapPin size={14} /> Stop Sequence
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {saving && <Loader2 size={16} className="animate-spin text-system-blue self-center" />}
                                <button 
                                    onClick={activeTab === 'metadata' ? saveMetadata : activeTab === 'shape' ? saveShape : saveStops}
                                    className="px-5 py-2 bg-system-blue text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-system-blue/20 hover:bg-blue-600 transition-colors"
                                >
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex p-6 gap-6 overflow-hidden">
                            {/* Control Panel */}
                            <div className="w-96 flex flex-col gap-6 overflow-y-auto">
                                {activeTab === 'metadata' && (
                                    <div className="bg-white rounded-hig p-5 shadow-sm space-y-4">
                                        <h3 className="text-sm font-bold text-system-gray uppercase tracking-wider">Metadata</h3>
                                        <div>
                                            <label className="text-xs font-semibold mb-1 block">Route Number</label>
                                            <input className="hig-input" value={selectedRoute.short_name} onChange={e => setSelectedRoute({...selectedRoute, short_name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold mb-1 block">Display Name</label>
                                            <input className="hig-input" value={selectedRoute.long_name} onChange={e => setSelectedRoute({...selectedRoute, long_name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold mb-1 block">System Color</label>
                                            <div className="flex gap-2">
                                                <input className="hig-input font-mono uppercase" value={selectedRoute.color} onChange={e => setSelectedRoute({...selectedRoute, color: e.target.value})} />
                                                <div className="w-11 h-11 rounded-lg border shadow-inner" style={{backgroundColor: `#${selectedRoute.color}`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'shape' && (
                                    <div className="bg-white rounded-hig p-5 shadow-sm space-y-4">
                                        <h3 className="text-sm font-bold text-system-gray uppercase tracking-wider">Geometry Tools</h3>
                                        <button 
                                            onClick={async () => {
                                                if (shapePoints.length < 2) return;
                                                setRouting(true);
                                                const coords = shapePoints.map(p => `${p.lon},${p.lat}`).join(';');
                                                const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
                                                setShapePoints(res.data.routes[0].geometry.coordinates.map((c, i) => ({ lat: c[1], lon: c[0], sequence: i + 1 })));
                                                setRouting(false);
                                            }}
                                            className="w-full py-2.5 bg-black text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-zinc-800"
                                        >
                                            {routing ? "Calculating..." : <><Zap size={16} /> Snap to Roads</>}
                                        </button>
                                        <button onClick={() => setShapePoints([])} className="w-full py-2 text-red-500 font-medium flex items-center justify-center gap-2 hover:bg-red-50 rounded-lg transition-colors">
                                            <RotateCcw size={16} /> Reset All Nodes
                                        </button>
                                        <p className="text-xs text-system-gray leading-relaxed">Click the map to add anchor points. "Snap to Roads" will fill the path using real street data.</p>
                                    </div>
                                )}

                                {activeTab === 'stops' && (
                                    <div className="flex flex-col gap-6 overflow-hidden">
                                        <div className="bg-white rounded-hig p-5 shadow-sm flex-1 overflow-hidden flex flex-col">
                                            <h3 className="text-sm font-bold text-system-gray uppercase tracking-wider mb-4">Route Stops</h3>
                                            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                                {assignedStops.map((rs, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2 bg-system-background rounded-lg group">
                                                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold shadow-sm">{i+1}</div>
                                                        <div className="flex-1 font-semibold text-sm truncate">{rs.stop?.name}</div>
                                                        <button onClick={() => setAssignedStops(assignedStops.filter((_, idx) => idx !== i).map((s, ix) => ({...s, sequence: ix+1})))} className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-110 transition-all text-lg">×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-hig p-5 shadow-sm flex-1 overflow-hidden flex flex-col">
                                            <h3 className="text-sm font-bold text-system-gray uppercase tracking-wider mb-4">Inventory Picker</h3>
                                            <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                                                {allStops.filter(s => !assignedStops.find(rs => rs.stop_id === s.id)).map(s => (
                                                    <div key={s.id} className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg group cursor-pointer" onClick={() => setAssignedStops([...assignedStops, {stop_id: s.id, stop: s, sequence: assignedStops.length+1}])}>
                                                        <span className="text-sm font-medium">{s.name}</span>
                                                        <Plus size={14} className="text-system-blue" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Map Canvas */}
                            <div className="flex-1 bg-white rounded-hig overflow-hidden shadow-xl relative ring-1 ring-black/5">
                                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                                    <RecenterMap center={mapCenter} />
                                    
                                    {activeTab === 'shape' && <MapEvents onMapClick={l => setShapePoints([...shapePoints, {lat: l.lat, lon: l.lng, sequence: shapePoints.length+1}])} />}

                                    <Polyline positions={shapePoints.map(p => [p.lat, p.lon])} color={`#${selectedRoute.color}`} weight={6} lineCap="round" lineJoin="round" opacity={0.8} />
                                    
                                    {activeTab === 'shape' && shapePoints.map((p, i) => (
                                        <Marker key={`p-${i}`} position={[p.lat, p.lon]} icon={L.divIcon({ className: 'bg-white border-2 border-system-blue w-3 h-3 rounded-full shadow-md', iconSize: [12, 12] })} />
                                    ))}

                                    {assignedStops.map((rs, i) => (
                                        <Marker key={`s-${i}`} position={[rs.stop.lat, rs.stop.lon]} icon={BusStopIcon}>
                                            <Popup><strong>{i+1}. {rs.stop.name}</strong></Popup>
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
