import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit3, Trash2, Route, Map as MapIcon, ChevronRight } from 'lucide-react';
import api from '../api';

const Trips = () => {
    const [trips, setTrips] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [formData, setFormData] = useState({ route_id: '', headsign: '', shape_id: '' });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [tRes, rRes] = await Promise.all([api.get('/trips'), api.get('/routes')]);
            setTrips(tRes.data || []);
            setRoutes(rRes.data || []);
        } finally {
            setLoading(false);
        }
    };

    // Auto-suggest IDs logic
    useEffect(() => {
        if (formData.route_id && !editingId) {
            const route = routes.find(r => r.id === parseInt(formData.route_id));
            if (route) {
                setFormData(prev => ({ 
                    ...prev, 
                    shape_id: `SHP_${route.short_name.toUpperCase()}`,
                    headsign: prev.headsign || route.long_name 
                }));
            }
        }
    }, [formData.route_id, routes, editingId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...formData, route_id: parseInt(formData.route_id) };
        if (editingId) await api.put(`/trips/${editingId}`, payload);
        else await api.post('/trips', payload);
        setFormData({ route_id: '', headsign: '', shape_id: '' });
        setEditingId(null);
        fetchInitialData();
    };

    if (loading && trips.length === 0) return <div className="flex h-screen items-center justify-center text-system-gray font-medium">Loading Trip Mappings...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-black">Trip Mappings</h1>
                <p className="text-system-gray mt-1">Bind logical routes to specific physical paths and directions.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Card */}
                <div className="lg:col-span-4">
                    <div className="hig-card p-6 shadow-sm sticky top-24">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Database size={20} className="text-system-blue" />
                            {editingId ? 'Edit Mapping' : 'New Assignment'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-system-gray uppercase mb-2 block">Reference Route</label>
                                <select 
                                    className="hig-input"
                                    value={formData.route_id} 
                                    onChange={(e) => setFormData({...formData, route_id: e.target.value})} 
                                    required
                                >
                                    <option value="">Choose a route...</option>
                                    {routes.map(r => (
                                        <option key={r.id} value={r.id}>{r.short_name} - {r.long_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-system-gray uppercase mb-2 block">Headsign (Target)</label>
                                <input 
                                    className="hig-input"
                                    placeholder="e.g. Bukateja Terminal"
                                    value={formData.headsign} 
                                    onChange={(e) => setFormData({...formData, headsign: e.target.value})} 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-system-gray uppercase mb-2 block flex justify-between">
                                    Shape Identifier
                                    <span className="text-[9px] bg-black/5 px-1 rounded text-black/40">GTFS_ID</span>
                                </label>
                                <input 
                                    className="hig-input font-mono"
                                    placeholder="SHP_K1"
                                    value={formData.shape_id} 
                                    onChange={(e) => setFormData({...formData, shape_id: e.target.value})} 
                                    required 
                                />
                            </div>

                            <div className="pt-2">
                                <button type="submit" className="w-full bg-system-blue text-white py-3 rounded-lg font-bold shadow-lg shadow-system-blue/20 hover:bg-blue-600 transition-all active:scale-[0.98]">
                                    {editingId ? 'Update Trip' : 'Create Mapping'}
                                </button>
                                {editingId && (
                                    <button type="button" onClick={() => {setEditingId(null); setFormData({route_id: '', headsign: '', shape_id: ''})}} className="w-full mt-3 text-system-gray font-medium py-2 hover:text-black">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Table Area */}
                <div className="lg:col-span-8">
                    <div className="hig-card overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/[0.02] border-b border-black/5">
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider">Service Line</th>
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider">Destination</th>
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider">Geometry ID</th>
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {trips.map(trip => (
                                    <tr key={trip.id} className="group hover:bg-black/[0.01] transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: `#${trip.route?.color || 'ddd'}` }}></div>
                                                <div>
                                                    <div className="font-bold text-black">{trip.route?.short_name || '??'}</div>
                                                    <div className="text-[10px] font-bold text-system-gray uppercase">Route #{trip.route_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-medium text-black">{trip.headsign}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-system-blue font-mono text-xs bg-system-blue/5 px-2 py-1 rounded w-fit">
                                                <MapIcon size={12} /> {trip.shape_id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => {setEditingId(trip.id); setFormData({ route_id: trip.route_id, headsign: trip.headsign, shape_id: trip.shape_id });}}
                                                    className="p-2 text-system-blue hover:bg-system-blue/10 rounded-md transition-colors"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => {if(window.confirm('Remove this trip?')) api.delete(`/trips/${trip.id}`).then(fetchInitialData)}}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Trips;
