import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/useWorkspace';
import { Globe, Plus, Trash2, Search, Landmark, RotateCcw, ExternalLink, ChevronRight } from 'lucide-react';
import api from '../api';
import { SidebarHeader } from './SidebarHeader';
import { Agency, Route, Stop, RouteStop, Trip, ShapePoint } from '../types';

const Agencies: React.FC = () => {
    const { setMapLayers, setStatus } = useWorkspace();
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [allRoutes, setAllRoutes] = useState<Route[]>([]);
    const [allStops, setAllStops] = useState<Stop[]>([]);
    const [stopRouteMap, setStopRouteMap] = useState<RouteStop[]>([]);
    const [allTrips, setAllTrips] = useState<Trip[]>([]);
    
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState<Agency>({ name: '', url: '', timezone: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [agencyStats, setAgencyStats] = useState<Record<number, { routes: number, stops: number }>>({});
    const [isDirty, setIsDirty] = useState(false);

    const initialFormData = useRef<string>(JSON.stringify({ name: '', url: '', timezone: '' }));

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setStatus({ message: 'Syncing Operators...', type: 'loading' });
        try {
            const [aRes, rRes, sRes, srRes, tRes] = await Promise.all([
                api.get('/agencies'), api.get('/routes'), api.get('/stops'), api.get('/stop-routes'), api.get('/trips')
            ]);
            
            setAgencies(aRes.data || []);
            setAllRoutes(rRes.data || []);
            setAllStops(sRes.data || []);
            setStopRouteMap(srRes.data || []);
            setAllTrips(tRes.data || []);

            // Calculate stats
            const stats: Record<number, { routes: number, stops: number }> = {};
            (aRes.data || []).forEach((agency: Agency) => {
                if (agency.id === undefined) return;
                const agencyRoutes = (rRes.data || []).filter((r: Route) => r.agency_id === agency.id);
                const routeIds = agencyRoutes.map((r: Route) => r.id);
                const stopIds = [...new Set((srRes.data || []).filter((sr: RouteStop) => routeIds.includes(sr.route_id)).map((sr: RouteStop) => sr.stop_id))];
                stats[agency.id] = { routes: agencyRoutes.length, stops: stopIds.length };
            });
            setAgencyStats(stats);
            setStatus(null);
        } catch (e) { setStatus({ message: 'Sync failed', type: 'error' }); } finally { setLoading(false); }
    }, [setStatus]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // Track Dirty State
    useEffect(() => {
        const current = JSON.stringify(formData);
        const dirty = current !== initialFormData.current;
        setIsDirty(dirty);
        if (dirty) setStatus({ message: 'Unsaved Record', type: 'info', isDirty: true });
        else if (selectedAgency) setStatus({ message: 'Record Synced', type: 'info', isDirty: false });
        else setStatus(null);
    }, [formData, selectedAgency, setStatus]);

    useEffect(() => {
        if (!selectedAgency || selectedAgency.id === undefined) {
            setMapLayers({ routes: [], stops: [], focusedPoints: [], activeShape: [] });
            return;
        }

        const updateGeometry = async () => {
            const agencyRoutes = allRoutes.filter(r => r.agency_id === selectedAgency.id);
            const routeIds = agencyRoutes.map(r => r.id);
            const stopIds = [...new Set(stopRouteMap.filter(sr => routeIds.includes(sr.route_id)).map(sr => sr.stop_id))];
            const agencyStops = allStops.filter(s => stopIds.includes(s.id));
            const agencyTrips = allTrips.filter(t => routeIds.includes(t.route_id));
            const shapeGeometries: { id: number, color: string, positions: [number, number][] }[] = [];
            
            await Promise.all(agencyTrips.map(async (trip) => {
                if (trip.shape_id) {
                    try {
                        const res = await api.get(`/shapes/${trip.shape_id}`);
                        const points: ShapePoint[] = res.data;
                        const poly = points.sort((a,b) => a.sequence - b.sequence).map(p => [p.lat, p.lon] as [number, number]);
                        const route = agencyRoutes.find(r => r.id === trip.route_id);
                        if (route) shapeGeometries.push({ id: trip.id, color: route.color, positions: poly });
                    } catch (e) { console.error(e); }
                }
            }));

            setMapLayers({
                routes: shapeGeometries.map(g => ({ ...g, isFocused: true })),
                stops: agencyStops.map(s => ({ ...s, isSmall: false, hidePopup: false })),
                focusedPoints: shapeGeometries.flatMap(g => g.positions),
                activeShape: []
            });
        };

        updateGeometry();
    }, [selectedAgency, allRoutes, allStops, stopRouteMap, allTrips, setMapLayers]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ message: 'Saving Operator...', type: 'loading' });
        try {
            if (editingId) await api.put(`/agencies/${editingId}`, formData);
            else await api.post('/agencies', formData);
            initialFormData.current = JSON.stringify(formData);
            setIsDirty(false);
            setStatus({ message: 'Operator Saved', type: 'success' });
            setTimeout(() => setStatus(null), 2000);
            fetchInitialData();
        } catch (error) { setStatus({ message: 'Save failed', type: 'error' }); }
    };

    const handleSelectAgency = (agency: Agency) => {
        setSelectedAgency(agency);
        setEditingId(agency.id || null);
        const data = { name: agency.name, url: agency.url, timezone: agency.timezone };
        setFormData(data);
        initialFormData.current = JSON.stringify(data);
    };

    const handleAddNew = () => {
        setSelectedAgency({ name: '', url: '', timezone: '' });
        setEditingId(null);
        const data = { name: '', url: '', timezone: '' };
        setFormData(data);
        initialFormData.current = JSON.stringify(data);
    };

    const filteredAgencies = agencies.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading && agencies.length === 0) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse flex-col gap-4">SYNCING OPERATORS...</div>;

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl relative z-20 overflow-hidden font-bold" style={{ width: 450 }}>
            <SidebarHeader 
                title={selectedAgency ? 'Operator Info' : 'Operators'} 
                Icon={Landmark} 
                onBack={selectedAgency ? () => setSelectedAgency(null) : undefined}
                actions={!selectedAgency && <button onClick={handleAddNew} className="p-2 bg-system-blue text-white rounded-lg shadow-lg hover:scale-105 transition-all"><Plus size={18} /></button>}
            />

            <div className="flex-1 overflow-y-auto">
                {selectedAgency ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                            <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">{editingId ? 'Modify Record' : 'Register Operator'}</h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Legal Name</label>
                                <input className="hig-input text-sm font-bold" placeholder="Agency Name..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                                <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Official Website</label>
                                <input className="hig-input text-sm font-bold" placeholder="Official URL" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required /></div>
                                <div><label className="text-[10px] font-black uppercase mb-1 block text-system-gray opacity-60">Operations Timezone</label>
                                <select className="hig-input text-sm font-bold" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} required>
                                    <option value="">Select Timezone...</option>
                                    <option value="Asia/Jakarta">Jakarta (WIB)</option>
                                    <option value="Asia/Makassar">Makassar (WITA)</option>
                                    <option value="Asia/Jayapura">Jayapura (WIT)</option>
                                </select></div>
                                <button type="submit" disabled={!isDirty} className="w-full bg-system-blue text-white py-4 rounded-xl font-black text-xs shadow-xl disabled:opacity-30 transition-all active:scale-95 uppercase">Commit Operator Changes</button>
                            </form>
                        </div>
                        {editingId && (
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white border border-black/5 p-4 rounded-2xl shadow-sm text-center">
                                        <div className="text-2xl font-black text-black leading-none mb-1">{agencyStats[editingId]?.routes || 0}</div>
                                        <div className="text-[10px] font-black text-system-gray uppercase tracking-widest">Active Lines</div>
                                    </div>
                                    <div className="bg-white border border-black/5 p-4 rounded-2xl shadow-sm text-center">
                                        <div className="text-2xl font-black text-black leading-none mb-1">{agencyStats[editingId]?.stops || 0}</div>
                                        <div className="text-[10px] font-black text-system-gray uppercase tracking-widest">Network Nodes</div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Danger Zone</div>
                                    <button onClick={() => { if(window.confirm('Remove agency?')) api.delete(`/agencies/${editingId}`).then(fetchInitialData).then(() => setSelectedAgency(null)); }} className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-xs font-black">
                                        <Trash2 size={14}/> DELETE OPERATOR
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="p-4 px-6 border-b border-black/5 bg-white sticky top-0 z-10 font-bold shrink-0 flex gap-2">
                            <div className="relative flex-1"><Search size={14} className="absolute left-3 top-3 text-system-gray" /><input className="hig-input text-sm pl-9 py-2" placeholder="Find operators..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                            <button onClick={fetchInitialData} className="p-2 bg-black/5 rounded-lg text-system-gray hover:text-black transition-colors" title="Sync Data"><RotateCcw size={18} /></button>
                        </div>
                        <div className="divide-y divide-black/5 font-bold text-black">
                            {filteredAgencies.map(agency => (
                                <div key={agency.id} className="p-6 hover:bg-black/[0.02] cursor-pointer transition-all group flex items-center justify-between" onClick={() => handleSelectAgency(agency)}>
                                    <div>
                                        <div className="font-black text-lg tracking-tight text-black leading-none mb-2">{agency.name}</div>
                                        <div className="flex items-center gap-2 text-[9px] font-black text-system-gray uppercase tracking-widest"><Globe size={10} /> {agency.timezone}</div>
                                    </div>
                                    <ChevronRight size={18} className="text-system-gray opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Agencies;
