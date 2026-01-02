import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Globe, Plus, Trash2, Search, ChevronLeft, ChevronRight, Landmark, Layers, Clock, RotateCcw } from 'lucide-react';
import api from '../api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Assets ---
const BusStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24]
});

// --- Map Helpers ---
const FitBounds = ({ points, trigger }) => {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [100, 100], animate: true });
        }
    }, [trigger, points, map]); // Added points and map dependencies
    return null;
};

const Agencies = () => {
    const [agencies, setAgencies] = useState([]);
    const [allRoutes, setAllRoutes] = useState([]);
    const [allStops, setAllStops] = useState([]);
    const [stopRouteMap, setStopRouteMap] = useState([]);
    const [allTrips, setAllTrips] = useState([]);
    
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [agencyGeometries, setAgencyGeometries] = useState({ routes: [], stops: [] });
    
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ name: '', url: '', timezone: '' });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [aRes, rRes, sRes, srRes, tRes] = await Promise.all([
                api.get('/agencies'), api.get('/routes'), api.get('/stops'), api.get('/stop-routes'), api.get('/trips')
            ]);
            
            setAgencies(aRes.data || []);
            setAllRoutes(rRes.data || []);
            setAllStops(sRes.data || []);
            setStopRouteMap(srRes.data || []);
            setAllTrips(tRes.data || []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // Update Agency Network Geometry when selection or global data changes
    useEffect(() => {
        if (!selectedAgency) {
            setAgencyGeometries({ routes: [], stops: [] });
            return;
        }

        const updateGeometry = async () => {
            const agencyRoutes = allRoutes.filter(r => r.agency_id === selectedAgency.id);
            const routeIds = agencyRoutes.map(r => r.id);
            
            const stopIds = [...new Set(stopRouteMap.filter(sr => routeIds.includes(sr.route_id)).map(sr => sr.stop_id))];
            const agencyStops = allStops.filter(s => stopIds.includes(s.id));

            const agencyTrips = allTrips.filter(t => routeIds.includes(t.route_id));
            const shapeGeometries = [];
            
            await Promise.all(agencyTrips.map(async (trip) => {
                if (trip.shape_id) {
                    try {
                        const res = await api.get(`/shapes/${trip.shape_id}`);
                        const poly = res.data.sort((a,b) => a.sequence - b.sequence).map(p => [p.lat, p.lon]);
                        shapeGeometries.push({ 
                            id: trip.id, 
                            color: agencyRoutes.find(r => r.id === trip.route_id)?.color, 
                            positions: poly 
                        });
                    } catch (e) { console.error(e); }
                }
            }));

            setAgencyGeometries({ routes: shapeGeometries, stops: agencyStops });
        };

        updateGeometry();
    }, [selectedAgency, allRoutes, allStops, stopRouteMap, allTrips]);

    const handleSelectAgency = (agency) => {
        setAgencyGeometries({ routes: [], stops: [] }); // Clear old to avoid flickering
        setSelectedAgency(agency);
        setEditingId(agency.id);
        setFormData({ name: agency.name, url: agency.url, timezone: agency.timezone });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) await api.put(`/agencies/${editingId}`, formData);
            else await api.post('/agencies', formData);
            setFormData({ name: '', url: '', timezone: '' });
            setEditingId(null);
            fetchInitialData();
        } catch (error) { console.error(error); }
    };

    const filteredAgencies = agencies.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const allNetworkPoints = useMemo(() => [
        ...agencyGeometries.routes.flatMap(r => r.positions),
        ...agencyGeometries.stops.map(s => [s.lat, s.lon])
    ], [agencyGeometries]);

    if (loading && agencies.length === 0) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse flex-col gap-4"><Landmark className="animate-spin" size={32} /> SYNCHRONIZING OPERATORS...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-system-background relative font-bold">
            <div className={`${sidebarOpen ? 'w-[450px]' : 'w-0'} bg-white border-r border-black/5 flex flex-col transition-all duration-300 overflow-hidden shrink-0 shadow-2xl z-20`}>
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-system-blue rounded-lg flex items-center justify-center text-white shadow-lg"><Landmark size={18}/></div>
                        <h1 className="text-xl font-black tracking-tight">Operators</h1>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
                </div>

                <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                    <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">{editingId ? 'Modify Record' : 'Register Operator'}</h3>
                    <form onSubmit={handleSave} className="space-y-3">
                        <input className="hig-input text-sm font-bold" placeholder="Agency Name..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        <input className="hig-input text-sm font-bold" placeholder="Official URL" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required />
                        <select className="hig-input text-sm font-bold" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} required>
                            <option value="">Select Timezone...</option>
                            <option value="Asia/Jakarta">Jakarta (WIB)</option>
                            <option value="Asia/Makassar">Makassar (WITA)</option>
                            <option value="Asia/Jayapura">Jayapura (WIT)</option>
                        </select>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-system-blue text-white py-2.5 rounded-lg font-black text-[10px] shadow-lg">
                                {editingId ? 'COMMIT CHANGES' : 'CONFIRM REGISTRATION'}
                            </button>
                            {editingId && <button type="button" onClick={() => {setEditingId(null); setSelectedAgency(null); setAgencyGeometries({routes:[], stops:[]}); setFormData({name:'', url:'', timezone:''})}} className="px-4 bg-white border border-black/10 rounded-lg text-[10px] font-black">CANCEL</button>}
                        </div>
                    </form>
                </div>

                <div className="p-4 border-b border-black/5 bg-white sticky top-0 z-10 font-bold flex gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-3 text-system-gray" />
                        <input className="hig-input text-sm pl-9 py-2" placeholder="Find operators..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <button onClick={fetchInitialData} className="p-2 bg-black/5 rounded-lg text-system-gray hover:text-black transition-colors" title="Sync Data">
                        <RotateCcw size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredAgencies.map(agency => (
                        <div key={agency.id} className={`p-6 hover:bg-black/[0.02] cursor-pointer transition-all group ${selectedAgency?.id === agency.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => handleSelectAgency(agency)}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-black text-lg tracking-tight text-black leading-none mb-2">{agency.name}</div>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-system-blue uppercase bg-system-blue/5 w-fit px-2 py-0.5 rounded tracking-tighter"><Globe size={10} /> {agency.timezone}</div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Remove agency?')) api.delete(`/agencies/${agency.id}`).then(fetchInitialData); }} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="bg-white border border-black/5 p-3 rounded-xl shadow-sm">
                                    <div className="text-xl font-black text-black leading-none mb-1">{allRoutes.filter(r => r.agency_id === agency.id).length}</div>
                                    <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">Active Lines</div>
                                </div>
                                <div className="bg-white border border-black/5 p-3 rounded-xl shadow-sm">
                                    <div className="text-xl font-black text-black leading-none mb-1">{[...new Set(stopRouteMap.filter(sr => allRoutes.filter(r => r.agency_id === agency.id).map(r => r.id).includes(sr.route_id)).map(sr => sr.stop_id))].length}</div>
                                    <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">Network Nodes</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 relative">
                {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-4 z-[1001] p-3 bg-white shadow-xl rounded-full border border-black/5 hover:scale-110 text-system-blue transition-transform"><ChevronRight size={24}/></button>}
                <MapContainer center={[-7.393, 109.360]} zoom={13} scrollWheelZoom={true} zoomControl={true} className="h-full w-full">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                    {selectedAgency && allNetworkPoints.length > 0 && <FitBounds points={allNetworkPoints} trigger={selectedAgency.id} />}
                    {agencyGeometries.routes.map(route => (
                        <Polyline 
                            key={`agency-path-${route.id}-${route.color}`} 
                            positions={route.positions} 
                            color={route.color ? `#${route.color.replace('#', '')}` : '#007AFF'} 
                            weight={6} 
                            opacity={0.8} 
                            lineCap="round" 
                        />
                    ))}
                    {agencyGeometries.stops.map(stop => (
                        <Marker key={`agency-stop-${stop.id}`} position={[stop.lat, stop.lon]} icon={BusStopIcon}>
                            <Popup><div className="p-1"><div className="text-[10px] font-black text-system-blue uppercase mb-1">Network Node</div><div className="text-sm font-black text-black tracking-tight">{stop.name}</div></div></Popup>
                        </Marker>
                    ))}
                </MapContainer>
                {selectedAgency && (
                    <div className="absolute bottom-10 right-10 flex flex-col items-end gap-2 pointer-events-none select-none">
                        <div className="text-[60px] font-black text-black opacity-[0.03] leading-none uppercase text-right">{selectedAgency.name.split(' ')[0]}<br/>NETWORK</div>
                        <div className="bg-black/90 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-2xl border border-white/10 pointer-events-auto"><Layers size={14} className="text-system-blue animate-pulse" />SHOWING {agencyGeometries.routes.length} LINES & {agencyGeometries.stops.length} NODES</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Agencies;
