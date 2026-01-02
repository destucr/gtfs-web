import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Database, Plus, Trash2, Map as MapIcon, Search, ChevronRight, Navigation } from 'lucide-react';
import api from '../api';
import { SidebarHeader } from './SidebarHeader';
import { Route, Trip, ShapePoint } from '../types';

const Trips: React.FC = () => {
    const { setMapLayers, setStatus } = useWorkspace();
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
        setStatus({ message: 'Syncing Bindings...', type: 'loading' });
        try {
            const [tRes, rRes] = await Promise.all([api.get('/trips'), api.get('/routes')]);
            setTrips(tRes.data || []);
            setRoutes(rRes.data || []);
            setStatus(null);
        } catch (e) { setStatus({ message: 'Sync failed', type: 'error' }); } finally { setLoading(false); }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // Track Dirty State
    useEffect(() => {
        const current = JSON.stringify(formData);
        const dirty = current !== initialFormData.current && initialFormData.current !== '';
        setIsDirty(dirty);
        if (dirty) setStatus({ message: 'Unsaved Mapping Adjustments', type: 'info', isDirty: true });
        else if (selectedTrip) setStatus({ message: 'Binding Synced', type: 'info', isDirty: false });
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
        setStatus({ message: 'Committing trip mapping...', type: 'loading' });
        const payload = { ...formData, route_id: parseInt(formData.route_id) };
        try {
            if (selectedTrip?.id) await api.put(`/trips/${selectedTrip.id}`, payload);
            else await api.post('/trips', payload);
            initialFormData.current = JSON.stringify(formData);
            setIsDirty(false);
            setStatus({ message: 'Binding Saved', type: 'success' });
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
            setStatus({ message: 'Loading geometry...', type: 'loading' });
            try {
                const res = await api.get(`/shapes/${trip.shape_id}`);
                const points: ShapePoint[] = res.data || [];
                setActivePoints(points.sort((a,b)=>a.sequence-b.sequence).map(p=>[p.lat, p.lon] as [number, number]));
                setStatus(null);
            } catch (err) { setActivePoints([]); setStatus({ message: 'Geometry not found', type: 'error' }); }
        } else {
            setActivePoints([]);
        }
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

    if (loading && trips.length === 0) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse flex-col gap-4">SYNCING BINDINGS...</div>;

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl relative z-20 overflow-hidden font-bold" style={{ width: 450 }}>
            <SidebarHeader 
                title={selectedTrip ? 'Mapping Editor' : 'Trip Mapping'} 
                Icon={Database} 
                onBack={selectedTrip ? () => setSelectedTrip(null) : undefined}
                actions={!selectedTrip && <button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>}
            />

            <div className="flex-1 overflow-y-auto">
                {selectedTrip ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                            <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">{selectedTrip.id ? 'Modify Trip Mapping' : 'Initialize New Trip'}</h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Reference Route</label>
                                <select className="hig-input text-sm font-bold" value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} required>
                                    <option value="">Select Route...</option>
                                    {routes.map(r => <option key={r.id} value={r.id}>{r.short_name} &mdash; {r.long_name}</option>)}
                                </select></div>
                                <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Destination Headsign</label>
                                <input className="hig-input text-sm font-bold" placeholder="e.g. To Downtown" value={formData.headsign} onChange={e => setFormData({...formData, headsign: e.target.value})} required /></div>
                                <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Geometry Shape ID</label>
                                <div className="relative"><input className="hig-input text-sm font-mono uppercase" placeholder="e.g. SHP_REDLINE" value={formData.shape_id} onChange={e => setFormData({...formData, shape_id: e.target.value})} required /><div className="absolute right-3 top-3 text-[9px] bg-black/10 px-1.5 py-0.5 rounded uppercase opacity-40">Link ID</div></div></div>
                                <div className="pt-2">
                                    <button type="submit" disabled={!isDirty} className="w-full bg-system-blue text-white py-4 rounded-xl font-black text-xs shadow-xl disabled:opacity-30 transition-all active:scale-95 uppercase">Commit Mapping Adjustments</button>
                                </div>
                            </form>
                        </div>
                        {selectedTrip.id !== 0 && (
                            <div className="p-6 space-y-6">
                                <div className="p-4 bg-white border border-black/5 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-3 mb-2 text-system-blue"><Navigation size={14}/><span className="text-[10px] font-black uppercase tracking-widest">Geometry Integrity</span></div>
                                    <div className="text-sm font-bold">{activePoints.length > 0 ? `Shape contains ${activePoints.length} verified coordinate points.` : 'No geometry points found for this Shape ID.'}</div>
                                </div>
                                <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Danger Zone</div>
                                    <button onClick={() => { if(window.confirm('Remove trip mapping?')) api.delete(`/trips/${selectedTrip.id}`).then(fetchInitialData).then(() => setSelectedTrip(null)); }} className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-xs font-black">
                                        <Trash2 size={14}/> DELETE BINDING
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="p-4 px-6 border-b border-black/5 bg-white sticky top-0 z-10 shrink-0 font-bold">
                            <div className="relative font-bold"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2" placeholder="Search service bindings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                        </div>
                        <div className="divide-y divide-black/5">
                            {filteredTrips.map(trip => (
                                <div key={trip.id} className="p-5 hover:bg-black/[0.02] cursor-pointer transition-all group flex items-center justify-between" onClick={() => handleSelectTrip(trip)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-10 rounded-full" style={{ backgroundColor: `#${trip.route?.color || 'ddd'}` }}></div>
                                        <div>
                                            <div className="font-black text-lg tracking-tight text-black leading-none mb-1">{trip.route?.short_name || '??'}</div>
                                            <div className="text-[10px] font-black text-system-gray uppercase tracking-widest">{trip.headsign}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-system-gray opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        );
    };
    
    export default Trips;
    