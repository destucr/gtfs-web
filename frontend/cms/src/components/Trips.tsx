import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Database, Plus, Trash2, Search, ChevronRight, Navigation, X, Maximize2, Minimize2, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import { SidebarHeader } from './SidebarHeader';
import { Route, Trip } from '../types';

const Trips: React.FC = () => {
    const { setMapLayers, setStatus, sidebarOpen, setSidebarOpen, quickMode, setSelectedEntityId, selectedEntityId } = useWorkspace();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [availableShapes, setAvailableShapes] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Editor State
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [formData, setFormData] = useState({ route_id: '', headsign: '', shape_id: '', service_id: 'DAILY', direction_id: '0' });
    const [activePoints, setActivePoints] = useState<[number, number][]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const initialFormData = useRef<string>('');

    const fetchInitialData = useCallback(async () => {
        setStatus({ message: 'Syncing...', type: 'loading' });
        try {
            const [tRes, rRes, sRes] = await Promise.all([
                api.get('/trips'), 
                api.get('/routes'),
                api.get('/shapes')
            ]);
            setTrips(tRes.data || []);
            setRoutes(rRes.data || []);
            setAvailableShapes(sRes.data || []);
            setStatus(null);
        } catch (e) { setStatus({ message: 'Sync failed', type: 'error' }); }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    useEffect(() => {
        if (selectedEntityId && trips.length > 0) {
            const trip = trips.find(t => t.id === selectedEntityId);
            if (trip) { handleSelectTrip(trip); setSelectedEntityId(null); }
        }
    }, [selectedEntityId, trips, setSelectedEntityId]);

    useEffect(() => {
        const current = JSON.stringify(formData);
        const dirty = current !== initialFormData.current && initialFormData.current !== '';
        setIsDirty(dirty);
        if (dirty) setStatus({ message: 'Unsaved local edits. Save to sync.', type: 'info', isDirty: true });
        else if (selectedTrip) setStatus({ message: 'Binding manifest synchronized.', type: 'info', isDirty: false });
    }, [formData, selectedTrip, setStatus]);

    useEffect(() => {
        const route = routes.find(r => r.id === parseInt(formData.route_id));
        setMapLayers({
            routes: activePoints.length > 0 ? [{
                id: selectedTrip?.id || 0, color: route?.color || '007AFF',
                positions: activePoints, isFocused: true
            }] : [],
            stops: [], focusedPoints: activePoints, activeShape: [], activeStop: null
        });
    }, [activePoints, formData.route_id, routes, selectedTrip, setMapLayers]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus({ message: 'Saving...', type: 'loading' });
        try {
            const payload = { 
                ...formData, 
                route_id: parseInt(formData.route_id), 
                direction_id: parseInt(formData.direction_id) 
            };
            if (selectedTrip?.id) await api.put(`/trips/${selectedTrip.id}`, payload);
            else await api.post('/trips', payload);
            initialFormData.current = JSON.stringify(formData);
            setIsDirty(false);
            setStatus({ message: 'Saved successfully.', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (err) { setStatus({ message: 'Save failed.', type: 'error' }); }
    };

    const handleSelectTrip = async (trip: Trip) => {
        setSelectedTrip(trip);
        const data = { 
            route_id: trip.route_id.toString(), 
            headsign: trip.headsign, 
            shape_id: trip.shape_id,
            service_id: trip.service_id || 'DAILY',
            direction_id: (trip.direction_id ?? 0).toString()
        };
        setFormData(data);
        initialFormData.current = JSON.stringify(data);
        if (trip.shape_id) {
            try {
                const res = await api.get(`/shapes/${trip.shape_id}`);
                const poly = (res.data || []).sort((a:any,b:any)=>a.sequence-b.sequence).map((p:any)=>[p.lat, p.lon] as [number, number]);
                setActivePoints(poly);
            } catch (err) { setActivePoints([]); }
        } else { setActivePoints([]); }
    };

    const handleAddNew = () => {
        setSelectedTrip({ id: 0, route_id: 0, headsign: '', shape_id: '', service_id: 'DAILY', direction_id: 0 });
        const data = { route_id: '', headsign: '', shape_id: '', service_id: 'DAILY', direction_id: '0' };
        setFormData(data);
        initialFormData.current = JSON.stringify(data);
        setActivePoints([]);
    };

    const filteredTrips = trips.filter(t => t.headsign.toLowerCase().includes(searchQuery.toLowerCase()) || t.route?.short_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="absolute inset-0 flex overflow-visible pointer-events-none font-bold">
            <motion.div initial={false} animate={{ x: sidebarOpen ? 0 : -400 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex flex-col h-full bg-white relative z-20 overflow-hidden text-black border-r border-zinc-100 pointer-events-auto shadow-2xl" style={{ width: 400 }}>
                <SidebarHeader 
                    title="Bindings" 
                    Icon={Database} 
                    onToggleSidebar={() => setSidebarOpen(false)}
                    actions={<button onClick={handleAddNew} className="p-1.5 bg-system-blue/10 text-system-blue rounded-lg hover:bg-system-blue/20 transition-colors" title="Add a new binding"><Plus size={18} /></button>} 
                />
                <div className="p-4 px-6 border-b border-zinc-100 bg-white shrink-0"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-zinc-400" /><input className="hig-input text-sm pl-9 py-2 font-bold" placeholder="Search trips..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div></div>
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
                    {filteredTrips.map(trip => (
                        <div key={trip.id} className={`p-4 hover:bg-zinc-50 cursor-pointer transition-all group flex items-center justify-between ${selectedTrip?.id === trip.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => handleSelectTrip(trip)}>
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: `#${(trip.route?.color || 'ddd').replace('#','')}` }}></div>
                                <div className="min-w-0"><div className="font-black text-sm text-zinc-900 leading-none mb-1 truncate">{trip.route?.short_name || '??'}</div><div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate">{trip.headsign}</div></div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Wipe binding?')) api.delete(`/trips/${trip.id}`).then(fetchInitialData); }} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                <ChevronRight size={18} className={`text-zinc-300 transition-all ${selectedTrip?.id === trip.id ? 'translate-x-1 text-system-blue opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {selectedTrip && (
                <motion.div drag dragMomentum={false} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`absolute top-6 z-[3000] w-[320px] bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`} style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}>
                    <div className="p-4 pb-3 flex items-center justify-between shrink-0 cursor-move border-b border-black/[0.03]">
                        <div className="flex items-center gap-3 flex-1 min-w-0"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-system-blue text-white shadow-lg shrink-0"><Database size={16} /></div><div className="min-w-0"><h2 className="text-sm font-black tracking-tight truncate leading-none mb-0.5">{formData.headsign || 'New'}</h2><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate">Mapping</p></div></div>
                        <div className="flex items-center gap-0.5"><button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-black/5 rounded-full text-zinc-400">{isCollapsed ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}</button><button onClick={() => setSelectedTrip(null)} className="p-1.5 hover:bg-black/5 rounded-full text-zinc-400 transition-all hover:rotate-90"><X size={16}/></button></div>
                    </div>
                    {!isCollapsed && (<><div className="flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar"><form onSubmit={handleSave} className="space-y-4"><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Master Line</label><select className="hig-input text-[11px] font-bold py-1.5" value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} required><option value="">Select...</option>{routes.map(r => <option key={r.id} value={r.id}>{r.short_name} &mdash; {r.long_name}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Service ID</label><input className="hig-input text-[11px] font-bold py-1.5 uppercase" placeholder="e.g. DAILY" value={formData.service_id} onChange={e => setFormData({...formData, service_id: e.target.value})} required /></div><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Direction</label><select className="hig-input text-[11px] font-bold py-1.5" value={formData.direction_id} onChange={e => setFormData({...formData, direction_id: e.target.value})} required><option value="0">0 - Outbound</option><option value="1">1 - Inbound</option></select></div></div>                                        <div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Heading</label><input className="hig-input text-[11px] font-bold py-1.5" value={formData.headsign} onChange={e => setFormData({...formData, headsign: e.target.value})} required /></div>
                                        <div>
                                            <label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Linked Path (Shape)</label>
                                            <select 
                                                className="hig-input text-[11px] font-mono font-bold py-1.5" 
                                                value={formData.shape_id} 
                                                onChange={e => setFormData({...formData, shape_id: e.target.value})} 
                                                required
                                            >
                                                <option value="">Select a path...</option>
                                                {availableShapes.map(shp => (
                                                    <option key={shp} value={shp}>{shp}</option>
                                                ))}
                                            </select>
                                        </div>
<div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100"><div className="flex items-center gap-2 mb-1 text-zinc-400"><Navigation size={12}/><span className="text-[8px] font-black uppercase">Geometry</span></div><div className="text-[10px] font-bold text-zinc-600 leading-relaxed">{activePoints.length > 0 ? `${activePoints.length} points.` : 'No path.'}</div></div>{selectedTrip.id !== 0 && (<div className="pt-4 mt-4 border-t border-black/[0.03]"><button type="button" onClick={() => { if(window.confirm('Delete this mapping record permanently?')) api.delete(`/trips/${selectedTrip.id}`).then(fetchInitialData).then(() => setSelectedTrip(null)); }} className="w-full py-2 text-[8px] font-black text-rose-500/60 hover:text-rose-600 uppercase tracking-[0.2em] transition-colors">Delete Record</button></div>)}</form></div><div className="p-4 bg-white/50 backdrop-blur-md border-t border-zinc-100 rounded-b-[1.5rem] sticky bottom-0 flex justify-center"><button onClick={() => handleSave()} disabled={!isDirty} className="px-8 py-2.5 bg-system-blue text-white rounded-full font-black text-[9px] shadow-xl shadow-system-blue/20 flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-30 active:scale-95 tracking-widest uppercase"><Save size={14}/> Commit Changes</button></div></>)}
                </motion.div>
            )}
        </div>
    );
};

export default Trips;
