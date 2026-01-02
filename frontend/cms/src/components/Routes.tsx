import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Info, Map as MapIcon, MapPin, Plus, Save, RotateCcw, Zap, ChevronRight, ChevronLeft, Bus, Loader2, GripVertical, Undo2, Settings2, Search, X, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Reorder } from 'framer-motion';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';
import { Route, Stop, Agency, Trip, ShapePoint, RouteStop } from '../types';

const RouteStudio: React.FC = () => {
    const { setMapLayers, sidebarOpen, setSidebarOpen, setOnMapClick, setOnShapePointMove, setOnShapePointDelete, setOnShapePointInsert } = useWorkspace();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [allStops, setAllStops] = useState<Stop[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    
    // Editor State
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [shapePoints, setShapePoints] = useState<ShapePoint[]>([]);
    const [assignedStops, setAssignedStops] = useState<RouteStop[]>([]);
    const [history, setHistory] = useState<ShapePoint[][]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // UI Logic
    const [activeSection, setActiveSection] = useState<'info' | 'path' | 'sequence' | null>('info');
    const [globalLoading, setGlobalLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [routing, setRouting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);

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

    const handleShapePointInsert = useCallback((index: number, latlng: { lat: number, lng: number }) => {
        const newPoints = [...shapePoints];
        const sId = selectedRoute?.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : '';
        newPoints.splice(index, 0, { lat: latlng.lat, lon: latlng.lng, sequence: index + 1, shape_id: sId });
        // Update sequences
        const reordered = newPoints.map((p, i) => ({ ...p, sequence: i + 1 }));
        pushToHistory(reordered);
    }, [shapePoints, selectedRoute, pushToHistory]);

    const snapStopsToPath = useCallback(() => {
        if (shapePoints.length < 2 || assignedStops.length === 0) return;
        
        const newAssignedStops = assignedStops.map(rs => {
            if (!rs.stop) return rs;
            
            let minDistance = Infinity;
            let nearestPoint = { lat: rs.stop.lat, lon: rs.stop.lon };
            
            for (let i = 0; i < shapePoints.length - 1; i++) {
                const p1 = L.latLng(shapePoints[i].lat, shapePoints[i].lon);
                const p2 = L.latLng(shapePoints[i+1].lat, shapePoints[i+1].lon);
                const stopPt = L.latLng(rs.stop.lat, rs.stop.lon);
                
                const closest = L.LineUtil.closestPointOnSegment(
                    L.CRS.EPSG3857.project(stopPt),
                    L.CRS.EPSG3857.project(p1),
                    L.CRS.EPSG3857.project(p2)
                );
                
                const unprojected = L.CRS.EPSG3857.unproject(closest);
                const dist = stopPt.distanceTo(unprojected);
                
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestPoint = { lat: unprojected.lat, lon: unprojected.lng };
                }
            }
            
            return {
                ...rs,
                stop: { ...rs.stop, lat: nearestPoint.lat, lon: nearestPoint.lon }
            };
        });
        
        setAssignedStops(newAssignedStops);
        setIsDirty(true);
        setMessage({ type: 'success', text: 'Stops Snapped' });
        setTimeout(() => setMessage(null), 2000);
    }, [shapePoints, assignedStops]);

    const saveChanges = useCallback(async (isAuto = false) => {
        if (!selectedRoute) return;
        setSaving(true);
        try {
            // 1. Save Metadata
            if (selectedRoute.id) await api.put(`/routes/${selectedRoute.id}`, selectedRoute);
            else if (!isAuto) {
                const res = await api.post('/routes', selectedRoute);
                setSelectedRoute(res.data);
            }

            // 2. Save Shape
            if (selectedRoute.id || !isAuto) {
                const rId = selectedRoute.id || 0;
                const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${rId}`;
                await api.put(`/shapes/${sId}`, shapePoints.map(p => ({ ...p, shape_id: sId })));
                
                // Trip Binding
                const trips: { data: Trip[] } = await api.get('/trips');
                if (!trips.data.find(t => t.route_id === rId)) {
                    await api.post('/trips', { route_id: rId, headsign: selectedRoute.long_name, shape_id: sId });
                }
            }

            // 3. Save Sequence
            if (selectedRoute.id) {
                const reordered = assignedStops.map((s, i) => ({ ...s, sequence: i + 1 }));
                await api.put(`/routes/${selectedRoute.id}/stops`, reordered);
            }

            setIsDirty(false);
            if (!isAuto) setMessage({ type: 'success', text: 'Cloud Synced' });
            setTimeout(() => setMessage(null), 3000);
            await refreshAllData();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    }, [selectedRoute, shapePoints, assignedStops, refreshAllData]);


    // Auto-save
    useEffect(() => {
        if (!isDirty || !selectedRoute?.id) return;
        const timer = setTimeout(() => saveChanges(true), 2000);
        return () => clearTimeout(timer);
    }, [isDirty, shapePoints, assignedStops, selectedRoute, saveChanges]);

    // Map Click Handler
    const handleMapClick = useCallback((latlng: { lat: number, lng: number }) => {
        if (selectedRoute && activeSection === 'path') {
            const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : '';
            pushToHistory([...shapePoints, { lat: latlng.lat, lon: latlng.lng, sequence: shapePoints.length + 1, shape_id: sId }]);
        }
    }, [activeSection, selectedRoute, shapePoints, pushToHistory]);

    useEffect(() => {
        setOnMapClick(() => handleMapClick);
        setOnShapePointMove(() => handleShapePointMove);
        setOnShapePointDelete(() => handleShapePointDelete);
        setOnShapePointInsert(() => handleShapePointInsert);
        return () => {
            setOnMapClick(null);
            setOnShapePointMove(undefined);
            setOnShapePointDelete(undefined);
            setOnShapePointInsert(undefined);
        };
    }, [handleMapClick, handleShapePointMove, handleShapePointDelete, handleShapePointInsert, setOnMapClick, setOnShapePointMove, setOnShapePointDelete, setOnShapePointInsert]);

    // Sync to global map
    useEffect(() => {
        setMapLayers(prev => ({
            ...prev,
            routes: selectedRoute ? [{
                id: selectedRoute.id,
                color: selectedRoute.color,
                positions: shapePoints.map(p => [p.lat, p.lon] as [number, number]),
                isFocused: true
            }] : [],
            stops: assignedStops.map(rs => ({ ...(rs.stop as Stop), hidePopup: false })),
            activeShape: activeSection === 'path' ? shapePoints : [],
            focusedPoints: shapePoints.length > 0 ? shapePoints.map(p => [p.lat, p.lon] as [number, number]) : [],
            activeStop: null
        }));
    }, [selectedRoute, shapePoints, assignedStops, activeSection, setMapLayers]);

    const handleSelectRoute = async (route: Route) => {
        if (isDirty) await saveChanges(true);
        setSelectedRoute(route);
        setIsDirty(false);
        try {
            const [tripsRes, stopsRes] = await Promise.all([
                api.get('/trips'), api.get(`/routes/${route.id}/stops`)
            ]);
            setAssignedStops(stopsRes.data || []);
            const trip: Trip | undefined = tripsRes.data.find((t: Trip) => t.route_id === route.id);
            if (trip?.shape_id) {
                const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                setShapePoints((shapeRes.data || []).sort((a: any, b: any) => a.sequence - b.sequence));
            } else { setShapePoints([]); }
        } catch (e) { console.error(e); }
    };

    const handleAddNew = () => {
        setSelectedRoute({ id: 0, short_name: '', long_name: '', color: '007AFF', agency_id: agencies[0]?.id || 0 });
        setShapePoints([]); setAssignedStops([]); setActiveSection('info'); setIsDirty(true);
    };

    const snapPointsToRoads = async () => {
        if (shapePoints.length === 0) return;
        setRouting(true);
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
        } finally { setRouting(false); }
    };

    const snapToRoads = async () => {
        if (shapePoints.length < 2 || !selectedRoute) return;
        setRouting(true);
        const coords = shapePoints.map(p => `${p.lon},${p.lat}`).join(';');
        const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${selectedRoute.id}`;
        try {
            const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
            const geometry: [number, number][] = res.data.routes[0].geometry.coordinates;
            pushToHistory(geometry.map((c, i) => ({ shape_id: sId, lat: c[1], lon: c[0], sequence: i + 1 })));
        } finally { setRouting(false); }
    };

    const filteredRoutes = routes.filter(r => 
        r.long_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.short_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (globalLoading) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse flex-col gap-4"><Loader2 className="animate-spin text-system-blue" size={32} /> INITIALIZING STUDIO...</div>;

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl relative z-20 overflow-hidden font-bold text-black" style={{ width: sidebarOpen ? '450px' : '0', transition: 'width 0.3s ease' }}>
            {/* Header */}
            <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-system-blue rounded-lg flex items-center justify-center text-white shadow-lg"><Bus size={18}/></div>
                    <h1 className="text-xl font-black tracking-tight leading-none">Route Studio</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
                </div>
            </div>

            {/* Editing Section */}
            <div className="flex-1 overflow-y-auto">
                {selectedRoute ? (
                    <div className="animate-in fade-in duration-300">
                        {/* Section: Route Metadata */}
                        <div className="border-b border-black/5">
                            <button onClick={() => setActiveSection(activeSection === 'info' ? null : 'info')} className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02]">
                                <div className="flex items-center gap-3 text-xs uppercase tracking-widest font-black text-system-gray">
                                    <Info size={14} className="text-system-blue" /> 1. Route Attributes
                                </div>
                                {activeSection === 'info' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {activeSection === 'info' && (
                                <div className="p-6 bg-system-blue/[0.02] space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Operator</label>
                                        <select className="hig-input text-sm font-bold" value={selectedRoute.agency_id} onChange={e => { setSelectedRoute({...selectedRoute, agency_id: parseInt(e.target.value)}); setIsDirty(true); }}>{agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                                        <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Route Type</label>
                                        <select className="hig-input text-sm font-bold" value={selectedRoute.route_type} onChange={e => { setSelectedRoute({...selectedRoute, route_type: parseInt(e.target.value)}); setIsDirty(true); }}>
                                            <option value={0}>Tram/Light Rail</option>
                                            <option value={1}>Subway/Metro</option>
                                            <option value={2}>Rail</option>
                                            <option value={3}>Bus</option>
                                            <option value={4}>Ferry</option>
                                            <option value={5}>Cable Tram</option>
                                            <option value={6}>Aerial Lift</option>
                                            <option value={7}>Funicular</option>
                                            <option value={11}>Trolleybus</option>
                                            <option value={12}>Monorail</option>
                                        </select></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Short Name</label><input className="hig-input text-sm font-bold" value={selectedRoute.short_name} onChange={e => { setSelectedRoute({...selectedRoute, short_name: e.target.value}); setIsDirty(true); }} /></div>
                                        <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Route Color</label>
                                        <div className="flex gap-2 items-center"><input type="color" className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0" value={`#${(selectedRoute.color || '007AFF').replace('#','')}`} onChange={e => { setSelectedRoute({...selectedRoute, color: e.target.value.replace('#','')}); setIsDirty(true); }} /><input className="hig-input font-mono text-xs p-2 h-10 uppercase" value={selectedRoute.color} onChange={e => { setSelectedRoute({...selectedRoute, color: e.target.value.replace('#','')}); setIsDirty(true); }} /></div></div>
                                    </div>
                                    <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Public Name</label><input className="hig-input text-sm font-bold" value={selectedRoute.long_name} onChange={e => { setSelectedRoute({...selectedRoute, long_name: e.target.value}); setIsDirty(true); }} /></div>
                                    <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Description</label><textarea className="hig-input text-sm font-bold min-h-[80px] py-2" value={selectedRoute.route_desc || ''} onChange={e => { setSelectedRoute({...selectedRoute, route_desc: e.target.value}); setIsDirty(true); }} /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Text Color</label>
                                        <div className="flex gap-2 items-center"><input type="color" className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0" value={`#${(selectedRoute.text_color || 'FFFFFF').replace('#','')}`} onChange={e => { setSelectedRoute({...selectedRoute, text_color: e.target.value.replace('#','')}); setIsDirty(true); }} /><input className="hig-input font-mono text-xs p-2 h-10 uppercase" value={selectedRoute.text_color || 'FFFFFF'} onChange={e => { setSelectedRoute({...selectedRoute, text_color: e.target.value.replace('#','')}); setIsDirty(true); }} /></div></div>
                                        <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Route URL</label><input className="hig-input text-sm font-bold" value={selectedRoute.route_url || ''} onChange={e => { setSelectedRoute({...selectedRoute, route_url: e.target.value}); setIsDirty(true); }} /></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section: Path Geometry */}
                        <div className="border-b border-black/5">
                            <button onClick={() => setActiveSection(activeSection === 'path' ? null : 'path')} className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02]">
                                <div className="flex items-center gap-3 text-xs uppercase tracking-widest font-black text-system-gray">
                                    <MapIcon size={14} className="text-system-blue" /> 2. Path Geometry
                                </div>
                                {activeSection === 'path' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {activeSection === 'path' && (
                                <div className="p-6 bg-system-blue/[0.02] space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={snapToRoads} className="py-3 bg-system-blue text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-blue-600 shadow-lg">{routing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} SNAP FULL PATH</button>
                                        <button onClick={snapPointsToRoads} className="py-3 bg-white border-2 border-system-blue text-system-blue rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-system-blue hover:text-white transition-all shadow-sm">{routing ? <Loader2 size={12} className="animate-spin" /> : <MapIcon size={12} />} SNAP ANCHORS</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={undo} disabled={history.length === 0} className="py-2 bg-white border border-black/10 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 disabled:opacity-30"><Undo2 size={12}/> UNDO</button>
                                        <button onClick={() => pushToHistory([])} className="py-2 bg-white border border-black/10 rounded-lg text-[10px] font-black text-red-500 flex items-center justify-center gap-1.5"><RotateCcw size={12}/> RESET</button>
                                    </div>
                                    <p className="text-[10px] text-system-gray italic leading-relaxed">Click map to drop anchors. Click path to insert. Drag node to move. Right-click node to delete.</p>
                                </div>
                            )}
                        </div>

                        {/* Section: Stop Sequence */}
                        <div className="border-b border-black/5">
                            <button onClick={() => setActiveSection(activeSection === 'sequence' ? null : 'sequence')} className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02]">
                                <div className="flex items-center gap-3 text-xs uppercase tracking-widest font-black text-system-gray">
                                    <MapPin size={14} className="text-system-blue" /> 3. Stop Sequence
                                </div>
                                {activeSection === 'sequence' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {activeSection === 'sequence' && (
                                <div className="p-6 bg-system-blue/[0.02] space-y-6">
                                    <button onClick={snapStopsToPath} className="w-full py-3 border-2 border-system-blue text-system-blue rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-system-blue hover:text-white transition-all shadow-sm"><Zap size={12} /> SNAP STOPS TO PATH</button>
                                    <Reorder.Group axis="y" values={assignedStops} onReorder={(newOrder) => { setAssignedStops(newOrder); setIsDirty(true); }} className="space-y-2">
                                        {assignedStops.map((rs, i) => (
                                            <Reorder.Item key={rs.stop_id} value={rs} className="flex items-center gap-3 p-3 bg-white rounded-xl cursor-grab border border-black/5 shadow-sm">
                                                <GripVertical size={14} className="text-black/20" /><div className="w-6 h-6 rounded-full bg-system-blue/10 flex items-center justify-center text-[10px] font-extrabold text-system-blue shrink-0">{i+1}</div>
                                                <div className="flex-1 font-bold text-[11px] truncate uppercase">{rs.stop?.name}</div>
                                                <button onClick={() => { setAssignedStops(assignedStops.filter((_, idx) => idx !== i)); setIsDirty(true); }} className="text-red-400 font-bold px-1">&times;</button>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                    <div className="pt-4 border-t border-black/5">
                                        <h4 className="text-[9px] font-black text-system-gray uppercase tracking-widest mb-3">Add to Line</h4>
                                        <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                                            {allStops.filter(s => !assignedStops.find(rs => rs.stop_id === s.id)).map(s => (
                                                <div key={s.id} className="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg cursor-pointer group transition-colors" onClick={() => { setAssignedStops([...assignedStops, {stop_id: s.id, stop: s, sequence: assignedStops.length+1, route_id: selectedRoute.id}]); setIsDirty(true); }}>
                                                    <span className="text-black/60 group-hover:text-system-blue text-[10px] font-black uppercase">{s.name}</span><Plus size={12} className="text-system-blue opacity-0 group-hover:opacity-100" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Actions */}
                        <div className="p-6 bg-white border-t border-black/5 sticky bottom-0">
                            <button onClick={() => saveChanges()} disabled={saving || !isDirty} className="w-full py-4 bg-system-blue text-white rounded-2xl font-black text-xs shadow-2xl flex items-center justify-center gap-3 hover:bg-blue-600 transition-all disabled:opacity-30">
                                {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} COMMIT CHANGES
                            </button>
                            {message && <div className={`mt-3 text-center text-[10px] font-black uppercase tracking-widest ${message.type === 'success' ? 'text-green-600' : 'text-red-500'} animate-pulse`}>{message.text}</div>}
                            <button onClick={() => setSelectedRoute(null)} className="w-full mt-3 py-2 text-[10px] font-black text-system-gray hover:text-black uppercase">Close Editor</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 px-6 border-b border-black/5 bg-white shrink-0 font-bold">
                            <div className="relative"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2 font-bold" placeholder="Search service lines..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                        </div>
                        <div className="divide-y divide-black/5">
                            {filteredRoutes.map(r => (
                                <div key={r.id} onClick={() => handleSelectRoute(r)} className={`p-4 hover:bg-black/[0.02] cursor-pointer transition-all flex items-center gap-3 group ${selectedRoute?.id === r.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm font-black text-[10px]" style={{ backgroundColor: `#${r.color}` }}>{r.short_name}</div>
                                    <div className="flex-1 min-w-0"><div className="text-sm text-black truncate leading-tight">{r.long_name}</div><div className="text-[10px] text-system-gray uppercase tracking-tighter">Line #{r.id}</div></div>
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RouteStudio;
