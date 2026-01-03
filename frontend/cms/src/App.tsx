import React, { useEffect, useState, useCallback } from 'react';
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
  ChevronRight, ChevronLeft, X, RotateCcw, Info, Hash, Clock
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
  const [stats, setStats] = useState({ agencies: [], stops: [], routes: [], trips: [] });
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<'checking' | 'online' | 'error'>('checking');

  const fetchStats = useCallback(async () => {
    try {
      const [a, s, r, t] = await Promise.all([
        api.get('/agencies'), api.get('/stops'), api.get('/routes'), api.get('/trips')
      ]);
      setStats({
        agencies: a.data || [],
        stops: s.data || [],
        routes: r.data || [],
        trips: t.data || []
      });
      setHealth('online');
    } catch {
      setHealth('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="flex h-full bg-white text-zinc-900 overflow-hidden font-bold select-none animate-in fade-in duration-500 pointer-events-auto">
      {/* Pane 1: Overview Tree (Left Sidebar) */}
      <div className="w-64 border-r border-zinc-100 flex flex-col bg-zinc-50/30">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-zinc-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Network Tree</span>
          </div>
          <button onClick={fetchStats} className="text-zinc-400 hover:text-zinc-900 transition-all active:rotate-180"><RotateCcw size={12}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[
            { label: 'Operators', count: stats.agencies.length, icon: Globe },
            { label: 'Stops', count: stats.stops.length, icon: MapPin },
            { label: 'Routes', count: stats.routes.length, icon: RouteIcon },
            { label: 'Bindings', count: stats.trips.length, icon: Hash },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-100 cursor-pointer group transition-colors">
              <div className="flex items-center gap-3 text-zinc-500 group-hover:text-zinc-900">
                <item.icon size={14} />
                <span className="text-[11px] font-bold">{item.label}</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-white border border-zinc-100 px-1.5 py-0.5 rounded-md">{loading ? '...' : item.count}</span>
            </div>
          ))}
          <div className="pt-4 px-3 pb-2 text-[9px] font-black text-zinc-300 uppercase tracking-widest border-t border-zinc-100 mt-2">Health Status</div>
          <div className="px-3 py-2 flex items-center gap-3 bg-white mx-2 rounded-xl border border-zinc-100">
            <div className={`w-1.5 h-1.5 rounded-full ${health === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-bold text-zinc-600">{health === 'online' ? 'Engine Online' : 'Sync Offline'}</span>
          </div>
        </div>
        <div className="p-4 bg-zinc-900 text-white group cursor-pointer overflow-hidden relative">
          <Link to="/routes" className="relative z-10 flex items-center justify-between w-full">
            <span className="text-[10px] font-black uppercase tracking-widest">Open Studio</span>
            <ArrowRight size={14} />
          </Link>
          <Zap size={60} className="absolute -right-4 -bottom-4 text-white/5 -rotate-12 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* Pane 2: Table Explorer (Main Center) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-1/2 flex flex-col border-b border-zinc-100">
          <div className="px-4 py-2.5 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><RouteIcon size={12}/> Global Service Manifest</h3>
            <span className="text-[8px] font-black text-zinc-400">Total: {stats.routes.length} entries</span>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10 border-b border-zinc-100">
                <tr>
                  {['ID', 'Label', 'Name', 'Operator', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-r border-zinc-100 text-left last:border-r-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-[11px]">
                {stats.routes.map(r => (
                  <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-2 font-mono text-zinc-300 border-r border-zinc-100 whitespace-nowrap">#{r.id}</td>
                    <td className="px-4 py-2 border-r border-zinc-100 whitespace-nowrap">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-white shadow-sm" style={{ backgroundColor: `#${(r.color || '007AFF').replace('#','')}` }}>{r.short_name}</div>
                    </td>
                    <td className="px-4 py-2 font-bold text-zinc-900 border-r border-zinc-100 truncate max-w-xs">{r.long_name}</td>
                    <td className="px-4 py-2 text-zinc-400 border-r border-zinc-100 uppercase">
                      {stats.agencies.find(a => a.id === r.agency_id)?.name || '...'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Verified</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pane 3: Audit Logs (Bottom Center) */}
        <div className="h-1/2 flex flex-col bg-zinc-50/10">
          <div className="px-4 py-2 bg-white border-b border-zinc-100 flex items-center justify-between shrink-0">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Clock size={12}/> Registry Event Log</h3>
            <div className="flex gap-3 text-[8px] font-black text-zinc-400 uppercase">
              <span>Streaming: Active</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1.5 custom-scrollbar text-zinc-600">
            <div className="flex gap-4"><span className="text-zinc-300">14:22:01</span><span className="font-black text-zinc-400 uppercase">DB_SYNC</span><span>Successfully updated Route manifest. All changes committed.</span></div>
            <div className="flex gap-4"><span className="text-zinc-300">14:21:45</span><span className="font-black text-zinc-400 uppercase">GEO_CALC</span><span>Geometry for SHP_REDLINE recalculated via OSRM service.</span></div>
            <div className="flex gap-4"><span className="text-zinc-300">14:20:30</span><span className="font-black text-zinc-400 uppercase">SYS_LOG</span><span>User session validated. Admin privileges confirmed.</span></div>
            <div className="flex gap-4"><span className="text-zinc-300">14:15:00</span><span className="font-black text-zinc-400 uppercase">SYS_BOOT</span><span>Transit Control Engine initialization complete. Registry ready.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FloatingFeedback: React.FC = () => {
  const { status } = useWorkspace();
  if (!status) return null;

  const colors = {
    info: 'bg-white text-black border-black/5',
    success: 'bg-green-500 text-white border-green-600',
    error: 'bg-red-500 text-white border-red-600',
    loading: 'bg-system-blue text-white border-blue-600'
  };

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
    <div 
      className="absolute top-6 z-[1000] pointer-events-none flex flex-col gap-3 transition-all duration-500"
      style={{ left: sidebarOpen ? 424 : 24 }}
    >
      {/* Persistence Indicator */}
      {(status?.isDirty || mapLayers.activeShape.length > 0) && (
        <div className="bg-black/80 backdrop-blur-xl text-white px-5 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-auto">
          <div className="relative flex h-3 w-3">
            <div className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status?.isDirty ? 'bg-orange-400' : 'bg-green-400'}`} />
            <div className={`relative inline-flex rounded-full h-3 w-3 ${status?.isDirty ? 'bg-orange-500' : 'bg-green-500'}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">
              {status?.isDirty ? 'Unsaved changes detected' : 'Registry synchronized'}
            </span>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
              {status?.isDirty ? 'Click Save to update the database' : 'Your workspace matches the server'}
            </p>
          </div>
        </div>
      )}

      {/* Quick Mode Indicator */}
      {quickMode && (
        <div className="bg-system-blue/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl border border-blue-400/30 shadow-[0_20px_50px_rgba(0,122,255,0.3)] flex items-center justify-between gap-8 animate-in zoom-in slide-in-from-top-4 duration-500 pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-xl animate-pulse">
              {quickMode === 'add-stop' ? <MapPin size={18} /> : <Zap size={18} />}
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.1em] block">Interactive Mode</span>
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">
                {quickMode === 'add-stop' ? 'Click on the map to add a stop' : 'Click on the map to trace your route'}
              </p>
            </div>
          </div>
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

  const handleAction = (mode: 'add-stop' | 'add-route') => {
    if (quickMode === mode) {
      setQuickMode(null);
    } else {
      setQuickMode(mode);
      if (mode === 'add-stop') navigate('/stops');
      if (mode === 'add-route') navigate('/routes');
    }
  };

  return (
    <div 
      className="absolute bottom-10 z-[1000] flex flex-col gap-3 transition-all duration-500 pointer-events-none"
      style={{ left: sidebarOpen ? 424 : 24 }}
    >
      <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-[1.5rem] shadow-2xl border border-black/5 flex flex-col gap-1 pointer-events-auto">
        <button 
          onClick={() => handleAction('add-stop')}
          className={`group flex items-center gap-3 p-3 rounded-[1rem] transition-all hover:scale-[1.02] active:scale-95 ${quickMode === 'add-stop' ? 'bg-orange-500 shadow-xl shadow-orange-500/30 text-white' : 'hover:bg-black/5 text-orange-600'}`}
          title="Add Stop"
        >
          <MapPin size={18} />
          <div className={`flex flex-col items-start transition-all overflow-hidden ${sidebarOpen || quickMode === 'add-stop' ? 'w-28 opacity-100' : 'w-0 opacity-0 group-hover:w-28 group-hover:opacity-100'}`}>
            <span className="text-[9px] font-black uppercase tracking-tight leading-none">Add Stop</span>
            <span className="text-[7px] font-bold opacity-60 uppercase whitespace-nowrap">Click map to place</span>
          </div>
        </button>
        <button 
          onClick={() => handleAction('add-route')}
          className={`group flex items-center gap-3 p-3 rounded-[1rem] transition-all hover:scale-[1.02] active:scale-95 ${quickMode === 'add-route' ? 'bg-system-blue shadow-xl shadow-system-blue/30 text-white' : 'hover:bg-black/5 text-system-blue'}`}
          title="Trace Route"
        >
          <RouteIcon size={18} />
          <div className={`flex flex-col items-start transition-all overflow-hidden ${sidebarOpen || quickMode === 'add-route' ? 'w-28 opacity-100' : 'w-0 opacity-0 group-hover:w-28 group-hover:opacity-100'}`}>
            <span className="text-[9px] font-black uppercase tracking-tight leading-none">Trace Path</span>
            <span className="text-[7px] font-bold opacity-60 uppercase whitespace-nowrap">Follow the roads</span>
          </div>
        </button>
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
      
      {/* Layer 0: The Map (Global Background) */}
      {!isHome && (
        <div className="absolute inset-0 z-0">
          <UnifiedMap />
        </div>
      )}

      {/* Layer 10: Map Overlay UI (HUD & Actions) */}
      {!isHome && (
        <>
          <MapHUD />
          <QuickActionMenu />
        </>
      )}

      {/* Layer 20+: UI Elements (Registry & Hubs) */}
      <div className={`absolute inset-0 transition-all duration-300 ${isHome ? 'z-30 pointer-events-auto' : 'z-20 pointer-events-none'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/stops" element={<Stops />} />
          <Route path="/routes" element={<RouteStudio />} />
          <Route path="/trips" element={<Trips />} />
        </Routes>
      </div>

      {/* Sidebar Toggle Handle (Sleek Nub) */}
      {!isHome && (
        <div 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute top-1/2 -translate-y-1/2 z-[4000] w-1.5 h-16 bg-black/20 hover:bg-system-blue rounded-full flex items-center justify-center cursor-pointer transition-all hover:w-2.5 active:scale-95 group ${sidebarOpen ? 'left-[392px]' : 'left-2'}`}
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            {sidebarOpen ? <ChevronLeft size={10} className="text-white" /> : <ChevronRight size={10} className="text-white" />}
          </div>
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
