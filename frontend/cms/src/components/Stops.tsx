import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { MapPin, Plus, Trash2, Search, Filter, Loader2, CheckCircle2, ChevronLeft, ChevronRight, Save, X, Layers, RotateCcw } from 'lucide-react';
import api from '../api';
import axios from 'axios';
import { Route, Stop, RouteStop, Trip, ShapePoint } from '../types';
import { Badge, Modal } from 'react-bootstrap';

const Stops: React.FC = () => {
    const { setMapLayers, sidebarOpen, setSidebarOpen, setOnMapClick } = useWorkspace();
    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [stopRouteMap, setStopRouteMap] = useState<Record<number, Route[]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    
    // Form State
    const [formData, setFormData] = useState<{ name: string, lat: number | '', lon: number | '' }>({ name: '', lat: '', lon: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [addFormOpen, setAddFormOpen] = useState(true);
    
    const [loading, setLoading] = useState(true);
    const [isNaming, setIsNaming] = useState(false);
    const [focusedRouteId, setFocusedRouteId] = useState<number | null>(null);
    const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
    const [routeShapes, setRouteShapes] = useState<Record<number, [number, number][]>>({});
    
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeAssignment, setActiveAssignment] = useState<{ stop: Stop | null, routeIds: number[] }>({ stop: null, routeIds: [] });
    const [inlineEdit, setInlineEdit] = useState<{ id: number, field: string, value: string } | null>(null);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
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
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const handleMapClick = useCallback(async (latlng: { lat: number, lng: number }) => {
        setFormData(prev => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
        setIsNaming(true);
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
            if (res.data) {
                setFormData(prev => ({ ...prev, name: res.data.name || res.data.display_name.split(',')[0] }));
            }
        } catch (e) { console.error(e); } finally { setIsNaming(false); }
    }, []);

    useEffect(() => {
        setOnMapClick(() => handleMapClick);
        return () => setOnMapClick(null);
    }, [handleMapClick, setOnMapClick]);

    const handleSave = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (formData.lat === '' || formData.lon === '') return;
        const payload = { 
            name: formData.name, 
            lat: formData.lat, 
            lon: formData.lon 
        };
        try {
            if (editingId) await api.put(`/stops/${editingId}`, payload);
            else await api.post('/stops', payload);
            clearSelection();
            fetchInitialData();
        } catch (err) { console.error(err); }
    }, [formData, editingId, fetchInitialData]);

    const clearSelection = () => {
        setEditingId(null);
        setFormData({ name: '', lat: '', lon: '' });
    };

    const toggleRouteFocus = async (routeId: number) => {
        if (focusedRouteId === routeId) {
            setFocusedRouteId(null);
            setSelectedRouteIds(prev => prev.filter(rid => rid !== routeId));
        } else {
            setFocusedRouteId(routeId);
            setAddFormOpen(false);
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
        await api.put(`/stops/${activeAssignment.stop.id}/routes`, activeAssignment.routeIds);
        setShowAssignModal(false);
        fetchInitialData();
    };

    const handleInlineSave = async (stop: Stop, field: string, value: string) => {
        const updatedStop = { ...stop, [field]: field === 'name' ? value : parseFloat(value) };
        await api.put(`/stops/${stop.id}`, updatedStop);
        setStops(stops.map(s => s.id === stop.id ? updatedStop : s));
        setInlineEdit(null);
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
            stops: stops.map(s => ({
                ...s,
                isSmall: true,
                hidePopup: false
            })),
            focusedPoints: editingId && formData.lat !== '' && formData.lon !== '' ? [[formData.lat as number, formData.lon as number]] : [],
            activeStop: (formData.lat !== '' && formData.lon !== '') ? {
                id: editingId || 0,
                name: formData.name,
                lat: formData.lat as number,
                lon: formData.lon as number,
                isDraggable: true
            } : null,
            activeShape: []
        }));
    }, [stops, selectedRouteIds, routeShapes, editingId, formData, routes, focusedRouteId, setMapLayers]);

    const filteredStops = stops.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRoute = focusedRouteId ? (stopRouteMap[s.id] || []).some(r => r.id === focusedRouteId) : true;
        return matchesSearch && matchesRoute;
    });

    if (loading && stops.length === 0) return <div className="flex h-screen items-center justify-center font-black text-system-gray animate-pulse flex-col gap-4">SYNCING INVENTORY...</div>;

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl relative z-20 overflow-hidden font-bold" style={{ width: sidebarOpen ? '450px' : '0', transition: 'width 0.3s ease' }}>
            <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0">
                <h1 className="text-xl font-black tracking-tight text-black leading-none">Stops Inventory</h1>
                <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setAddFormOpen(true); clearSelection(); }} className={`p-2 rounded-lg transition-colors ${addFormOpen && !editingId ? 'bg-system-blue text-white' : 'hover:bg-black/5 text-system-gray'}`} title="Add New Stop"><Plus size={20}/></button>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray transition-colors"><ChevronLeft size={20}/></button>
                </div>
            </div>

            <div className={`transition-all duration-500 overflow-hidden shrink-0 ${addFormOpen || editingId ? 'max-h-[400px]' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                <div className="p-6 bg-system-blue/5 border-b border-system-blue/10 font-bold text-black">
                    <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">{editingId ? 'Modify Record' : 'Register New Station'}</h3>
                    <form onSubmit={handleSave} className="space-y-3 font-bold">
                        <div className="relative">
                            <input className="hig-input text-sm pr-10 font-bold" placeholder="Point Label..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            {isNaming && <Loader2 size={14} className="animate-spin absolute right-3 top-3 text-system-blue" />}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative"><input type="number" step="any" className="hig-input text-xs font-mono pl-8" placeholder="Lat" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value === '' ? '' : parseFloat(e.target.value)})} required /><div className="absolute left-2 top-2.5 text-[9px] opacity-40">LAT</div></div>
                            <div className="relative"><input type="number" step="any" className="hig-input text-xs font-mono pl-8" placeholder="Lon" value={formData.lon} onChange={e => setFormData({...formData, lon: e.target.value === '' ? '' : parseFloat(e.target.value)})} required /><div className="absolute left-2 top-2.5 text-[9px] opacity-40">LON</div></div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button type="submit" className="flex-1 bg-system-blue text-white py-2.5 rounded-lg font-black text-[10px] shadow-lg"> {editingId ? 'COMMIT ADJUSTMENTS' : 'REGISTER POINT'} </button>
                            {(editingId || formData.lat !== '') && <button type="button" onClick={clearSelection} className="px-4 bg-white border border-black/10 rounded-lg text-[10px] font-black uppercase"><X size={14} /></button>}
                        </div>
                    </form>
                </div>
            </div>

            <div className="p-4 border-b border-black/5 bg-white sticky top-0 z-10 shrink-0 font-bold text-black">
                <div className="relative"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2 font-bold" placeholder={focusedRouteId ? "Search stops on line..." : "Search inventory..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                {focusedRouteId && (
                    <div className="mt-3 flex items-center justify-between font-bold text-black">
                        <Badge className="bg-system-blue/10 text-system-blue border-none px-2 py-1 text-[10px] font-black flex items-center gap-1.5 uppercase tracking-tighter"><Filter size={10}/> Filtering by Line {routes.find(r=>r.id===focusedRouteId)?.short_name}</Badge>
                        <button onClick={() => setFocusedRouteId(null)} className="text-[10px] font-black text-red-500 hover:underline uppercase">Clear Filter</button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-black/5 font-bold text-black">
                {filteredStops.map(stop => (
                    <div key={stop.id} className={`p-4 hover:bg-black/[0.02] cursor-pointer transition-colors group ${editingId === stop.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => { setEditingId(stop.id); setFormData({name: stop.name, lat: stop.lat, lon: stop.lon}); }}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                                <div onDoubleClick={(e) => { e.stopPropagation(); setInlineEdit({ id: stop.id, field: 'name', value: stop.name }); }}>
                                    {inlineEdit?.id === stop.id && inlineEdit?.field === 'name' ? (
                                        <input autoFocus className="hig-input py-1 h-8" value={inlineEdit.value} onClick={e => e.stopPropagation()} onChange={e => setInlineEdit({...inlineEdit, value: e.target.value})} onBlur={() => handleInlineSave(stop, 'name', inlineEdit.value)} onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(stop, 'name', inlineEdit.value)} />
                                    ) : ( <div className="font-black text-sm text-black uppercase tracking-tight truncate">{stop.name}</div> )}
                                </div>
                                <div className="text-[9px] font-mono text-system-gray uppercase tracking-widest mt-0.5">{Number(stop.lat).toFixed(6)}, {Number(stop.lon).toFixed(6)}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); setActiveAssignment({ stop, routeIds: (stopRouteMap[stop.id] || []).map(r=>r.id) }); setShowAssignModal(true); }} className="p-1.5 bg-system-blue/10 text-system-blue rounded-md hover:bg-system-blue hover:text-white transition-all shadow-sm"><Plus size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete point?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1">{(stopRouteMap[stop.id] || []).map(r => (<span key={r.id} className={`px-2 py-0.5 rounded text-[8px] font-black text-white shadow-sm uppercase tracking-tighter ${focusedRouteId === r.id ? 'ring-2 ring-black/20 scale-110' : ''}`} style={{ backgroundColor: `#${r.color}` }}>{r.short_name}</span>))}</div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-black/5 bg-white shrink-0 font-bold text-black">
                <h3 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3 flex items-center gap-2"><Layers size={12} /> Focus Station List</h3>
                <div className="flex flex-wrap gap-2">
                    {routes.map(r => ( <button key={r.id} onClick={() => toggleRouteFocus(r.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${focusedRouteId === r.id ? 'bg-black text-white border-black scale-110 shadow-xl' : 'bg-white text-system-gray border-black/10 hover:border-black/20'}`}>{r.short_name}</button> ))}
                </div>
            </div>

            {showAssignModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-bold">
                    <div className="hig-card w-full max-w-md shadow-2xl p-8 bg-white animate-in fade-in zoom-in duration-200">
                        <h3 className="text-2xl font-black mb-2 text-black text-primary">Route Binding</h3>
                        <p className="text-system-gray text-sm mb-8 font-medium">Which lines pass through <span className="text-black font-black underline">{activeAssignment.stop?.name}</span>?</p>
                        <div className="space-y-2 mb-10 max-h-80 overflow-y-auto pr-2 text-black">
                            {routes.map(r => (
                                <div key={r.id} onClick={() => { const ids = activeAssignment.routeIds.includes(r.id) ? activeAssignment.routeIds.filter(id => id !== r.id) : [...activeAssignment.routeIds, r.id]; setActiveAssignment({ ...activeAssignment, routeIds: ids }); }} className={`p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all border-2 ${activeAssignment.routeIds.includes(r.id) ? 'border-system-blue bg-system-blue/5' : 'border-transparent bg-black/5 hover:bg-black-[0.08]'}`}>
                                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }}></div><span className="font-bold text-sm tracking-tight">{r.short_name} - {r.long_name}</span></div>
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
