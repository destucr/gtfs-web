import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { MapPin, Plus, Trash2, Search, Filter, Loader2, CheckCircle2, ChevronLeft, ChevronRight, LocateFixed, Save, X, Minimize2, Maximize2, Layers } from 'lucide-react';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';

const Stops = () => {
    const { mapLayers, setMapLayers } = useWorkspace();
    const [stops, setStops] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [stopRouteMap, setStopRouteMap] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    
    // Form State
    const [formData, setFormData] = useState({ name: '', lat: '', lon: '' });
    const [editingId, setEditingId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [hudMinimized, setHudMinimized] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [isNaming, setIsNaming] = useState(false);
    const [selectedRouteIds, setSelectedRouteIds] = useState([]);
    const [routeShapes, setRouteShapes] = useState({});
    
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeAssignment, setActiveAssignment] = useState({ stop: null, routeIds: [] });
    const [inlineEdit, setInlineEdit] = useState(null);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [sRes, rRes, srRes] = await Promise.all([
                api.get('/stops'), api.get('/routes'), api.get('/stop-routes')
            ]);
            setStops(sRes.data || []);
            setRoutes(rRes.data || []);
            const map = {};
            (srRes.data || []).forEach(assoc => {
                if (!map[assoc.stop_id]) map[assoc.stop_id] = [];
                const r = (rRes.data || []).find(rt => rt.id === assoc.route_id);
                if (r) map[assoc.stop_id].push(r);
            });
            setStopRouteMap(map);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // Sync layers to global map
    useEffect(() => {
        setMapLayers(prev => ({
            ...prev,
            routes: selectedRouteIds.map(id => ({
                id,
                color: routes.find(r => r.id === id)?.color || '007AFF',
                positions: routeShapes[id] || [],
                isFocused: false
            })),
            stops: stops.map(s => ({
                ...s,
                isSmall: true,
                hidePopup: false
            })),
            focusedPoints: editingId ? [[formData.lat, formData.lon]] : []
        }));
    }, [stops, selectedRouteIds, routeShapes, editingId, formData, routes, setMapLayers]);

    const handleSave = useCallback(async (e) => {
        if (e) e.preventDefault();
        if (!formData.lat || !formData.lon) return;
        const payload = { ...formData, lat: parseFloat(formData.lat), lon: parseFloat(formData.lon) };
        try {
            if (editingId) await api.put(`/stops/${editingId}`, payload);
            else await api.post('/stops', payload);
            setFormData({ name: '', lat: '', lon: '' });
            setEditingId(null);
            fetchInitialData();
        } catch (err) { console.error(err); }
    }, [formData, editingId, fetchInitialData]);

    const toggleRouteFilter = async (routeId) => {
        const id = parseInt(routeId);
        if (selectedRouteIds.includes(id)) {
            setSelectedRouteIds(selectedRouteIds.filter(rid => rid !== id));
        } else {
            setSelectedRouteIds([...selectedRouteIds, id]);
            if (!routeShapes[id]) {
                const tripsRes = await api.get('/trips');
                const routeTrips = tripsRes.data.filter(t => t.route_id === id);
                if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                    const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                    setRouteShapes(prev => ({ ...prev, [id]: shapeRes.data.sort((a,b)=>a.sequence-b.sequence).map(p=>[p.lat, p.lon]) }));
                }
            }
        }
    };

    const handleInlineSave = async (stop, field, value) => {
        const updatedStop = { ...stop, [field]: field === 'name' ? value : parseFloat(value) };
        await api.put(`/stops/${stop.id}`, updatedStop);
        setStops(stops.map(s => s.id === stop.id ? updatedStop : s));
        setInlineEdit(null);
    };

    const filteredStops = stops.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl relative z-20 overflow-hidden" style={{ width: sidebarOpen ? '450px' : '0', transition: 'width 0.3s ease' }}>
            <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0">
                <h1 className="text-xl font-black tracking-tight">Stops Inventory</h1>
                <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
            </div>

            <div className="p-6 bg-system-blue/5 border-b border-system-blue/10 shrink-0">
                <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">
                    {editingId ? 'Modify Record' : 'Register New Station'}
                </h3>
                <form onSubmit={handleSave} className="space-y-3 font-bold">
                    <div className="relative">
                        <input className="hig-input text-sm pr-10" placeholder="Point Label..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        {isNaming && <Loader2 size={14} className="animate-spin absolute right-3 top-3 text-system-blue" />}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" step="any" className="hig-input text-xs font-mono" placeholder="Lat" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} required />
                        <input type="number" step="any" className="hig-input text-xs font-mono" placeholder="Lon" value={formData.lon} onChange={e => setFormData({...formData, lon: e.target.value})} required />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button type="submit" className="flex-1 bg-system-blue text-white py-2.5 rounded-lg font-black text-[10px] shadow-lg shadow-system-blue/20">
                            {editingId ? 'COMMIT ADJUSTMENTS' : 'REGISTER POINT'} <span className="opacity-40 ml-1">^S</span>
                        </button>
                        {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'', lat:'', lon:''})}} className="px-4 bg-white border border-black/10 rounded-lg text-[10px] font-black uppercase">Cancel</button>}
                    </div>
                </form>
            </div>

            <div className="p-4 border-b border-black/5 bg-white sticky top-0 z-10 font-bold shrink-0">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-3 text-system-gray" />
                    <input className="hig-input text-sm pl-9 py-2" placeholder="Search points..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                {filteredStops.map(stop => (
                    <div key={stop.id} className={`p-4 hover:bg-black/[0.02] cursor-pointer transition-colors group ${editingId === stop.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`} onClick={() => { setEditingId(stop.id); setFormData({name: stop.name, lat: stop.lat, lon: stop.lon}); }}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                                <div onDoubleClick={(e) => { e.stopPropagation(); setInlineEdit({ id: stop.id, field: 'name', value: stop.name }); }}>
                                    {inlineEdit?.id === stop.id && inlineEdit?.field === 'name' ? (
                                        <input autoFocus className="hig-input py-1 h-8" value={inlineEdit.value} onClick={e => e.stopPropagation()} onChange={e => setInlineEdit({...inlineEdit, value: e.target.value})} onBlur={() => handleInlineSave(stop, 'name', inlineEdit.value)} onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(stop, 'name', inlineEdit.value)} />
                                    ) : (
                                        <div className="font-black text-sm text-black">{stop.name}</div>
                                    )}
                                </div>
                                <div className="text-[9px] font-mono text-system-gray uppercase tracking-widest mt-0.5">{stop.lat.toFixed(6)}, {stop.lon.toFixed(6)}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setActiveAssignment({ stop, routeIds: (stopRouteMap[stop.id] || []).map(r=>r.id) }); setShowAssignModal(true); }} className="p-1.5 bg-system-blue/10 text-system-blue rounded-md hover:bg-system-blue hover:text-white transition-all shadow-sm"><Plus size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete point?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }} className="p-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1">{(stopRouteMap[stop.id] || []).map(r => (<span key={r.id} className="px-2 py-0.5 rounded text-[8px] font-black text-white shadow-sm uppercase tracking-tighter" style={{ backgroundColor: `#${r.color}` }}>{r.short_name}</span>))}</div>
                    </div>
                ))}
            </div>

            {/* Minimizable HUD Integrated in Sidebar for now or kept floating */}
            <div className="p-4 border-t border-black/5 bg-white shrink-0">
                <h3 className="text-[10px] font-black text-system-gray uppercase tracking-widest mb-3 flex items-center gap-2"><Filter size={12} /> Map Overlays</h3>
                <div className="flex flex-wrap gap-2">
                    {routes.map(r => ( <button key={r.id} onClick={() => toggleRouteFilter(r.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${selectedRouteIds.includes(r.id) ? 'bg-system-blue text-white border-system-blue' : 'bg-white text-system-gray border-black/10'}`}>{r.short_name}</button> ))}
                </div>
            </div>

            {showAssignModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-bold">
                    <div className="hig-card w-full max-w-md shadow-2xl p-8 bg-white animate-in fade-in zoom-in duration-200">
                        <h3 className="text-2xl font-black mb-2 text-black">Route Binding</h3>
                        <p className="text-system-gray text-sm mb-8 font-medium">Which lines pass through <span className="text-black font-black underline">{activeAssignment.stop?.name}</span>?</p>
                        <div className="space-y-2 mb-10 max-h-80 overflow-y-auto pr-2">
                            {routes.map(r => (
                                <div key={r.id} onClick={() => { const ids = activeAssignment.routeIds.includes(r.id) ? activeAssignment.routeIds.filter(id => id !== r.id) : [...activeAssignment.routeIds, r.id]; setActiveAssignment({ ...activeAssignment, routeIds: ids }); }} className={`p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all border-2 ${activeAssignment.routeIds.includes(r.id) ? 'border-system-blue bg-system-blue/5 text-black' : 'border-transparent bg-black/5 hover:bg-black-[0.08] text-black'}`}>
                                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: `#${r.color}` }}></div><span className="font-bold text-sm tracking-tight">{r.short_name} - {r.long_name}</span></div>
                                    {activeAssignment.routeIds.includes(r.id) && <CheckCircle2 size={20} className="text-system-blue" />}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={async () => { await api.put(`/stops/${activeAssignment.stop.id}/routes`, activeAssignment.routeIds); setShowAssignModal(false); fetchInitialData(); }} className="flex-1 bg-system-blue text-white py-4 rounded-xl font-black shadow-xl hover:bg-blue-600 transition-all uppercase tracking-tighter text-xs">Apply Bindings</button>
                            <button onClick={() => setShowAssignModal(false)} className="px-8 bg-black/5 text-system-gray font-black rounded-xl hover:text-black uppercase tracking-tighter text-xs">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stops;
