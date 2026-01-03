import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Plus, Save, Zap, ChevronRight, Bus, Loader2, Search, X, Maximize2, Minimize2, Clock, ArrowDownWideNarrow } from 'lucide-react';
import { Reorder, motion } from 'framer-motion';
import api from '../api';
import axios from 'axios';
import { SidebarHeader } from './SidebarHeader';
import { Route, Agency, Trip, ShapePoint, RouteStop } from '../types';

const RouteStudio: React.FC = () => {
    const { setMapLayers, setStatus, quickMode, setQuickMode, sidebarOpen, selectedEntityId, setSelectedEntityId, setHoveredEntityId } = useWorkspace();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    
    // Editor State
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [originalRoute, setOriginalRoute] = useState<Route | null>(null);
    const [shapePoints, setShapePoints] = useState<ShapePoint[]>([]);
    const [originalShape, setOriginalShape] = useState<ShapePoint[]>([]);
    const [assignedStops, setAssignedStops] = useState<RouteStop[]>([]);
    const [originalAssignedStops, setOriginalAssignedStops] = useState<RouteStop[]>([]);
    
    const [history, setHistory] = useState<ShapePoint[][]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // UI Logic
    const [activeSection, setActiveSection] = useState<'info' | 'path' | 'sequence' | null>('info');
    const [globalLoading, setGlobalLoading] = useState(true);
    const [autoRoute, setAutoRoute] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [focusType, setFocusType] = useState<'select' | 'hover' | null>(null);

    const isDirty = useMemo(() => {
        if (!selectedRoute) return false;
        return JSON.stringify(selectedRoute) !== JSON.stringify(originalRoute) ||
               JSON.stringify(shapePoints) !== JSON.stringify(originalShape) ||
               JSON.stringify(assignedStops) !== JSON.stringify(originalAssignedStops);
    }, [selectedRoute, originalRoute, shapePoints, originalShape, assignedStops, originalAssignedStops]);

    const refreshAllData = useCallback(async () => {
        const [rRes, aRes] = await Promise.all([
            api.get('/routes'), api.get('/agencies')
        ]);
        setRoutes(rRes.data || []);
        setAgencies(aRes.data || []);
    }, []);

    const refreshData = useCallback(async () => {
        setGlobalLoading(true);
        await refreshAllData();
        setGlobalLoading(false);
    }, [refreshAllData]);

    useEffect(() => { refreshData(); }, [refreshData]);

    // Sync isDirty to Global Status
    useEffect(() => {
        if (isDirty) setStatus({ message: 'Unsaved local edits. Save to sync.', type: 'info', isDirty: true });
        else if (selectedRoute) setStatus({ message: 'All changes saved to server.', type: 'info', isDirty: false });
        else setStatus(null);
    }, [isDirty, selectedRoute, setStatus]);

    // --- Timing Engine ---
    const timeToSeconds = (t: string) => {
        const [h, m, s] = t.split(':').map(Number);
        return h * 3600 + m * 60 + (s || 0);
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

    const setDwellTime = (index: number, minutes: number) => {
        const newStops = [...assignedStops];
        const arr = timeToSeconds(newStops[index].arrival_time || '08:00:00');
        const newDep = secondsToTime(arr + (minutes * 60));
        const diff = (minutes * 60) - (timeToSeconds(newStops[index].departure_time || '08:00:00') - arr);
        newStops[index] = { ...newStops[index], departure_time: newDep };
        for (let i = index + 1; i < newStops.length; i++) {
            const sArr = timeToSeconds(newStops[i].arrival_time || '08:00:00') + diff;
            const sDep = timeToSeconds(newStops[i].departure_time || '08:00:00') + diff;
            newStops[i] = { ...newStops[i], arrival_time: secondsToTime(sArr), departure_time: secondsToTime(sDep) };
        }
        setAssignedStops(newStops);
    };

    const setTravelDuration = (index: number, minutes: number) => {
        if (index === 0) return;
        const prevDep = timeToSeconds(assignedStops[index-1].departure_time || '08:00:00');
        const newArrival = secondsToTime(prevDep + (minutes * 60));
        updateFlow(index, newArrival, 'arrival');
    };

    // --- GIS Actions ---
    const pushToHistory = useCallback((newPoints: ShapePoint[]) => {
        setHistory(prev => [...prev.slice(-19), shapePoints]);
        setShapePoints(newPoints);
    }, [shapePoints]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        setShapePoints(lastState);
        setHistory(prev => prev.slice(0, -1));
    }, [history]);

    const handleSelectRoute = async (route: Route) => {
        setQuickMode(null);
        setFocusType('select');
        if (isDirty) await saveChanges(true);
        setSelectedRoute(route);
        setOriginalRoute(route);
        try {
            const [tripsRes, stopsRes] = await Promise.all([api.get('/trips'), api.get(`/routes/${route.id}/stops`)]);
            const sData = stopsRes.data || [];
            setAssignedStops(sData);
            setOriginalAssignedStops(sData);
            const trip: Trip | undefined = tripsRes.data.find((t: Trip) => t.route_id === route.id);
            if (trip?.shape_id) {
                const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                const points = (shapeRes.data || []).sort((a: any, b: any) => a.sequence - b.sequence);
                setShapePoints(points);
                setOriginalShape(points);
            } else { setShapePoints([]); setOriginalShape([]); }
        } catch (e) {}
    };

    const handleAddNew = useCallback(() => {
        setQuickMode(null);
        setFocusType('select');
        const newRoute = { id: 0, short_name: '', long_name: '', color: '007AFF', agency_id: agencies[0]?.id || 0 };
        setSelectedRoute(newRoute);
        setOriginalRoute(newRoute);
        setShapePoints([]); setOriginalShape([]);
        setAssignedStops([]); setOriginalAssignedStops([]);
        setActiveSection('info');
    }, [agencies, setQuickMode]);

    useEffect(() => {
        if (quickMode === 'add-route' && !selectedRoute) handleAddNew();
    }, [quickMode, selectedRoute, handleAddNew]);

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
            if (selectedRoute.id) await api.put(`/routes/${selectedRoute.id}`, selectedRoute);
            else if (!isAuto) {
                const res = await api.post('/routes', selectedRoute);
                setSelectedRoute(res.data);
                setOriginalRoute(res.data);
            }
            if (selectedRoute.id || !isAuto) {
                const rId = selectedRoute.id || 0;
                const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${rId}`;
                await api.put(`/shapes/${sId}`, shapePoints.map(p => ({ ...p, shape_id: sId })));
                const trips: { data: Trip[] } = await api.get('/trips');
                if (!trips.data.find(t => t.route_id === rId)) await api.post('/trips', { route_id: rId, headsign: selectedRoute.long_name, shape_id: sId, service_id: 'DAILY' });
                setOriginalShape(shapePoints);
            }
            if (selectedRoute.id) {
                const reordered = assignedStops.map((s, i) => ({ ...s, sequence: i + 1 }));
                await api.put(`/routes/${selectedRoute.id}/stops`, reordered);
                setOriginalAssignedStops(assignedStops);
            }
            if (!isAuto) { setStatus({ message: 'Saved successfully', type: 'success' }); setTimeout(() => setStatus(null), 2000); }
            await refreshAllData();
        } catch (e) { setStatus({ message: 'Save failed', type: 'error' }); }
    }, [selectedRoute, shapePoints, assignedStops, refreshAllData, setStatus]);

    // Auto-save
    useEffect(() => {
        if (!isDirty || !selectedRoute?.id) return;
        const timer = setTimeout(() => saveChanges(true), 2000);
        return () => clearTimeout(timer);
    }, [isDirty, selectedRoute, saveChanges]);

    const handleRouteHoverEffect = useCallback(async (routeId: number | null) => {
        setHoveredEntityId(routeId);
        setFocusType(routeId ? 'hover' : null);
        if (routeId) {
            try {
                const tripsRes: { data: Trip[] } = await api.get('/trips');
                const routeTrips = tripsRes.data.filter(t => t.route_id === routeId);
                if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                    const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                    const poly = (shapeRes.data || []).sort((a:any,b:any)=>a.sequence-b.sequence).map((p:any)=>[p.lat, p.lon] as [number, number]);
                    setMapLayers(prev => ({ ...prev, previewRoutes: [{ id: routeId, color: routes.find(r => r.id === routeId)?.color || '007AFF', positions: poly, isFocused: true }] }));
                }
            } catch (e) {}
        } else { setMapLayers(prev => ({ ...prev, previewRoutes: [] })); }
    }, [routes, setHoveredEntityId, setMapLayers]);

    useEffect(() => {
        setMapLayers(prev => ({
            ...prev,
            routes: selectedRoute ? [{ id: selectedRoute.id, color: selectedRoute.color, positions: shapePoints.map(p => [p.lat, p.lon] as [number, number]), isFocused: true }] : [],
            stops: assignedStops.map(rs => ({ ...(rs.stop || { id: rs.stop_id, name: 'Unknown', lat: 0, lon: 0 }), hidePopup: false })),
            activeShape: activeSection === 'path' ? shapePoints : [],
            focusedPoints: shapePoints.length > 0 ? shapePoints.map(p => [p.lat, p.lon] as [number, number]) : [],
            activeStop: null, focusType
        }));
    }, [selectedRoute, shapePoints, assignedStops, activeSection, focusType, setMapLayers]);

    const snapPointsToRoads = async () => {
        if (shapePoints.length === 0) return;
        setStatus({ message: 'Snapping anchors...', type: 'loading' });
        try {
            const snapped = await Promise.all(shapePoints.map(async (p) => {
                const res = await axios.get(`https://router.project-osrm.org/nearest/v1/driving/${p.lon},${p.lat}`);
                if (res.data.waypoints?.[0]) {
                    const loc = res.data.waypoints[0].location;
                    return { ...p, lat: loc[1], lon: loc[0] };
                }
                return p;
            }));
            pushToHistory(snapped);
            setStatus({ message: 'Anchors aligned', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
        } catch (e) { setStatus({ message: 'Snap failed', type: 'error' }); }
    };

    const snapToRoads = async () => {
        if (shapePoints.length < 2 || !selectedRoute) return;
        setStatus({ message: 'Re-routing full path...', type: 'loading' });
        const coords = shapePoints.map(p => `${p.lon},${p.lat}`).join(';');
        const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${selectedRoute.id}`;
        try {
            const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
            if (res.data.routes?.[0]) {
                const geometry: [number, number][] = res.data.routes[0].geometry.coordinates;
                pushToHistory(geometry.map((c, i) => ({ shape_id: sId, lat: c[1], lon: c[0], sequence: i + 1 })));
                setStatus({ message: 'Path fully snapped', type: 'success' });
                setTimeout(() => setStatus(null), 2000);
            }
        } catch (e) { setStatus({ message: 'Routing error', type: 'error' }); }
    };

    const filteredRoutes = routes.filter(r => r.long_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.short_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (globalLoading) return <div className="flex h-screen items-center justify-center font-bold text-zinc-400 animate-pulse flex-col gap-4"><Loader2 className="animate-spin text-system-blue" size={32} /> LOADING DESIGNER...</div>;

    return (
        <div className="absolute inset-0 flex overflow-visible pointer-events-none font-bold">
            <motion.div animate={{ x: sidebarOpen ? 0 : -400 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex flex-col h-full bg-white relative z-20 overflow-hidden text-black pointer-events-auto shadow-2xl border-r border-zinc-100" style={{ width: 400 }}>
                <SidebarHeader title="Routes" Icon={Bus} actions={<button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>} />
                <div className="p-4 px-6 border-b border-zinc-100 bg-white shrink-0">
                    <div className="relative"><Search size={14} className="absolute left-3 top-3 text-zinc-400" /><input className="hig-input text-sm pl-9 py-2 font-bold" placeholder="Search routes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
                    {filteredRoutes.map(r => (
                        <div key={r.id} onMouseEnter={() => handleRouteHoverEffect(r.id)} onMouseLeave={() => handleRouteHoverEffect(null)} onClick={() => handleSelectRoute(r)} className={`p-4 hover:bg-zinc-50 cursor-pointer transition-all flex items-center gap-3 group ${selectedRoute?.id === r.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm font-black text-[10px]" style={{ backgroundColor: `#${(r.color || '007AFF').replace('#','')}` }}>{r.short_name}</div>
                            <div className="flex-1 min-w-0"><div className="text-sm text-black truncate leading-tight">{r.long_name}</div><div className="text-[10px] text-zinc-400 uppercase tracking-tighter">Line #{r.id}</div></div>
                            <ChevronRight size={14} className={`text-zinc-300 transition-all ${selectedRoute?.id === r.id ? 'translate-x-1 text-system-blue' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                    ))}
                </div>
            </motion.div>

            {selectedRoute && (
                <motion.div drag dragMomentum={false} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`absolute top-6 z-[3000] w-[320px] bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`} style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}>
                    <div className="p-4 pb-3 flex items-center justify-between shrink-0 cursor-move border-b border-black/[0.03]">
                        <div className="flex items-center gap-3 flex-1 min-w-0"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900 text-white shadow-lg shrink-0"><Bus size={16} /></div><div className="min-w-0"><h2 className="text-sm font-black tracking-tight truncate leading-none mb-0.5">{selectedRoute.short_name || 'New Route'}</h2><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate">Flow Designer</p></div></div>
                        <div className="flex items-center gap-0.5"><button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-black/5 rounded-full text-zinc-400">{isCollapsed ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}</button><button onClick={() => setSelectedRoute(null)} className="p-1.5 hover:bg-black/5 rounded-full text-zinc-400 transition-all hover:rotate-90"><X size={16}/></button></div>
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="px-4 py-2 shrink-0">
                                <div className="bg-black/5 p-1 rounded-lg flex gap-0.5 border border-black/5">
                                    {(['info', 'path', 'sequence'] as const).map((tab) => (
                                        <button key={tab} onClick={() => setActiveSection(tab)} className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-tight transition-all ${activeSection === tab ? 'bg-white text-system-blue shadow-sm' : 'text-zinc-400 hover:text-black'}`}>{tab === 'info' ? 'Details' : tab === 'path' ? 'Path' : 'Stops'}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar">
                                {activeSection === 'sequence' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="p-3 bg-zinc-900 text-white rounded-2xl shadow-xl flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/10 rounded-xl"><Clock size={16} /></div>
                                                <div><div className="text-[8px] font-black uppercase opacity-40 leading-none mb-1">Departure</div><input type="time" step="1" className="bg-transparent border-none p-0 text-sm font-black focus:ring-0 outline-none w-full" value={assignedStops[0]?.departure_time || '08:00:00'} onChange={(e) => updateFlow(0, e.target.value, 'departure')} /></div>
                                            </div>
                                            <ArrowDownWideNarrow size={16} className="opacity-20" />
                                        </div>

                                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1.5 custom-scrollbar">
                                            <Reorder.Group axis="y" values={assignedStops} onReorder={(newOrder) => { setAssignedStops(newOrder); }}>
                                                {assignedStops.map((rs, i) => {
                                                    const prevDep = i > 0 ? timeToSeconds(assignedStops[i-1].departure_time || '08:00:00') : null;
                                                    const currentArr = timeToSeconds(rs.arrival_time || '08:00:00');
                                                    const currentDep = timeToSeconds(rs.departure_time || '08:00:00');
                                                    const travelDur = prevDep !== null ? Math.floor((currentArr - prevDep) / 60) : 0;
                                                    const dwellDur = Math.floor((currentDep - currentArr) / 60);

                                                    return (
                                                        <React.Fragment key={rs.stop_id}>
                                                            {i > 0 && (
                                                                <div className="flex items-center gap-2 pl-10 py-1">
                                                                    <div className="h-4 w-0.5 bg-zinc-100 rounded-full" />
                                                                    <div className="flex items-center gap-1.5 group/dur">
                                                                        <span className="text-[8px] font-black text-zinc-300 uppercase">Travel:</span>
                                                                        <input type="number" min="1" className="w-10 bg-zinc-50 border-none rounded p-0.5 text-[10px] font-black text-system-blue text-center focus:bg-white transition-colors" value={travelDur} onChange={(e) => setTravelDuration(i, parseInt(e.target.value) || 1)} />
                                                                        <span className="text-[8px] font-black text-zinc-300 uppercase">min</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <Reorder.Item value={rs} className="flex flex-col gap-2 p-3 bg-white border border-zinc-100 rounded-2xl cursor-grab hover:border-zinc-200 transition-all group">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-5 h-5 rounded-full bg-zinc-50 flex items-center justify-center text-[8px] font-black text-zinc-400">{i+1}</div>
                                                                        <div className="text-[11px] font-black text-zinc-900 uppercase truncate w-32">{rs.stop?.name}</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex flex-col items-end">
                                                                            <input type="time" step="1" className="bg-transparent border-none p-0 text-[10px] font-mono font-black text-zinc-900 focus:ring-0 outline-none text-right w-20" value={rs.arrival_time || '08:00:00'} onChange={(e) => updateFlow(i, e.target.value, 'arrival')} />
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-[7px] font-black text-zinc-300 uppercase">Stay:</span>
                                                                                <input type="number" min="0" className="w-8 bg-zinc-50 border-none rounded p-0 text-[9px] font-black text-orange-500 text-center focus:bg-white" value={dwellDur} onChange={(e) => setDwellTime(i, parseInt(e.target.value) || 0)} />
                                                                                <span className="text-[7px] font-black text-zinc-300 uppercase">m</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
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
                                            <div><label className="text-[8px] font-black text-zinc-400 uppercase mb-1 block">Operator</label><select className="hig-input text-[11px] py-1.5 font-bold" value={selectedRoute.agency_id} onChange={e => { setSelectedRoute({...selectedRoute, agency_id: parseInt(e.target.value)}); }}>{agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                                            <div><label className="text-[8px] font-black text-zinc-400 uppercase mb-1 block">Type</label><select className="hig-input text-[11px] py-1.5 font-bold" value={selectedRoute.route_type} onChange={e => { setSelectedRoute({...selectedRoute, route_type: parseInt(e.target.value)}); }}><option value={3}>Bus</option><option value={0}>Tram</option><option value={1}>Subway</option></select></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-[8px] font-black text-zinc-400 uppercase mb-1 block">Short Name</label><input className="hig-input text-[11px] py-1.5 font-bold uppercase" value={selectedRoute.short_name} onChange={e => { setSelectedRoute({...selectedRoute, short_name: e.target.value}); }} /></div>
                                            <div><label className="text-[8px] font-black text-zinc-400 uppercase mb-1 block">Color</label><div className="flex gap-1.5 items-center"><input type="color" className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" value={`#${(selectedRoute.color || '007AFF').replace('#','')}`} onChange={e => { setSelectedRoute({...selectedRoute, color: e.target.value.replace('#','')}); }} /><input className="hig-input text-[10px] font-mono p-1 h-6 uppercase" value={selectedRoute.color} onChange={e => { setSelectedRoute({...selectedRoute, color: e.target.value.replace('#','')}); }} /></div></div>
                                        </div>
                                        <div><label className="text-[8px] font-black text-zinc-400 uppercase mb-1 block">Public Name</label><input className="hig-input text-[11px] py-1.5 font-bold" value={selectedRoute.long_name} onChange={e => { setSelectedRoute({...selectedRoute, long_name: e.target.value}); }} /></div>
                                        {selectedRoute.id !== 0 && (<div className="pt-4 mt-4 border-t border-zinc-100"><button type="button" onClick={() => { if(window.confirm('Delete record?')) api.delete(`/routes/${selectedRoute.id}`).then(refreshData).then(() => setSelectedRoute(null)); }} className="w-full py-2 text-[8px] font-black text-rose-500/60 hover:text-rose-600 uppercase tracking-[0.2em] transition-colors">Delete Record</button></div>)}
                                    </div>
                                )}
                                {activeSection === 'path' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100"><div className="flex items-center gap-2"><Zap size={12} className={autoRoute ? "text-system-blue" : "text-zinc-400"} /><span className="text-[9px] font-black uppercase tracking-tight">Auto-snap to roads</span></div><button onClick={() => setAutoRoute(!autoRoute)} className={`w-8 h-4 rounded-full transition-all relative ${autoRoute ? 'bg-system-blue' : 'bg-zinc-200'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${autoRoute ? 'left-4.5' : 'left-0.5'}`} /></button></div>
                                        <div className="grid grid-cols-2 gap-2"><button onClick={snapToRoads} className="py-2.5 bg-system-blue text-white rounded-xl font-black text-[9px] uppercase shadow-lg">Full Path</button><button onClick={snapPointsToRoads} className="py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-black text-[9px] uppercase">Snap Anchors</button></div>
                                        <div className="grid grid-cols-2 gap-2"><button onClick={undo} disabled={history.length === 0} className="py-2 bg-white border border-zinc-200 rounded-lg text-[9px] font-black text-zinc-400 hover:bg-zinc-50 uppercase disabled:opacity-30">Undo</button><button onClick={() => { if(window.confirm('Clear all?')) pushToHistory([]); }} className="py-2 bg-white border border-zinc-200 rounded-lg text-[9px] font-black text-red-400 hover:bg-red-50 uppercase">Clear All</button></div>
                                        <div className="p-3 bg-zinc-50/50 rounded-xl border border-zinc-100"><p className="text-[9px] text-zinc-400 leading-relaxed font-bold italic text-center text-balance">Click map to add stops. Drag to move. Right-click to remove.</p></div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-white/50 backdrop-blur-md border-t border-zinc-100 rounded-b-[1.5rem] sticky bottom-0 flex justify-center">
                                <button onClick={() => saveChanges()} disabled={!isDirty} className="px-8 py-2.5 bg-system-blue text-white rounded-full font-black text-[9px] shadow-lg shadow-system-blue/20 flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-30 active:scale-95 tracking-widest uppercase"><Save size={14}/> Commit Changes</button>
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default RouteStudio;
