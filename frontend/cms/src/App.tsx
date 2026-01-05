import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Agencies from './components/Agencies';
import Stops from './components/Stops';
import RouteStudio from './components/Routes';
import Trips from './components/Trips';
import api from './api';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { useWorkspace } from './context/useWorkspace';
import UnifiedMap from './components/UnifiedMap';
import {
  Globe, MapPin, Route as RouteIcon, Database, 
  ArrowRight, ShieldCheck, Zap, AlertCircle, Loader2, 
  ChevronRight, X, RotateCcw, Hash, Clock, ArrowUpDown, Filter, PanelLeftOpen
} from 'lucide-react';

const ShortcutManager: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedEntityId, setQuickMode } = useWorkspace();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const resetStates = () => {
          setSelectedEntityId(null);
          setQuickMode(null);
        };

        switch (e.key) {
          case '1': e.preventDefault(); resetStates(); navigate('/agencies'); break;
          case '2': e.preventDefault(); resetStates(); navigate('/stops'); break;
          case '3': e.preventDefault(); resetStates(); navigate('/routes'); break;
          case '4': e.preventDefault(); resetStates(); navigate('/trips'); break;
          case '0': e.preventDefault(); resetStates(); navigate('/'); break;
          default: break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, setSelectedEntityId, setQuickMode]);
  return null;
};

