import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Plus, Save, Zap, ChevronRight, Bus, Search, X, Maximize2, Minimize2, Clock, ArrowDownWideNarrow, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Reorder, motion } from 'framer-motion';
import api from '../api';
import { SidebarHeader } from './SidebarHeader';
import { RouteSign } from './RouteSign';
import { Route, Agency, Trip, ShapePoint, TripStop } from '../types';

const RouteStudio: React.FC = () => {
    const { settings, setMapLayers, setStatus, quickMode, setQuickMode, sidebarOpen, setSidebarOpen, selectedEntityId, setSelectedEntityId, setHoveredEntityId, setOnMapClick, setOnShapePointMove, setOnShapePointDelete, setOnShapePointInsert } = useWorkspace();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);

    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [originalRoute, setOriginalRoute] = useState<Route | null>(null);
    const [shapePoints, setShapePoints] = useState<ShapePoint[]>([]);
    const [originalShape, setOriginalShape] = useState<ShapePoint[]>([]);
    const [assignedStops, setAssignedStops] = useState<TripStop[]>([]);
    const [originalAssignedStops, setOriginalAssignedStops] = useState<TripStop[]>([]);

    const [searchQuery, setSearchQuery] = useState('');

    const [activeSection, setActiveSection] = useState<'info' | 'path' | 'sequence' | null>('info');
    const [globalLoading, setGlobalLoading] = useState(true);
    const [autoRoute, setAutoRoute] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [focusType, setFocusType] = useState<'select' | 'hover' | null>(null);
    const [persistentRouteIds, setPersistentRouteIds] = useState<number[]>([]);
    const [persistentRouteShapes, setPersistentRouteShapes] = useState<Record<number, [number, number][]>>({});

    const isDirty = useMemo(() => {
        if (!selectedRoute) return false;
        return JSON.stringify(selectedRoute) !== JSON.stringify(originalRoute) ||
            JSON.stringify(shapePoints) !== JSON.stringify(originalShape) ||
            JSON.stringify(assignedStops) !== JSON.stringify(originalAssignedStops);
    }, [selectedRoute, originalRoute, shapePoints, originalShape, assignedStops, originalAssignedStops]);

    const refreshAllData = useCallback(async () => {
        const [rRes, aRes] = await Promise.all([api.get('/routes'), api.get('/agencies')]);
        setRoutes(rRes.data || []);
        setAgencies(aRes.data || []);
    }, []);

    const refreshData = useCallback(async () => {
        setGlobalLoading(true);
        await refreshAllData();
        setGlobalLoading(false);
    }, [refreshAllData]);

    useEffect(() => { refreshData(); }, [refreshData]);

    useEffect(() => {
        if (isDirty) setStatus({ message: 'Unsaved edits. Save to sync.', type: 'info', isDirty: true });
        else setStatus(null);
    }, [isDirty, setStatus]);

    const timeToSeconds = (t: string) => {
        const segments = t.trim().split(':');
        const nums = segments.map(s => Number(s));
        return nums[0] * 3600 + nums[1] * 60 + (nums[2] || 0);
    };

    const secondsToTime = (s: number) => {
        const h = Math.floor(s / 3600).toString().padStart(2, '0');
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
        const sc = (s % 60).toString().padStart(2, '0');
        return `${h}:${m}:${sc}`;
    };

    const updateFlow = (startIndex: number, newTime: string, type: 'arrival' | 'departure') => {
        const newStops = [...assignedStops];
        const oldTime = type === 'arrival' ? (newStops[startIndex].arrival_time || '08:00:00') : (newStops[startIndex].departure_time || '08:00:00');
        const diff = timeToSeconds(newTime) - timeToSeconds(oldTime);
        for (let i = startIndex; i < newStops.length; i++) {
            const arr = timeToSeconds(newStops[i].arrival_time || '08:00:00') + diff;
            const dep = timeToSeconds(newStops[i].departure_time || '08:00:00') + diff;
            newStops[i] = { ...newStops[i], arrival_time: secondsToTime(arr), departure_time: secondsToTime(dep) };
        }
        setAssignedStops(newStops);
    };

    const setTravelDuration = (index: number, minutes: number) => {
        if (index === 0) return;
        const prevDep = timeToSeconds(assignedStops[index - 1].departure_time || '08:00:00');
        const newArrival = secondsToTime(prevDep + (minutes * 60));
        updateFlow(index, newArrival, 'arrival');
    };

    const handleSelectRoute = async (route: Route) => {
        setQuickMode(null);
        setFocusType('select');
        if (isDirty) await saveChanges(true);
        setSelectedRoute(route);
        setOriginalRoute(route);
        try {
            const tripsRes = await api.get('/trips');
            const trip = (tripsRes.data || []).find((t: Trip) => t.route_id === route.id);
            if (trip) {
                const stopsRes = await api.get(`/trips/${trip.id}/stops`);
                const sData = stopsRes.data || [];
                setAssignedStops(sData);
                setOriginalAssignedStops(sData);
                if (trip.shape_id) {
                    const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                    const points = (shapeRes.data || []).sort((a: any, b: any) => a.sequence - b.sequence);
                    setShapePoints(points);
                    setOriginalShape(points);
                } else { setShapePoints([]); setOriginalShape([]); }
            } else {
                setAssignedStops([]); setOriginalAssignedStops([]);
                setShapePoints([]); setOriginalShape([]);
            }
        } catch (e) {
            setStatus({ message: 'Failed to load route data', type: 'error' });
        }
    };

    const handleAddNew = useCallback(() => {
        if (agencies.length === 0) {
            setStatus({ message: 'Create an operator first.', type: 'error' });
            return;
        }
        setFocusType('select');
        const newRoute = { id: 0, short_name: '', long_name: '', color: '007AFF', agency_id: agencies[0].id || 0 };
        setSelectedRoute(newRoute);
        setOriginalRoute(newRoute);
        setShapePoints([]); setOriginalShape([]);
        setAssignedStops([]); setOriginalAssignedStops([]);
        setActiveSection('info');
    }, [agencies, setStatus]);

    const togglePersistentRoute = useCallback(async (routeId: number) => {
        setPersistentRouteIds(prev => {
            const isRemoving = prev.includes(routeId);
            if (isRemoving) return prev.filter(id => id !== routeId);
            return [...prev, routeId];
        });

        if (!persistentRouteShapes[routeId]) {
            try {
                const tripsRes = await api.get('/trips');
                const routeTrips = (tripsRes.data || []).filter((t: Trip) => t.route_id === routeId);
                if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                    const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                    const poly = (shapeRes.data || []).sort((a: any, b: any) => a.sequence - b.sequence).map((p: any) => [p.lat, p.lon] as [number, number]);
                    setPersistentRouteShapes(prev => ({ ...prev, [routeId]: poly }));
                }
            } catch (e) {
                console.error('Failed to fetch persistent route shape', e);
            }
        }
    }, [persistentRouteShapes]);

    useEffect(() => {
        if (quickMode === 'add-route') handleAddNew();
    }, [quickMode, handleAddNew]);

    useEffect(() => {
        if (selectedEntityId && routes.length > 0) {
            const route = routes.find(r => r.id === selectedEntityId);
            if (route) { handleSelectRoute(route); setSelectedEntityId(null); }
        }
    }, [selectedEntityId, routes, setSelectedEntityId]);

    const saveChanges = useCallback(async (isAuto = false) => {
        if (!selectedRoute) return;
        if (!isAuto) setStatus({ message: 'Saving Changes...', type: 'loading' });
        try {
            let currentRoute = { ...selectedRoute };
            if (currentRoute.id) await api.put(`/routes/${currentRoute.id}`, currentRoute);
            else if (!isAuto) {
                const res = await api.post('/routes', currentRoute);
                currentRoute = res.data;
                setSelectedRoute(currentRoute);
                setOriginalRoute(currentRoute);
            }
            if (currentRoute.id) {
                const rId = currentRoute.id;
                const sId = `SHP_${rId}`;
                await api.put(`/shapes/${sId}`, shapePoints.map(p => ({ ...p, shape_id: sId })));
                const tripsRes = await api.get('/trips');
                const trip = (tripsRes.data || []).find((t: Trip) => t.route_id === rId);
                if (!trip) {
                    const newTrip = await api.post('/trips', { route_id: rId, headsign: currentRoute.long_name, shape_id: sId, service_id: 'DAILY' });
                    const reordered = assignedStops.map((s, i) => ({ ...s, sequence: i + 1, trip_id: newTrip.data.id }));
                    await api.put(`/trips/${newTrip.data.id}/stops`, reordered);
                } else {
                    const reordered = assignedStops.map((s, i) => ({ ...s, sequence: i + 1, trip_id: trip.id }));
                    await api.put(`/trips/${trip.id}/stops`, reordered);
                }
                setOriginalShape(shapePoints);
                setOriginalAssignedStops(assignedStops);
            }
            if (!isAuto) { setStatus({ message: 'Changes committed.', type: 'success' }); setTimeout(() => setStatus(null), 2000); }
            await refreshAllData();
        } catch (e) { setStatus({ message: 'Save failed', type: 'error' }); }
    }, [selectedRoute, shapePoints, assignedStops, refreshAllData, setStatus]);

    useEffect(() => {
        if (!isDirty || !selectedRoute?.id) return;
        const timer = setTimeout(() => saveChanges(true), 2000);
        return () => clearTimeout(timer);
    }, [isDirty, selectedRoute, saveChanges]);

    const handleRouteHoverEffect = useCallback(async (routeId: number | null) => {
        setHoveredEntityId(routeId);
        setFocusType(routeId ? 'hover' : null);

        if (!routeId) {
            setMapLayers(prev => ({ ...prev, previewRoutes: [] }));
            return;
        }

        // Use cache if available
        if (persistentRouteShapes[routeId]) {
            setMapLayers(prev => ({
                ...prev,
                previewRoutes: [{
                    id: routeId,
                    color: routes.find(r => r.id === routeId)?.color || '007AFF',
                    positions: persistentRouteShapes[routeId],
                    isFocused: true
                }]
            }));
            return;
        }

        try {
            const tripsRes = await api.get('/trips');
            const trip = (tripsRes.data || []).find((t: Trip) => t.route_id === routeId);
            if (trip?.shape_id) {
                const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                const poly = (shapeRes.data || []).sort((a: any, b: any) => a.sequence - b.sequence).map((p: any) => [p.lat, p.lon] as [number, number]);

                // Also update cache for future use
                setPersistentRouteShapes(prev => ({ ...prev, [routeId]: poly }));

                setMapLayers(prev => ({
                    ...prev,
                    previewRoutes: [{
                        id: routeId,
                        color: routes.find(r => r.id === routeId)?.color || '007AFF',
                        positions: poly,
                        isFocused: true
                    }]
                }));
            }
        } catch (e) {
            console.error('Hover preview error', e);
        }
    }, [routes, setHoveredEntityId, setMapLayers, persistentRouteShapes]);

    const fetchOSRMRoute = async (points: [number, number][]) => {
        if (points.length < 2) return [];
        const coords = points.map(p => `${p[1]},${p[0]}`).join(';');
        try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.code !== 'Ok') return [];
            return data.routes[0].geometry.coordinates.map((c: any) => ({ lat: c[1], lon: c[0] }));
        } catch (e) {
            console.error('OSRM Fetch Error:', e);
            return [];
        }
    };

    const handleSnapAnchors = async () => {
        if (assignedStops.length < 2) return;
        setStatus({ message: 'Snapping to stops...', type: 'loading' });
        const stopPoints = assignedStops.map(s => [s.stop?.lat || 0, s.stop?.lon || 0] as [number, number]);
        const routePoints = await fetchOSRMRoute(stopPoints);
        if (routePoints.length > 0) {
            setShapePoints(routePoints.map((p: { lat: number, lon: number }, i: number) => ({ shape_id: `SHP_${selectedRoute?.id}`, ...p, sequence: i + 1 })));
            setStatus({ message: 'Snapped successfully.', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
        } else {
            setStatus({ message: 'Snapping failed.', type: 'error' });
        }
    };

    useEffect(() => {
        if (!selectedRoute) {
            setOnMapClick(null);
            return;
        }
        const sId = `SHP_${selectedRoute.id}`;
        const handleMapClick = async (latlng: { lat: number, lng: number }) => {
            if (activeSection !== 'path') setActiveSection('path');
            if (quickMode === 'add-route') setQuickMode(null);

            let newPoints: ShapePoint[] = [];
            if (autoRoute && shapePoints.length > 0) {
                setStatus({ message: 'Snapping...', type: 'loading' });
                const lastPoint = shapePoints[shapePoints.length - 1];
                const snapped = await fetchOSRMRoute([[lastPoint.lat, lastPoint.lon], [latlng.lat, latlng.lng]]);
                if (snapped.length > 0) {
                    // Avoid duplicating the start point
                    newPoints = snapped.slice(1).map((p: { lat: number, lon: number }, i: number) => ({ shape_id: sId, ...p, sequence: shapePoints.length + i + 1 }));
                } else {
                    newPoints = [{ shape_id: sId, lat: latlng.lat, lon: latlng.lng, sequence: shapePoints.length + 1 }];
                }
                setStatus(null);
            } else {
                newPoints = [{ shape_id: sId, lat: latlng.lat, lon: latlng.lng, sequence: shapePoints.length + 1 }];
            }

            setShapePoints(prev => [...prev, ...newPoints]);
        };
        setOnMapClick(handleMapClick);
        return () => setOnMapClick(null);
    }, [selectedRoute, activeSection, shapePoints, quickMode, autoRoute, setQuickMode, setOnMapClick, setStatus]);

    useEffect(() => {
        const pRoutes = persistentRouteIds
            .filter(id => !selectedRoute || id !== selectedRoute.id) // Avoid duplicate layer for selected route
            .map(id => ({
                id, color: routes.find(r => r.id === id)?.color || '007AFF',
                positions: persistentRouteShapes[id] || [], isFocused: false
            })).filter(pr => pr.positions.length > 0);

        setMapLayers(prev => ({
            ...prev,
            routes: [...(selectedRoute ? [{ id: selectedRoute.id, color: selectedRoute.color, positions: shapePoints.map(p => [p.lat, p.lon] as [number, number]), isFocused: true }] : []), ...pRoutes],
            stops: assignedStops.map(rs => ({ ...(rs.stop || { id: rs.stop_id, name: 'Unknown', lat: 0, lon: 0 }), hidePopup: false })),
            activeShape: activeSection === 'path' ? shapePoints : [],
            focusedPoints: shapePoints.length > 0 ? shapePoints.map(p => [p.lat, p.lon] as [number, number]) : [],
            activeStop: null, focusType
        }));
    }, [selectedRoute, shapePoints, assignedStops, activeSection, focusType, persistentRouteIds, persistentRouteShapes, routes, setMapLayers]);

    useEffect(() => {
        if (!selectedRoute || activeSection !== 'path') {
            setOnShapePointMove(undefined);
            setOnShapePointDelete(undefined);
            setOnShapePointInsert(undefined);
            return;
        }

        const handleMove = (index: number, latlng: { lat: number, lng: number }) => {
            setShapePoints(prev => {
                const next = [...prev];
                next[index] = { ...next[index], lat: latlng.lat, lon: latlng.lng };
                return next;
            });
        };

        const handleDelete = (index: number) => {
            setShapePoints(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, sequence: i + 1 })));
        };

        const handleInsert = (index: number, latlng: { lat: number, lng: number }) => {
            setShapePoints(prev => {
                const next = [...prev];
                next.splice(index, 0, { shape_id: `SHP_${selectedRoute.id}`, lat: latlng.lat, lon: latlng.lng, sequence: 0 });
                return next.map((p, i) => ({ ...p, sequence: i + 1 }));
            });
        };

        setOnShapePointMove(handleMove);
        setOnShapePointDelete(handleDelete);
        setOnShapePointInsert(handleInsert);

        return () => {
            setOnShapePointMove(undefined);
            setOnShapePointDelete(undefined);
            setOnShapePointInsert(undefined);
        };
    }, [selectedRoute, activeSection, setOnShapePointMove, setOnShapePointDelete, setOnShapePointInsert]);

    const filteredRoutes = routes.filter((r: Route) => r.long_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.short_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (globalLoading) return <div className="flex h-screen items-center justify-center font-bold text-zinc-400 dark:text-zinc-600 animate-pulse flex-col gap-4">LOADING STUDIO...</div>;

    return (
        <div className="absolute inset-0 flex overflow-visible pointer-events-none font-bold">
            <motion.div initial={false} animate={{ x: sidebarOpen ? 0 : -320 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex flex-col h-full bg-white dark:bg-zinc-950 relative z-20 overflow-hidden text-black dark:text-white border-r border-zinc-200 dark:border-zinc-800 pointer-events-auto shadow-none" style={{ width: 320 }}>
                <SidebarHeader title="Routes" Icon={Bus} onToggleSidebar={() => setSidebarOpen(false)} actions={<button onClick={handleAddNew} disabled={agencies.length === 0} className={`p-1.5 rounded-sm transition-colors ${agencies.length === 0 ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-blue-50 dark:bg-zinc-900 text-blue-600 hover:bg-blue-100 dark:hover:bg-zinc-800'}`}>{agencies.length === 0 ? <AlertCircle size={18} /> : <Plus size={18} />}</button>} />
                <div className="p-4 px-6 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
                    <div className="relative"><Search size={14} className="hig-input-icon" /><input className="hig-input pl-8" placeholder="Search routes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800">
                    {filteredRoutes.map(r => (
                        <div key={r.id} onMouseEnter={() => handleRouteHoverEffect(r.id)} onMouseLeave={() => handleRouteHoverEffect(null)} onClick={() => handleSelectRoute(r)} className={`p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors duration-75 flex items-center gap-3 group ${selectedRoute?.id === r.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''}`}>
                            <RouteSign key={settings['global_sign_style']} route={r} size="md" />
                            <div className="flex-1 min-w-0"><div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">{r.long_name}</div><div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">Line #{r.id}</div></div>
                            <div className={`flex items-center gap-1 transition-all ${persistentRouteIds.includes(r.id) || selectedRoute?.id === r.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <button onClick={(e) => { e.stopPropagation(); togglePersistentRoute(r.id); }} className={`p-1.5 rounded-sm transition-all ${persistentRouteIds.includes(r.id) || selectedRoute?.id === r.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'text-zinc-300 hover:text-zinc-600'}`}>
                                    {persistentRouteIds.includes(r.id) || selectedRoute?.id === r.id ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <ChevronRight size={14} className={`text-zinc-300 ml-1 transition-all duration-75 ${selectedRoute?.id === r.id ? 'translate-x-1 text-blue-600' : ''}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {selectedRoute && (
                <motion.div drag dragMomentum={false} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`absolute top-6 z-[3000] w-[320px] bg-white dark:bg-zinc-950 rounded-sm shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`} style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}>
                    <div className="p-3 flex items-center justify-between shrink-0 cursor-move border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0"><div className="w-7 h-7 rounded-sm flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shrink-0 shadow-none"><Bus size={14} /></div><div className="min-w-0"><h2 className="text-xs font-bold tracking-tight truncate leading-none mb-0.5 dark:text-zinc-100">{selectedRoute.short_name || 'New Route'}</h2><p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate">Flow Designer</p></div></div>
                        <div className="flex items-center gap-0.5"><button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-sm text-zinc-400">{isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}</button><button onClick={() => setSelectedRoute(null)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-sm text-zinc-400 transition-all hover:rotate-90"><X size={16} /></button></div>
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="px-4 py-2 shrink-0 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950"><div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-sm flex gap-0.5 border border-zinc-200 dark:border-zinc-800">{(['info', 'path', 'sequence'] as const).map((tab) => (<button key={tab} onClick={() => setActiveSection(tab)} className={`flex-1 py-1.5 rounded-sm text-[9px] font-bold uppercase transition-all duration-75 ${activeSection === tab ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-blue-600' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}>{tab === 'info' ? 'Details' : tab === 'path' ? 'Path' : 'Stops'}</button>))}</div></div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-zinc-950">
                                {activeSection === 'sequence' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="p-3 bg-zinc-900 dark:bg-zinc-800 text-white rounded-sm border border-zinc-800 dark:border-zinc-700 flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/10 rounded-sm"><Clock size={14} /></div>
                                                <div><div className="text-[8px] font-bold uppercase opacity-40 leading-none mb-1">Departure</div><input type="time" step="1" className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 outline-none w-full" value={assignedStops[0]?.departure_time || '08:00:00'} onChange={(e) => updateFlow(0, e.target.value, 'departure')} /></div>
                                            </div>
                                            <ArrowDownWideNarrow size={16} className="opacity-20" />
                                        </div>
                                        <div className="space-y-1">
                                            <Reorder.Group axis="y" values={assignedStops} onReorder={(newOrder) => { setAssignedStops(newOrder); }}>
                                                {assignedStops.map((rs, i) => {
                                                    const prevDep = i > 0 ? timeToSeconds(assignedStops[i - 1].departure_time || '08:00:00') : null;
                                                    const currentArr = timeToSeconds(rs.arrival_time || '08:00:00');
                                                    const travelDur = prevDep !== null ? Math.floor((currentArr - prevDep) / 60) : 0;
                                                    return (
                                                        <React.Fragment key={rs.stop_id}>
                                                            {i > 0 && (<div className="flex items-center gap-2 pl-8 py-1"><div className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" /><div className="flex items-center gap-1.5"><span className="text-[7px] font-bold text-zinc-300 dark:text-zinc-600 uppercase">Travel:</span><input type="number" min="1" className="w-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-sm p-0.5 text-[9px] font-bold text-blue-600 text-center" value={travelDur} onChange={(e) => setTravelDuration(i, parseInt(e.target.value) || 1)} /><span className="text-[7px] font-bold text-zinc-300 dark:text-zinc-600 uppercase">min</span></div></div>)}
                                                            <Reorder.Item value={rs} className="flex flex-col gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-sm cursor-grab active:cursor-grabbing hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                                                                <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-4 h-4 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[7px] font-bold text-zinc-400">{i + 1}</div><div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase truncate w-28">{rs.stop?.name}</div></div><div className="flex flex-col items-end"><input type="time" step="1" className="bg-transparent border-none p-0 text-[10px] font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:ring-0 outline-none text-right w-20" value={rs.arrival_time || '08:00:00'} onChange={(e) => updateFlow(i, e.target.value, 'arrival')} /></div></div>
                                                            </Reorder.Item>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </Reorder.Group>
                                        </div>
                                    </div>
                                )}
                                {activeSection === 'info' && (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 block">Operator</label><select className="hig-input" value={selectedRoute.agency_id} onChange={e => { setSelectedRoute({ ...selectedRoute, agency_id: parseInt(e.target.value) }); }}>{agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                                            <div><label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 block">Type</label><select className="hig-input" value={selectedRoute.route_type} onChange={e => { setSelectedRoute({ ...selectedRoute, route_type: parseInt(e.target.value) }); }}><option value={3}>Bus</option><option value={0}>Tram</option><option value={1}>Subway</option></select></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 block">Short Name</label><input className="hig-input uppercase" value={selectedRoute.short_name} onChange={e => { setSelectedRoute({ ...selectedRoute, short_name: e.target.value }); }} /></div>
                                            <div><label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 block">Color</label><div className="flex gap-1.5 items-center"><input type="color" className="w-6 h-6 rounded-sm cursor-pointer bg-transparent border border-zinc-200 dark:border-zinc-800 p-0" value={`#${(selectedRoute.color || '007AFF').replace('#', '')}`} onChange={e => { setSelectedRoute({ ...selectedRoute, color: e.target.value.replace('#', '') }); }} /><input className="hig-input font-mono h-6" value={selectedRoute.color} onChange={e => { setSelectedRoute({ ...selectedRoute, color: e.target.value.replace('#', '') }); }} /></div></div>
                                        </div>
                                        <div><label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 block">Public Name</label><input className="hig-input" value={selectedRoute.long_name} onChange={e => { setSelectedRoute({ ...selectedRoute, long_name: e.target.value }); }} /></div>
                                        {selectedRoute.id !== 0 && (<div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800"><button type="button" onClick={() => { if (window.confirm('Delete route?')) api.delete(`/routes/${selectedRoute.id}`).then(() => { refreshData(); setSelectedRoute(null); }); }} className="w-full py-2 text-[8px] font-bold text-rose-500/60 hover:text-rose-600 uppercase tracking-[0.2em] transition-colors">Delete Record</button></div>)}
                                    </div>
                                )}
                                {activeSection === 'path' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-sm border border-zinc-100 dark:border-zinc-800"><div className="flex items-center gap-2"><Zap size={12} className={autoRoute ? "text-blue-600" : "text-zinc-400"} /><span className="text-[9px] font-bold uppercase tracking-tight">Auto-snap to roads</span></div><button onClick={() => setAutoRoute(!autoRoute)} className={`w-8 h-4 rounded-full transition-all relative ${autoRoute ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoRoute ? 'left-4.5' : 'left-0.5'}`} /></button></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setShapePoints([])} className="py-2.5 bg-rose-600 text-white rounded-sm font-bold text-[9px] uppercase">Clear Path</button>
                                            <button onClick={handleSnapAnchors} className="py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-sm font-bold text-[9px] uppercase">Snap to Stops</button>
                                        </div>
                                        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-sm border border-zinc-100 dark:border-zinc-800"><p className="text-[9px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-bold italic text-center">Click map to add stops. Drag to move. Right-click to remove.</p></div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 sticky bottom-0 flex justify-center"><button onClick={() => saveChanges()} disabled={!isDirty} className="w-full py-2 bg-blue-600 text-white rounded-sm font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all duration-75 disabled:opacity-30 active:scale-95 tracking-widest uppercase shadow-none"><Save size={14} /> Commit Changes</button></div>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default RouteStudio;