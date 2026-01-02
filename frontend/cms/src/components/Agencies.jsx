import React, { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Edit3, ExternalLink, Clock } from 'lucide-react';
import api from '../api';

const Agencies = () => {
    const [agencies, setAgencies] = useState([]);
    const [formData, setFormData] = useState({ name: '', url: '', timezone: '' });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAgencies();
    }, []);

    const fetchAgencies = async () => {
        setLoading(true);
        try {
            const res = await api.get('/agencies');
            setAgencies(res.data || []);
        } catch (error) {
            console.error("Error fetching agencies", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/agencies/${editingId}`, formData);
            } else {
                await api.post('/agencies', formData);
            }
            setFormData({ name: '', url: '', timezone: '' });
            setEditingId(null);
            fetchAgencies();
        } catch (error) {
            console.error("Error saving agency", error);
        }
    };

    if (loading && agencies.length === 0) return <div className="flex h-screen items-center justify-center text-system-gray font-medium">Loading Agencies...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-black">Transit Agencies</h1>
                    <p className="text-system-gray mt-1">Manage the organizations and regions providing transit data.</p>
                </div>
                <div className="bg-system-blue/10 text-system-blue px-4 py-2 rounded-full text-sm font-bold">
                    {agencies.length} Registered
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Card */}
                <div className="lg:col-span-4">
                    <div className="hig-card p-6 shadow-sm sticky top-24">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
                            {editingId ? 'Edit Agency' : 'Register New Agency'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-system-gray uppercase mb-2 block tracking-wider">Agency Name</label>
                                <input 
                                    name="name"
                                    className="hig-input"
                                    placeholder="e.g. Purbalingga Trans"
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-system-gray uppercase mb-2 block tracking-wider">Website URL</label>
                                <input 
                                    name="url"
                                    className="hig-input"
                                    placeholder="https://..."
                                    value={formData.url} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-system-gray uppercase mb-2 block tracking-wider">Regional Timezone</label>
                                <select 
                                    name="timezone"
                                    className="hig-input"
                                    value={formData.timezone} 
                                    onChange={handleChange} 
                                    required
                                >
                                    <option value="">Select a region...</option>
                                    <option value="Asia/Jakarta">Jakarta (WIB)</option>
                                    <option value="Asia/Makassar">Makassar (WITA)</option>
                                    <option value="Asia/Jayapura">Jayapura (WIT)</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <button type="submit" className="w-full bg-system-blue text-white py-3 rounded-lg font-bold shadow-lg shadow-system-blue/20 hover:bg-blue-600 transition-all active:scale-[0.98]">
                                    {editingId ? 'Update Registration' : 'Register Agency'}
                                </button>
                                {editingId && (
                                    <button 
                                        type="button"
                                        onClick={() => {setEditingId(null); setFormData({name:'', url:'', timezone:''})}}
                                        className="w-full mt-3 text-system-gray font-medium py-2 hover:text-black transition-colors"
                                    >
                                        Cancel Editing
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
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider">Agency Info</th>
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-xs font-bold text-system-gray uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {agencies.map(agency => (
                                    <tr key={agency.id} className="group hover:bg-black/[0.01] transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-black">{agency.name}</div>
                                            <a href={agency.url} target="_blank" rel="noreferrer" className="text-system-blue text-xs flex items-center gap-1 mt-1 hover:underline">
                                                <ExternalLink size={10} /> {agency.url}
                                            </a>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-system-gray text-sm">
                                                <Clock size={14} />
                                                {agency.timezone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => {setEditingId(agency.id); setFormData({name: agency.name, url: agency.url, timezone: agency.timezone})}}
                                                    className="p-2 text-system-blue hover:bg-system-blue/10 rounded-md transition-colors"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => {if(window.confirm('Remove this agency?')) api.delete(`/agencies/${agency.id}`).then(fetchAgencies)}}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {agencies.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-12 text-center text-system-gray font-medium">
                                            <Globe size={48} className="mx-auto mb-4 opacity-20" />
                                            No agencies registered yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Agencies;
