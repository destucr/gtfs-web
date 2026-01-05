import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { MapPin, Plus, Trash2, Search, Loader2, ChevronRight, X, Maximize2, Minimize2, Save, Eye, EyeOff, ArrowDownAz, Clock, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';
import { SidebarHeader } from './SidebarHeader';
import { Route, Stop, TripStop, Trip, ShapePoint } from '../types';
import UnifiedMap from './UnifiedMap';

const Stops: React.FC = () => {
    const { setMapLayers, setOnMapClick, setStatus, quickMode, setQuickMode, sidebarOpen, setSidebarOpen, selectedEntityId, setSelectedEntityId, setHoveredEntityId, hoveredEntityId } = useWorkspace();

    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [stopRouteMap, setStopRouteMap] = useState<Record<number, Route[]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'newest' | 'routes'>('name');

    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [formData, setFormData] = useState<Stop>({ id: 0, name: '', lat: 0, lon: 0 });
    const [originalData, setOriginalData] = useState<Stop | null>(null);

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
        } catch (e) { 
            setStatus({ message: 'Sync failed', type: 'error' }); 
            setTimeout(() => setStatus(null), 3000);
        }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // Auto-load all routes in demo mode
    useEffect(() => {
        if (import.meta.env.VITE_DEMO_MODE !== 'true' || routes.length === 0) return;

        const loadAllRoutes = async () => {
            console.log('🚀 [Demo Mode] Loading all routes for Stops page...');
            try {
                const tripsRes: { data: Trip[] } = await api.get('/trips');
                const trips = tripsRes.data || [];
                console.log(`📦 [Demo Mode] Found ${trips.length} trips`);
                
                // Get unique route IDs that have trips with shapes
                const routeIdsWithShapes = new Set<number>();
                const shapeIdToRouteId = new Map<string, number>();
                
                trips.forEach((trip: Trip) => {
                    if (trip.route_id && trip.shape_id) {
                        routeIdsWithShapes.add(trip.route_id);
                        shapeIdToRouteId.set(trip.shape_id, trip.route_id);
                    }
                });

                console.log(`🗺️ [Demo Mode] Found ${routeIdsWithShapes.size} routes with shapes`);

                // Set all routes as persistent first (so they show up even while loading)
                setPersistentRouteIds(Array.from(routeIdsWithShapes));

                // Use bulk API to load all shapes at once (more efficient)
                const shapeIds = Array.from(shapeIdToRouteId.keys());
                if (shapeIds.length > 0) {
                    try {
                        console.log(`📥 [Demo Mode] Loading ${shapeIds.length} shapes in bulk...`);
                        const bulkRes = await api.post('/shapes/bulk', shapeIds);
                        const bulkData: Record<string, ShapePoint[]> = bulkRes.data || {};
                        
                        // Map shapes to routes
                        const newShapes: Record<number, [number, number][]> = {};
                        Object.keys(bulkData).forEach(shapeId => {
                            const routeId = shapeIdToRouteId.get(shapeId);
                            if (routeId) {
                                const points = bulkData[shapeId].sort((a, b) => a.sequence - b.sequence);
                                newShapes[routeId] = points.map(p => [p.lat, p.lon] as [number, number]);
                            }
                        });
                        
                        console.log(`✅ [Demo Mode] Loaded ${Object.keys(newShapes).length} route shapes`);
                        setRouteShapes(prev => ({ ...prev, ...newShapes }));
                    } catch (e) {
                        console.error('❌ [Demo Mode] Failed to load shapes in bulk:', e);
                    }
                }
            } catch (e) {
                console.error('❌ [Demo Mode] Failed to load routes:', e);
            }
        };

        loadAllRoutes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routes.length]); // Only depend on routes.length to avoid infinite loops

    const handleRouteHighlight = useCallback(async (routeId: number, isPersistent: boolean) => {
        if (!isPersistent) {
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
    }, [routeShapes, setRouteShapes]);

    const handleSelectStop = useCallback(async (stop: Stop) => {
        if (selectedStop?.id === stop.id) {
            if (isDirty && !window.confirm('Unsaved changes will be lost. Unselect?')) return;
            setSelectedStop(null);
            setFormData({ id: 0, name: '', lat: 0, lon: 0 });
            setOriginalData(null);
            setFocusType(null);
            setSelectedStopRouteIds([]);
            return;
        }
        setQuickMode(null);
        setSelectedStop(stop);
        setFormData({ ...stop });
        setOriginalData({ ...stop });
        setActiveTab('info');
        setFocusType('select');

        const routesForStop = stopRouteMap[stop.id] || [];
        setSelectedStopRouteIds(routesForStop.map(r => r.id));
        await Promise.all(routesForStop.map(r => handleRouteHighlight(r.id, true)));
    }, [stopRouteMap, setQuickMode, handleRouteHighlight, selectedStop, isDirty]);

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
        else setStatus(null);
    }, [isDirty, setStatus]);

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
        } catch (err) { 
            setStatus({ message: 'Save failed.', type: 'error' }); 
            setTimeout(() => setStatus(null), 3000);
        }
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
            } catch (e) { }
        }
    };

    useEffect(() => {
        const hoveredStop = stops.find(s => s.id === hoveredEntityId);
        const allRouteIds = [...new Set([...selectedStopRouteIds, ...persistentRouteIds])];
        const routeLayers = allRouteIds.map(rid => ({
            id: rid, color: routes.find(r => r.id === rid)?.color || '007AFF',
            positions: routeShapes[rid] || [], isFocused: true
        })).filter(r => r.positions.length > 0);

        if (import.meta.env.VITE_DEMO_MODE === 'true' && routeLayers.length > 0) {
            console.log(`🗺️ [Stops] Setting ${routeLayers.length} routes on map`);
        }

        setMapLayers(prev => ({
            ...prev,
            routes: routeLayers,
            stops: stops.map(s => ({
                ...s, isSmall: true, hidePopup: false,
                isCustom: s.id === hoveredEntityId,
                icon: s.id === hoveredEntityId ? L.divIcon({
                    className: '',
                    html: `<div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
                            <div style="position: absolute; width: 24px; height: 24px; background-color: rgba(249,115,22,0.3); border-radius: 9999px; animation: leaflet-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="width: 10px; height: 10px; background-color: #F97316; border: 1px solid white; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); position: relative; z-index: 10;"></div>
                        </div>`,
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
            <div className="absolute inset-0 z-0 pointer-events-auto">
                <UnifiedMap />
            </div>
            <motion.div initial={false} animate={{ x: sidebarOpen ? 0 : -320 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex flex-col h-full bg-white dark:bg-zinc-950 relative z-20 overflow-hidden text-black dark:text-white border-r border-zinc-200 dark:border-zinc-800 pointer-events-auto shadow-none" style={{ width: 320 }}>
                <SidebarHeader title="Stops" Icon={MapPin} onToggleSidebar={() => setSidebarOpen(false)} actions={<button onClick={handleAddNew} className="p-1.5 bg-blue-50 dark:bg-zinc-900 text-blue-600 rounded-sm hover:bg-blue-100 dark:hover:bg-zinc-800 transition-colors" title="Add Stop"><Plus size={18} /></button>} />
                <div className="p-4 px-6 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
                    <div className="flex flex-col gap-3 mb-4">
                        <div className="relative w-full">
                            <Search size={14} className="hig-input-icon" />
                            <input className="hig-input pl-8" placeholder="Search stops..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex bg-zinc-50 dark:bg-zinc-900 p-1 rounded-sm border border-zinc-200 dark:border-zinc-800 gap-0.5">
                            {(['name', 'newest', 'routes'] as const).map((mode) => (
                                <button key={mode} onClick={() => setSortBy(mode)} className={`flex-1 flex justify-center py-1 rounded-sm transition-all duration-75 ${sortBy === mode ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}>
                                    {mode === 'name' && <ArrowDownAz size={14} />}
                                    {mode === 'newest' && <Clock size={14} />}
                                    {mode === 'routes' && <Share2 size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1"><h3 className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Link to Route</h3>{focusedRouteId && <button onClick={() => setFocusedRouteId(null)} className="text-[8px] font-bold text-rose-500 hover:underline uppercase">Clear</button>}</div>
                        <div className="flex flex-wrap gap-1.5">
                            {routes.map(r => (
                                <div key={r.id} className="flex items-center bg-white dark:bg-zinc-900 rounded-sm border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors duration-75 overflow-hidden">
                                    <button onClick={() => { if (focusedRouteId === r.id) setFocusedRouteId(null); else setFocusedRouteId(r.id); }} className={`px-2.5 py-1 text-[9px] font-bold transition-all ${focusedRouteId === r.id ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>{r.short_name}</button>
                                    <button onClick={() => togglePersistentRoute(r.id)} className={`p-1 border-l border-zinc-100 dark:border-zinc-800 transition-all ${persistentRouteIds.includes(r.id) ? 'bg-blue-600 text-white' : 'text-zinc-200 dark:text-zinc-700 hover:text-zinc-400'}`}>{persistentRouteIds.includes(r.id) ? <Eye size={10} /> : <EyeOff size={10} />}</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800">
                    {filteredStops.map(stop => (
                        <div key={stop.id} onMouseEnter={() => handleStopHover(stop.id)} onMouseLeave={() => handleStopHover(null)} className={`p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors duration-75 group flex items-center justify-between ${selectedStop?.id === stop.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''}`} onClick={() => handleSelectStop(stop)}>
                            <div className="flex-1 min-w-0"><div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate mb-1">{stop.name}</div><div className="flex flex-wrap gap-1">{(stopRouteMap[stop.id] || []).map(r => (<div key={r.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `#${r.color}` }} />))}</div></div>
                            <div className="flex gap-1 items-center shrink-0">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-75">
                                    {focusedRouteId && (<button onClick={(e) => { e.stopPropagation(); toggleStopInRoute(stop, focusedRouteId); }} className={`p-1.5 rounded-sm transition-colors duration-75 ${(stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>{(stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? <X size={14} /> : <Plus size={14} />}</button>)}
                                    <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete stop?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-sm transition-all"><Trash2 size={14} /></button>
                                </div>
                                <ChevronRight size={18} className={`text-zinc-300 ml-2 transition-all duration-75 ${selectedStop?.id === stop.id ? 'translate-x-1 text-blue-600' : ''}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {selectedStop && (
                <motion.div drag dragMomentum={false} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`absolute top-6 z-[3000] w-[320px] bg-white dark:bg-zinc-950 rounded-sm shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`} style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}>
                    <div className="p-3 flex items-center justify-between shrink-0 cursor-move border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0"><div className="w-7 h-7 rounded-sm flex items-center justify-center bg-orange-500 text-white shrink-0"><MapPin size={14} /></div><div className="min-w-0"><h2 className="text-xs font-bold tracking-tight truncate leading-none mb-0.5 dark:text-zinc-100">{formData.name || 'New Stop'}</h2><p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate">Stop Details</p></div></div>
                        <div className="flex items-center gap-0.5"><button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-sm text-zinc-400">{isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}</button><button onClick={() => setSelectedStop(null)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-sm text-zinc-400 transition-all hover:rotate-90"><X size={16} /></button></div>
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="px-4 py-2 shrink-0 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                <div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-sm flex gap-0.5 border border-zinc-200 dark:border-zinc-800">
                                    {(['info', 'bindings'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex-1 py-1.5 rounded-sm text-[9px] font-bold uppercase transition-all duration-75 ${activeTab === tab ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-blue-600' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
                                        >
                                            {tab === 'info' ? 'Details' : 'Links'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-zinc-950">
                                {activeTab === 'info' && (
                                    <form onSubmit={handleSave} className="space-y-4 animate-in fade-in duration-300">
                                        <div>
                                            <label className="text-[8px] font-bold uppercase mb-1 block text-zinc-400 dark:text-zinc-500">Name</label>
                                            <div className="relative">
                                                <input className="hig-input pr-8" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                                {isNaming && <Loader2 size={12} className="animate-spin absolute right-2 top-2 text-blue-600" />}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[8px] font-bold uppercase mb-1 block text-zinc-400 dark:text-zinc-500">Lat</label>
                                                <input type="number" step="any" className="hig-input font-mono" value={formData.lat} onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) })} required />
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-bold uppercase mb-1 block text-zinc-400 dark:text-zinc-500">Lon</label>
                                                <input type="number" step="any" className="hig-input font-mono" value={formData.lon} onChange={e => setFormData({ ...formData, lon: parseFloat(e.target.value) })} required />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-sm border border-zinc-100 dark:border-zinc-800 text-center">
                                            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-tight">Drag marker on map to move.</p>
                                        </div>
                                        {selectedStop.id !== 0 && (
                                            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                                                <button type="button" onClick={() => { if (window.confirm('Delete record?')) api.delete(`/stops/${selectedStop.id}`).then(() => { fetchInitialData(); setSelectedStop(null); }); }} className="w-full py-2 text-[8px] font-bold text-rose-500/60 hover:text-rose-600 uppercase tracking-[0.2em] transition-colors">Delete Record</button>
                                            </div>
                                        )}
                                    </form>
                                )}
                                {activeTab === 'bindings' && (
                                    <div className="space-y-2 animate-in fade-in duration-300">
                                        <div className="px-1 mb-2">
                                            <h3 className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Select routes to link</h3>
                                        </div>
                                        {selectedStop.id === 0 ? (
                                            <div className="p-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-sm">
                                                <p className="text-[10px] text-zinc-400 font-bold uppercase">Save stop first to link routes</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {routes.map(route => {
                                                    const isLinked = (stopRouteMap[selectedStop.id] || []).some(r => r.id === route.id);
                                                    return (
                                                        <div
                                                            key={route.id}
                                                            onClick={() => toggleStopInRoute(selectedStop, route.id)}
                                                            className={`p-2 flex items-center justify-between rounded-sm border transition-all cursor-pointer ${isLinked ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[10px] text-white" style={{ backgroundColor: `#${route.color}` }}>
                                                                    {route.short_name}
                                                                </div>
                                                                <div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate w-32">
                                                                    {route.long_name}
                                                                </div>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${isLinked ? 'bg-blue-600 border-blue-600' : 'border-zinc-200 dark:border-zinc-800'}`}>
                                                                {isLinked && <Plus size={10} className="text-white rotate-45" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 sticky bottom-0 flex justify-center shadow-none">
                                <button onClick={() => handleSave()} disabled={!isDirty || activeTab === 'bindings'} className="w-full py-2 bg-blue-600 text-white rounded-sm font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all duration-75 disabled:opacity-30 active:scale-95 tracking-widest uppercase shadow-none">
                                    <Save size={14} /> Sync Stop
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default Stops;