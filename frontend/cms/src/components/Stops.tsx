import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { MapPin, Plus, Trash2, Search, Loader2, CheckCircle2, ChevronRight, X, Maximize2, Minimize2, Bus, Save, Eye, EyeOff, ArrowDownAz, Clock, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';
import { SidebarHeader } from './SidebarHeader';
import { Route, Stop, TripStop, Trip, ShapePoint } from '../types';

const Stops: React.FC = () => {
    const { setMapLayers, setOnMapClick, setStatus, quickMode, setQuickMode, sidebarOpen, setSidebarOpen, selectedEntityId, setSelectedEntityId, setHoveredEntityId, hoveredEntityId } = useWorkspace();
    const navigate = useNavigate();

    // Registry Data
    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [stopRouteMap, setStopRouteMap] = useState<Record<number, Route[]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'newest' | 'routes'>('name');

    // Editor State
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [formData, setFormData] = useState<Stop>({ id: 0, name: '', lat: 0, lon: 0 });
    const [originalData, setOriginalData] = useState<Stop | null>(null);

    // UI State
    const [activeTab, setActiveTab] = useState<'info' | 'bindings'>('info');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isNaming, setIsNaming] = useState(false);
    const [focusedRouteId, setFocusedRouteId] = useState<number | null>(null);
    const [routeShapes, setRouteShapes] = useState<Record<number, [number, number][]>>({});
    const [hoveredRouteIds, setHoveredRouteIds] = useState<number[]>([]);
    const [selectedStopRouteIds, setSelectedStopRouteIds] = useState<number[]>([]);
    const [focusType, setFocusType] = useState<'select' | 'hover' | null>(null);
    const [persistentRouteIds, setPersistentRouteIds] = useState<number[]>([]);

    // Calculate Dirty State
    const isDirty = useMemo(() => {
        if (!selectedStop || !originalData) return false;
        return JSON.stringify(formData) !== JSON.stringify(originalData);
    }, [formData, originalData, selectedStop]);

    const fetchInitialData = useCallback(async () => {
        setStatus({ message: 'Syncing...', type: 'loading' });
        try {
            const [sRes, rRes, srRes] = await Promise.all([api.get('/stops'), api.get('/routes'), api.get('/stop-routes')]);
            const sData = sRes.data || [];
            const rData = rRes.data || [];
            const srData = srRes.data || [];

            setStops(sData);
            setRoutes(rData);
            const map: Record<number, Route[]> = {};
            srData.forEach((assoc: TripStop & { trip: Trip }) => {
                if (!map[assoc.stop_id]) map[assoc.stop_id] = [];
                const r = rData.find((rt: Route) => rt.id === assoc.trip?.route_id);
                if (r && !map[assoc.stop_id].some(existing => existing.id === r.id)) {
                    map[assoc.stop_id].push(r);
                }
            });
            setStopRouteMap(map);
            setStatus(null);
        } catch (e) { setStatus({ message: 'Sync failed', type: 'error' }); }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const handleRouteHighlight = useCallback(async (routeId: number, isPersistent: boolean) => {
        if (isPersistent) {
            // No-op for persistent in this context as we are just highlighting
        } else {
            setHoveredRouteIds(prev => [...new Set([...prev, routeId])]);
        }

        if (!routeShapes[routeId]) {
            try {
                const tripsRes: { data: Trip[] } = await api.get('/trips');
                const routeTrips = tripsRes.data.filter(t => t.route_id === routeId);
                if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                    const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                    const points: ShapePoint[] = shapeRes.data || [];
                    const poly = points.sort((a, b) => a.sequence - b.sequence).map(p => [p.lat, p.lon] as [number, number]);
                    setRouteShapes(prev => ({ ...prev, [routeId]: poly }));
                }
            } catch (e) { }
        }
    }, [routeShapes, setHoveredRouteIds, setRouteShapes]);

    const handleSelectStop = useCallback(async (stop: Stop) => {
        setQuickMode(null);
        setSelectedStop(stop);
        setFormData({ ...stop });
        setOriginalData({ ...stop });
        setActiveTab('info');
        setFocusType('select');

        const routesForStop = stopRouteMap[stop.id] || [];
        setSelectedStopRouteIds(routesForStop.map(r => r.id));
        await Promise.all(routesForStop.map(r => handleRouteHighlight(r.id, true)));
    }, [stopRouteMap, setQuickMode, handleRouteHighlight]);

    useEffect(() => {
        if (selectedEntityId && stops.length > 0) {
            const stop = stops.find(s => s.id === selectedEntityId);
            if (stop) { handleSelectStop(stop); setSelectedEntityId(null); }
        }
    }, [selectedEntityId, stops, handleSelectStop, setSelectedEntityId]);

    const handleStopHover = async (stopId: number | null) => {
        setHoveredEntityId(stopId);
        setFocusType(stopId ? 'hover' : (selectedStop ? 'select' : null));
        if (stopId) {
            const routesForStop = stopRouteMap[stopId] || [];
            setHoveredRouteIds([]);
            await Promise.all(routesForStop.map(r => handleRouteHighlight(r.id, false)));
        } else { setHoveredRouteIds([]); }
    };

    const handleAddNew = useCallback(() => {
        setQuickMode(null);
        const newStop = { id: 0, name: '', lat: 0, lon: 0 };
        setSelectedStop(newStop);
        setFormData({ ...newStop });
        setOriginalData({ ...newStop });
        setActiveTab('info');
        setFocusType('select');
        setSelectedStopRouteIds([]);
    }, [setQuickMode]);

    useEffect(() => {
        if (quickMode === 'add-stop' && !selectedStop) { handleAddNew(); }
    }, [quickMode, selectedStop, handleAddNew]);

    const handleMapClick = useCallback(async (latlng: { lat: number, lng: number }) => {
        if (selectedStop || quickMode === 'add-stop') {
            setFormData(prev => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
            setIsNaming(true);
            if (quickMode === 'add-stop') setQuickMode(null);
            try {
                const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
                if (res.data) {
                    const name = res.data.name || res.data.display_name.split(',')[0];
                    setFormData(prev => ({ ...prev, name }));
                }
            } catch (e) { } finally { setIsNaming(false); }
        }
    }, [selectedStop, quickMode, setQuickMode]);

    useEffect(() => {
        setOnMapClick(handleMapClick);
        return () => setOnMapClick(null);
    }, [handleMapClick, setOnMapClick]);

    useEffect(() => {
        if (isDirty) setStatus({ message: 'Unsaved edits. Save to sync.', type: 'info', isDirty: true });
        else if (selectedStop) setStatus({ message: 'All changes saved.', type: 'info', isDirty: false });
        else setStatus(null);
    }, [isDirty, selectedStop, setStatus]);

    const handleSave = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus({ message: 'Saving...', type: 'loading' });
        try {
            if (selectedStop?.id) {
                await api.put(`/stops/${selectedStop.id}`, formData);
            } else {
                const res = await api.post('/stops', formData);
                setSelectedStop(res.data);
                setFormData(res.data);
                setOriginalData(res.data);
            }
            if (selectedStop?.id) {
                setOriginalData({ ...formData });
            }
            setStatus({ message: 'Saved successfully.', type: 'success' });
            setTimeout(() => setStatus(null), 3000);
            fetchInitialData();
        } catch (err) { setStatus({ message: 'Save failed.', type: 'error' }); }
    }, [formData, selectedStop, fetchInitialData, setStatus]);

    const toggleStopInRoute = async (stop: Stop, routeId: number) => {
        const currentRoutes = stopRouteMap[stop.id] || [];
        const isAssigned = currentRoutes.some(r => r.id === routeId);
        const newRouteIds = isAssigned ? currentRoutes.filter(r => r.id !== routeId).map(r => r.id) : [...currentRoutes.map(r => r.id), routeId];
        setStatus({ message: 'Updating...', type: 'loading' });
        try {
            await api.put(`/stops/${stop.id}/routes`, newRouteIds);
            fetchInitialData();
            setStatus({ message: 'Link updated.', type: 'success' });
            setTimeout(() => setStatus(null), 3000);
        } catch (e) { }
    };

    const togglePersistentRoute = async (routeId: number) => {
        if (persistentRouteIds.includes(routeId)) {
            setPersistentRouteIds(prev => prev.filter(id => id !== routeId));
            return;
        }

        setPersistentRouteIds(prev => [...prev, routeId]);

        if (!routeShapes[routeId]) {
            try {
                const tripsRes: { data: Trip[] } = await api.get('/trips');
                const routeTrips = tripsRes.data.filter(t => t.route_id === routeId);
                if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                    const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                    const points: ShapePoint[] = shapeRes.data || [];
                    const poly = points.sort((a, b) => a.sequence - b.sequence).map(p => [p.lat, p.lon] as [number, number]);
                    setRouteShapes(prev => ({ ...prev, [routeId]: poly }));
                }
            } catch (e) {
                console.error("Failed to load route shape:", e);
            }
        }
    };

    useEffect(() => {
        const hoveredStop = stops.find(s => s.id === hoveredEntityId);
        setMapLayers(prev => ({
            ...prev,
            routes: [...new Set([...selectedStopRouteIds, ...persistentRouteIds])].map(rid => ({
                id: rid, color: routes.find(r => r.id === rid)?.color || '007AFF',
                positions: routeShapes[rid] || [], isFocused: true
            })),
            stops: stops.map(s => ({
                ...s, isSmall: true, hidePopup: false,
                isCustom: s.id === hoveredEntityId,
                icon: s.id === hoveredEntityId ? L.divIcon({
                    className: '',
                    html: `<div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
                            <div style="position: absolute; width: 24px; height: 24px; background-color: rgba(249,115,22,0.3); border-radius: 9999px; animation: leaflet-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="width: 10px; height: 10px; background-color: #F97316; border: 1px solid white; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); position: relative; z-index: 10;"></div>
                        </div>
                        <style>
                          @keyframes leaflet-ping {
                            75%, 100% { transform: scale(2); opacity: 0; }
                          }
                        </style>`,
                    iconSize: [24, 24], iconAnchor: [12, 12]
                }) : undefined
            })),
            focusedPoints: (formData.lat !== 0 && formData.lon !== 0) ? [[formData.lat, formData.lon]] : (hoveredStop ? [[hoveredStop.lat, hoveredStop.lon]] : []),
            activeStop: (formData.lat !== 0 && formData.lon !== 0) ? { ...formData, isDraggable: true } : null,
            previewRoutes: hoveredRouteIds.map(rid => ({
                id: rid, color: routes.find(r => r.id === rid)?.color || '007AFF',
                positions: routeShapes[rid] || [], isFocused: false
            })),
            activeShape: [],
            focusType
        }));
    }, [stops, routeShapes, formData, routes, hoveredRouteIds, selectedStopRouteIds, persistentRouteIds, hoveredEntityId, focusType, setMapLayers]);

    const filteredStops = useMemo(() => {
        let result = stops.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRoute = focusedRouteId ? (stopRouteMap[s.id] || []).some(r => r.id === focusedRouteId) : true;
            return matchesSearch && matchesRoute;
        });

        // Apply Sorting
        result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'newest') return b.id - a.id;
            if (sortBy === 'routes') {
                const countA = (stopRouteMap[a.id] || []).length;
                const countB = (stopRouteMap[b.id] || []).length;
                return countB - countA;
            }
            return 0;
        });

        return result;
    }, [stops, searchQuery, focusedRouteId, stopRouteMap, sortBy]);

    return (
        <div className="absolute inset-0 flex overflow-visible pointer-events-none font-bold">
            <motion.div animate={{ x: sidebarOpen ? 0 : -400 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex flex-col h-full bg-white relative z-20 overflow-hidden text-black border-r border-zinc-100 pointer-events-auto shadow-2xl" style={{ width: 400 }}>
                <SidebarHeader 
                    title="Stops" 
                    Icon={MapPin} 
                    onToggleSidebar={() => setSidebarOpen(false)}
                    actions={<button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all" title="Add a new stop"><Plus size={18} /></button>} 
                />
                <div className="p-4 px-6 border-b border-zinc-100 bg-white shrink-0">
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
                            <input className="hig-input text-sm pl-9 py-2 font-bold w-full" placeholder="Search stops..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex bg-zinc-50 p-1 rounded-xl border border-zinc-100 gap-0.5">
                            {(['name', 'newest', 'routes'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setSortBy(mode)}
                                    className={`p-1.5 rounded-lg transition-all ${sortBy === mode ? 'bg-white text-system-blue shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    title={
                                        mode === 'name' ? '[Sort: Alpha] Click to reorder A-Z' :
                                        mode === 'newest' ? '[Sort: Recent] Click to show latest first' :
                                        '[Sort: Connectivity] Click to show major hubs first'
                                    }
                                >
                                    {mode === 'name' && <ArrowDownAz size={14} />}
                                    {mode === 'newest' && <Clock size={14} />}
                                    {mode === 'routes' && <Share2 size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1"><h3 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Link to Route</h3>{focusedRouteId && <button onClick={() => setFocusedRouteId(null)} className="text-[8px] font-black text-red-500 hover:underline uppercase">Clear</button>}</div>
                        <div className="flex flex-wrap gap-1.5">
                            {routes.map(r => (
                                <div key={r.id} className="flex items-center bg-white rounded-lg border border-zinc-100 hover:border-zinc-200 transition-all shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => { if (focusedRouteId === r.id) setFocusedRouteId(null); else setFocusedRouteId(r.id); }}
                                        className={`px-2.5 py-1 text-[9px] font-black transition-all ${focusedRouteId === r.id ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'}`}
                                    >
                                        {r.short_name}
                                    </button>
                                    <button
                                        onClick={() => togglePersistentRoute(r.id)}
                                        className={`p-1 border-l border-zinc-50 transition-all ${persistentRouteIds.includes(r.id) ? 'bg-system-blue text-white' : 'text-zinc-200 hover:text-zinc-400'}`}
                                        title="Toggle persistent route line"
                                    >
                                        {persistentRouteIds.includes(r.id) ? <Eye size={10} /> : <EyeOff size={10} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
                    {filteredStops.map(stop => (
                        <div key={stop.id} onMouseEnter={() => handleStopHover(stop.id)} onMouseLeave={() => handleStopHover(null)} className={`p-4 hover:bg-zinc-50 cursor-pointer transition-all group flex items-center justify-between ${selectedStop?.id === stop.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => handleSelectStop(stop)}>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-sm text-zinc-900 uppercase tracking-tight truncate mb-1">{stop.name}</div>
                                <div className="flex flex-wrap gap-1">{(stopRouteMap[stop.id] || []).map(r => (<div key={r.id} className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }} />))}</div>
                            </div>
                            <div className="flex gap-1 items-center shrink-0">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    {focusedRouteId && (
                                        <button onClick={(e) => { e.stopPropagation(); toggleStopInRoute(stop, focusedRouteId); }} className={`p-1.5 rounded-lg transition-all shadow-sm ${(stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? 'bg-orange-500 text-white' : 'bg-system-blue text-white'}`}>{(stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? <X size={14} /> : <Plus size={14} />}</button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this stop record permanently?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"><Trash2 size={14} /></button>
                                </div>
                                <ChevronRight size={18} className={`text-zinc-300 ml-2 transition-all ${selectedStop?.id === stop.id ? 'translate-x-1 text-system-blue' : ''}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {selectedStop && (
                <motion.div drag dragMomentum={false} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`absolute top-6 z-[3000] w-[320px] bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`} style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}>
                    <div className="p-4 pb-3 flex items-center justify-between shrink-0 cursor-move border-b border-black/[0.03]">
                        <div className="flex items-center gap-3 flex-1 min-w-0"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500 text-white shadow-lg shrink-0"><MapPin size={16} /></div><div className="min-w-0"><h2 className="text-sm font-black tracking-tight truncate leading-none mb-0.5">{formData.name || 'Unlabeled'}</h2><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate">Stop Details</p></div></div>
                        <div className="flex items-center gap-0.5"><button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-black/5 rounded-full text-zinc-400">{isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}</button><button onClick={() => setSelectedStop(null)} className="p-1.5 hover:bg-black/5 rounded-full text-zinc-400 transition-all hover:rotate-90"><X size={16} /></button></div>
                    </div>
                    {!isCollapsed && (<><div className="px-4 py-2 shrink-0"><div className="bg-black/5 p-1 rounded-lg flex gap-0.5 border border-black/5">{(['info', 'bindings'] as const).map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-tight transition-all ${activeTab === tab ? 'bg-white text-system-blue shadow-sm' : 'text-zinc-400 hover:text-black'}`}>{tab === 'info' ? 'Details' : 'Links'}</button>))}</div></div><div className="flex-1 overflow-y-auto p-4 pt-2 pb-24 custom-scrollbar">{activeTab === 'info' && (<form onSubmit={handleSave} className="space-y-4 animate-in fade-in duration-300"><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Name</label><div className="relative"><input className="hig-input text-[11px] font-bold py-1.5 pr-8" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />{isNaming && <Loader2 size={12} className="animate-spin absolute right-2.5 top-2.5 text-system-blue" />}</div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Lat</label><input type="number" step="any" className="hig-input text-[10px] font-mono py-1.5" value={formData.lat} onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) })} required /></div><div><label className="text-[8px] font-black uppercase mb-1 block text-zinc-400">Lon</label><input type="number" step="any" className="hig-input text-[10px] font-mono py-1.5" value={formData.lon} onChange={e => setFormData({ ...formData, lon: parseFloat(e.target.value) })} required /></div></div><div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-center"><p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">Drag marker on map to move.</p></div>{selectedStop.id !== 0 && (<div className="pt-4 mt-4 border-t border-black/[0.03]"><button type="button" onClick={() => { if (window.confirm('Delete this stop record permanently?')) api.delete(`/stops/${selectedStop.id}`).then(fetchInitialData).then(() => setSelectedStop(null)); }} className="w-full py-2 text-[8px] font-black text-rose-500/60 hover:text-rose-600 uppercase tracking-[0.2em] transition-colors">Delete Record</button></div>)}</form>)}{activeTab === 'bindings' && (<div className="space-y-3 animate-in fade-in duration-300"><div className="flex items-center justify-between mb-1 px-1"><h4 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">One-Click Toggle</h4></div>{selectedStop.id === 0 ? (<div className="p-8 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center gap-3 text-center"><div className="w-12 h-12 rounded-full bg-zinc-200/50 flex items-center justify-center text-zinc-400"><Save size={24} /></div><div><p className="text-[10px] font-black text-zinc-900 uppercase tracking-tight">Save Stop First</p><p className="text-[9px] text-zinc-400 font-bold leading-tight mt-1">You must commit the stop record to the server before managing route links.</p></div></div>) : (<div className="space-y-1.5">{routes.map(r => { const isAssigned = (stopRouteMap[selectedStop.id] || []).some(assigned => assigned.id === r.id); return (<div key={r.id} onMouseEnter={() => handleRouteHighlight(r.id, false)} onMouseLeave={() => handleRouteHighlight(r.id, false)} className={`p-2.5 rounded-xl flex items-center justify-between transition-all border ${isAssigned ? 'border-system-blue bg-system-blue/5 shadow-sm scale-[1.02]' : 'border-black/5 bg-white hover:border-black/10'}`}><div onClick={() => toggleStopInRoute(selectedStop, r.id)} className="flex-1 flex items-center gap-2.5 cursor-pointer"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: `#${r.color}` }} /><span className="font-black text-[10px] text-zinc-900">{r.short_name} &mdash; {r.long_name}</span></div><div className="flex items-center gap-1"><button onClick={(e) => { e.stopPropagation(); setSelectedEntityId(r.id); navigate('/routes'); }} className="p-1 hover:bg-system-blue hover:text-white rounded-md transition-all text-system-blue/40"><Bus size={12} /></button>{isAssigned ? <CheckCircle2 size={14} className="text-system-blue" /> : <Plus size={14} className="text-zinc-200" />}</div></div>); })}</div>)}</div>)}</div><div className="p-4 bg-white/50 backdrop-blur-md border-t border-zinc-100 rounded-b-[1.5rem] flex justify-center"><button onClick={handleSave} disabled={!isDirty} className="px-8 py-2.5 bg-system-blue text-white rounded-full font-black text-[9px] shadow-xl shadow-system-blue/20 flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-30 active:scale-95 tracking-widest uppercase"><Save size={14} /> Commit Changes</button></div></>)}
                </motion.div>
            )}
        </div>
    );
};

export default Stops;