const Home: React.FC = () => {
  const [stats, setStats] = useState<{ agencies: any[], stops: any[], routes: any[], trips: any[] }>({ agencies: [], stops: [], routes: [], trips: [] });
  const [logs, setLogs] = useState<{ timestamp: string, action: string, details: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<'checking' | 'online' | 'error'>('checking');
  const navigate = useNavigate();
  const { setSelectedEntityId } = useWorkspace();

  const [activeType, setActiveType] = useState<'routes' | 'stops' | 'agencies' | 'trips'>('routes');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });

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

  const headers = {
    routes: [{label:'ID',key:'id'},{label:'Sign',key:'short_name'},{label:'Name',key:'long_name'},{label:'Operator',key:'agency_id'}],
    stops: [{label:'ID',key:'id'},{label:'Name',key:'name'},{label:'Lat',key:'lat'},{label:'Lon',key:'lon'}],
    agencies: [{label:'ID',key:'id'},{label:'Operator',key:'name'},{label:'URL',key:'url'},{label:'Timezone',key:'timezone'}],
    trips: [{label:'ID',key:'id'},{label:'Route',key:'route_id'},{label:'Heading',key:'headsign'},{label:'Path ID',key:'shape_id'}]
  };

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

  return (
    <div className="flex h-full bg-white text-zinc-900 overflow-hidden font-bold select-none animate-in fade-in duration-500 pointer-events-auto">
      {/* Registry Tree Sidebar */}
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
              className={`flex items-center justify-between px-3 py-1.5 rounded-md transition-all cursor-pointer group ${activeType === item.type ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'}`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon size={14} className={activeType === item.type ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-500'} />
                <span className="text-[11px] tracking-tight">{item.label}</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 rounded ${activeType === item.type ? 'bg-blue-100 text-blue-700' : 'text-zinc-400 group-hover:bg-zinc-200'}`}>{loading ? '...' : item.count}</span>
            </div>
          ))}
          <div className="pt-6 px-3 pb-2 text-[8px] font-black text-zinc-300 uppercase tracking-[0.2em] border-t border-zinc-100 mt-4">System Status</div>
          <div className="px-3 py-2.5 flex items-center gap-3 bg-white mx-2 rounded-xl border border-zinc-100 shadow-sm">
            <div className={`w-1.5 h-1.5 rounded-full ${health === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{health === 'online' ? 'All systems ready' : 'Server error'}</span>
          </div>
          <div className="pt-4 px-2">
            <button 
              onClick={() => window.open('http://localhost:8080/api/export/gtfs', '_blank')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-all shadow-sm active:scale-95"
              title="Export standard GTFS ZIP bundle."
            >
              <Database size={14} /> Export Bundle
            </button>
          </div>
        </div>
        <div className="p-4 bg-zinc-900 text-white group cursor-pointer overflow-hidden relative" onClick={() => navigate('/routes')}>
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest text-zinc-100">Map Designer</span><span className="text-[7px] text-white/40 uppercase font-black">Professional Tools</span></div>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
          <Zap size={60} className="absolute -right-4 -bottom-4 text-white/5 -rotate-12 group-hover:scale-110 transition-all duration-500" />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Overview Snapshot Bar */}
        <div className="p-4 grid grid-cols-4 gap-4 border-b border-zinc-200 bg-zinc-50/50 shrink-0">
          {[
            { label: 'Network Coverage', val: stats.stops.length, icon: Globe, col: 'text-blue-600', sub: 'Total Stops' },
            { label: 'Active Services', val: stats.routes.length, icon: RouteIcon, col: 'text-emerald-600', sub: 'Routes Online' },
            { label: 'Total Schedule', val: stats.trips.length, icon: Database, col: 'text-purple-600', sub: 'Trip Entries' },
            { label: 'Data Integrity', val: integrityScore, icon: ShieldCheck, col: 'text-zinc-900', title: 'Calculated ratio of routes with assigned paths.', sub: 'Health Score' },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-zinc-200 shadow-sm rounded-md p-3 flex flex-col justify-between h-20" title={item.title}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{item.label}</span>
                <item.icon size={14} className={`${item.col} opacity-80`} />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-zinc-900 tracking-tight leading-none">{loading ? '...' : item.val}</span>
                <span className="text-[9px] font-medium text-zinc-400">{item.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col border-b border-zinc-200 min-h-0">
          <div className="px-4 py-2 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px] tracking-wider"><span>Inventory</span> <ChevronRight size={10}/> <span className="text-zinc-900">{activeType}</span></div>
              <div className="h-4 w-px bg-zinc-200" />
              <div className="relative">
                <Filter size={10} className="absolute left-2.5 top-2 text-zinc-400" />
                <input className="bg-zinc-50 border border-zinc-200 rounded-md pl-7 pr-3 py-1 text-[10px] font-medium focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all" placeholder={`Search ${activeType}...`} value={filterQuery} onChange={e => setFilterQuery(e.target.value)} />
              </div>
            </div>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">{processedData.length} RESULTS</span>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar bg-white relative">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-zinc-50 z-10 border-b border-zinc-200">
                <tr>
                  {headers[activeType].map(h => (
                    <th key={h.label} onClick={() => setSortConfig({ key: h.key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-r border-zinc-200/50 cursor-pointer hover:bg-zinc-100 group select-none">
                      <div className="flex items-center justify-between">{h.label} <ArrowUpDown size={10} className={`opacity-0 group-hover:opacity-100 ${sortConfig.key === h.key ? 'opacity-100 text-zinc-900' : ''}`} /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {processedData.map(item => (
                  <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-blue-50/30 transition-colors cursor-pointer group">
                    <td className="px-4 py-2 font-mono text-zinc-400 border-r border-zinc-100 group-hover:text-zinc-900">#{item.id}</td>
                    {activeType === 'routes' ? (
                      <>
                        <td className="px-4 py-2 border-r border-zinc-100"><div className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: `#${(item.color || '007AFF').replace('#','')}` }}>{item.short_name}</div></td>
                        <td className="px-4 py-2 font-medium text-zinc-900 border-r border-zinc-100 truncate max-w-xs">{item.long_name}</td>
                        <td className="px-4 py-2 text-zinc-500 uppercase text-[10px]">{stats.agencies.find(a => a.id === item.agency_id)?.name || '...'}</td>
                      </>
                    ) : activeType === 'stops' ? (
                      <>
                        <td className="px-4 py-2 font-medium text-zinc-900 border-r border-zinc-100">{item.name}</td>
                        <td className="px-4 py-2 font-mono text-zinc-500 border-r border-zinc-100">
                          {typeof item.lat === 'number' && isFinite(item.lat) ? item.lat.toFixed(6) : '0.000000'}
                        </td>
                        <td className="px-4 py-2 font-mono text-zinc-500">
                          {typeof item.lon === 'number' && isFinite(item.lon) ? item.lon.toFixed(6) : '0.000000'}
                        </td>
                      </>
                    ) : activeType === 'agencies' ? (
                      <>
                        <td className="px-4 py-2 font-medium text-zinc-900 border-r border-zinc-100">{item.name}</td>
                        <td className="px-4 py-2 text-zinc-500 border-r border-zinc-100 truncate max-w-xs">{item.url}</td>
                        <td className="px-4 py-2 text-zinc-500">{item.timezone}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 font-mono text-zinc-500 border-r border-zinc-100">L-{item.route_id}</td>
                        <td className="px-4 py-2 font-medium text-zinc-900 border-r border-zinc-100">{item.headsign}</td>
                        <td className="px-4 py-2 text-zinc-500 text-[10px] uppercase tracking-wider">{item.shape_id}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-64 flex flex-col bg-zinc-950 text-zinc-400 border-t border-zinc-800 shrink-0">
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2"><Clock size={12}/> System Console</h3>
            <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500 uppercase tracking-wider"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Stream</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1 custom-scrollbar bg-black/50 select-text">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-4 items-start hover:bg-zinc-900/50 p-0.5 rounded transition-colors">
                <span className="text-zinc-600 w-20 shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className="font-bold text-blue-400 w-24 shrink-0 truncate uppercase">{log.action}</span>
                <span className="text-zinc-400 leading-relaxed">{log.details}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="text-zinc-600 italic px-2">Waiting for system events...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const FloatingFeedback: React.FC = () => {
  const { status } = useWorkspace();
  if (!status) return null;
  const colors = { info: 'bg-white text-black border-black/5', success: 'bg-green-500 text-white border-green-600', error: 'bg-red-500 text-white border-red-600', loading: 'bg-system-blue text-white border-blue-600' };
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[5000] animate-in slide-in-from-bottom-4 duration-300">
      <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 font-black text-xs uppercase tracking-widest ${colors[status.type]}`}>
        {status.type === 'loading' && <Loader2 size={16} className="animate-spin" />}
        {status.type === 'success' && <ShieldCheck size={16} />}
        {status.type === 'error' && <AlertCircle size={16} />}
        {status.message}
      </div>
    </div>
  );
};

const MapHUD: React.FC = () => {
  const { mapLayers, status, quickMode, setQuickMode, sidebarOpen } = useWorkspace();
  const location = useLocation();
  if (location.pathname === '/') return null;
  return (
    <div className="absolute top-6 z-[1000] pointer-events-none flex flex-col gap-3 transition-all duration-500" style={{ left: sidebarOpen ? 424 : 24 }}>
      {(status?.isDirty || mapLayers.activeShape.length > 0) && (
        <div className="bg-black/80 backdrop-blur-xl text-white px-5 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-auto">
          <div className="relative flex h-3 w-3"><div className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status?.isDirty ? 'bg-orange-400' : 'bg-green-400'}`} /><div className={`relative inline-flex rounded-full h-3 w-3 ${status?.isDirty ? 'bg-orange-500' : 'bg-green-500'}`} /></div>
          <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-[0.15em]">{status?.isDirty ? 'Unsaved changes detected' : 'Registry synchronized'}</span><p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{status?.isDirty ? 'Click Save to update the server' : 'Your workspace matches the server'}</p></div>
        </div>
      )}
      {quickMode && (
        <div className="bg-system-blue/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl border border-blue-400/30 shadow-[0_20px_50px_rgba(0,122,255,0.3)] flex items-center justify-between gap-8 animate-in zoom-in slide-in-from-top-4 duration-500 pointer-events-auto">
          <div className="flex items-center gap-4"><div className="bg-white/20 p-2 rounded-xl animate-pulse">{quickMode === 'add-stop' ? <MapPin size={18} /> : <Zap size={18} />}</div><div><span className="text-[11px] font-black uppercase tracking-[0.1em] block">Interactive Mode</span><p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{quickMode === 'add-stop' ? 'Click on the map to add a stop' : 'Click on the map to trace your route'}</p></div></div>
          <button onClick={() => setQuickMode(null)} className="hover:bg-white/20 p-2 rounded-xl transition-all active:scale-90"><X size={16}/></button>
        </div>
      )}
    </div>
  );
};

const QuickActionMenu: React.FC = () => {
  const { setQuickMode, quickMode, sidebarOpen } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/') return null;
  const handleAction = (mode: 'add-stop' | 'add-route') => { if (quickMode === mode) { setQuickMode(null); } else { setQuickMode(mode); if (mode === 'add-stop') navigate('/stops'); if (mode === 'add-route') navigate('/routes'); } };
  return (
    <div className="absolute bottom-10 z-[1000] flex flex-col gap-3 transition-all duration-500 pointer-events-none" style={{ left: sidebarOpen ? 424 : 24 }}>
      <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-[1.5rem] shadow-2xl border border-black/5 flex flex-col gap-1 pointer-events-auto">
        <button onClick={() => handleAction('add-stop')} className={`group flex items-center gap-3 p-3 rounded-[1rem] transition-all hover:scale-[1.02] active:scale-95 ${quickMode === 'add-stop' ? 'bg-orange-500 shadow-xl shadow-orange-500/30 text-white' : 'hover:bg-black/5 text-orange-600'}`} title="Add Stop"><MapPin size={18} /><div className={`flex flex-col items-start transition-all overflow-hidden ${sidebarOpen || quickMode === 'add-stop' ? 'w-28 opacity-100' : 'w-0 opacity-0 group-hover:w-28 group-hover:opacity-100'}`}><span className="text-[9px] font-black uppercase tracking-tight leading-none">Add Stop</span><span className="text-[7px] font-bold opacity-60 uppercase whitespace-nowrap">Place on map</span></div></button>
        <button onClick={() => handleAction('add-route')} className={`group flex items-center gap-3 p-3 rounded-[1rem] transition-all hover:scale-[1.02] active:scale-95 ${quickMode === 'add-route' ? 'bg-system-blue shadow-xl shadow-system-blue/30 text-white' : 'hover:bg-black/5 text-system-blue'}`} title="Trace Route"><RouteIcon size={18} /><div className={`flex flex-col items-start transition-all overflow-hidden ${sidebarOpen || quickMode === 'add-route' ? 'w-28 opacity-100' : 'w-0 opacity-0 group-hover:w-28 group-hover:opacity-100'}`}><span className="text-[9px] font-black uppercase tracking-tight leading-none">Trace Path</span><span className="text-[7px] font-bold opacity-60 uppercase whitespace-nowrap">Follow roads</span></div></button>
      </div>
    </div>
  );
};

const WorkspaceContainer: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useWorkspace();
  const isHome = location.pathname === '/';
  return (
    <div className="flex-1 h-full overflow-hidden relative text-zinc-900 font-bold bg-zinc-100">
      <FloatingFeedback />
      {!isHome && <div className="absolute inset-0 z-0"><UnifiedMap /></div>}
      {!isHome && <><MapHUD /><QuickActionMenu /></>}
      <div className={`absolute inset-0 transition-all duration-300 ${isHome ? 'z-30 pointer-events-auto' : 'z-20 pointer-events-none'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/stops" element={<Stops />} />
          <Route path="/routes" element={<RouteStudio />} />
          <Route path="/trips" element={<Trips />} />
        </Routes>
      </div>
      {!isHome && !sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="absolute top-6 left-6 z-[4000] p-3 bg-white shadow-2xl rounded-2xl border border-black/5 hover:scale-105 active:scale-95 transition-all text-system-blue pointer-events-auto"
          title="Show Sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <WorkspaceProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-zinc-100 text-zinc-900 font-sans">
          <Navigation />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <ShortcutManager />
            <WorkspaceContainer />
          </main>
        </div>
      </WorkspaceProvider>
    </Router>
  );
}

export default App;