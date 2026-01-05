import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Globe, MapPin, Route as RouteIcon, Database, 
    ShieldCheck, ArrowUpDown, Filter, ChevronRight, 
    Clock, RotateCcw, Hash 
} from 'lucide-react';
import api from '../api';
import { useWorkspace } from '../context/useWorkspace';

interface DashboardProps {
    // Add props if needed in future
}

export const Dashboard: React.FC<DashboardProps> = () => {
    const navigate = useNavigate();
    const { setSelectedEntityId } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState<'checking' | 'online' | 'error'>('checking');
    const [stats, setStats] = useState<{ agencies: any[], stops: any[], routes: any[], trips: any[] }>({ agencies: [], stops: [], routes: [], trips: [] });
    const [logs, setLogs] = useState<{ timestamp: string, action: string, details: string }[]>([]);
    
    // UI State
    const [activeType, setActiveType] = useState<'routes' | 'stops' | 'agencies' | 'trips'>('routes');
    const [filterQuery, setFilterQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });
    
    // Column Resizing State
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [isResizing, setIsResizing] = useState<string | null>(null);
    const [resizingX, setResizingX] = useState<number | null>(null);
    const resizingRef = useRef<{ key: string, startX: number, startWidth: number } | null>(null);

    // Console Resizing State
    const [consoleHeight, setConsoleHeight] = useState(192);
    const isResizingConsole = useRef(false);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const [a, s, r, t, l] = await Promise.all([
                api.get('/agencies'), api.get('/stops'), api.get('/routes'), api.get('/trips'), api.get('/activity-logs')
            ]);
            setStats({ agencies: a.data || [], stops: s.data || [], routes: r.data || [], trips: t.data || [] });
            setLogs(l.data || []);
            setHealth('online');
        } catch (err) {
            console.error('System: Failed to fetch registry statistics.', err);
            setHealth('error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // Resizing Logic
    const startResize = (e: React.MouseEvent, key: string, currentWidth: number) => {
        e.preventDefault();
        resizingRef.current = { key, startX: e.clientX, startWidth: currentWidth };
        setIsResizing(key);
        setResizingX(e.clientX);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const startConsoleResize = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizingConsole.current = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleConsoleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingRef.current) return;
        requestAnimationFrame(() => {
            if (!resizingRef.current) return;
            const { key, startX, startWidth } = resizingRef.current;
            const diff = e.clientX - startX;
            setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, startWidth + diff) }));
            setResizingX(e.clientX);
        });
    }, []);

    const handleConsoleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizingConsole.current) return;
        requestAnimationFrame(() => {
            const newHeight = window.innerHeight - e.clientY;
            setConsoleHeight(Math.max(100, Math.min(600, newHeight)));
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        resizingRef.current = null;
        isResizingConsole.current = false;
        setIsResizing(null);
        setResizingX(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mousemove', handleConsoleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, handleConsoleMouseMove]);

    // Data Processing
    const processedData = useMemo(() => {
        let items = [...(stats[activeType] || [])];
        if (filterQuery) {
            const q = filterQuery.toLowerCase();
            items = items.filter(i => 
                (i.name && i.name.toLowerCase().includes(q)) ||
                (i.short_name && i.short_name.toLowerCase().includes(q)) ||
                (i.long_name && i.long_name.toLowerCase().includes(q)) ||
                (i.headsign && i.headsign.toLowerCase().includes(q)) ||
                String(i.id).includes(q)
            );
        }
        items.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [stats, activeType, filterQuery, sortConfig]);

    const integrityScore = useMemo(() => {
        if (loading || stats.routes.length === 0) return '0%';
        const routesWithShapes = new Set(stats.trips.filter(t => t.shape_id).map(t => t.route_id)).size;
        const score = (routesWithShapes / stats.routes.length) * 100;
        return `${score.toFixed(1)}%`;
    }, [stats, loading]);

    const handleRowClick = (item: any) => {
        setSelectedEntityId(item.id);
        const pathMap = { routes: '/routes', stops: '/stops', agencies: '/agencies', trips: '/trips' };
        navigate(pathMap[activeType]);
    };

    const headers = {
        routes: [{label:'ID',key:'id',w:60},{label:'Sign',key:'short_name',w:60},{label:'Name',key:'long_name',w:200},{label:'Operator',key:'agency_id',w:100}],
        stops: [{label:'ID',key:'id',w:60},{label:'Name',key:'name',w:200},{label:'Lat',key:'lat',w:100},{label:'Lon',key:'lon',w:100}],
        agencies: [{label:'ID',key:'id',w:60},{label:'Operator',key:'name',w:150},{label:'URL',key:'url',w:200},{label:'Timezone',key:'timezone',w:100}],
        trips: [{label:'ID',key:'id',w:60},{label:'Route',key:'route_id',w:80},{label:'Heading',key:'headsign',w:200},{label:'Path ID',key:'shape_id',w:100}]
    };

    const StatCard = ({ label, val, icon: Icon, sub, onClick }: any) => (
        <button 
            onClick={onClick}
            className="bg-white border border-zinc-200 rounded-sm p-3 flex flex-col justify-between h-20 hover:border-zinc-400 transition-all text-left group active:bg-zinc-50"
        >
            <div className="flex items-center justify-between w-full mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-900 transition-colors">{label}</span>
                <Icon size={14} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            </div>
            <div className="flex items-end justify-between w-full">
                <span className="text-2xl font-bold text-zinc-900 tracking-tight leading-none">{loading ? '...' : val}</span>
                <span className="text-[9px] font-medium text-zinc-400">{sub}</span>
            </div>
        </button>
    );

    return (
        <div className="flex h-full bg-white text-zinc-900 overflow-hidden font-bold select-none animate-in fade-in duration-500 relative">
            {/* Ghost Resize Line */}
            {isResizing && resizingX !== null && (
                <div 
                    className="absolute top-0 bottom-0 w-px bg-blue-500 z-[100] pointer-events-none"
                    style={{ left: resizingX }}
                />
            )}

            {/* Explorer Sidebar */}
            <div className="w-64 border-r border-zinc-200 flex flex-col bg-white shrink-0">
                <div className="h-10 px-3 border-b border-zinc-200 flex items-center justify-between text-zinc-500 bg-zinc-50">
                    <div className="flex items-center gap-2"><Database size={12} /><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Explorer</span></div>
                    <button onClick={fetchStats} className={`hover:text-zinc-900 transition-transform ${loading ? 'animate-spin' : 'active:rotate-180'}`}><RotateCcw size={12}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {[
                        { label: 'Operators', type: 'agencies', count: stats.agencies.length, icon: Globe },
                        { label: 'Stops', type: 'stops', count: stats.stops.length, icon: MapPin },
                        { label: 'Routes', type: 'routes', count: stats.routes.length, icon: RouteIcon },
                        { label: 'Trips', type: 'trips', count: stats.trips.length, icon: Hash },
                    ].map(item => (
                        <div 
                            key={item.label} 
                            onClick={() => setActiveType(item.type as any)} 
                            className={`flex items-center justify-between px-3 py-1.5 rounded-sm transition-all cursor-pointer group ${activeType === item.type ? 'bg-zinc-100 text-zinc-900 font-bold' : 'hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900'}`}
                        >
                            <div className="flex items-center gap-2.5">
                                <item.icon size={14} className={activeType === item.type ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'} />
                                <span className="text-[11px] tracking-tight">{item.label}</span>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 rounded-sm border border-zinc-200 ${activeType === item.type ? 'bg-white text-zinc-900' : 'text-zinc-400 bg-zinc-50'}`}>{loading ? '...' : item.count}</span>
                        </div>
                    ))}
                    
                    <div className="pt-6 px-3 pb-2 text-[8px] font-black text-zinc-300 uppercase tracking-[0.2em] border-t border-zinc-100 mt-4">System Status</div>
                    <div className="px-3 py-2.5 flex items-center gap-3 bg-zinc-50 mx-2 rounded-sm border border-zinc-200">
                        <div className={`w-1.5 h-1.5 rounded-full ${health === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{health === 'online' ? 'All systems ready' : 'Server error'}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Stats Grid */}
                <div className="p-4 grid grid-cols-4 gap-4 border-b border-zinc-200 bg-zinc-50/30 shrink-0">
                    <StatCard label="Network Coverage" val={stats.stops.length} icon={Globe} sub="Total Stops" onClick={() => navigate('/stops')} />
                    <StatCard label="Active Services" val={stats.routes.length} icon={RouteIcon} sub="Routes Online" onClick={() => navigate('/routes')} />
                    <StatCard label="Total Schedule" val={stats.trips.length} icon={Database} sub="Trip Entries" onClick={() => navigate('/trips')} />
                    <StatCard label="Data Integrity" val={integrityScore} icon={ShieldCheck} sub="Health Score" onClick={() => {}} />
                </div>

                {/* Table View */}
                <div className="flex-1 flex flex-col border-b border-zinc-200 min-h-0 bg-white relative">
                    <div className="px-4 py-2 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px] tracking-wider"><span>Inventory</span> <ChevronRight size={10}/> <span className="text-zinc-900">{activeType}</span></div>
                            <div className="h-4 w-px bg-zinc-200" />
                            <div className="relative">
                                <Filter size={10} className="absolute left-2.5 top-2 text-zinc-400" />
                                <input className="bg-zinc-50 border border-zinc-200 rounded-sm pl-7 pr-3 py-1 text-[10px] font-medium focus:ring-2 focus:ring-zinc-200 focus:border-zinc-300 outline-none w-64 transition-all placeholder:text-zinc-400 text-zinc-900" placeholder={`Search ${activeType}...`} value={filterQuery} onChange={e => setFilterQuery(e.target.value)} />
                            </div>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">{processedData.length} RESULTS</span>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar bg-white relative">
                        <table className="w-full border-collapse text-left text-[11px] table-fixed min-w-max">
                            <thead className="sticky top-0 bg-zinc-50 z-10 border-b border-zinc-200">
                                <tr>
                                    {headers[activeType].map((h: any) => {
                                        const width = columnWidths[h.key] || h.w || 100;
                                        return (
                                            <th 
                                                key={h.label} 
                                                style={{ width }}
                                                className="relative px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200/50 cursor-pointer hover:bg-zinc-100 group select-none"
                                            >
                                                <div 
                                                    className="flex items-center justify-between overflow-hidden" 
                                                    onClick={() => setSortConfig({ key: h.key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                                >
                                                    {h.label} 
                                                    <ArrowUpDown size={10} className={`opacity-0 group-hover:opacity-100 ${sortConfig.key === h.key ? 'opacity-100 text-zinc-900' : ''}`} />
                                                </div>
                                                <div 
                                                    className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors z-20 ${isResizing === h.key ? 'bg-blue-500' : 'hover:bg-blue-400'}`}
                                                    onMouseDown={(e) => startResize(e, h.key, width)}
                                                />
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {processedData.map(item => (
                                    <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-zinc-50 transition-colors cursor-pointer group">
                                        <td className="px-4 py-2 font-mono text-zinc-400 border-r border-zinc-100 group-hover:text-zinc-900 truncate">#{item.id}</td>
                                        {activeType === 'routes' ? (
                                            <>
                                                <td className="px-4 py-2 border-r border-zinc-100 truncate"><div className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: `#${(item.color || '007AFF').replace('#','')}` }}>{item.short_name}</div></td>
                                                <td className="px-4 py-2 font-medium text-zinc-900 border-r border-zinc-100 truncate">{item.long_name}</td>
                                                <td className="px-4 py-2 text-zinc-500 uppercase text-[10px] truncate">{stats.agencies.find(a => a.id === item.agency_id)?.name || '...'}</td>
                                            </>
                                        ) : activeType === 'stops' ? (
                                            <>
                                                <td className="px-4 py-2 font-medium text-zinc-900 border-r border-zinc-100 truncate">{item.name}</td>
                                                <td className="px-4 py-2 font-mono text-zinc-500 border-r border-zinc-100 truncate">
                                                    {typeof item.lat === 'number' && isFinite(item.lat) ? item.lat.toFixed(6) : '0.000000'}
                                                </td>
                                                <td className="px-4 py-2 font-mono text-zinc-500 truncate">
                                                    {typeof item.lon === 'number' && isFinite(item.lon) ? item.lon.toFixed(6) : '0.000000'}
                                                </td>
                                            </>
                                        ) : activeType === 'agencies' ? (
                                            <>
                                                <td className="px-4 py-2 font-medium text-zinc-900 border-r border-zinc-100 truncate">{item.name}</td>
                                                <td className="px-4 py-2 text-zinc-500 border-r border-zinc-100 truncate">{item.url}</td>
                                                <td className="px-4 py-2 text-zinc-500 truncate">{item.timezone}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-2 font-mono text-zinc-500 border-r border-zinc-100 truncate">L-{item.route_id}</td>
                                                <td className="px-4 py-2 font-medium text-zinc-900 border-r border-zinc-100 truncate">{item.headsign}</td>
                                                <td className="px-4 py-2 text-zinc-500 text-[10px] uppercase tracking-wider truncate">{item.shape_id}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Vertical Resizer */}
                <div 
                    className="h-1 bg-zinc-200 hover:bg-blue-400 cursor-row-resize transition-colors z-30 flex items-center justify-center group"
                    onMouseDown={startConsoleResize}
                >
                    <div className="w-8 h-px bg-zinc-300 rounded-full group-hover:bg-blue-500" />
                </div>

                {/* Console Log */}
                <div 
                    className="flex flex-col bg-white text-zinc-500 shrink-0"
                    style={{ height: consoleHeight }}
                >
                    <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2"><Clock size={12}/> Event Stream</h3>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500 uppercase tracking-wider"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Online</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1 font-mono text-[10px] space-y-0.5 custom-scrollbar bg-white select-text">
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-4 items-start bg-transparent border-b border-zinc-50 p-1.5 hover:bg-zinc-50 transition-colors">
                                <span className="text-zinc-400 w-20 shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                <span className="font-bold text-blue-600 w-24 shrink-0 truncate uppercase">{log.action}</span>
                                <span className="text-zinc-600 leading-relaxed">{log.details}</span>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="text-zinc-400 italic px-2 py-4 text-center">Waiting for system events...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
