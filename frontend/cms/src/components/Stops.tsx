import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { MapPin, Plus, Trash2, Search, Filter, Loader2, CheckCircle2, ChevronRight, Save, X, Layers, RotateCcw } from 'lucide-react';
import api from '../api';
import axios from 'axios';
import { SidebarHeader } from './SidebarHeader';
import { Route, Stop, RouteStop, Trip, ShapePoint } from '../types';

const Stops: React.FC = () => {
    const { setMapLayers, setOnMapClick, setStatus, quickMode, setQuickMode } = useWorkspace();
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

    // Handle Quick Mode Entry
    useEffect(() => {
        if (quickMode === 'add-stop' && !selectedStop) {
            handleAddNew();
        }
    }, [quickMode, selectedStop]);

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

    const toggleStopInRoute = async (stop: Stop, routeId: number) => {
        const currentRoutes = stopRouteMap[stop.id] || [];
        const isAssigned = currentRoutes.some(r => r.id === routeId);
        let newRouteIds: number[];
        
        if (isAssigned) {
            newRouteIds = currentRoutes.filter(r => r.id !== routeId).map(r => r.id);
            setStatus({ message: `Removing from Line ${routes.find(r => r.id === routeId)?.short_name}...`, type: 'loading' });
        } else {
            newRouteIds = [...currentRoutes.map(r => r.id), routeId];
            setStatus({ message: `Adding to Line ${routes.find(r => r.id === routeId)?.short_name}...`, type: 'loading' });
        }

        try {
            await api.put(`/stops/${stop.id}/routes`, newRouteIds);
            setStatus({ message: isAssigned ? 'Removed from line' : 'Added to line', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (e) { setStatus({ message: 'Update failed', type: 'error' }); }
    };

    const handleSelectStop = (stop: Stop) => {
        setQuickMode(null);
        setSelectedStop(stop);
        setFormData(stop);
        initialFormData.current = JSON.stringify(stop);
    };

    const handleAddNew = () => {
        setQuickMode(null);
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
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black text-system-gray uppercase tracking-widest">Route Bindings</h4>
                                        <div className="text-[9px] font-black text-system-blue bg-system-blue/5 px-2 py-0.5 rounded">AUTO-SYNC</div>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {routes.map(r => {
                                            const isAssigned = (stopRouteMap[selectedStop.id] || []).some(assigned => assigned.id === r.id);
                                            return (
                                                <div 
                                                    key={r.id} 
                                                    onClick={async () => {
                                                        const currentIds = (stopRouteMap[selectedStop.id] || []).map(assigned => assigned.id);
                                                        const newIds = isAssigned 
                                                            ? currentIds.filter(id => id !== r.id) 
                                                            : [...currentIds, r.id];
                                                        
                                                        setStatus({ message: isAssigned ? `Removing Line ${r.short_name}...` : `Adding Line ${r.short_name}...`, type: 'loading' });
                                                        try {
                                                            await api.put(`/stops/${selectedStop.id}/routes`, newIds);
                                                            setStatus({ message: isAssigned ? 'Binding Removed' : 'Binding Added', type: 'success' });
                                                            setTimeout(() => setStatus(null), 2000);
                                                            fetchInitialData();
                                                        } catch (e) { setStatus({ message: 'Update failed', type: 'error' }); }
                                                    }}
                                                    className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${isAssigned ? 'border-system-blue bg-system-blue/5' : 'border-black/5 bg-white hover:border-black/10'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `#${r.color}` }} />
                                                        <span className="font-bold text-[11px] tracking-tight text-black">{r.short_name} &mdash; {r.long_name}</span>
                                                    </div>
                                                    {isAssigned ? <CheckCircle2 size={16} className="text-system-blue" /> : <Plus size={16} className="text-system-gray opacity-20" />}
                                                </div>
                                            );
                                        })}
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
                                        <div className="flex flex-wrap gap-1">{(stopRouteMap[stop.id] || []).map(r => (<div key={r.id} className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }} title={r.short_name} />))}</div>
                                    </div>
                                    <div className="flex gap-1 items-center shrink-0">
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {focusedRouteId ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleStopInRoute(stop, focusedRouteId); }} 
                                                    className={`p-1.5 rounded-lg transition-all shadow-sm ${ (stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? 'bg-orange-500 text-white' : 'bg-system-blue text-white' }`}
                                                    title={(stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? 'Remove from Line' : 'Add to Line'}
                                                >
                                                    {(stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? <X size={14}/> : <Plus size={14}/>}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setActiveAssignment({ stop, routeIds: (stopRouteMap[stop.id] || []).map(r=>r.id) }); setShowAssignModal(true); }} 
                                                    className="p-1.5 bg-system-blue/10 text-system-blue rounded-lg hover:bg-system-blue hover:text-white transition-all"
                                                    title="Manage Lines"
                                                >
                                                    <Plus size={14}/>
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete stop inventory record?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} 
                                                className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                title="Delete Stop"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                        <ChevronRight size={18} className="text-system-gray ml-2" />
                                    </div>
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
        </div>
    );
};

export default Stops;
