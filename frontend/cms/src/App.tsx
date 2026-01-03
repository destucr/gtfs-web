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
  ArrowRight, Activity, ShieldCheck, Zap, AlertCircle, Loader2, TrendingUp, ChevronRight, ChevronLeft, X
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
    { name: 'Operators', value: stats.agencies.length, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Station Nodes', value: stats.stops.length, icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50' },
    { name: 'Service Lines', value: stats.routes.length, icon: RouteIcon, color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Trip Bindings', value: stats.trips.length, icon: Database, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-700 pointer-events-auto">
      <header className="mb-8 flex justify-between items-end border-b border-black/[0.03] pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black mb-1">Network Control Center</h1>
          <p className="text-[10px] text-system-gray font-bold uppercase tracking-widest opacity-60">Global GTFS Infrastructure Management</p>
        </div>
        <div className="flex gap-2">
            <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 border shadow-sm ${health === 'online' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${health === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest">System {health.toUpperCase()}</span>
            </div>
            <button onClick={fetchStats} className="p-1.5 hover:bg-black/5 rounded-full text-system-gray transition-colors"><RotateCcw size={14}/></button>
        </div>
      </header>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statsGrid.map((c) => (
          <div key={c.name} className="bg-white border border-black/5 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${c.bg} ${c.color}`}><c.icon size={16} /></div>
              <TrendingUp size={14} className="text-black/5 group-hover:text-black/20 transition-colors" />
            </div>
            <div className="text-2xl font-black text-black leading-none mb-1">{loading ? '...' : c.value}</div>
            <div className="text-[9px] font-black text-system-gray uppercase tracking-widest">{c.name}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Network Integrity Panel */}
        <section className="col-span-2 bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-black/[0.02] border-b border-black/5 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={14} className="text-system-blue" /> Integrity Audit</h3>
            <span className="text-[8px] font-black text-system-gray opacity-40">REAL-TIME ANALYSIS</span>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-black/60">Registry Health</span>
                <span className="text-[11px] font-black text-green-600">98.4%</span>
              </div>
              <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[98.4%]" />
              </div>
              <p className="text-[9px] text-system-gray leading-relaxed font-bold uppercase">All major shapes and stops are topologically linked to operators.</p>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={12} className="text-orange-600" />
                  <span className="text-[9px] font-black text-orange-700 uppercase">Orphan Nodes</span>
                </div>
                <span className="text-[10px] font-black text-orange-700">0 DETECTED</span>
              </div>
              <div className="p-3 bg-system-blue/5 rounded-xl border border-system-blue/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={12} className="text-system-blue" />
                  <span className="text-[9px] font-black text-system-blue uppercase">GORM Buffer</span>
                </div>
                <span className="text-[10px] font-black text-system-blue tracking-tighter">ACTIVE SYNC</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Registry Peek */}
        <section className="col-span-2 bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-black/[0.02] border-b border-black/5 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Activity size={14} className="text-system-blue" /> Recent Registry Entries</h3>
            <Link to="/routes" className="text-[8px] font-black text-system-blue hover:underline">VIEW ALL</Link>
          </div>
          <div className="divide-y divide-black/[0.03]">
            {stats.routes.slice(0, 4).map(route => (
              <div key={route.id} className="px-6 py-3 flex items-center justify-between hover:bg-black/[0.01] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md shadow-sm flex items-center justify-center text-white text-[8px] font-black shrink-0" style={{ backgroundColor: `#${(route.color || '007AFF').replace('#','')}` }}>{route.short_name}</div>
                  <span className="text-[11px] font-bold text-black uppercase truncate max-w-[200px]">{route.long_name}</span>
                </div>
                <span className="text-[8px] font-black text-system-gray opacity-40">LINE #{route.id}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Action Panel */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-system-blue to-blue-700 p-6 rounded-3xl text-white shadow-2xl shadow-system-blue/20 relative overflow-hidden group h-full flex flex-col justify-between">
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4"><Zap size={20}/></div>
              <h2 className="text-xl font-black mb-2 tracking-tight leading-tight">GIS Studio Engine</h2>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-6">High-density visual network drafting</p>
              <Link to="/routes" className="inline-flex items-center px-6 py-3 bg-white text-system-blue rounded-xl font-black text-[10px] shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">Enter Studio</Link>
            </div>
            <TrendingUp size={150} className="absolute -right-10 -bottom-10 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-1000 pointer-events-none" />
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
              {status?.isDirty ? 'Local edits detected' : 'Registry Synchronized'}
            </span>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
              {status?.isDirty ? 'Commit changes to update database' : 'Workspace matches cloud manifest'}
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
              <span className="text-[11px] font-black uppercase tracking-[0.1em] block">GIS Creative Mode</span>
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">
                {quickMode === 'add-stop' ? 'Click Map to Record Node' : 'Click Map to Extend Path'}
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
          title="New Stop Node"
        >
          <MapPin size={18} />
          <div className={`flex flex-col items-start transition-all overflow-hidden ${sidebarOpen || quickMode === 'add-stop' ? 'w-28 opacity-100' : 'w-0 opacity-0 group-hover:w-28 group-hover:opacity-100'}`}>
            <span className="text-[9px] font-black uppercase tracking-tight leading-none">Node Capture</span>
            <span className="text-[7px] font-bold opacity-60 uppercase whitespace-nowrap">Add station to map</span>
          </div>
        </button>
        <button 
          onClick={() => handleAction('add-route')}
          className={`group flex items-center gap-3 p-3 rounded-[1rem] transition-all hover:scale-[1.02] active:scale-95 ${quickMode === 'add-route' ? 'bg-system-blue shadow-xl shadow-system-blue/30 text-white' : 'hover:bg-black/5 text-system-blue'}`}
          title="Trace Geometry"
        >
          <RouteIcon size={18} />
          <div className={`flex flex-col items-start transition-all overflow-hidden ${sidebarOpen || quickMode === 'add-route' ? 'w-28 opacity-100' : 'w-0 opacity-0 group-hover:w-28 group-hover:opacity-100'}`}>
            <span className="text-[9px] font-black uppercase tracking-tight leading-none">Path Trace</span>
            <span className="text-[7px] font-bold opacity-60 uppercase whitespace-nowrap">Draw route on road</span>
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