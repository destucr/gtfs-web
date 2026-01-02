import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Globe, Plus, Trash2, Search, ChevronLeft, ChevronRight, Landmark, RotateCcw, Landmark as LandmarkIcon, ExternalLink, Clock } from 'lucide-react';
import api from '../api';

const Agencies = () => {
    const { setMapLayers } = useWorkspace();
    const [agencies, setAgencies] = useState([]);
    const [allRoutes, setAllRoutes] = useState([]);
    const [allStops, setAllStops] = useState([]);
    const [stopRouteMap, setStopRouteMap] = useState([]);
    const [allTrips, setAllTrips] = useState([]);
    
    const [selectedAgency, setSelectedAgency] = useState(null);
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

    useEffect(() => {
        if (!selectedAgency) {
            setMapLayers({ routes: [], stops: [], focusedPoints: [], activeShape: [] });
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
                        shapeGeometries.push({ id: trip.id, color: agencyRoutes.find(r => r.id === trip.route_id)?.color, positions: poly });
                    } catch (e) { console.error(e); }
                }
            }));

            setMapLayers({
                routes: shapeGeometries.map(g => ({ ...g, isFocused: true })),
                stops: agencyStops.map(s => ({ ...s, isSmall: false, hidePopup: false })),
                focusedPoints: shapeGeometries.flatMap(g => g.positions),
                activeShape: []
            });
        };

        updateGeometry();
    }, [selectedAgency, allRoutes, allStops, stopRouteMap, allTrips, setMapLayers]);

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

    if (loading && agencies.length === 0) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse flex-col gap-4">SYNCING OPERATORS...</div>;

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl relative z-20 overflow-hidden font-bold" style={{ width: sidebarOpen ? '450px' : '0', transition: 'width 0.3s ease' }}>
            <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-system-blue rounded-lg flex items-center justify-center text-white shadow-lg"><Landmark size={18}/></div><h1 className="text-xl font-black tracking-tight text-black">Operators</h1></div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
            </div>

            <div className="p-6 bg-system-blue/5 border-b border-system-blue/10 shrink-0">
                <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">{editingId ? 'Modify Record' : 'Register Operator'}</h3>
                <form onSubmit={handleSave} className="space-y-3 font-bold">
                    <input className="hig-input text-sm" placeholder="Agency Name..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    <input className="hig-input text-sm" placeholder="Official URL" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required />
                    <select className="hig-input text-sm" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} required>
                        <option value="">Select Timezone...</option>
                        <option value="Asia/Jakarta">Jakarta (WIB)</option>
                        <option value="Asia/Makassar">Makassar (WITA)</option>
                        <option value="Asia/Jayapura">Jayapura (WIT)</option>
                    </select>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-system-blue text-white py-2.5 rounded-lg font-black text-[10px] shadow-lg">{editingId ? 'COMMIT CHANGES' : 'CONFIRM REGISTRATION'}</button>
                        {editingId && <button type="button" onClick={() => {setEditingId(null); setSelectedAgency(null); setFormData({name:'', url:'', timezone:''})}} className="px-4 bg-white border border-black/10 rounded-lg text-[10px] font-black">CANCEL</button>}
                    </div>
                </form>
            </div>

            <div className="p-4 border-b border-black/5 bg-white sticky top-0 z-10 font-bold shrink-0 flex gap-2">
                <div className="relative flex-1"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2" placeholder="Find operators..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <button onClick={fetchInitialData} className="p-2 bg-black/5 rounded-lg text-system-gray hover:text-black transition-colors" title="Sync Data"><RotateCcw size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                {filteredAgencies.map(agency => (
                    <div key={agency.id} className={`p-6 hover:bg-black/[0.02] cursor-pointer transition-all group ${selectedAgency?.id === agency.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => setSelectedAgency(agency)}>
                        <div className="flex justify-between items-start mb-3">
                            <div><div className="font-black text-lg tracking-tight text-black leading-none mb-2">{agency.name}</div><div className="flex items-center gap-2 text-[10px] font-black text-system-blue uppercase bg-system-blue/5 w-fit px-2 py-0.5 rounded tracking-tighter"><Globe size={10} /> {agency.timezone}</div></div>
                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Remove agency?')) api.delete(`/agencies/${agency.id}`).then(fetchInitialData); }} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                        </div>
                        <a href={agency.url} target="_blank" rel="noreferrer" className="text-xs text-system-gray flex items-center gap-1 hover:underline mb-4 font-bold italic"><ExternalLink size={10} /> {agency.url}</a>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white border border-black/5 p-3 rounded-xl shadow-sm text-center">
                                <div className="text-xl font-black text-black leading-none mb-1">{allRoutes.filter(r => r.agency_id === agency.id).length}</div>
                                <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">Lines</div>
                            </div>
                            <div className="bg-white border border-black/5 p-3 rounded-xl shadow-sm text-center">
                                <div className="text-xl font-black text-black leading-none mb-1">{[...new Set(stopRouteMap.filter(sr => allRoutes.filter(r => r.agency_id === agency.id).map(r => r.id).includes(sr.route_id)).map(sr => sr.stop_id))].length}</div>
                                <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">Nodes</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Agencies;
