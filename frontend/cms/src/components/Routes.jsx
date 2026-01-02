import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Info, Map as MapIcon, MapPin, Plus, Save, RotateCcw, Zap, ChevronRight, ChevronLeft, Bus, Loader2, GripVertical, Undo2, Layers, Settings2, Search, X, Maximize2, Minimize2, CheckCircle2 } from 'lucide-react';
import { Reorder } from 'framer-motion';
import api from '../api';
import axios from 'axios';

const RouteStudio = () => {
    const { setMapLayers } = useWorkspace();
    const [routes, setRoutes] = useState([]);
    const [allStops, setAllStops] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [shapePoints, setShapePoints] = useState([]);
    const [assignedStops, setAssignedStops] = useState([]);
    const [history, setHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [activeTab, setActiveTab] = useState('metadata'); 
    const [globalLoading, setGlobalLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [panelMinimized, setPanelMinimized] = useState(false);
    const [saving, setSaving] = useState(false);
    const [routing, setRouting] = useState(false);
    const [message, setMessage] = useState(null);
    const [isDirty, setIsDirty] = useState(false);

    // --- Undo Logic ---
    const pushToHistory = useCallback((newPoints) => {
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

    // --- SYNC TO GLOBAL MAP ---
    useEffect(() => {
        setMapLayers(prev => ({
            ...prev,
            routes: selectedRoute ? [{
                id: selectedRoute.id,
                color: selectedRoute.color,
                positions: shapePoints.map(p => [p.lat, p.lon]),
                isFocused: true
            }] : [],
            stops: assignedStops.map(rs => ({
                ...rs.stop,
                hidePopup: false
            })),
            activeShape: activeTab === 'shape' ? shapePoints : [],
            focusedPoints: shapePoints.length > 0 ? shapePoints.map(p => [p.lat, p.lon]) : []
        }));
    }, [selectedRoute, shapePoints, assignedStops, activeTab, setMapLayers]);

    const saveCurrentTask = useCallback(async (isAuto = false) => {
        if (!selectedRoute) return;
        setSaving(true);
        try {
            if (activeTab === 'metadata') {
                if (selectedRoute.id) await api.put(`/routes/${selectedRoute.id}`, selectedRoute);
                else if (!isAuto) {
                    const res = await api.post('/routes', selectedRoute);
                    setSelectedRoute(res.data);
                }
                await refreshAllData();
            } else if (activeTab === 'shape') {
                const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${selectedRoute.id}`;
                await api.put(`/shapes/${sId}`, shapePoints.map(p => ({ ...p, shape_id: sId })));
                const trips = await api.get('/trips');
                if (!trips.data.find(t => t.route_id === selectedRoute.id)) {
                    await api.post('/trips', { route_id: selectedRoute.id, headsign: selectedRoute.long_name, shape_id: sId });
                }
            } else {
                const reordered = assignedStops.map((s, i) => ({ ...s, sequence: i + 1 }));
                await api.put(`/routes/${selectedRoute.id}/stops`, reordered);
            }
            setIsDirty(false);
            if (!isAuto) setMessage({ type: 'success', text: 'Changes synced' });
            setTimeout(() => setMessage(null), 3000);
        } finally { setSaving(false); }
    }, [selectedRoute, activeTab, shapePoints, assignedStops, refreshAllData]);

    useEffect(() => {
        if (!isDirty || !selectedRoute?.id) return;
        const timer = setTimeout(() => saveCurrentTask(true), 2000);
        return () => clearTimeout(timer);
    }, [isDirty, shapePoints, assignedStops, selectedRoute, saveCurrentTask]);

    const snapToRoads = useCallback(async () => {
        if (shapePoints.length < 2) return;
        setRouting(true);
        const coords = shapePoints.map(p => `${p.lon},${p.lat}`).join(';');
        try {
            const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
            pushToHistory(res.data.routes[0].geometry.coordinates.map((c, i) => ({ lat: c[1], lon: c[0], sequence: i + 1 })));
        } catch (e) { console.error(e); } finally { setRouting(false); }
    }, [shapePoints, pushToHistory]);

    const handleSelectRoute = async (route) => {
        if (isDirty) await saveCurrentTask(true);
        setSelectedRoute(route);
        setActiveTab('metadata');
        setIsDirty(false);
        try {
            const [tripsRes, stopsRes] = await Promise.all([
                api.get('/trips'), api.get(`/routes/${route.id}/stops`)
            ]);
            setAssignedStops(stopsRes.data || []);
            const trip = tripsRes.data.find(t => t.route_id === route.id);
            if (trip?.shape_id) {
                const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                setShapePoints((shapeRes.data || []).sort((a, b) => a.sequence - b.sequence));
            } else { setShapePoints([]); }
        } catch (e) { console.error(e); }
    };

    const filteredRoutes = routes.filter(r => 
        r.short_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.long_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddNew = () => {
        setSelectedRoute({ short_name: '', long_name: '', color: '007AFF', agency_id: agencies[0]?.id || '' });
        setShapePoints([]); setAssignedStops([]); setActiveTab('metadata'); setIsDirty(true);
    };

    if (globalLoading) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse flex-col gap-4"><Loader2 className="animate-spin text-system-blue" size={32} /> INITIALIZING STUDIO...</div>;

    return (
        <div className="flex h-full bg-white shadow-2xl relative z-20 overflow-hidden" style={{ width: sidebarOpen ? '320px' : '0', transition: 'width 0.3s ease' }}>
            <div className="flex flex-col w-[320px] h-full shrink-0">
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                    <h1 className="text-xl font-black tracking-tight text-black">Transit Lines</h1>
                    <div className="flex gap-2">
                        <button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>
                        <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
                    </div>
                </div>

                <div className="p-4 border-b border-black/5 bg-white font-bold">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-3 text-system-gray" />
                        <input className="hig-input text-sm pl-9 py-2" placeholder="Search lines..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5 font-bold">
                    {filteredRoutes.map(r => (
                        <div key={r.id} onClick={() => handleSelectRoute(r)} className={`p-4 hover:bg-black/[0.02] cursor-pointer transition-all flex items-center gap-3 group ${selectedRoute?.id === r.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm font-black text-[10px]" style={{ backgroundColor: `#${r.color}` }}>{r.short_name}</div>
                            <div className="flex-1 min-w-0"><div className="text-sm text-black truncate">{r.long_name}</div><div className="text-[10px] text-system-gray uppercase tracking-tighter">Line #{r.id}</div></div>
                            <ChevronRight size={14} className={`transition-all ${selectedRoute?.id === r.id ? 'text-system-blue translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                        </div>
                    ))}
                </div>

                {/* Right Panel Integrated when visible */}
                {selectedRoute && (
                    <div className={`absolute top-6 left-[340px] bottom-6 ${panelMinimized ? 'w-14 overflow-hidden' : 'w-[400px]'} z-[1000] flex flex-col pointer-events-none transition-all duration-500 ease-in-out font-bold`}>
                        <div className="hig-card shadow-2xl flex flex-col h-full pointer-events-auto overflow-hidden bg-white/95 backdrop-blur-xl border border-black/5">
                            <div className="p-5 border-b border-black/5 flex items-center justify-between bg-black/[0.02]">
                                <div className={`flex items-center gap-3 transition-opacity ${panelMinimized ? 'opacity-0' : 'opacity-100'}`}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black" style={{ backgroundColor: `#${selectedRoute.color}` }}>{selectedRoute.short_name}</div>
                                    <div className="min-w-0"><div className="text-sm font-black text-black truncate max-w-[180px]">{selectedRoute.long_name || 'New Route'}</div>
                                    <div className="flex items-center gap-2">{saving ? <div className="text-system-blue animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin"/><span className="text-[9px]">Syncing...</span></div> : <div className="text-green-600 flex items-center gap-1"><CheckCircle2 size={10}/><span className="text-[9px]">Synced</span></div>}</div></div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setPanelMinimized(!panelMinimized)} className="p-2 hover:bg-black/5 rounded-full text-system-gray">{panelMinimized ? <Maximize2 size={18}/> : <Minimize2 size={18}/>}</button>
                                    {!panelMinimized && <button onClick={() => setSelectedRoute(null)} className="p-2 hover:bg-black/5 rounded-full text-system-gray"><X size={18}/></button>}
                                </div>
                            </div>
                            {!panelMinimized && (
                                <>
                                    <div className="px-5 py-4 border-b border-black/5"><div className="segmented-control">
                                        <div onClick={() => { if (isDirty) saveCurrentTask(true); setActiveTab('metadata'); }} className={`segmented-item ${activeTab === 'metadata' ? 'active' : ''}`}>Info</div>
                                        <div onClick={() => { if (isDirty) saveCurrentTask(true); setActiveTab('shape'); }} className={`segmented-item ${activeTab === 'shape' ? 'active' : ''}`}>Path</div>
                                        <div onClick={() => { if (isDirty) saveCurrentTask(true); setActiveTab('stops'); }} className={`segmented-item ${activeTab === 'stops' ? 'active' : ''}`}>Sequence</div>
                                    </div></div>
                                    <div className="flex-1 overflow-y-auto p-5">
                                        {activeTab === 'metadata' && (
                                            <div className="space-y-5">
                                                <div><label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-system-gray">Operator</label><select className="hig-input text-sm font-bold" value={selectedRoute.agency_id} onChange={e => { setSelectedRoute({...selectedRoute, agency_id: parseInt(e.target.value)}); setIsDirty(true); }}>{agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                                                <div><label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-system-gray">Short Name</label><input className="hig-input text-sm font-bold" value={selectedRoute.short_name} onChange={e => { setSelectedRoute({...selectedRoute, short_name: e.target.value}); setIsDirty(true); }} /></div>
                                                <div><label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-system-gray">Display Name</label><input className="hig-input text-sm font-bold" value={selectedRoute.long_name} onChange={e => { setSelectedRoute({...selectedRoute, long_name: e.target.value}); setIsDirty(true); }} /></div>
                                                <div><label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-system-gray">Brand Color</label><div className="flex gap-3"><div className="relative flex-1"><input className="hig-input font-mono text-sm pl-8" value={selectedRoute.color.replace('#','')} onChange={e => { setSelectedRoute({...selectedRoute, color: e.target.value.replace('#','')}); setIsDirty(true); }} /><div className="absolute left-3 top-1/2 -translate-y-1/2 text-system-gray font-mono text-xs">#</div></div><input type="color" className="w-12 h-12 rounded-xl shrink-0 cursor-pointer bg-transparent border-none shadow-lg" value={`#${selectedRoute.color.replace('#','')}`} onChange={e => { setSelectedRoute({...selectedRoute, color: e.target.value.replace('#','')}); setIsDirty(true); }} /></div></div>
                                            </div>
                                        )}
                                        {activeTab === 'shape' && (
                                            <div className="space-y-6">
                                                <div className="p-4 bg-system-blue/5 rounded-2xl border border-system-blue/10">
                                                    <button onClick={snapToRoads} className="w-full py-3 bg-system-blue text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-blue-600 shadow-lg mb-3">{routing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} SNAP PATH TO ROADS</button>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button onClick={undo} disabled={history.length === 0} className="py-2.5 bg-white border border-black/10 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 disabled:opacity-30 hover:bg-black/5"><Undo2 size={12}/> UNDO</button>
                                                        <button onClick={() => pushToHistory([])} className="py-2.5 bg-white border border-black/10 rounded-lg text-[10px] font-black text-red-500 flex items-center justify-center gap-1.5 hover:bg-red-50 transition-all"><RotateCcw size={12}/> RESET</button>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-system-gray leading-relaxed font-semibold bg-black/[0.03] p-4 rounded-xl border border-black/5">Click map to add nodes. Use Snap tool to trace road network.</p>
                                            </div>
                                        )}
                                        {activeTab === 'stops' && (
                                            <div className="space-y-6 flex flex-col h-full overflow-hidden">
                                                <div className="flex-1 flex flex-col overflow-hidden min-h-[250px]">
                                                    <h4 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3">Sequence</h4>
                                                    <Reorder.Group axis="y" values={assignedStops} onReorder={(newOrder) => { setAssignedStops(newOrder); setIsDirty(true); }} className="flex-1 overflow-y-auto space-y-2 pr-2 font-bold">
                                                        {assignedStops.map((rs, i) => (
                                                            <Reorder.Item key={rs.stop_id} value={rs} className="flex items-center gap-3 p-3 bg-system-background rounded-xl cursor-grab border border-black/5 shadow-sm">
                                                                <GripVertical size={14} className="text-black/20" /><div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-extrabold shadow-sm shrink-0">{i+1}</div>
                                                                <div className="flex-1 font-bold text-xs truncate uppercase tracking-tighter">{rs.stop?.name}</div>
                                                                <button onClick={() => { setAssignedStops(assignedStops.filter((_, idx) => idx !== i)); setIsDirty(true); }} className="text-red-400 font-bold p-1">&times;</button>
                                                            </Reorder.Item>
                                                        ))}
                                                    </Reorder.Group>
                                                </div>
                                                <div className="flex-1 flex flex-col overflow-hidden border-t border-black/5 pt-6">
                                                    <h4 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3 font-bold">Add Stops</h4>
                                                    <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                                                        {allStops.filter(s => !assignedStops.find(rs => rs.stop_id === s.id)).map(s => (
                                                            <div key={s.id} className="flex items-center justify-between p-2.5 hover:bg-black/5 rounded-lg cursor-pointer group transition-colors" onClick={() => { setAssignedStops([...assignedStops, {stop_id: s.id, stop: s, sequence: assignedStops.length+1}]); setIsDirty(true); }}>
                                                                <span className="text-black/60 group-hover:text-system-blue text-[10px] font-black uppercase tracking-tighter">{s.name}</span><Plus size={14} className="text-system-blue opacity-0 group-hover:opacity-100" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 border-t border-black/5 bg-black/[0.02]"><button onClick={() => saveCurrentTask()} className="w-full py-4 bg-system-blue text-white rounded-2xl font-black text-xs shadow-2xl flex items-center justify-center gap-3 hover:bg-blue-600 transition-all"> <Save size={16}/> FORCE SYNC TO CLOUD </button></div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteStudio;
