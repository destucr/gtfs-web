import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { MapPin, Plus, Trash2, Search, Filter, Loader2, CheckCircle2, ChevronRight, Save, X, Layers, RotateCcw } from 'lucide-react';
import api from '../api';
import axios from 'axios';
import { SidebarHeader } from './SidebarHeader';
import { Route, Stop, RouteStop, Trip, ShapePoint } from '../types';

const Stops: React.FC = () => {
    const { setMapLayers, setOnMapClick, setStatus } = useWorkspace();
    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [stopRouteMap, setStopRouteMap] = useState<Record<number, Route[]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    
    // Editor State
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [formData, setFormData] = useState<Stop>({ id: 0, name: '', lat: 0, lon: 0 });
    const [isDirty, setIsDirty] = useState(false);
    const initialFormData = useRef<string>('');

    const [loading, setLoading] = useState(true);
    const [isNaming, setIsNaming] = useState(false);
    const [focusedRouteId, setFocusedRouteId] = useState<number | null>(null);
    const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
    const [routeShapes, setRouteShapes] = useState<Record<number, [number, number][]>>({});
    
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeAssignment, setActiveAssignment] = useState<{ stop: Stop | null, routeIds: number[] }>({ stop: null, routeIds: [] });

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setStatus({ message: 'Syncing Inventory...', type: 'loading' });
        try {
            const [sRes, rRes, srRes] = await Promise.all([
                api.get('/stops'), api.get('/routes'), api.get('/stop-routes')
            ]);
            const stopsData: Stop[] = sRes.data || [];
            const routesData: Route[] = rRes.data || [];
            const associations: RouteStop[] = srRes.data || [];

            setStops(stopsData);
            setRoutes(routesData);
            
            const map: Record<number, Route[]> = {};
            associations.forEach(assoc => {
                if (!map[assoc.stop_id]) map[assoc.stop_id] = [];
                const r = routesData.find(rt => rt.id === assoc.route_id);
                if (r) map[assoc.stop_id].push(r);
            });
            setStopRouteMap(map);
            setStatus(null);
        } catch (e) { setStatus({ message: 'Sync failed', type: 'error' }); } finally { setLoading(false); }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const handleMapClick = useCallback(async (latlng: { lat: number, lng: number }) => {
        setFormData(prev => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
        setIsNaming(true);
        setStatus({ message: 'Reverse Geocoding...', type: 'loading' });
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
            if (res.data) {
                const name = res.data.name || res.data.display_name.split(',')[0];
                setFormData(prev => ({ ...prev, name }));
                setStatus({ message: `Location: ${name}`, type: 'success' });
                setTimeout(() => setStatus(null), 2000);
            }
        } catch (e) { console.error(e); setStatus({ message: 'Geocoding failed', type: 'error' }); } finally { setIsNaming(false); }
    }, [setStatus]);

    useEffect(() => {
        setOnMapClick(() => handleMapClick);
        return () => setOnMapClick(null);
    }, [handleMapClick, setOnMapClick]);

    // Dirty State Tracking
    useEffect(() => {
        const current = JSON.stringify(formData);
        const dirty = current !== initialFormData.current && initialFormData.current !== '';
        setIsDirty(dirty);
        if (dirty) setStatus({ message: 'Unsaved Point Adjustments', type: 'info', isDirty: true });
        else if (selectedStop) setStatus({ message: 'Point Synced', type: 'info', isDirty: false });
    }, [formData, selectedStop, setStatus]);

    const handleSave = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus({ message: 'Committing adjustments...', type: 'loading' });
        try {
            if (selectedStop?.id) await api.put(`/stops/${selectedStop.id}`, formData);
            else await api.post('/stops', formData);
            initialFormData.current = JSON.stringify(formData);
            setIsDirty(false);
            setStatus({ message: 'Point Recorded', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (err) { setStatus({ message: 'Save failed', type: 'error' }); }
    }, [formData, selectedStop, fetchInitialData, setStatus]);

    const handleSelectStop = (stop: Stop) => {
        setSelectedStop(stop);
        setFormData(stop);
        initialFormData.current = JSON.stringify(stop);
    };

    const handleAddNew = () => {
        const newStop = { id: 0, name: '', lat: 0, lon: 0 };
        setSelectedStop(newStop);
        setFormData(newStop);
        initialFormData.current = JSON.stringify(newStop);
    };

    const toggleRouteFocus = async (routeId: number) => {
        if (focusedRouteId === routeId) {
            setFocusedRouteId(null);
            setSelectedRouteIds(prev => prev.filter(rid => rid !== routeId));
        } else {
            setFocusedRouteId(routeId);
            if (!selectedRouteIds.includes(routeId)) {
                setSelectedRouteIds(prev => [...prev, routeId]);
                if (!routeShapes[routeId]) {
                    const tripsRes: { data: Trip[] } = await api.get('/trips');
                    const routeTrips = tripsRes.data.filter(t => t.route_id === routeId);
                    if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                        const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                        const points: ShapePoint[] = shapeRes.data;
                        setRouteShapes(prev => ({ ...prev, [routeId]: points.sort((a,b)=>a.sequence-b.sequence).map(p=>[p.lat, p.lon] as [number, number]) }));
                    }
                }
            }
        }
    };

    const saveAssignments = async () => {
        if (!activeAssignment.stop) return;
        setStatus({ message: 'Updating Bindings...', type: 'loading' });
        try {
            await api.put(`/stops/${activeAssignment.stop.id}/routes`, activeAssignment.routeIds);
            setShowAssignModal(false);
            setStatus({ message: 'Bindings updated', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (e) { setStatus({ message: 'Binding failed', type: 'error' }); }
    };

    // Sync to global map
    useEffect(() => {
        setMapLayers(prev => ({
            ...prev,
            routes: selectedRouteIds.map(rid => ({
                id: rid,
                color: routes.find(r => r.id === rid)?.color || '007AFF',
                positions: routeShapes[rid] || [],
                isFocused: focusedRouteId === rid
            })),
            stops: stops.map(s => ({ ...s, isSmall: true, hidePopup: false })),
            focusedPoints: (formData.lat !== 0 && formData.lon !== 0) ? [[formData.lat, formData.lon]] : [],
            activeStop: (formData.lat !== 0 && formData.lon !== 0) ? { ...formData, isDraggable: true } : null,
            activeShape: []
        }));
    }, [stops, selectedRouteIds, routeShapes, formData, routes, focusedRouteId, setMapLayers]);

    const filteredStops = stops.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRoute = focusedRouteId ? (stopRouteMap[s.id] || []).some(r => r.id === focusedRouteId) : true;
        return matchesSearch && matchesRoute;
    });

    if (loading && stops.length === 0) return <div className="flex h-screen items-center justify-center font-black text-system-gray animate-pulse flex-col gap-4">SYNCING INVENTORY...</div>;

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl relative z-20 overflow-hidden font-bold" style={{ width: 450 }}>
            <SidebarHeader 
                title={selectedStop ? 'Point Editor' : 'Stops'} 
                Icon={MapPin} 
                onBack={selectedStop ? () => setSelectedStop(null) : undefined}
                actions={!selectedStop && <button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>}
            />

            <div className="flex-1 overflow-y-auto">
                {selectedStop ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                            <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">{selectedStop.id ? 'Modify Record' : 'Register New Station'}</h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Point Label</label>
                                    <input className="hig-input text-sm font-bold pr-10" placeholder="e.g. Central Station" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                    {isNaming && <Loader2 size={14} className="animate-spin absolute right-3 top-9 text-system-blue" />}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Latitude</label>
                                    <input type="number" step="any" className="hig-input text-xs font-mono" value={formData.lat} onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})} required /></div>
                                    <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Longitude</label>
                                    <input type="number" step="any" className="hig-input text-xs font-mono" value={formData.lon} onChange={e => setFormData({...formData, lon: parseFloat(e.target.value)})} required /></div>
                                </div>
                                <div className="pt-2">
                                    <button type="submit" disabled={!isDirty} className="w-full bg-system-blue text-white py-4 rounded-xl font-black text-xs shadow-xl disabled:opacity-30 transition-all active:scale-95 uppercase">Commit Point Changes</button>
                                </div>
                                <p className="text-[10px] text-system-gray italic text-center leading-relaxed">Drag the marker on the map to adjust coordinates visually.</p>
                            </form>
                        </div>
                        {selectedStop.id !== 0 && (
                            <div className="p-6 space-y-6">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-[10px] font-black text-system-gray uppercase tracking-widest">Active Line Bindings</h4>
                                        <button onClick={() => { setActiveAssignment({ stop: selectedStop, routeIds: (stopRouteMap[selectedStop.id] || []).map(r=>r.id) }); setShowAssignModal(true); }} className="text-[10px] font-black text-system-blue hover:underline uppercase">Manage</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(stopRouteMap[selectedStop.id] || []).map(r => (
                                            <span key={r.id} className="px-3 py-1 bg-white border border-black/10 rounded-lg text-[10px] font-black text-black shadow-sm flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `#${r.color}` }} /> {r.short_name}
                                            </span>
                                        ))}
                                        {(stopRouteMap[selectedStop.id] || []).length === 0 && <div className="text-[10px] text-system-gray italic">No active bindings</div>}
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Danger Zone</div>
                                    <button onClick={() => { if(window.confirm('Delete point?')) api.delete(`/stops/${selectedStop.id}`).then(fetchInitialData).then(() => setSelectedStop(null)); }} className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-xs font-black">
                                        <Trash2 size={14}/> DELETE POINT
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="p-4 px-6 border-b border-black/5 bg-white sticky top-0 z-10 shrink-0 font-bold">
                            <div className="relative"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2" placeholder={focusedRouteId ? "Search stops on line..." : "Search inventory..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                            {focusedRouteId && (
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="bg-system-blue/10 text-system-blue px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter flex items-center gap-2"><Filter size={10}/> Line {routes.find(r=>r.id===focusedRouteId)?.short_name}</div>
                                    <button onClick={() => setFocusedRouteId(null)} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear</button>
                                </div>
                            )}
                        </div>
                        <div className="divide-y divide-black/5">
                            {filteredStops.map(stop => (
                                <div key={stop.id} className="p-5 hover:bg-black/[0.02] cursor-pointer transition-all group flex items-center justify-between" onClick={() => handleSelectStop(stop)}>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-sm text-black uppercase tracking-tight truncate mb-1">{stop.name}</div>
                                        <div className="flex flex-wrap gap-1">{(stopRouteMap[stop.id] || []).map(r => (<div key={r.id} className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }} />))}</div>
                                    </div>
                                    <ChevronRight size={18} className="text-system-gray opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-black/5 bg-white sticky bottom-0 z-10">
                            <h3 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3 flex items-center gap-2"><Layers size={12} /> Focus Station List</h3>
                            <div className="flex flex-wrap gap-2">
                                {routes.map(r => ( <button key={r.id} onClick={() => toggleRouteFocus(r.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${focusedRouteId === r.id ? 'bg-black text-white border-black shadow-xl' : 'bg-white text-system-gray border-black/10 hover:border-black/20'}`}>{r.short_name}</button> ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showAssignModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="hig-card w-full max-w-md shadow-2xl p-8 bg-white animate-in fade-in zoom-in duration-200">
                        <h3 className="text-2xl font-black mb-2 text-black">Route Binding</h3>
                        <p className="text-system-gray text-sm mb-8 font-medium">Which lines pass through <span className="text-black font-black underline">{activeAssignment.stop?.name}</span>?</p>
                        <div className="space-y-2 mb-10 max-h-80 overflow-y-auto pr-2">
                            {routes.map(r => (
                                <div key={r.id} onClick={() => { const ids = activeAssignment.routeIds.includes(r.id) ? activeAssignment.routeIds.filter(id => id !== r.id) : [...activeAssignment.routeIds, r.id]; setActiveAssignment({ ...activeAssignment, routeIds: ids }); }} className={`p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all border-2 ${activeAssignment.routeIds.includes(r.id) ? 'border-system-blue bg-system-blue/5' : 'border-transparent bg-black/5 hover:bg-black/10'}`}>
                                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }}></div><span className="font-black text-sm tracking-tight">{r.short_name} - {r.long_name}</span></div>
                                    {activeAssignment.routeIds.includes(r.id) && <CheckCircle2 size={20} className="text-system-blue" />}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={saveAssignments} className="flex-1 bg-system-blue text-white py-4 rounded-xl font-black shadow-xl hover:bg-blue-600 transition-all uppercase tracking-tighter text-xs">Apply Bindings</button>
                            <button onClick={() => setShowAssignModal(false)} className="px-8 bg-black/5 text-system-gray font-black rounded-xl hover:text-black uppercase tracking-tighter text-xs">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stops;
