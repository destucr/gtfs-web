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

  const statsGrid = [
    { name: 'Operators', value: stats.agencies.length, icon: Globe },
    { name: 'Station Nodes', value: stats.stops.length, icon: MapPin },
    { name: 'Service Lines', value: stats.routes.length, icon: RouteIcon },
    { name: 'Trip Bindings', value: stats.trips.length, icon: Database },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700 pointer-events-auto">
      <header className="mb-10 flex justify-between items-center border-b border-zinc-100 pb-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-zinc-900/20"><LayoutDashboard size={24}/></div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 leading-none">Dashboard</h1>
            <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-[0.15em] mt-2">Network intelligence and connectivity audit</p>
          </div>
        </div>
        <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl flex items-center gap-3 border border-zinc-100 bg-white shadow-sm">
                <div className={`w-2 h-2 rounded-full ${health === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{health === 'online' ? 'All systems operational' : 'Connection failure'}</span>
            </div>
            <button onClick={fetchStats} className="p-2.5 hover:bg-zinc-100 rounded-xl text-zinc-400 transition-all active:rotate-180 duration-500 border border-transparent hover:border-zinc-200"><RotateCcw size={16}/></button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 space-y-8">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            {statsGrid.map((c) => (
              <div key={c.name} className="bg-white border border-zinc-100 p-5 rounded-[1.5rem] shadow-sm hover:border-zinc-300 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-lg bg-zinc-50 text-zinc-400 group-hover:text-zinc-900 transition-colors"><c.icon size={18} /></div>
                  <TrendingUp size={14} className="text-zinc-100 group-hover:text-zinc-300 transition-colors" />
                </div>
                <div className="text-3xl font-black text-zinc-900 tracking-tighter leading-none mb-1.5">{loading ? '...' : c.value}</div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{c.name}</div>
              </div>
            ))}
          </div>

          {/* Detailed Routes Manifest */}
          <section className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="px-6 py-5 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-zinc-500"><RouteIcon size={14}/> Service Lines</h3>
              <span className="text-[9px] font-black text-zinc-900 bg-white border border-zinc-200 px-3 py-1 rounded-full uppercase">{stats.routes.length} Active</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50/30 border-b border-zinc-100">
                  <tr>
                    <th className="px-6 py-3.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">ID</th>
                    <th className="px-6 py-3.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Route Name</th>
                    <th className="px-6 py-3.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Topology</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {stats.routes.slice(0, 8).map(r => (
                    <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white shadow-lg" style={{ backgroundColor: `#${(r.color || '007AFF').replace('#','')}` }}>{r.short_name}</div>
                          <span className="text-xs font-mono font-black text-zinc-300 group-hover:text-zinc-900 transition-colors">#{r.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-zinc-900 truncate max-w-[300px]">{r.long_name}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-tight">Verified</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/30 text-center">
              <Link to="/routes" className="text-[10px] font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-[0.25em] transition-colors">Open studio for full manifest &rarr;</Link>
            </div>
          </section>
        </div>

        <div className="col-span-4 space-y-8">
          {/* GIS Studio Pro Action */}
          <section className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-inner"><Zap size={24} className="text-zinc-100"/></div>
              <h2 className="text-2xl font-black mb-2 tracking-tight">Route Studio</h2>
              <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-10 leading-relaxed">High-performance visual network drafting engine</p>
              <Link to="/routes" className="flex items-center justify-center w-full py-4 bg-white text-zinc-900 rounded-2xl font-black text-[11px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em]">Open Designer</Link>
            </div>
            <TrendingUp size={180} className="absolute -right-12 -bottom-12 text-white/[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000 pointer-events-none" />
          </section>

          {/* Infrastructure Health */}
          <section className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-3"><ShieldCheck size={16}/> System Health</h3>
            <div className="space-y-5">
              <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-zinc-500 uppercase">Registry Sync</span><span className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">Operational</span></div>
              <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-zinc-500 uppercase">Database Status</span><span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Connected</span></div>
              <div className="pt-5 border-t border-zinc-100 flex justify-between items-center"><span className="text-[11px] font-bold text-zinc-500 uppercase">Manifest Integrity</span><span className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">98.4%</span></div>
            </div>
          </section>
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