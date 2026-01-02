import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { Database, Plus, Trash2, Map as MapIcon, Search, ChevronLeft, ChevronRight, Loader2, Navigation } from 'lucide-react';
import api from '../api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const RecenterMap = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50], animate: true });
        }
    }, [points, map]);
    return null;
};

const Trips = () => {
    const [trips, setTrips] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ route_id: '', headsign: '', shape_id: '' });
    const [activePoints, setActivePoints] = useState([]);
    
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [tRes, rRes] = await Promise.all([api.get('/trips'), api.get('/routes')]);
            setTrips(tRes.data || []);
            setRoutes(rRes.data || []);
        } finally { setLoading(false); }
    };

    // Auto-suggest logic
    useEffect(() => {
        if (formData.route_id && !editingId) {
            const route = routes.find(r => r.id === parseInt(formData.route_id));
            if (route) {
                setFormData(prev => ({ 
                    ...prev, 
                    shape_id: `SHP_${route.short_name.toUpperCase()}`,
                    headsign: prev.headsign || route.long_name 
                }));
            }
        }
    }, [formData.route_id, routes, editingId]);

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = { ...formData, route_id: parseInt(formData.route_id) };
        try {
            if (editingId) await api.put(`/trips/${editingId}`, payload);
            else await api.post('/trips', payload);
            setFormData({ route_id: '', headsign: '', shape_id: '' });
            setEditingId(null);
            fetchInitialData();
        } catch (err) { console.error("Save error:", err); }
    };

    const handleViewTrip = async (trip) => {
        setEditingId(trip.id);
        setFormData({ route_id: trip.route_id, headsign: trip.headsign, shape_id: trip.shape_id });
        if (trip.shape_id) {
            try {
                const res = await api.get(`/shapes/${trip.shape_id}`);
                setActivePoints((res.data || []).sort((a,b)=>a.sequence-b.sequence).map(p=>[p.lat, p.lon]));
            } catch (err) { console.error("Load geometry error:", err); setActivePoints([]); }
        }
    };

    const filteredTrips = trips.filter(t => 
        t.headsign.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.route?.short_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && trips.length === 0) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse">LOAD BALANCING TRIPS...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-system-background relative">
            
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-[450px]' : 'w-0'} bg-white border-r border-black/5 flex flex-col transition-all duration-300 overflow-hidden shrink-0 shadow-2xl z-20`}>
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-system-blue rounded-lg flex items-center justify-center text-white shadow-lg">
                            <Database size={18}/>
                        </div>
                        <h1 className="text-xl font-black tracking-tight">Trip Mapping</h1>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
                </div>

                {/* Assignment Form */}
                <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                    <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">
                        {editingId ? 'Modify Trip Mapping' : 'Initialize New Trip'}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-3 font-bold">
                        <select className="hig-input text-sm" value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} required>
                            <option value="">Choose Reference Route...</option>
                            {routes.map(r => <option key={r.id} value={r.id}>{r.short_name} &mdash; {r.long_name}</option>)}
                        </select>
                        <input className="hig-input text-sm" placeholder="Destination Headsign" value={formData.headsign} onChange={e => setFormData({...formData, headsign: e.target.value})} required />
                        <div className="relative">
                            <input className="hig-input text-sm font-mono" placeholder="SHAPE_ID" value={formData.shape_id} onChange={e => setFormData({...formData, shape_id: e.target.value})} required />
                            <div className="absolute right-3 top-3 text-[9px] bg-black/10 px-1.5 py-0.5 rounded uppercase opacity-40">Link ID</div>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-system-blue text-white py-2.5 rounded-lg font-black text-xs shadow-lg">
                                {editingId ? 'CONFIRM CHANGES' : 'CREATE TRIP BINDING'}
                            </button>
                            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({route_id:'', headsign:'', shape_id:''}); setActivePoints([]);}} className="px-4 bg-white border border-black/10 rounded-lg text-xs font-bold">DISMISS</button>}
                        </div>
                    </form>
                </div>

                {/* List Area */}
                <div className="p-4 border-b border-black/5 bg-white sticky top-0 z-10">
                    <div className="relative font-bold">
                        <Search size={14} className="absolute left-3 top-3 text-system-gray" />
                        <input className="hig-input text-sm pl-9 py-2" placeholder="Search service bindings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredTrips.map(trip => (
                        <div 
                            key={trip.id} 
                            className={`p-6 hover:bg-black/[0.02] cursor-pointer transition-colors group ${editingId === trip.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`}
                            onClick={() => handleViewTrip(trip)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-10 rounded-full" style={{ backgroundColor: `#${trip.route?.color || 'ddd'}` }}></div>
                                    <div>
                                        <div className="font-black text-lg tracking-tight leading-none mb-1">{trip.route?.short_name || '??'}</div>
                                        <div className="text-[10px] font-black text-system-gray uppercase tracking-widest">{trip.headsign}</div>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Remove trip mapping?')) api.delete(`/trips/${trip.id}`).then(fetchInitialData); }} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-system-blue font-mono bg-system-blue/5 px-2 py-1 rounded w-fit uppercase">
                                <MapIcon size={10} /> Link: {trip.shape_id}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toggle Sidebar */}
            {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-4 z-[1001] p-3 bg-white shadow-xl rounded-full border border-black/5 hover:scale-110 text-system-blue">
                    <ChevronRight size={24}/>
                </button>
            )}

            {/* Content Area (Map Visualization) */}
            <div className="flex-1 relative">
                <MapContainer center={[-7.393, 109.360]} zoom={13} zoomControl={false} className="h-full w-full grayscale-[0.2]">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                    {activePoints.length > 0 && (
                        <>
                            <Polyline positions={activePoints} color={trips.find(t=>t.id===editingId)?.route?.color ? `#${trips.find(t=>t.id===editingId).route.color}` : '#007AFF'} weight={8} opacity={0.8} />
                            <RecenterMap points={activePoints} />
                        </>
                    )}
                </MapContainer>
                
                {editingId && (
                    <div className="absolute top-6 right-6 z-[1000] bg-black/90 text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3">
                        <Navigation size={16} className="text-system-blue animate-pulse" />
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none">Inspecting Geometry</div>
                            <div className="text-sm font-bold tracking-tight">{formData.shape_id}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Trips;