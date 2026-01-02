import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Globe, Plus, Trash2, Search, Landmark, RotateCcw, ExternalLink, ChevronRight, X, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import { SidebarHeader } from './SidebarHeader';
import { Agency, Route, Stop, RouteStop, Trip, ShapePoint } from '../types';

const Agencies: React.FC = () => {
    const { setMapLayers, setStatus, sidebarOpen, quickMode } = useWorkspace();
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [allRoutes, setAllRoutes] = useState<Route[]>([]);
    const [allStops, setAllStops] = useState<Stop[]>([]);
    const [stopRouteMap, setStopRouteMap] = useState<RouteStop[]>([]);
    const [allTrips, setAllTrips] = useState<Trip[]>([]);
    
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState<Agency>({ name: '', url: '', timezone: '' });
    const [isDirty, setIsDirty] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const initialFormData = useRef<string>('');
    const [loading, setLoading] = useState(true);
    const [agencyStats, setAgencyStats] = useState<Record<number, { routes: number, stops: number }>>({});

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setStatus({ message: 'Syncing Network Data...', type: 'loading' });
        try {
            const [aRes, rRes, sRes, srRes, tRes] = await Promise.all([
                api.get('/agencies'), api.get('/routes'), api.get('/stops'), api.get('/stop-routes'), api.get('/trips')
            ]);
            
            setAgencies(aRes.data || []);
            setAllRoutes(rRes.data || []);
            setAllStops(sRes.data || []);
            setStopRouteMap(srRes.data || []);
            setAllTrips(tRes.data || []);

            const stats: Record<number, { routes: number, stops: number }> = {};
            (aRes.data || []).forEach((agency: Agency) => {
                if (agency.id === undefined) return;
                const agencyRoutes = (rRes.data || []).filter((r: Route) => r.agency_id === agency.id);
                const routeIds = agencyRoutes.map((r: Route) => r.id);
                const stopIds = [...new Set((srRes.data || []).filter((sr: RouteStop) => routeIds.includes(sr.route_id)).map((sr: RouteStop) => sr.stop_id))];
                stats[agency.id] = { routes: agencyRoutes.length, stops: stopIds.length };
            });
            setAgencyStats(stats);
            setStatus(null);
        } catch (e) { setStatus({ message: 'Sync failed', type: 'error' }); } finally { setLoading(false); }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    useEffect(() => {
        const current = JSON.stringify({ name: formData.name, url: formData.url, timezone: formData.timezone });
        const dirty = current !== initialFormData.current && initialFormData.current !== '';
        setIsDirty(dirty);
        if (dirty) setStatus({ message: 'Pending operator changes', type: 'info', isDirty: true });
        else if (selectedAgency) setStatus({ message: 'Operator synchronized', type: 'info', isDirty: false });
    }, [formData, selectedAgency, setStatus]);

    useEffect(() => {
        if (!selectedAgency || selectedAgency.id === undefined) {
            setMapLayers({ routes: [], stops: [], focusedPoints: [], activeShape: [] });
            return;
        }

        const updateGeometry = async () => {
            const agencyRoutes = allRoutes.filter(r => r.agency_id === selectedAgency.id);
            const routeIds = agencyRoutes.map(r => r.id);
            const stopIds = [...new Set(stopRouteMap.filter(sr => routeIds.includes(sr.route_id)).map(sr => sr.stop_id))];
            const agencyStops = allStops.filter(s => stopIds.includes(s.id));
            const agencyTrips = allTrips.filter(t => routeIds.includes(t.route_id));
            const shapeGeometries: { id: number, color: string, positions: [number, number][] }[] = [];
            
            await Promise.all(agencyTrips.map(async (trip) => {
                if (trip.shape_id) {
                    try {
                        const res = await api.get(`/shapes/${trip.shape_id}`);
                        const points: ShapePoint[] = res.data;
                        const poly = points.sort((a,b) => a.sequence - b.sequence).map(p => [p.lat, p.lon] as [number, number]);
                        const route = agencyRoutes.find(r => r.id === trip.route_id);
                        if (route) shapeGeometries.push({ id: trip.id, color: route.color, positions: poly });
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ message: 'Syncing Operator...', type: 'loading' });
        try {
            if (selectedAgency?.id) await api.put(`/agencies/${selectedAgency.id}`, formData);
            else await api.post('/agencies', formData);
            initialFormData.current = JSON.stringify({ name: formData.name, url: formData.url, timezone: formData.timezone });
            setIsDirty(false);
            setStatus({ message: 'Network Operator Saved', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (error) { setStatus({ message: 'Save failed', type: 'error' }); }
    };

    const handleSelectAgency = (agency: Agency) => {
        setSelectedAgency(agency);
        const data = { name: agency.name, url: agency.url, timezone: agency.timezone };
        setFormData(data);
        initialFormData.current = JSON.stringify(data);
    };

    const handleAddNew = () => {
        const newAgency = { name: '', url: '', timezone: '' };
        setSelectedAgency(newAgency);
        setFormData(newAgency);
        initialFormData.current = JSON.stringify(newAgency);
    };

    const filteredAgencies = agencies.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="absolute inset-0 flex overflow-visible pointer-events-none font-bold">
            {/* Sidebar: Registry */}
            <div className="flex flex-col h-full bg-white relative z-20 overflow-hidden text-black border-r border-black/5 pointer-events-auto shadow-2xl" style={{ width: 400 }}>
                <SidebarHeader title="Operators" Icon={Landmark} actions={<button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>} />
                
                <div className="p-4 px-6 border-b border-black/5 bg-white shrink-0 flex gap-2">
                    <div className="relative flex-1"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2" placeholder="Search operators..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                    <button onClick={fetchInitialData} className="p-2 bg-black/5 rounded-lg text-system-gray hover:text-black transition-colors" title="Sync Data"><RotateCcw size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredAgencies.map(agency => (
                        <div key={agency.id} className={`p-6 hover:bg-black/[0.02] cursor-pointer transition-all group flex items-center justify-between ${selectedAgency?.id === agency.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => handleSelectAgency(agency)}>
                            <div className="min-w-0">
                                <div className="font-black text-lg tracking-tight text-black leading-none mb-2 truncate">{agency.name}</div>
                                <div className="flex items-center gap-2 text-[9px] font-black text-system-gray uppercase tracking-widest"><Globe size={10} /> {agency.timezone}</div>
                            </div>
                            <ChevronRight size={18} className={`text-system-gray transition-all ${selectedAgency?.id === agency.id ? 'translate-x-1 text-system-blue' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Operator Hub */}
            {selectedAgency && (
                <motion.div 
                    drag
                    dragMomentum={false}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`absolute top-6 z-[3000] w-[450px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.2)] border border-black/5 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`}
                    style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}
                >
                    <div className="p-8 pb-6 flex items-center justify-between shrink-0 cursor-move">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-system-blue text-white shadow-xl shadow-system-blue/20 shrink-0"><Landmark size={24} /></div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black tracking-tight truncate leading-none mb-1.5">{formData.name || 'New Agency'}</h2>
                                <p className="text-[10px] font-black text-system-gray uppercase tracking-[0.2em] truncate opacity-60">Operator ID: {selectedAgency.id || 'RESERVED'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-black/5 rounded-full text-system-gray transition-all">
                                {isCollapsed ? <Maximize2 size={18}/> : <Minimize2 size={18}/>}
                            </button>
                            <button onClick={() => setSelectedAgency(null)} className="p-2.5 hover:bg-black/5 rounded-full text-system-gray transition-all hover:rotate-90"><X size={20}/></button>
                        </div>
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="flex-1 overflow-y-auto p-8 pt-2 custom-scrollbar">
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60 tracking-widest">Formal Name</label>
                                    <input className="hig-input text-sm font-bold" placeholder="e.g. Transit Authority" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                                    
                                    <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60 tracking-widest">Public Endpoint</label>
                                    <div className="relative"><input className="hig-input text-sm font-bold pr-10" placeholder="https://..." value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required /><ExternalLink size={14} className="absolute right-3 top-3 text-system-gray opacity-40" /></div></div>
                                    
                                    <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60 tracking-widest">Timezone Protocol</label>
                                    <select className="hig-input text-sm font-bold" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} required>
                                        <option value="">Identify Timezone...</option>
                                        <option value="Asia/Jakarta">Jakarta (WIB)</option><option value="Asia/Makassar">Makassar (WITA)</option><option value="Asia/Jayapura">Jayapura (WIT)</option>
                                    </select></div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                                        <div className="bg-black/5 p-4 rounded-2xl text-center">
                                            <div className="text-2xl font-black text-black leading-none mb-1">{selectedAgency.id ? agencyStats[selectedAgency.id]?.routes || 0 : 0}</div>
                                            <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">Active Lines</div>
                                        </div>
                                        <div className="bg-black/5 p-4 rounded-2xl text-center">
                                            <div className="text-2xl font-black text-black leading-none mb-1">{selectedAgency.id ? agencyStats[selectedAgency.id]?.stops || 0 : 0}</div>
                                            <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">Physical Nodes</div>
                                        </div>
                                    </div>

                                    {selectedAgency.id && (
                                        <button type="button" onClick={() => { if(window.confirm('Wipe this operator from registry?')) api.delete(`/agencies/${selectedAgency.id}`).then(fetchInitialData).then(() => setSelectedAgency(null)); }} className="w-full py-3 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-[0.2em] transition-colors">Terminate Record</button>
                                    )}
                                </form>
                            </div>

                            <div className="p-8 bg-white/50 backdrop-blur-md border-t border-black/5 rounded-b-[2.5rem] sticky bottom-0">
                                <button onClick={handleSave} disabled={!isDirty} className="w-full py-5 bg-system-blue text-white rounded-2xl font-black text-[11px] shadow-2xl shadow-system-blue/30 transition-all disabled:opacity-30 active:scale-95 uppercase tracking-widest">Sync Operator Manifest</button>
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default Agencies;