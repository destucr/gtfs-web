import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
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
  LayoutDashboard, Globe, MapPin, Route as RouteIcon, Database, 
  ArrowRight, Activity, ShieldCheck, Zap, AlertCircle, Loader2, TrendingUp, 
  ChevronRight, ChevronLeft, X, RotateCcw, Hash, Clock, ArrowUpDown, Filter
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
      const [a, s, r, t] = await Promise.all([
        api.get('/agencies'), api.get('/stops'), api.get('/routes'), api.get('/trips')
      ]);
      setStats({ agencies: a.data || [], stops: s.data || [], routes: r.data || [], trips: t.data || [] });
      setHealth('online');
    } catch { setHealth('error'); } finally { setLoading(false); }
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

  const handleRowClick = (item: any) => {
    setSelectedEntityId(item.id);
    const pathMap = { routes: '/routes', stops: '/stops', agencies: '/agencies', trips: '/trips' };
    navigate(pathMap[activeType]);
  };

  return (
    <div className="flex h-full bg-white text-zinc-900 overflow-hidden font-bold select-none animate-in fade-in duration-500 pointer-events-auto">
      {/* Network Items Sidebar */}
      <div className="w-64 border-r border-zinc-100 flex flex-col bg-zinc-50/30 shrink-0">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between text-zinc-500">
          <div className="flex items-center gap-2"><Database size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Network Items</span></div>
          <button onClick={fetchStats} className={`hover:text-zinc-900 transition-transform ${loading ? 'animate-spin' : 'active:rotate-180'}`}><RotateCcw size={12}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[
            { label: 'Operators', type: 'agencies', count: stats.agencies.length, icon: Globe },
            { label: 'Stops', type: 'stops', count: stats.stops.length, icon: MapPin },
            { label: 'Routes', type: 'routes', count: stats.routes.length, icon: RouteIcon },
            { label: 'Trips', type: 'trips', count: stats.trips.length, icon: Hash },
          ].map(item => (
            <div key={item.label} onClick={() => setActiveType(item.type as any)} className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${activeType === item.type ? 'bg-white shadow-md border border-zinc-100' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}>
              <div className="flex items-center gap-3"><item.icon size={14} className={activeType === item.type ? 'text-system-blue' : ''} /><span className="text-[11px] font-black uppercase tracking-tight">{item.label}</span></div>
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border ${activeType === item.type ? 'text-system-blue border-system-blue/20 bg-system-blue/5' : 'text-zinc-400 border-zinc-100 bg-white'}`}>{loading ? '...' : item.count}</span>
            </div>
          ))}
          <div className="pt-6 px-3 pb-2 text-[9px] font-black text-zinc-300 uppercase tracking-widest border-t border-zinc-100 mt-4">System Status</div>
          <div className="px-3 py-2.5 flex items-center gap-3 bg-white mx-2 rounded-xl border border-zinc-100 shadow-sm">
            <div className={`w-1.5 h-1.5 rounded-full ${health === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{health === 'online' ? 'All systems ready' : 'Server error'}</span>
          </div>
        </div>
        <div className="p-4 bg-zinc-900 text-white group cursor-pointer overflow-hidden relative" onClick={() => navigate('/routes')}>
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-100">Map Designer</span>
              <span className="text-[7px] text-white/40 uppercase font-black">Interactive Editor</span>
            </div>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
          <Zap size={60} className="absolute -right-4 -bottom-4 text-white/5 -rotate-12 group-hover:scale-110 transition-all duration-500" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Overview Snapshot Bar (Flat, Non-Interactive) */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-white shrink-0">
          {[
            { label: 'Network Coverage', val: stats.stops.length, icon: Globe, col: 'text-blue-600' },
            { label: 'Active Services', val: stats.routes.length, icon: RouteIcon, col: 'text-emerald-600' },
            { label: 'Total Schedule', val: stats.trips.length, icon: Database, col: 'text-purple-600' },
            { label: 'Data Integrity', val: '98.4%', icon: ShieldCheck, col: 'text-zinc-900' },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              <div className="flex items-center gap-3">
                <div className={`${item.col} opacity-40`}><item.icon size={14} /></div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{item.label}</span>
                  <span className="text-sm font-black text-zinc-900 leading-none">{loading ? '...' : item.val}</span>
                </div>
              </div>
              {i < 3 && <div className="h-6 w-px bg-zinc-100 mx-4" />}
            </React.Fragment>
          ))}
          <div className="flex-1" /> {/* Spacer */}
        </div>

        {/* Dynamic Manifest Explorer */}
        <div className="h-[45%] flex flex-col border-b border-zinc-100">
          <div className="px-5 py-3 bg-white border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-400 font-black uppercase text-[9px] tracking-widest"><span>Viewing</span> <ChevronRight size={10}/> <span className="text-zinc-900">{activeType}</span></div>
              <div className="h-4 w-px bg-zinc-200" />
              <div className="relative">
                <Filter size={10} className="absolute left-2.5 top-2 text-zinc-400" />
                <input className="bg-zinc-50 border-none rounded-lg pl-7 pr-3 py-1 text-[10px] font-bold focus:ring-2 focus:ring-zinc-100 outline-none w-48" placeholder={`Search ${activeType}...`} value={filterQuery} onChange={e => setFilterQuery(e.target.value)} />
              </div>
            </div>
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter">Total count: {processedData.length} entries</span>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar bg-white">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10 border-b border-zinc-100">
                <tr>
                  {headers[activeType].map(h => (
                    <th key={h.label} onClick={() => setSortConfig({ key: h.key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })} className="px-5 py-2.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-r border-zinc-100 text-left last:border-r-0 cursor-pointer hover:bg-zinc-50 group transition-colors">
                      <div className="flex items-center justify-between">{h.label} <ArrowUpDown size={10} className={`opacity-0 group-hover:opacity-100 ${sortConfig.key === h.key ? 'opacity-100 text-zinc-900' : ''}`} /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-[11px]">
                {processedData.map(item => (
                  <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-zinc-50 transition-colors cursor-pointer group">
                    {activeType === 'routes' ? (
                      <>
                        <td className="px-5 py-2.5 font-mono text-zinc-300 border-r border-zinc-100 group-hover:text-zinc-900 whitespace-nowrap">#{item.id}</td>
                        <td className="px-5 py-2.5 border-r border-zinc-100"><div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: `#${(item.color || '007AFF').replace('#','')}` }}>{item.short_name}</div></td>
                        <td className="px-5 py-2.5 font-bold text-zinc-900 border-r border-zinc-100 truncate max-w-xs">{item.long_name}</td>
                        <td className="px-5 py-2.5 text-zinc-400 border-r border-zinc-100 uppercase">{stats.agencies.find(a => a.id === item.agency_id)?.name || '...'}</td>
                      </>
                    ) : activeType === 'stops' ? (
                      <>
                        <td className="px-5 py-2.5 font-mono text-zinc-300 border-r border-zinc-100">#{item.id}</td>
                        <td className="px-5 py-2.5 font-bold text-zinc-900 border-r border-zinc-100">{item.name}</td>
                        <td className="px-5 py-2.5 font-mono text-zinc-400 border-r border-zinc-100">{item.lat.toFixed(6)}</td>
                        <td className="px-5 py-2.5 font-mono text-zinc-400 border-r border-zinc-100">{item.lon.toFixed(6)}</td>
                      </>
                    ) : activeType === 'agencies' ? (
                      <>
                        <td className="px-5 py-2.5 font-mono text-zinc-300 border-r border-zinc-100">#{item.id}</td>
                        <td className="px-5 py-2.5 font-bold text-zinc-900 border-r border-zinc-100">{item.name}</td>
                        <td className="px-5 py-2.5 text-zinc-400 border-r border-zinc-100 truncate max-w-xs">{item.url}</td>
                        <td className="px-5 py-2.5 text-zinc-400 border-r border-zinc-100">{item.timezone}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-2.5 font-mono text-zinc-300 border-r border-zinc-100">#{item.id}</td>
                        <td className="px-5 py-2.5 font-mono text-zinc-400 border-r border-zinc-100">L-{item.route_id}</td>
                        <td className="px-5 py-2.5 font-bold text-zinc-900 border-r border-zinc-100">{item.headsign}</td>
                        <td className="px-5 py-2.5 text-zinc-400 border-r border-zinc-100 text-[9px] uppercase tracking-tighter">{item.shape_id}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Log */}
        <div className="flex-1 flex flex-col bg-zinc-50/10">
          <div className="px-5 py-3 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Clock size={12}/> Recent Activity</h3>
            <div className="flex items-center gap-2 text-[8px] font-black text-emerald-500 uppercase tracking-widest"><div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Live updates active</div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 font-mono text-[10px] space-y-2 custom-scrollbar text-zinc-500 bg-zinc-50/20">
            <div className="flex gap-6 opacity-60"><span className="text-zinc-300">14:22:01</span><span className="font-black text-zinc-400">SAVING</span><span>Changes saved to the server successfully.</span></div>
            <div className="flex gap-6 opacity-60"><span className="text-zinc-300">14:21:45</span><span className="font-black text-zinc-400">ROUTING</span><span>Calculated a new road path for your route.</span></div>
            <div className="flex gap-6 opacity-60"><span className="text-zinc-300">14:15:00</span><span className="font-black text-zinc-400">READY</span><span>Everything is up and running. System ready.</span></div>
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
          <div className="flex items-center gap-4"><div className="bg-white/20 p-2 rounded-xl animate-pulse">{quickMode === 'add-stop' ? <MapPin size={18} /> : <Zap size={18} />}</div><div><span className="text-[11px] font-black uppercase tracking-[0.1em] block">Drawing on Map</span><p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{quickMode === 'add-stop' ? 'Click on the map to add a stop' : 'Click on the map to trace your route'}</p></div></div>
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
    <div className="h-[calc(100vh-64px)] overflow-hidden relative text-black font-bold bg-system-background">
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
      {!isHome && (
        <div onClick={() => setSidebarOpen(!sidebarOpen)} className={`absolute top-1/2 -translate-y-1/2 z-[4000] w-1.5 h-16 bg-black/20 hover:bg-system-blue rounded-full flex items-center justify-center cursor-pointer transition-all hover:w-2.5 active:scale-95 group ${sidebarOpen ? 'left-[392px]' : 'left-2'}`} title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}>
          <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">{sidebarOpen ? <ChevronLeft size={10} className="text-white" /> : <ChevronRight size={10} className="text-white" />}</div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <WorkspaceProvider>
        <div className="min-h-screen bg-system-background flex flex-col">
          <Navigation />
          <ShortcutManager />
          <main className="flex-1 overflow-hidden">
            <WorkspaceContainer />
          </main>
        </div>
      </WorkspaceProvider>
    </Router>
  );
}

export default App;