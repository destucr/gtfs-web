import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { MapPin, Plus, Trash2, Search, Filter, Loader2, CheckCircle2, ChevronRight, X, Layers, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import axios from 'axios';
import { SidebarHeader } from './SidebarHeader';
import { Route, Stop, RouteStop, Trip, ShapePoint } from '../types';

const Stops: React.FC = () => {
    const { setMapLayers, setOnMapClick, setStatus, quickMode, setQuickMode, sidebarOpen } = useWorkspace();
    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [stopRouteMap, setStopRouteMap] = useState<Record<number, Route[]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    
    // Editor State
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [formData, setFormData] = useState<Stop>({ id: 0, name: '', lat: 0, lon: 0 });
    const [activeTab, setActiveTab] = useState<'info' | 'bindings'>('info');
    const [isDirty, setIsDirty] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const initialFormData = useRef<string>('');

    const [loading, setLoading] = useState(true);
    const [isNaming, setIsNaming] = useState(false);
    const [focusedRouteId, setFocusedRouteId] = useState<number | null>(null);
    const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
    const [routeShapes, setRouteShapes] = useState<Record<number, [number, number][]>>({});
    const [hoveredRouteId, setHoveredRouteId] = useState<number | null>(null);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setStatus({ message: 'Syncing Inventory...', type: 'loading' });
        try {
            const [sRes, rRes, srRes] = await Promise.all([
                api.get('/stops'), api.get('/routes'), api.get('/stop-routes')
            ]);
            setStops(sRes.data || []);
            setRoutes(rRes.data || []);
            
            const map: Record<number, Route[]> = {};
            (srRes.data || []).forEach((assoc: RouteStop) => {
                if (!map[assoc.stop_id]) map[assoc.stop_id] = [];
                const r = (rRes.data || []).find((rt: Route) => rt.id === assoc.route_id);
                if (r) map[assoc.stop_id].push(r);
            });
            setStopRouteMap(map);
            setStatus(null);
        } catch (e) { setStatus({ message: 'Sync failed', type: 'error' }); } finally { setLoading(false); }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const handleRouteHover = async (routeId: number | null) => {
        setHoveredRouteId(routeId);
        if (routeId && !routeShapes[routeId]) {
            try {
                const tripsRes: { data: Trip[] } = await api.get('/trips');
                const routeTrips = tripsRes.data.filter(t => t.route_id === routeId);
                if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                    const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                    const poly = (shapeRes.data || []).sort((a:any,b:any)=>a.sequence-b.sequence).map((p:any)=>[p.lat, p.lon] as [number, number]);
                    setRouteShapes(prev => ({ ...prev, [routeId]: poly }));
                }
            } catch (e) { console.error(e); }
        }
    };

    // Handle Quick Mode Entry
    useEffect(() => {
        if (quickMode === 'add-stop' && !selectedStop) {
            handleAddNew();
        }
    }, [quickMode, selectedStop]);

    const handleMapClick = useCallback(async (latlng: { lat: number, lng: number }) => {
        if (selectedStop || quickMode === 'add-stop') {
            setFormData(prev => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
            setIsNaming(true);
            setStatus({ message: 'Analyzing location...', type: 'loading' });
            try {
                const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
                if (res.data) {
                    const name = res.data.name || res.data.display_name.split(',')[0];
                    setFormData(prev => ({ ...prev, name }));
                    setStatus({ message: `Identified: ${name}`, type: 'success' });
                    setTimeout(() => setStatus(null), 2000);
                }
            } catch (e) { setStatus({ message: 'Location identified', type: 'info' }); } finally { setIsNaming(false); }
        }
    }, [selectedStop, quickMode, setStatus]);

    useEffect(() => {
        setOnMapClick(() => handleMapClick);
        return () => setOnMapClick(null);
    }, [handleMapClick, setOnMapClick]);

    useEffect(() => {
        const current = JSON.stringify(formData);
        const dirty = current !== initialFormData.current && initialFormData.current !== '';
        setIsDirty(dirty);
        if (dirty) setStatus({ message: 'Pending changes', type: 'info', isDirty: true });
        else if (selectedStop) setStatus({ message: 'Synchronized', type: 'info', isDirty: false });
    }, [formData, selectedStop, setStatus]);

    const handleSave = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus({ message: 'Recording point...', type: 'loading' });
        try {
            if (selectedStop?.id) await api.put(`/stops/${selectedStop.id}`, formData);
            else await api.post('/stops', formData);
            initialFormData.current = JSON.stringify(formData);
            setIsDirty(false);
            setStatus({ message: 'Point synchronized', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (err) { setStatus({ message: 'Save failed', type: 'error' }); }
    }, [formData, selectedStop, fetchInitialData, setStatus]);

    const handleSelectStop = (stop: Stop) => {
        setQuickMode(null);
        setSelectedStop(stop);
        setFormData(stop);
        setActiveTab('info');
        initialFormData.current = JSON.stringify(stop);
    };

    const handleAddNew = () => {
        setQuickMode(null);
        const newStop = { id: 0, name: '', lat: 0, lon: 0 };
        setSelectedStop(newStop);
        setFormData(newStop);
        setActiveTab('info');
        initialFormData.current = JSON.stringify(newStop);
    };

    const toggleStopInRoute = async (stop: Stop, routeId: number) => {
        const currentRoutes = stopRouteMap[stop.id] || [];
        const isAssigned = currentRoutes.some(r => r.id === routeId);
        const newRouteIds = isAssigned ? currentRoutes.filter(r => r.id !== routeId).map(r => r.id) : [...currentRoutes.map(r => r.id), routeId];
        setStatus({ message: 'Updating binding...', type: 'loading' });
        try {
            await api.put(`/stops/${stop.id}/routes`, newRouteIds);
            setStatus({ message: 'Binding synced', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (e) { setStatus({ message: 'Update failed', type: 'error' }); }
    };

    useEffect(() => {
        setMapLayers(prev => ({
            ...prev,
            routes: selectedRouteIds.map(rid => ({
                id: rid, color: routes.find(r => r.id === rid)?.color || '007AFF',
                positions: routeShapes[rid] || [], isFocused: focusedRouteId === rid
            })),
            stops: stops.map(s => ({ ...s, isSmall: true, hidePopup: false })),
            focusedPoints: (formData.lat !== 0 && formData.lon !== 0) ? [[formData.lat, formData.lon]] : [],
            activeStop: (formData.lat !== 0 && formData.lon !== 0) ? { ...formData, isDraggable: true } : null,
            activeShape: [],
            previewRoute: hoveredRouteId ? {
                id: hoveredRouteId, color: routes.find(r => r.id === hoveredRouteId)?.color || '007AFF',
                positions: routeShapes[hoveredRouteId] || [], isFocused: false
            } : null
        }));
    }, [stops, selectedRouteIds, routeShapes, formData, routes, focusedRouteId, hoveredRouteId, setMapLayers]);

    const filteredStops = stops.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRoute = focusedRouteId ? (stopRouteMap[s.id] || []).some(r => r.id === focusedRouteId) : true;
        return matchesSearch && matchesRoute;
    });

    return (
        <div className="absolute inset-0 flex overflow-visible pointer-events-none font-bold">
            {/* Sidebar: Registry */}
            <div className="flex flex-col h-full bg-white relative z-20 overflow-hidden text-black border-r border-black/5 pointer-events-auto shadow-2xl" style={{ width: 400 }}>
                <SidebarHeader title="Inventory" Icon={MapPin} actions={<button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>} />
                
                <div className="p-4 px-6 border-b border-black/5 bg-white shrink-0">
                    <div className="relative"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2 font-bold" placeholder="Search inventory..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                    {focusedRouteId && (
                        <div className="mt-3 flex items-center justify-between animate-in slide-in-from-top-2">
                            <div className="bg-system-blue/10 text-system-blue px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter flex items-center gap-2"><Filter size={10}/> Line {routes.find(r=>r.id===focusedRouteId)?.short_name}</div>
                            <button onClick={() => setFocusedRouteId(null)} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear</button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredStops.map(stop => (
                        <div key={stop.id} className={`p-5 hover:bg-black/[0.02] cursor-pointer transition-all group flex items-center justify-between ${selectedStop?.id === stop.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => handleSelectStop(stop)}>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-sm text-black uppercase tracking-tight truncate mb-1">{stop.name}</div>
                                <div className="flex flex-wrap gap-1">{(stopRouteMap[stop.id] || []).map(r => (<div key={r.id} className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }} />))}</div>
                            </div>
                            <div className="flex gap-1 items-center shrink-0">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    {focusedRouteId && (
                                        <button onClick={(e) => { e.stopPropagation(); toggleStopInRoute(stop, focusedRouteId); }} className={`p-1.5 rounded-lg transition-all shadow-sm ${ (stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? 'bg-orange-500 text-white' : 'bg-system-blue text-white' }`}>{(stopRouteMap[stop.id] || []).some(r => r.id === focusedRouteId) ? <X size={14}/> : <Plus size={14}/>}</button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete node?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
                                </div>
                                <ChevronRight size={18} className={`text-system-gray ml-2 transition-all ${selectedStop?.id === stop.id ? 'translate-x-1 text-system-blue' : ''}`} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-black/5 bg-white shrink-0">
                    <h3 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3 flex items-center gap-2"><Layers size={12} /> Registry Filter</h3>
                    <div className="flex flex-wrap gap-2">
                        {routes.map(r => ( <button key={r.id} onClick={() => { if(focusedRouteId === r.id) setFocusedRouteId(null); else setFocusedRouteId(r.id); }} className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${focusedRouteId === r.id ? 'bg-black text-white border-black shadow-xl scale-105' : 'bg-white text-system-gray border-black/10 hover:border-black/20'}`}>{r.short_name}</button> ))}
                    </div>
                </div>
            </div>

            {/* Floating Node Hub */}
            {selectedStop && (
                <motion.div 
                    drag
                    dragMomentum={false}
                    className="absolute top-6 z-[3000] w-[450px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.2)] border border-black/5 flex flex-col transition-shadow duration-300 pointer-events-auto"
                    style={{ left: sidebarOpen ? 424 : 24, height: isCollapsed ? 'auto' : 'calc(100vh - 120px)' }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="p-8 pb-6 flex items-center justify-between shrink-0 cursor-move">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-orange-500 text-white shadow-xl shadow-orange-500/20 shrink-0"><MapPin size={24} /></div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black tracking-tight truncate leading-none mb-1.5">{formData.name || 'Unlabeled Node'}</h2>
                                <p className="text-[10px] font-black text-system-gray uppercase tracking-[0.2em] truncate opacity-60">ID: {selectedStop.id || 'NEW_RECORD'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-black/5 rounded-full text-system-gray transition-all">
                                {isCollapsed ? <Maximize2 size={18}/> : <Minimize2 size={18}/>}
                            </button>
                            <button onClick={() => setSelectedStop(null)} className="p-2.5 hover:bg-black/5 rounded-full text-system-gray transition-all hover:rotate-90"><X size={20}/></button>
                        </div>
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="px-8 py-2 shrink-0">
                                <div className="bg-black/5 p-1.5 rounded-[1.25rem] flex gap-1 border border-black/5">
                                    {(['info', 'bindings'] as const).map((tab) => (
                                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-system-blue shadow-sm scale-[1.02]' : 'text-system-gray hover:text-black'}`}>
                                            {tab === 'info' ? 'Specifications' : 'Line Bindings'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                                {activeTab === 'info' && (
                                    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Visual Label</label>
                                        <div className="relative"><input className="hig-input text-sm font-bold pr-10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />{isNaming && <Loader2 size={14} className="animate-spin absolute right-3 top-3 text-system-blue" />}</div></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Latitude</label><input type="number" step="any" className="hig-input text-xs font-mono" value={formData.lat} onChange={e => setFormData({...formData, lat: parseFloat(e.target.value)})} required /></div>
                                            <div><label className="text-[10px] font-black uppercase mb-1.5 block text-system-gray opacity-60">Longitude</label><input type="number" step="any" className="hig-input text-xs font-mono" value={formData.lon} onChange={e => setFormData({...formData, lon: parseFloat(e.target.value)})} required /></div>
                                        </div>
                                        <div className="p-6 bg-black/[0.03] rounded-[2rem] border border-black/5 text-center">
                                            <p className="text-[10px] text-system-gray leading-relaxed font-bold uppercase tracking-tight">Relocate by dragging the orange marker directly on the map.</p>
                                        </div>
                                        <button type="submit" disabled={!isDirty} className="w-full bg-system-blue text-white py-5 rounded-2xl font-black text-[11px] shadow-2xl shadow-system-blue/30 transition-all disabled:opacity-30 uppercase tracking-widest active:scale-95">Commit Node Position</button>
                                    </form>
                                )}

                                {activeTab === 'bindings' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center justify-between mb-4 px-1"><h4 className="text-[10px] font-black text-system-gray uppercase tracking-[0.2em]">Network Integration</h4><span className="text-[9px] font-black text-system-blue bg-system-blue/5 px-2 py-0.5 rounded-full">ONE-CLICK SYNC</span></div>
                                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                            {routes.map(r => {
                                                const isAssigned = (stopRouteMap[selectedStop.id] || []).some(assigned => assigned.id === r.id);
                                                return (
                                                    <div key={r.id} onMouseEnter={() => handleRouteHover(r.id)} onMouseLeave={() => handleRouteHover(null)} onClick={async () => {
                                                        const currentIds = (stopRouteMap[selectedStop.id] || []).map(assigned => assigned.id);
                                                        const newIds = isAssigned ? currentIds.filter(id => id !== r.id) : [...currentIds, r.id];
                                                        setStatus({ message: 'Syncing...', type: 'loading' });
                                                        try { await api.put(`/stops/${selectedStop.id}/routes`, newIds); fetchInitialData(); setStatus({ message: 'Synced', type: 'success' }); setTimeout(()=>setStatus(null), 1000); } catch(e) {}
                                                    }} className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${isAssigned ? 'border-system-blue bg-system-blue/5 shadow-lg shadow-system-blue/10 scale-[1.02]' : 'border-black/5 bg-white hover:border-black/10'}`}>
                                                        <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }} /><span className="font-black text-xs tracking-tight text-black">{r.short_name} &mdash; {r.long_name}</span></div>
                                                        {isAssigned ? <CheckCircle2 size={18} className="text-system-blue" /> : <Plus size={18} className="text-system-gray opacity-20 group-hover:opacity-100" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default Stops;
