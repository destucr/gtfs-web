import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Database, Plus, Trash2, Map as MapIcon, Search, ChevronRight, Navigation, X, Maximize2, Minimize2, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import { SidebarHeader } from './SidebarHeader';
import { Route, Trip, ShapePoint } from '../types';

const Trips: React.FC = () => {
    const { setMapLayers, setStatus, sidebarOpen, quickMode } = useWorkspace();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [formData, setFormData] = useState({ route_id: '', headsign: '', shape_id: '' });
    const [activePoints, setActivePoints] = useState<[number, number][]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const initialFormData = useRef<string>('');
    
    const [loading, setLoading] = useState(true);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setStatus({ message: 'Syncing Mappings...', type: 'loading' });
        try {
            const [tRes, rRes] = await Promise.all([api.get('/trips'), api.get('/routes')]);
            setTrips(tRes.data || []);
            setRoutes(rRes.data || []);
            setStatus(null);
        } catch (e) { setStatus({ message: 'Sync failed', type: 'error' }); } finally { setLoading(false); }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    useEffect(() => {
        const current = JSON.stringify(formData);
        const dirty = current !== initialFormData.current && initialFormData.current !== '';
        setIsDirty(dirty);
        if (dirty) setStatus({ message: 'Pending sync', type: 'info', isDirty: true });
        else if (selectedTrip) setStatus({ message: 'Synchronized', type: 'info', isDirty: false });
    }, [formData, selectedTrip, setStatus]);

    useEffect(() => {
        const route = routes.find(r => r.id === parseInt(formData.route_id));
        setMapLayers({
            routes: activePoints.length > 0 ? [{
                id: selectedTrip?.id || 0, color: route?.color || '007AFF',
                positions: activePoints, isFocused: true
            }] : [],
            stops: [], focusedPoints: activePoints, activeShape: []
        });
    }, [activePoints, formData.route_id, routes, selectedTrip, setMapLayers]);

    useEffect(() => {
        if (formData.route_id && !selectedTrip?.id) {
            const route = routes.find(r => r.id === parseInt(formData.route_id));
            if (route) { setFormData(prev => ({ ...prev, shape_id: prev.shape_id || `SHP_${route.short_name.toUpperCase()}`, headsign: prev.headsign || route.long_name })); }
        }
    }, [formData.route_id, routes, selectedTrip]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ message: 'Syncing...', type: 'loading' });
        try {
            if (selectedTrip?.id) await api.put(`/trips/${selectedTrip.id}`, { ...formData, route_id: parseInt(formData.route_id) });
            else await api.post('/trips', { ...formData, route_id: parseInt(formData.route_id) });
            initialFormData.current = JSON.stringify(formData);
            setIsDirty(false);
            setStatus({ message: 'Saved', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (err) { setStatus({ message: 'Save failed', type: 'error' }); }
    };

    const handleSelectTrip = async (trip: Trip) => {
        setSelectedTrip(trip);
        const data = { route_id: trip.route_id.toString(), headsign: trip.headsign, shape_id: trip.shape_id };
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
        setSelectedTrip({ id: 0, route_id: 0, headsign: '', shape_id: '' });
        const data = { route_id: '', headsign: '', shape_id: '' };
        setFormData(data);
        initialFormData.current = JSON.stringify(data);
        setActivePoints([]);
    };

    const filteredTrips = trips.filter(t => t.headsign.toLowerCase().includes(searchQuery.toLowerCase()) || t.route?.short_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="absolute inset-0 flex overflow-visible pointer-events-none font-bold">
            {/* Sidebar: Registry */}
            <motion.div 
                animate={{ x: sidebarOpen ? 0 : -400 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="flex flex-col h-full bg-white relative z-20 overflow-hidden text-black border-r border-black/5 pointer-events-auto shadow-2xl" 
                style={{ width: 400 }}
            >
                <SidebarHeader title="Bindings" Icon={Database} actions={<button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>} />
                <div className="p-4 px-6 border-b border-black/5 bg-white shrink-0"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2 font-bold" placeholder="Search bindings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div></div>
                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredTrips.map(trip => (
                        <div key={trip.id} className={`p-5 hover:bg-black/[0.02] cursor-pointer transition-all group flex items-center justify-between ${selectedTrip?.id === trip.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => handleSelectTrip(trip)}>
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: `#${(trip.route?.color || 'ddd').replace('#','')}` }}></div>
                                <div className="min-w-0"><div className="font-black text-lg tracking-tight text-black leading-none mb-1 truncate">{trip.route?.short_name || '??'}</div><div className="text-[10px] font-black text-system-gray uppercase tracking-widest truncate">{trip.headsign}</div></div>
                            </div>
                            <ChevronRight size={18} className={`text-system-gray transition-all ${selectedTrip?.id === trip.id ? 'translate-x-1 text-system-blue' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                    ))}
                </div>
            </motion.div>

            {selectedTrip && (
                <motion.div 
                    drag dragMomentum={false}
                    onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
                    className={`absolute top-6 z-[3000] w-[320px] bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`}
                    style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}
                >
                    <div className="p-4 pb-3 flex items-center justify-between shrink-0 cursor-move border-b border-black/[0.03]">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-system-blue text-white shadow-lg shrink-0"><Database size={16} /></div>
                            <div className="min-w-0"><h2 className="text-sm font-black tracking-tight truncate leading-none mb-0.5">{formData.headsign || 'New Binding'}</h2><p className="text-[8px] font-black text-system-gray uppercase tracking-widest truncate opacity-60">Manifest</p></div>
                        </div>
                        <div className="flex items-center gap-0.5">
                            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-black/5 rounded-full text-system-gray">{isCollapsed ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}</button>
                            <button onClick={() => setSelectedTrip(null)} className="p-1.5 hover:bg-black/5 rounded-full text-system-gray transition-all hover:rotate-90"><X size={16}/></button>
                        </div>
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar">
                                <form onSubmit={handleSave} className="space-y-4">
                                    <div><label className="text-[8px] font-black uppercase mb-1 block text-system-gray opacity-60">Master Line</label>
                                    <select className="hig-input text-[11px] font-bold py-1.5" value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} required>
                                        <option value="">Identify...</option>{routes.map(r => <option key={r.id} value={r.id}>{r.short_name} &mdash; {r.long_name}</option>)}
                                    </select></div>
                                    <div><label className="text-[8px] font-black uppercase mb-1 block text-system-gray opacity-60">Signature</label><input className="hig-input text-[11px] font-bold py-1.5" placeholder="e.g. To Center" value={formData.headsign} onChange={e => setFormData({...formData, headsign: e.target.value})} required /></div>
                                    <div><label className="text-[8px] font-black uppercase mb-1 block text-system-gray opacity-60">Geometry ID</label>
                                    <div className="relative"><input className="hig-input text-[11px] font-mono py-1.5 pr-8 uppercase" value={formData.shape_id} onChange={e => setFormData({...formData, shape_id: e.target.value})} required /><div className="absolute right-2.5 top-2 text-[7px] bg-black/5 px-1 rounded font-black opacity-40">GEO</div></div></div>
                                    <div className="p-3 bg-system-blue/5 rounded-xl border border-system-blue/10"><div className="flex items-center gap-2 mb-1 text-system-blue"><Navigation size={12}/><span className="text-[8px] font-black uppercase">Topology</span></div><div className="text-[10px] font-bold text-black/70 leading-relaxed">{activePoints.length > 0 ? `${activePoints.length} vertices verified.` : 'No geometry found.'}</div></div>
                                    {selectedTrip.id && (
                                        <button type="button" onClick={() => { if(window.confirm('Dissolve mapping?')) api.delete(`/trips/${selectedTrip.id}`).then(fetchInitialData).then(() => setSelectedTrip(null)); }} className="w-full py-2 text-[8px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Dissolve Binding</button>
                                    )}
                                </form>
                            </div>
                            <div className="p-4 bg-white/50 backdrop-blur-md border-t border-black/5 rounded-b-[1.5rem] sticky bottom-0">
                                <button onClick={handleSave} disabled={!isDirty} className="w-full py-3.5 bg-system-blue text-white rounded-xl font-black text-[9px] shadow-xl shadow-system-blue/20 transition-all disabled:opacity-30 active:scale-95 tracking-widest uppercase"><Save size={16}/> Commit Changes</button>
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default Trips;