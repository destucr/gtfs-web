import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Globe, Plus, Trash2, Search, Landmark, RotateCcw, ExternalLink, ChevronRight, X, Maximize2, Minimize2, Save } from 'lucide-react';
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
        setStatus({ message: 'Syncing data...', type: 'loading' });
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
        if (dirty) setStatus({ message: 'Unsaved local edits. Save to sync.', type: 'info', isDirty: true });
        else if (selectedAgency) setStatus({ message: 'All changes saved.', type: 'info', isDirty: false });
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
                        const poly = (res.data || []).sort((a:any,b:any) => a.sequence - b.sequence).map((p:any) => [p.lat, p.lon] as [number, number]);
                        const route = agencyRoutes.find(r => r.id === trip.route_id);
                        if (route) shapeGeometries.push({ id: trip.id, color: route.color, positions: poly });
                    } catch (e) {}
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
        setStatus({ message: 'Saving...', type: 'loading' });
        try {
            if (selectedAgency?.id) await api.put(`/agencies/${selectedAgency.id}`, formData);
            else await api.post('/agencies', formData);
            initialFormData.current = JSON.stringify({ name: formData.name, url: formData.url, timezone: formData.timezone });
            setIsDirty(false);
            setStatus({ message: 'Saved successfully.', type: 'success' });
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
            <motion.div animate={{ x: sidebarOpen ? 0 : -400 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex flex-col h-full bg-white relative z-20 overflow-hidden text-black border-r border-zinc-100 pointer-events-auto shadow-2xl" style={{ width: 400 }}>
                <SidebarHeader title="Operators" Icon={Landmark} actions={<button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all" title="Add a new operator"><Plus size={18} /></button>} />
                <div className="p-4 px-6 border-b border-zinc-100 bg-white shrink-0 flex gap-2">
                    <div className="relative flex-1"><Search size={14} className="absolute left-3 top-3 text-zinc-400" /><input className="hig-input text-sm pl-9 py-2 font-bold" placeholder="Search operators..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                    <button onClick={fetchInitialData} className="p-2 bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"><RotateCcw size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
                    {filteredAgencies.map(agency => (
                        <div key={agency.id} className={`p-4 hover:bg-zinc-50 cursor-pointer transition-all group flex items-center justify-between ${selectedAgency?.id === agency.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => handleSelectAgency(agency)}>
                            <div className="min-w-0"><div className="font-black text-sm tracking-tight text-zinc-900 leading-none mb-1 truncate">{agency.name}</div><div className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest"><Globe size={10} /> {agency.timezone}</div></div>
                            <ChevronRight size={18} className={`text-zinc-300 transition-all ${selectedAgency?.id === agency.id ? 'translate-x-1 text-system-blue' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                    ))}
                </div>
            </motion.div>

            {selectedAgency && (
                <motion.div drag dragMomentum={false} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`absolute top-6 z-[3000] w-[320px] bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`} style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}>
                    <div className="p-4 pb-3 flex items-center justify-between shrink-0 cursor-move border-b border-black/[0.03]">
                        <div className="flex items-center gap-3 flex-1 min-w-0"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-system-blue text-white shadow-lg shrink-0"><Landmark size={16} /></div><div className="min-w-0"><h2 className="text-sm font-black tracking-tight truncate leading-none mb-0.5">{formData.name || 'New'}</h2><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate">Operator Details</p></div></div>
                        <div className="flex items-center gap-0.5"><button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-black/5 rounded-full text-zinc-400">{isCollapsed ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}</button><button onClick={() => setSelectedAgency(null)} className="p-1.5 hover:bg-black/5 rounded-full text-zinc-400 transition-all hover:rotate-90"><X size={16}/></button></div>
                    </div>
                    {!isCollapsed && (<><div className="flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar"><form onSubmit={handleSave} className="space-y-4"><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Operator Name</label><input className="hig-input text-[11px] font-bold py-1.5" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Website</label><div className="relative"><input className="hig-input text-[11px] font-bold py-1.5 pr-8" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required /><ExternalLink size={12} className="absolute right-2.5 top-2.5 text-zinc-400" /></div></div><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Timezone</label><select className="hig-input text-[11px] font-bold py-1.5" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} required><option value="">Select...</option><option value="Asia/Jakarta">Jakarta</option></select></div><div className="grid grid-cols-2 gap-2 pt-2"><div className="bg-zinc-50 p-2 rounded-xl text-center"><div className="text-lg font-black text-zinc-900 leading-none mb-0.5">{selectedAgency.id ? agencyStats[selectedAgency.id]?.routes || 0 : 0}</div><div className="text-[7px] font-black text-zinc-400 uppercase">Lines</div></div><div className="bg-zinc-50 p-2 rounded-xl text-center"><div className="text-lg font-black text-zinc-900 leading-none mb-0.5">{selectedAgency.id ? agencyStats[selectedAgency.id]?.stops || 0 : 0}</div><div className="text-[7px] font-black text-zinc-400 uppercase">Nodes</div></div></div>{selectedAgency.id && (<button type="button" onClick={() => { if(window.confirm('Wipe record?')) api.delete(`/agencies/${selectedAgency.id}`).then(fetchInitialData).then(() => setSelectedAgency(null)); }} className="w-full py-2 text-[8px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Delete Operator</button>)}</form></div><div className="p-4 bg-white/50 backdrop-blur-md border-t border-zinc-100 rounded-b-[1.5rem] sticky bottom-0"><button onClick={handleSave} disabled={!isDirty} className="w-full py-3.5 bg-system-blue text-white rounded-xl font-black text-[9px] shadow-xl shadow-system-blue/20 transition-all active:scale-95 tracking-widest uppercase"><Save size={16}/> Save Changes</button></div></>)}
                </motion.div>
            )}
        </div>
    );
};

export default Agencies;