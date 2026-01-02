import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Info, Map as MapIcon, MapPin, Plus, Save, RotateCcw, Zap, ChevronRight, Bus, Loader2, GripVertical, Undo2, Search, ChevronDown, ChevronUp, X, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { Reorder, motion } from 'framer-motion';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';
import { SidebarHeader } from './SidebarHeader';
import { Route, Stop, Agency, Trip, ShapePoint, RouteStop } from '../types';

const RouteStudio: React.FC = () => {
    const { setMapLayers, setOnMapClick, setOnShapePointMove, setOnShapePointDelete, setOnShapePointInsert, setStatus, quickMode, setQuickMode, sidebarOpen } = useWorkspace();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [allStops, setAllStops] = useState<Stop[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    
    // Editor State
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [shapePoints, setShapePoints] = useState<ShapePoint[]>([]);
    const [assignedStops, setAssignedStops] = useState<RouteStop[]>([]);
    const [history, setHistory] = useState<ShapePoint[][]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [stopSearchQuery, setStopSearchQuery] = useState('');
    
    // UI Logic
    const [activeSection, setActiveSection] = useState<'info' | 'path' | 'sequence' | null>('info');
    const [globalLoading, setGlobalLoading] = useState(true);
    const [autoRoute, setAutoRoute] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const refreshAllData = useCallback(async () => {
        const [rRes, sRes, aRes] = await Promise.all([
            api.get('/routes'), api.get('/stops'), api.get('/agencies')
        ]);
        setRoutes(rRes.data || []);
        setAllStops(sRes.data || []);
        setAgencies(aRes.data || []);
    }, []);

    const refreshData = useCallback(async () => {
        setGlobalLoading(true);
        await refreshAllData();
        setGlobalLoading(false);
    }, [refreshAllData]);

    useEffect(() => { refreshData(); }, [refreshData]);

    // Handle Quick Mode Entry
    useEffect(() => {
        if (quickMode === 'add-route' && !selectedRoute) {
            handleAddNew();
        }
    }, [quickMode, selectedRoute]);

    // Sync isDirty to Global Status
    useEffect(() => {
        if (isDirty) {
            setStatus({ message: 'Unsaved Changes', type: 'info', isDirty: true });
        } else if (selectedRoute) {
            setStatus({ message: 'All Changes Synced', type: 'info', isDirty: false });
        } else {
            setStatus(null);
        }
    }, [isDirty, selectedRoute, setStatus]);

    // --- Persistence ---
    const pushToHistory = useCallback((newPoints: ShapePoint[]) => {
        setHistory(prev => [...prev.slice(-19), shapePoints]);
        setShapePoints(newPoints);
        setIsDirty(true);
    }, [shapePoints]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        setShapePoints(lastState);
        setHistory(prev => prev.slice(0, -1));
        setIsDirty(true);
    }, [history]);

    // --- Shape Editing ---
    const handleShapePointMove = useCallback((index: number, latlng: { lat: number, lng: number }) => {
        const newPoints = [...shapePoints];
        newPoints[index] = { ...newPoints[index], lat: latlng.lat, lon: latlng.lng };
        pushToHistory(newPoints);
    }, [shapePoints, pushToHistory]);

    const handleShapePointDelete = useCallback((index: number) => {
        const newPoints = shapePoints.filter((_, i) => i !== index).map((p, i) => ({ ...p, sequence: i + 1 }));
        pushToHistory(newPoints);
    }, [shapePoints, pushToHistory]);

    const handleShapePointInsert = useCallback(async (index: number, latlng: { lat: number, lng: number }) => {
        const sId = selectedRoute?.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${selectedRoute?.id}`;
        
        if (autoRoute && index > 0 && index < shapePoints.length) {
            setStatus({ message: 'Routing via Roads...', type: 'loading' });
            try {
                const prev = shapePoints[index - 1];
                const next = shapePoints[index];
                const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${prev.lon},${prev.lat};${latlng.lng},${latlng.lat};${next.lon},${next.lat}?overview=full&geometries=geojson`);
                
                if (res.data.routes && res.data.routes[0]) {
                    const geometry: [number, number][] = res.data.routes[0].geometry.coordinates;
                    const newPoints = [...shapePoints];
                    const intermediatePoints = geometry.slice(1, -1).map((c) => ({
                        shape_id: sId, lat: c[1], lon: c[0], sequence: 0
                    }));
                    newPoints.splice(index, 0, ...intermediatePoints);
                    const reordered = newPoints.map((p, i) => ({ ...p, sequence: i + 1 }));
                    pushToHistory(reordered);
                    setStatus({ message: 'Point Inserted (Road Snapped)', type: 'success' });
                    setTimeout(() => setStatus(null), 2000);
                    return;
                }
            } catch (e) { console.error(e); setStatus({ message: 'Routing failed', type: 'error' }); }
        }

        const newPoints = [...shapePoints];
        newPoints.splice(index, 0, { lat: latlng.lat, lon: latlng.lng, sequence: index + 1, shape_id: sId });
        const reordered = newPoints.map((p, i) => ({ ...p, sequence: i + 1 }));
        pushToHistory(reordered);
    }, [shapePoints, selectedRoute, autoRoute, pushToHistory, setStatus]);

    const snapStopsToPath = useCallback(() => {
        if (shapePoints.length < 2 || assignedStops.length === 0) return;
        setStatus({ message: 'Snapping stops...', type: 'loading' });
        
        const newAssignedStops = assignedStops.map(rs => {
            if (!rs.stop) return rs;
            let minDistance = Infinity;
            let nearestPoint = { lat: rs.stop.lat, lon: rs.stop.lon };
            for (let i = 0; i < shapePoints.length - 1; i++) {
                const p1 = L.latLng(shapePoints[i].lat, shapePoints[i].lon);
                const p2 = L.latLng(shapePoints[i+1].lat, shapePoints[i+1].lon);
                const stopPt = L.latLng(rs.stop.lat, rs.stop.lon);
                const closest = L.LineUtil.closestPointOnSegment(L.CRS.EPSG3857.project(stopPt), L.CRS.EPSG3857.project(p1), L.CRS.EPSG3857.project(p2));
                const unprojected = L.CRS.EPSG3857.unproject(closest);
                const dist = stopPt.distanceTo(unprojected);
                if (dist < minDistance) { minDistance = dist; nearestPoint = { lat: unprojected.lat, lon: unprojected.lng }; }
            }
            return { ...rs, stop: { ...rs.stop, lat: nearestPoint.lat, lon: nearestPoint.lon } };
        });
        
        setAssignedStops(newAssignedStops);
        setIsDirty(true);
        setStatus({ message: 'Stops aligned to path', type: 'success' });
        setTimeout(() => setStatus(null), 2000);
    }, [shapePoints, assignedStops, setStatus]);

    const saveChanges = useCallback(async (isAuto = false) => {
        if (!selectedRoute) return;
        if (!isAuto) setStatus({ message: 'Syncing with Cloud...', type: 'loading' });
        try {
            if (selectedRoute.id) await api.put(`/routes/${selectedRoute.id}`, selectedRoute);
            else if (!isAuto) {
                const res = await api.post('/routes', selectedRoute);
                setSelectedRoute(res.data);
            }
            if (selectedRoute.id || !isAuto) {
                const rId = selectedRoute.id || 0;
                const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${rId}`;
                await api.put(`/shapes/${sId}`, shapePoints.map(p => ({ ...p, shape_id: sId })));
                const trips: { data: Trip[] } = await api.get('/trips');
                if (!trips.data.find(t => t.route_id === rId)) await api.post('/trips', { route_id: rId, headsign: selectedRoute.long_name, shape_id: sId });
            }
            if (selectedRoute.id) {
                const reordered = assignedStops.map((s, i) => ({ ...s, sequence: i + 1 }));
                await api.put(`/routes/${selectedRoute.id}/stops`, reordered);
            }
            setIsDirty(false);
            if (!isAuto) { setStatus({ message: 'Changes committed', type: 'success' }); setTimeout(() => setStatus(null), 2000); }
            await refreshAllData();
        } catch (e) { console.error(e); setStatus({ message: 'Save failed', type: 'error' }); }
    }, [selectedRoute, shapePoints, assignedStops, refreshAllData, setStatus]);

    // Auto-save
    useEffect(() => {
        if (!isDirty || !selectedRoute?.id) return;
        const timer = setTimeout(() => saveChanges(true), 2000);
        return () => clearTimeout(timer);
    }, [isDirty, shapePoints, assignedStops, selectedRoute, saveChanges]);

    // Map Click Handler
    const handleMapClick = useCallback(async (latlng: { lat: number, lng: number }) => {
        if (selectedRoute && activeSection === 'path') {
            const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${selectedRoute.id}`;
            const newPoint = { lat: latlng.lat, lon: latlng.lng, sequence: shapePoints.length + 1, shape_id: sId };

            if (autoRoute && shapePoints.length > 0) {
                setStatus({ message: 'Finding Road...', type: 'loading' });
                try {
                    const lastPoint = shapePoints[shapePoints.length - 1];
                    const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${lastPoint.lon},${lastPoint.lat};${latlng.lng},${latlng.lat}?overview=full&geometries=geojson`);
                    if (res.data.routes && res.data.routes[0]) {
                        const geometry: [number, number][] = res.data.routes[0].geometry.coordinates;
                        const intermediatePoints = geometry.slice(1).map((c, i) => ({
                            shape_id: sId, lat: c[1], lon: c[0], sequence: shapePoints.length + i + 1
                        }));
                        pushToHistory([...shapePoints, ...intermediatePoints]);
                        setStatus({ message: 'Path Extended', type: 'success' });
                        setTimeout(() => setStatus(null), 2000);
                        return;
                    }
                } catch (e) { console.error(e); setStatus({ message: 'Road not found', type: 'error' }); }
            }
            pushToHistory([...shapePoints, newPoint]);
        }
    }, [activeSection, selectedRoute, shapePoints, autoRoute, pushToHistory, setStatus]);

    useEffect(() => {
        setOnMapClick(() => handleMapClick);
        setOnShapePointMove(() => handleShapePointMove);
        setOnShapePointDelete(() => handleShapePointDelete);
        setOnShapePointInsert(() => handleShapePointInsert);
        return () => { setOnMapClick(null); setOnShapePointMove(undefined); setOnShapePointDelete(undefined); setOnShapePointInsert(undefined); };
    }, [handleMapClick, handleShapePointMove, handleShapePointDelete, handleShapePointInsert, setOnMapClick, setOnShapePointMove, setOnShapePointDelete, setOnShapePointInsert]);

    // Sync to global map
    useEffect(() => {
        setMapLayers(prev => ({
            ...prev,
            routes: selectedRoute ? [{ id: selectedRoute.id, color: selectedRoute.color, positions: shapePoints.map(p => [p.lat, p.lon] as [number, number]), isFocused: true }] : [],
            stops: assignedStops.map(rs => ({ ...(rs.stop as Stop), hidePopup: false })),
            activeShape: activeSection === 'path' ? shapePoints : [],
            focusedPoints: shapePoints.length > 0 ? shapePoints.map(p => [p.lat, p.lon] as [number, number]) : [],
            activeStop: null
        }));
    }, [selectedRoute, shapePoints, assignedStops, activeSection, setMapLayers]);

    const handleSelectRoute = async (route: Route) => {
        setQuickMode(null);
        if (isDirty) await saveChanges(true);
        setSelectedRoute(route);
        setIsDirty(false);
        try {
            const [tripsRes, stopsRes] = await Promise.all([api.get('/trips'), api.get(`/routes/${route.id}/stops`)]);
            setAssignedStops(stopsRes.data || []);
            const trip: Trip | undefined = tripsRes.data.find((t: Trip) => t.route_id === route.id);
            if (trip?.shape_id) {
                const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                setShapePoints((shapeRes.data || []).sort((a: any, b: any) => a.sequence - b.sequence));
            } else { setShapePoints([]); }
        } catch (e) { console.error(e); }
    };

    const handleAddNew = () => {
        setQuickMode(null);
        setSelectedRoute({ id: 0, short_name: '', long_name: '', color: '007AFF', agency_id: agencies[0]?.id || 0 });
        setShapePoints([]); setAssignedStops([]); setActiveSection('info'); setIsDirty(true);
    };

    const snapPointsToRoads = async () => {
        if (shapePoints.length === 0) return;
        setStatus({ message: 'Snapping anchors...', type: 'loading' });
        try {
            const snappedPoints = await Promise.all(shapePoints.map(async (p) => {
                try {
                    const res = await axios.get(`https://router.project-osrm.org/nearest/v1/driving/${p.lon},${p.lat}`);
                    if (res.data.waypoints && res.data.waypoints.length > 0) {
                        const snapped = res.data.waypoints[0].location;
                        return { ...p, lat: snapped[1], lon: snapped[0] };
                    }
                } catch (e) { console.error(e); }
                return p;
            }));
            pushToHistory(snappedPoints);
            setStatus({ message: 'Anchors aligned to roads', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
        } finally { }
    };

    const snapToRoads = async () => {
        if (shapePoints.length < 2 || !selectedRoute) return;
        setStatus({ message: 'Re-routing full path...', type: 'loading' });
        const coords = shapePoints.map(p => `${p.lon},${p.lat}`).join(';');
        const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${selectedRoute.id}`;
        try {
            const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
            const geometry: [number, number][] = res.data.routes[0].geometry.coordinates;
            pushToHistory(geometry.map((c, i) => ({ shape_id: sId, lat: c[1], lon: c[0], sequence: i + 1 })));
            setStatus({ message: 'Path fully snapped', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
        } catch (e) { setStatus({ message: 'Routing error', type: 'error' }); }
    };

    const filteredRoutes = routes.filter(r => r.long_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.short_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (globalLoading) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse flex-col gap-4"><Loader2 className="animate-spin text-system-blue" size={32} /> INITIALIZING STUDIO...</div>;

    return (
        <div className="absolute inset-0 flex overflow-visible pointer-events-none font-bold">
            {/* Sidebar: Route Picker */}
            <div className="flex flex-col h-full bg-white relative z-20 overflow-hidden text-black pointer-events-auto shadow-2xl border-r border-black/5" style={{ width: 400 }}>
                <SidebarHeader 
                    title="Studio" 
                    Icon={Bus} 
                    actions={<button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>}
                />
                
                <div className="p-4 px-6 border-b border-black/5 bg-white shrink-0">
                    <div className="relative"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2 font-bold" placeholder="Search service lines..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredRoutes.map(r => (
                        <div key={r.id} onClick={() => handleSelectRoute(r)} className={`p-4 hover:bg-black/[0.02] cursor-pointer transition-all flex items-center gap-3 group ${selectedRoute?.id === r.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm font-black text-[10px]" style={{ backgroundColor: `#${(r.color || '007AFF').replace('#','')}` }}>{r.short_name}</div>
                            <div className="flex-1 min-w-0"><div className="text-sm text-black truncate leading-tight">{r.long_name}</div><div className="text-[10px] text-system-gray uppercase tracking-tighter">Line #{r.id}</div></div>
                            <ChevronRight size={14} className={`transition-all ${selectedRoute?.id === r.id ? 'opacity-100 text-system-blue translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Editor Window */}
            {selectedRoute && (
                <motion.div 
                    drag
                    dragMomentum={false}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`absolute top-6 z-[3000] w-[450px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.2)] border border-black/5 flex flex-col transition-all duration-500 pointer-events-auto ${quickMode && !isHovered ? 'opacity-20 pointer-events-none scale-95 blur-sm' : 'opacity-100'}`}
                    style={{ right: 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: (quickMode && !isHovered ? 0.2 : 1), x: 0 }}
                >
                    {/* Floating Header (Drag Handle) */}
                    <div className="p-8 pb-6 flex items-center justify-between shrink-0 cursor-move">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-system-blue/20 shrink-0" style={{ backgroundColor: `#${(selectedRoute.color || '007AFF').replace('#','')}` }}>
                                <Bus size={24} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black tracking-tight truncate leading-none mb-1.5">{selectedRoute.short_name || 'New Route'}</h2>
                                <p className="text-[10px] font-black text-system-gray uppercase tracking-[0.2em] truncate opacity-60">{selectedRoute.long_name || 'Draft Configuration'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-black/5 rounded-full text-system-gray transition-all">
                                {isCollapsed ? <Maximize2 size={18}/> : <Minimize2 size={18}/>}
                            </button>
                            <button onClick={() => setSelectedRoute(null)} className="p-2 hover:bg-black/5 rounded-full text-system-gray transition-all hover:rotate-90"><X size={20}/></button>
                        </div>
                    </div>

                    {!isCollapsed && (
                        <>
                            {/* Segmented Control */}
                            <div className="px-8 py-2 shrink-0">
                                <div className="bg-black/5 p-1.5 rounded-[1.25rem] flex gap-1 border border-black/5">
                                    {(['info', 'path', 'sequence'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveSection(tab)}
                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSection === tab ? 'bg-white text-system-blue shadow-sm scale-[1.02]' : 'text-system-gray hover:text-black hover:bg-white/50'}`}
                                        >
                                            {tab === 'info' ? 'Specs' : tab === 'path' ? 'Geom' : 'Nodes'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                                {activeSection === 'info' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Operator</label>
                                            <select className="hig-input text-sm font-bold" value={selectedRoute.agency_id} onChange={e => { setSelectedRoute({...selectedRoute, agency_id: parseInt(e.target.value)}); setIsDirty(true); }}>{agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Route Type</label>
                                            <select className="hig-input text-sm font-bold" value={selectedRoute.route_type} onChange={e => { setSelectedRoute({...selectedRoute, route_type: parseInt(e.target.value)}); setIsDirty(true); }}>
                                                <option value={0}>Tram/Light Rail</option><option value={1}>Subway/Metro</option><option value={2}>Rail</option><option value={3}>Bus</option><option value={4}>Ferry</option><option value={5}>Cable Tram</option><option value={6}>Aerial Lift</option><option value={7}>Funicular</option><option value={11}>Trolleybus</option><option value={12}>Monorail</option>
                                            </select></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Short Name</label><input className="hig-input text-sm font-bold" value={selectedRoute.short_name} onChange={e => { setSelectedRoute({...selectedRoute, short_name: e.target.value}); setIsDirty(true); }} /></div>
                                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Route Color</label>
                                            <div className="flex gap-2 items-center"><input type="color" className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0" value={`#${(selectedRoute.color || '007AFF').replace('#','')}`} onChange={e => { setSelectedRoute({...selectedRoute, color: e.target.value.replace('#','')}); setIsDirty(true); }} /><input className="hig-input font-mono text-xs p-2 h-10 uppercase" value={selectedRoute.color} onChange={e => { setSelectedRoute({...selectedRoute, color: e.target.value.replace('#','')}); setIsDirty(true); }} /></div></div>
                                        </div>
                                        <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Public Name</label><input className="hig-input text-sm font-bold" value={selectedRoute.long_name} onChange={e => { setSelectedRoute({...selectedRoute, long_name: e.target.value}); setIsDirty(true); }} /></div>
                                        <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Description</label><textarea className="hig-input text-sm font-bold min-h-[80px] py-2" value={selectedRoute.route_desc || ''} onChange={e => { setSelectedRoute({...selectedRoute, route_desc: e.target.value}); setIsDirty(true); }} /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Text Color</label>
                                            <div className="flex gap-2 items-center"><input type="color" className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0" value={`#${(selectedRoute.text_color || 'FFFFFF').replace('#','')}`} onChange={e => { setSelectedRoute({...selectedRoute, text_color: e.target.value.replace('#','')}); setIsDirty(true); }} /><input className="hig-input font-mono text-xs p-2 h-10 uppercase" value={selectedRoute.text_color || 'FFFFFF'} onChange={e => { setSelectedRoute({...selectedRoute, text_color: e.target.value.replace('#','')}); setIsDirty(true); }} /></div></div>
                                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Route URL</label><input className="hig-input text-sm font-bold" value={selectedRoute.route_url || ''} onChange={e => { setSelectedRoute({...selectedRoute, route_url: e.target.value}); setIsDirty(true); }} /></div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'path' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between p-5 bg-system-blue/5 rounded-3xl border border-system-blue/10 shadow-inner">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl transition-all ${autoRoute ? 'bg-system-blue text-white shadow-lg' : 'bg-black/5 text-system-gray'}`}>
                                                    <Zap size={18} className={autoRoute ? "animate-pulse" : ""} />
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-black uppercase tracking-widest block mb-0.5">Continuous Routing</span>
                                                    <p className="text-[9px] font-bold text-system-gray uppercase opacity-60">Automatic Road Snapping</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setAutoRoute(!autoRoute)} className={`w-12 h-6 rounded-full transition-all relative ${autoRoute ? 'bg-system-blue shadow-lg shadow-system-blue/20' : 'bg-black/10'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${autoRoute ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <button onClick={snapToRoads} className="group relative py-5 bg-white border border-black/5 rounded-3xl font-black text-[10px] flex flex-col items-center gap-2 hover:bg-system-blue hover:text-white hover:border-system-blue transition-all shadow-sm hover:shadow-xl hover:shadow-system-blue/20 active:scale-95 uppercase tracking-widest">
                                                <div className="p-2 bg-system-blue/5 rounded-lg group-hover:bg-white/20 transition-colors"><Zap size={16} /></div>
                                                Full Trace
                                            </button>
                                            <button onClick={snapPointsToRoads} className="group relative py-5 bg-white border border-black/5 rounded-3xl font-black text-[10px] flex flex-col items-center gap-2 hover:bg-system-blue hover:text-white hover:border-system-blue transition-all shadow-sm hover:shadow-xl hover:shadow-system-blue/20 active:scale-95 uppercase tracking-widest">
                                                <div className="p-2 bg-system-blue/5 rounded-lg group-hover:bg-white/20 transition-colors"><MapIcon size={16} /></div>
                                                Snap Anchors
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <button onClick={undo} disabled={history.length === 0} className="py-4 bg-white border border-black/5 rounded-2xl text-[10px] font-black flex items-center justify-center gap-3 disabled:opacity-30 transition-all hover:bg-black/5 uppercase tracking-widest shadow-sm"><Undo2 size={16}/> Undo Edit</button>
                                            <button onClick={() => { if(window.confirm('Wipe all geometry data for this route?')) pushToHistory([]); }} className="py-4 bg-white border border-black/5 rounded-2xl text-[10px] font-black text-red-500 flex items-center justify-center gap-3 transition-all hover:bg-red-50 uppercase tracking-widest shadow-sm"><Trash2 size={16}/> Clear Data</button>
                                        </div>

                                        <div className="p-6 bg-black/[0.03] rounded-[2rem] border border-black/5">
                                            <div className="flex items-center gap-3 mb-3 text-black/40"><Info size={14}/><span className="text-[9px] font-black uppercase tracking-widest text-black/60">GIS Instructions</span></div>
                                            <p className="text-[10px] text-system-gray leading-relaxed font-bold">Left-click map to append nodes. Drag existing nodes to relocate. Right-click any node to remove. Click on any path segment to insert an anchor point.</p>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'sequence' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <button onClick={snapStopsToPath} className="w-full py-4 bg-white border border-system-blue/20 text-system-blue rounded-2xl font-black text-[10px] flex items-center justify-center gap-3 hover:bg-system-blue hover:text-white transition-all shadow-sm active:scale-95 uppercase tracking-widest"><Zap size={14} /> Snap Sequence to Path</button>
                                        
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between px-1">
                                                <h4 className="text-[10px] font-black text-system-gray uppercase tracking-[0.2em]">Active Timeline</h4>
                                                <span className="text-[9px] font-black text-system-blue bg-system-blue/5 px-2 py-0.5 rounded-full">{assignedStops.length} NODES</span>
                                            </div>
                                            <Reorder.Group axis="y" values={assignedStops} onReorder={(newOrder) => { setAssignedStops(newOrder); setIsDirty(true); }} className="space-y-2">
                                                {assignedStops.map((rs, i) => (
                                                    <Reorder.Item key={rs.stop_id} value={rs} className="flex items-center gap-4 p-4 bg-white/50 border border-black/5 rounded-2xl cursor-grab border-transparent hover:border-black/10 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all group">
                                                        <GripVertical size={14} className="text-black/10 group-hover:text-black/30 transition-colors" />
                                                        <div className="w-7 h-7 rounded-full bg-system-blue/5 flex items-center justify-center text-[10px] font-black text-system-blue shrink-0 group-hover:bg-system-blue group-hover:text-white transition-all">{i+1}</div>
                                                        <div className="flex-1 font-black text-[11px] truncate uppercase tracking-tight text-black">{rs.stop?.name}</div>
                                                        <button onClick={() => { setAssignedStops(assignedStops.filter((_, idx) => idx !== i)); setIsDirty(true); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={16}/></button>
                                                    </Reorder.Item>
                                                ))}
                                            </Reorder.Group>
                                        </div>

                                        <div className="pt-8 border-t border-black/5">
                                            <div className="flex items-center justify-between mb-4 px-1">
                                                <h4 className="text-[10px] font-black text-system-gray uppercase tracking-[0.2em]">Available Nodes</h4>
                                                <div className="relative"><Search size={12} className="absolute left-3 top-2.5 text-system-gray opacity-40" /><input className="hig-input text-[10px] pl-9 py-2 h-9 w-44 font-black bg-black/5 border-none focus:bg-white focus:ring-2 focus:ring-system-blue/20 transition-all" placeholder="FILTER INVENTORY..." value={stopSearchQuery} onChange={e => setStopSearchQuery(e.target.value)} /></div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                                {allStops
                                                    .filter(s => !assignedStops.find(rs => rs.stop_id === s.id))
                                                    .filter(s => s.name.toLowerCase().includes(stopSearchQuery.toLowerCase()))
                                                    .map(s => (
                                                    <div key={s.id} className="flex items-center justify-between p-4 hover:bg-white rounded-2xl cursor-pointer group transition-all border border-transparent hover:border-black/5 hover:shadow-lg shadow-black/5" onClick={() => { setAssignedStops([...assignedStops, {stop_id: s.id, stop: s, sequence: assignedStops.length+1, route_id: selectedRoute.id}]); setIsDirty(true); setStatus({ message: `Linked ${s.name}`, type: 'success' }); setTimeout(()=>setStatus(null), 1000); }}>
                                                        <span className="text-black font-black text-[11px] uppercase truncate mr-2 tracking-tight">{s.name}</span>
                                                        <Plus size={16} className="text-system-blue opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all shrink-0" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Persistent Save Bar */}
                            <div className="p-8 bg-white/50 backdrop-blur-md border-t border-black/5 rounded-b-[2.5rem] sticky bottom-0">
                                <button onClick={() => saveChanges()} disabled={!isDirty} className="w-full py-5 bg-system-blue text-white rounded-2xl font-black text-[11px] shadow-2xl shadow-system-blue/30 flex items-center justify-center gap-3 hover:bg-blue-600 hover:scale-[1.02] transition-all disabled:opacity-30 active:scale-95 tracking-[0.1em]">
                                    <Save size={20}/> COMMIT BUNDLE CHANGES
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default RouteStudio;
