import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Database, Plus, Trash2, Map as MapIcon, Search, ChevronRight, Navigation, X } from 'lucide-react';
import api from '../api';
import { SidebarHeader } from './SidebarHeader';
import { Route, Trip, ShapePoint } from '../types';

const Trips: React.FC = () => {
    const { setMapLayers, setStatus, sidebarOpen } = useWorkspace();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Editor State
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [formData, setFormData] = useState({ route_id: '', headsign: '', shape_id: '' });
    const [activePoints, setActivePoints] = useState<[number, number][]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const initialFormData = useRef<string>('');
    
    const [loading, setLoading] = useState(true);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setStatus({ message: 'Syncing Trip Mappings...', type: 'loading' });
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
        if (dirty) setStatus({ message: 'Pending binding changes', type: 'info', isDirty: true });
        else if (selectedTrip) setStatus({ message: 'Binding synchronized', type: 'info', isDirty: false });
    }, [formData, selectedTrip, setStatus]);

    useEffect(() => {
        const route = routes.find(r => r.id === parseInt(formData.route_id));
        setMapLayers({
            routes: activePoints.length > 0 ? [{
                id: selectedTrip?.id || 0,
                color: route?.color || '007AFF',
                positions: activePoints,
                isFocused: true
            }] : [],
            stops: [],
            focusedPoints: activePoints,
            activeShape: []
        });
    }, [activePoints, formData.route_id, routes, selectedTrip, setMapLayers]);

    // Auto-suggest logic
    useEffect(() => {
        if (formData.route_id && !selectedTrip?.id) {
            const route = routes.find(r => r.id === parseInt(formData.route_id));
            if (route) {
                setFormData(prev => ({ 
                    ...prev, 
                    shape_id: prev.shape_id || `SHP_${route.short_name.toUpperCase()}`,
                    headsign: prev.headsign || route.long_name 
                }));
            }
        }
    }, [formData.route_id, routes, selectedTrip]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ message: 'Syncing Mapping...', type: 'loading' });
        const payload = { ...formData, route_id: parseInt(formData.route_id) };
        try {
            if (selectedTrip?.id) await api.put(`/trips/${selectedTrip.id}`, payload);
            else await api.post('/trips', payload);
            initialFormData.current = JSON.stringify(formData);
            setIsDirty(false);
            setStatus({ message: 'Trip binding recorded', type: 'success' });
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
            setStatus({ message: 'Loading geometry data...', type: 'loading' });
            try {
                const res = await api.get(`/shapes/${trip.shape_id}`);
                const poly = (res.data || []).sort((a:any,b:any)=>a.sequence-b.sequence).map((p:any)=>[p.lat, p.lon] as [number, number]);
                setActivePoints(poly);
                setStatus(null);
            } catch (err) { setActivePoints([]); setStatus({ message: 'Geometry not found', type: 'error' }); }
        } else { setActivePoints([]); }
    };

    const handleAddNew = () => {
        const newTrip = { id: 0, route_id: 0, headsign: '', shape_id: '' };
        setSelectedTrip(newTrip);
        const data = { route_id: '', headsign: '', shape_id: '' };
        setFormData(data);
        initialFormData.current = JSON.stringify(data);
        setActivePoints([]);
    };

    const filteredTrips = trips.filter(t => 
        t.headsign.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.route?.short_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-full bg-system-background relative overflow-hidden font-bold">
            {/* Sidebar: Registry */}
            <div className="flex flex-col h-full bg-white shadow-2xl relative z-20 overflow-hidden font-bold text-black border-r border-black/5" style={{ width: 400 }}>
                <SidebarHeader title="Bindings" Icon={Database} actions={<button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>} />
                
                <div className="p-4 px-6 border-b border-black/5 bg-white shrink-0">
                    <div className="relative font-bold"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2" placeholder="Search service bindings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredTrips.map(trip => (
                        <div key={trip.id} className={`p-6 hover:bg-black/[0.02] cursor-pointer transition-all group flex items-center justify-between ${selectedTrip?.id === trip.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => handleSelectTrip(trip)}>
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: `#${(trip.route?.color || 'ddd').replace('#','')}` }}></div>
                                <div className="min-w-0">
                                    <div className="font-black text-lg tracking-tight text-black leading-none mb-1 truncate">{trip.route?.short_name || '??'}</div>
                                    <div className="text-[10px] font-black text-system-gray uppercase tracking-widest truncate">{trip.headsign}</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className={`text-system-gray transition-all ${selectedTrip?.id === trip.id ? 'translate-x-1 text-system-blue' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Binding Hub */}
            {selectedTrip && (
                <div 
                    className="absolute top-6 z-[1500] w-[450px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.2)] border border-black/5 flex flex-col max-h-[calc(100vh-120px)] transition-all duration-500 animate-in fade-in slide-in-from-left-8"
                    style={{ left: sidebarOpen ? '424px' : '24px' }}
                >
                    <div className="p-8 pb-6 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-system-blue text-white shadow-xl shadow-system-blue/20 shrink-0"><Database size={24} /></div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black tracking-tight truncate leading-none mb-1.5">{formData.headsign || 'New Binding'}</h2>
                                <p className="text-[10px] font-black text-system-gray uppercase tracking-[0.2em] truncate opacity-60">Manifest ID: {selectedTrip.id || 'NEW_ENTRY'}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedTrip(null)} className="p-2.5 hover:bg-black/5 rounded-full text-system-gray transition-all hover:rotate-90"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-2">
                        <form onSubmit={handleSave} className="space-y-6">
                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60 tracking-widest">Master Route</label>
                            <select className="hig-input text-sm font-bold" value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} required>
                                <option value="">Identify Line...</option>
                                {routes.map(r => <option key={r.id} value={r.id}>{r.short_name} &mdash; {r.long_name}</option>)}
                            </select></div>

                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60 tracking-widest">Destination Signature</label>
                            <input className="hig-input text-sm font-bold" placeholder="e.g. To Downtown Center" value={formData.headsign} onChange={e => setFormData({...formData, headsign: e.target.value})} required /></div>

                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60 tracking-widest">Linked Geometry Hash</label>
                            <div className="relative"><input className="hig-input text-sm font-mono font-black uppercase" placeholder="SHP_ID" value={formData.shape_id} onChange={e => setFormData({...formData, shape_id: e.target.value})} required /><div className="absolute right-3 top-2.5 text-[9px] bg-black/5 px-2 py-1 rounded font-black opacity-40">GEO_ID</div></div></div>

                            <div className="p-6 bg-system-blue/5 rounded-[2rem] border border-system-blue/10">
                                <div className="flex items-center gap-3 mb-2 text-system-blue"><Navigation size={14}/><span className="text-[9px] font-black uppercase tracking-widest">Topology Integrity</span></div>
                                <div className="text-xs font-bold text-black/70 leading-relaxed">{activePoints.length > 0 ? `Detected ${activePoints.length} verified coordinate vertices in linked geometry.` : 'No geometry associated with this Shape ID.'}</div>
                            </div>

                            {selectedTrip.id && (
                                <button type="button" onClick={() => { if(window.confirm('Delete this mapping?')) api.delete(`/trips/${selectedTrip.id}`).then(fetchInitialData).then(() => setSelectedTrip(null)); }} className="w-full py-3 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-[0.2em] transition-colors">Dissolve Binding</button>
                            )}
                        </form>
                    </div>

                    <div className="p-8 bg-white/50 backdrop-blur-md border-t border-black/5 rounded-b-[2.5rem] sticky bottom-0">
                        <button onClick={handleSave} disabled={!isDirty} className="w-full py-5 bg-system-blue text-white rounded-2xl font-black text-[11px] shadow-2xl shadow-system-blue/30 transition-all disabled:opacity-30 active:scale-95 uppercase tracking-widest">Sync Trip Mapping</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Trips;