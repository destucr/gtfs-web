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
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-700 pointer-events-auto">
      <header className="mb-8 flex justify-between items-center border-b border-black/[0.03] pb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-xl"><LayoutDashboard size={20}/></div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-black leading-none">Dashboard</h1>
            <p className="text-[10px] text-system-gray font-bold uppercase tracking-widest mt-1.5 opacity-60">Overview of your transit network</p>
          </div>
        </div>
        <div className="flex gap-2">
            <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border shadow-sm ${health === 'online' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <div className={`w-1 h-1 rounded-full ${health === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[8px] font-black uppercase tracking-widest">{health === 'online' ? 'All systems operational' : 'System connection error'}</span>
            </div>
            <button onClick={fetchStats} className="p-2 hover:bg-black/5 rounded-lg text-system-gray transition-all active:rotate-180 duration-500" title="Refresh data"><RotateCcw size={14}/></button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          {/* Detailed Routes Manifest */}
          <section className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-black/[0.02] border-b border-black/5 flex items-center justify-between">
              <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 text-black/60"><RouteIcon size={12}/> Service Lines</h3>
              <span className="text-[8px] font-black text-system-blue bg-system-blue/5 px-2 py-0.5 rounded uppercase">{stats.routes.length} Active Routes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/[0.01] border-b border-black/[0.03]">
                  <tr>
                    <th className="px-5 py-2.5 text-[8px] font-black text-system-gray uppercase tracking-widest">Line</th>
                    <th className="px-5 py-2.5 text-[8px] font-black text-system-gray uppercase tracking-widest">Route Name</th>
                    <th className="px-5 py-2.5 text-[8px] font-black text-system-gray uppercase tracking-widest">Operator</th>
                    <th className="px-5 py-2.5 text-[8px] font-black text-system-gray uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02]">
                  {stats.routes.slice(0, 10).map(r => (
                    <tr key={r.id} className="hover:bg-black/[0.01] transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black text-white shadow-sm" style={{ backgroundColor: `#${(r.color || '007AFF').replace('#','')}` }}>{r.short_name}</div>
                          <span className="text-[10px] font-mono font-black text-black">#{r.id}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[11px] font-bold text-black truncate max-w-[200px]">{r.long_name}</td>
                      <td className="px-5 py-3 text-[9px] font-black text-system-gray uppercase tracking-tight">
                        {stats.agencies.find(a => a.id === r.agency_id)?.name || 'No Operator'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1 text-[8px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">Live</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-black/5 bg-black/[0.01] text-center">
              <Link to="/routes" className="text-[8px] font-black text-system-blue uppercase tracking-[0.2em] hover:underline">View all routes in Studio &rarr;</Link>
            </div>
          </section>

          {/* Infrastructure Health Audit */}
          <section className="bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-black/[0.02] border-b border-black/5 flex items-center justify-between">
              <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 text-black/60"><ShieldCheck size={12}/> Network Health</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-orange-500"/><span className="text-[10px] font-black uppercase tracking-widest text-black/80">Stops</span></div>
                  <span className="text-[11px] font-mono font-black">{stats.stops.length}</span>
                </div>
                <div className="flex items-center justify-between border-t border-black/[0.03] pt-3">
                  <div className="flex items-center gap-2"><Database size={14} className="text-purple-500"/><span className="text-[10px] font-black uppercase tracking-widest text-black/80">Active Trips</span></div>
                  <span className="text-[11px] font-mono font-black">{stats.trips.length}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-system-blue/5 rounded-xl border border-system-blue/10 flex items-center justify-between">
                  <span className="text-[8px] font-black text-system-blue uppercase tracking-widest">Mapped Paths</span>
                  <span className="text-[10px] font-black text-system-blue">{stats.trips.filter(t => t.shape_id).length} Verified</span>
                </div>
                <div className="p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                  <span className="text-[8px] font-black text-green-700 uppercase tracking-widest">Disconnected Stops</span>
                  <span className="text-[10px] font-black text-green-700">0 Found</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="col-span-4 space-y-6">
          <section className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-2xl text-white shadow-2xl relative overflow-hidden group border border-white/5">
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-4"><Zap size={20} className="text-yellow-400 animate-pulse"/></div>
              <h2 className="text-lg font-black mb-1 tracking-tight">Route Studio</h2>
              <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.2em] mb-6">Create and edit routes on the map</p>
              <Link to="/routes" className="flex items-center justify-center w-full py-3 bg-white text-black rounded-xl font-black text-[9px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">Open Designer</Link>
            </div>
            <TrendingUp size={120} className="absolute -right-8 -bottom-8 text-white/[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000 pointer-events-none" />
          </section>

          <section className="bg-white border border-black/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-black/60 mb-4 flex items-center gap-2"><Clock size={12}/> Session Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-system-gray uppercase">Last Update</span><span className="text-[9px] font-black text-black">Just now</span></div>
              <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-system-gray uppercase">Data Sync</span><span className="text-[9px] font-black text-system-blue uppercase bg-system-blue/5 px-1.5 py-0.5 rounded">Active</span></div>
              <div className="flex justify-between items-center pt-3 border-t border-black/[0.03]"><span className="text-[9px] font-bold text-system-gray uppercase">Permissions</span><span className="text-[9px] font-black text-green-600 uppercase">Administrator</span></div>
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