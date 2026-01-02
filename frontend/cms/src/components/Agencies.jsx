import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Globe, Plus, Trash2, Edit3, ExternalLink, Clock, Search, ChevronLeft, ChevronRight, Loader2, Landmark } from 'lucide-react';
import api from '../api';
import 'leaflet/dist/leaflet.css';

const Agencies = () => {
    const [agencies, setAgencies] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({ name: '', url: '', timezone: '' });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [agencyStats, setAgencyStats] = useState({}); // {agencyId: {stops: 0, routes: 0}}

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [aRes, rRes, sRes] = await Promise.all([
                api.get('/agencies'), api.get('/routes'), api.get('/stops')
            ]);
            const agenciesData = aRes.data || [];
            setAgencies(agenciesData);
            
            // Calculate stats for each agency
            const stats = {};
            agenciesData.forEach(agency => {
                const agencyRoutes = (rRes.data || []).filter(r => r.agency_id === agency.id);
                stats[agency.id] = {
                    routes: agencyRoutes.length,
                    stops: (sRes.data || []).length // Approximation for now
                };
            });
            setAgencyStats(stats);
        } finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) await api.put(`/agencies/${editingId}`, formData);
            else await api.post('/agencies', formData);
            setFormData({ name: '', url: '', timezone: '' });
            setEditingId(null);
            fetchInitialData();
        } catch (error) { console.error(error); }
    };

    const filteredAgencies = agencies.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading && agencies.length === 0) return <div className="flex h-screen items-center justify-center font-bold text-system-gray animate-pulse">SYNCHRONIZING AGENCIES...</div>;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-system-background relative">
            
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-[450px]' : 'w-0'} bg-white border-r border-black/5 flex flex-col transition-all duration-300 overflow-hidden shrink-0 shadow-2xl z-20`}>
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-system-blue rounded-lg flex items-center justify-center text-white shadow-lg">
                            <Landmark size={18}/>
                        </div>
                        <h1 className="text-xl font-black tracking-tight">Agencies</h1>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-black/5 rounded-lg text-system-gray"><ChevronLeft size={20}/></button>
                </div>

                {/* Register Form */}
                <div className="p-6 bg-system-blue/5 border-b border-system-blue/10">
                    <h3 className="text-[10px] font-black text-system-blue uppercase tracking-widest mb-4">
                        {editingId ? 'Modify Registration' : 'Register Operator'}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-3">
                        <input className="hig-input text-sm" placeholder="Operator Name (e.g. Trans Jakarta)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        <input className="hig-input text-sm" placeholder="Official Website URL" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required />
                        <select className="hig-input text-sm" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} required>
                            <option value="">Regional Timezone...</option>
                            <option value="Asia/Jakarta">Jakarta (WIB)</option>
                            <option value="Asia/Makassar">Makassar (WITA)</option>
                            <option value="Asia/Jayapura">Jayapura (WIT)</option>
                        </select>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-system-blue text-white py-2.5 rounded-lg font-bold text-xs shadow-lg">
                                {editingId ? 'UPDATE RECORD' : 'CONFIRM REGISTRATION'}
                            </button>
                            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'', url:'', timezone:''})}} className="px-4 bg-white border border-black/10 rounded-lg text-xs font-bold">CANCEL</button>}
                        </div>
                    </form>
                </div>

                {/* List Area */}
                <div className="p-4 border-b border-black/5 bg-white sticky top-0 z-10 font-bold">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-3 text-system-gray" />
                        <input className="hig-input text-sm pl-9 py-2" placeholder="Find operators..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {filteredAgencies.map(agency => (
                        <div 
                            key={agency.id} 
                            className={`p-6 hover:bg-black/[0.02] cursor-pointer transition-colors group ${editingId === agency.id ? 'bg-system-blue/5 border-l-4 border-system-blue' : ''}`}
                            onClick={() => { setEditingId(agency.id); setFormData({name: agency.name, url: agency.url, timezone: agency.timezone}); }}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-black text-lg tracking-tight text-black">{agency.name}</div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-system-blue uppercase tracking-tighter mt-1 bg-system-blue/5 w-fit px-2 py-0.5 rounded">
                                        <Clock size={10} /> {agency.timezone}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Remove agency?')) api.delete(`/agencies/${agency.id}`).then(fetchInitialData); }} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                            </div>
                            
                            <a href={agency.url} target="_blank" rel="noreferrer" className="text-xs text-system-gray flex items-center gap-1 hover:underline mb-4 font-medium italic">
                                <ExternalLink size={10} /> {agency.url}
                            </a>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/[0.03] p-2 rounded-lg text-center">
                                    <div className="text-lg font-black">{agencyStats[agency.id]?.routes || 0}</div>
                                    <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">Active Lines</div>
                                </div>
                                <div className="bg-black/[0.03] p-2 rounded-lg text-center">
                                    <div className="text-lg font-black">{agencyStats[agency.id]?.stops || 0}</div>
                                    <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">Network Points</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toggle Sidebar */}
            {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-4 z-[1001] p-3 bg-white shadow-xl rounded-full border border-black/5 hover:scale-110 text-system-blue">
                    <ChevronRight size={24}/>
                </button>
            )}

            {/* Map Area (Agency Overview) */}
            <div className="flex-1 relative">
                <MapContainer center={[-7.393, 109.360]} zoom={13} zoomControl={false} className="h-full w-full grayscale-[0.5] contrast-[0.9]">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                </MapContainer>
                
                <div className="absolute inset-0 bg-gradient-to-t from-system-background via-transparent to-transparent pointer-events-none"></div>
                
                <div className="absolute bottom-12 right-12 text-right">
                    <div className="text-[80px] font-black text-black opacity-[0.03] leading-none select-none uppercase">TRANSIT<br/>OPERATORS</div>
                </div>
            </div>
        </div>
    );
};

export default Agencies;