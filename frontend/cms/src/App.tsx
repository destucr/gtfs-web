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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1': e.preventDefault(); navigate('/agencies'); break;
          case '2': e.preventDefault(); navigate('/stops'); break;
          case '3': e.preventDefault(); navigate('/routes'); break;
          case '4': e.preventDefault(); navigate('/trips'); break;
          case '0': e.preventDefault(); navigate('/'); break;
          default: break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
  return null;
};

const Home: React.FC = () => {
  const [stats, setStats] = useState({ agencies: 0, stops: 0, routes: 0, trips: 0 });
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<'checking' | 'online' | 'error'>('checking');

  const fetchStats = useCallback(async () => {
    try {
      const [a, s, r, t] = await Promise.all([
        api.get('/agencies'), api.get('/stops'), api.get('/routes'), api.get('/trips')
      ]);
      setStats({
        agencies: a.data?.length || 0,
        stops: s.data?.length || 0,
        routes: r.data?.length || 0,
        trips: t.data?.length || 0
      });
      setHealth('online');
    } catch {
      setHealth('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const cards = [
    { name: 'Agencies', value: stats.agencies, icon: Globe, path: '/agencies', color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Transit Operators' },
    { name: 'Stops', value: stats.stops, icon: MapPin, path: '/stops', color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Physical Stations' },
    { name: 'Routes', value: stats.routes, icon: RouteIcon, path: '/routes', color: 'text-green-600', bg: 'bg-green-50', desc: 'Service Lines' },
    { name: 'Trips', value: stats.trips, icon: Database, path: '/trips', color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Service Bindings' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700 pointer-events-auto">
      <header className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-black mb-2 text-primary">Transit Control Center</h1>
          <p className="text-lg text-system-gray font-semibold">Network Infrastructure & GTFS Lifecycle Management</p>
        </div>
        <div className="flex gap-3">
            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border shadow-sm ${health === 'online' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <Activity size={16} className={health === 'online' ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">Database: {health.toUpperCase()}</span>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 font-bold">
        {cards.map((c, i) => (
          <Link key={c.path} to={c.path} className="hig-card p-6 group hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-3 rounded-xl ${c.bg} ${c.color} shadow-inner`}><c.icon size={24} /></div>
                <span className="text-[9px] font-black text-system-gray bg-black/5 px-2 py-1 rounded uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Shortcut ^ {i+1}</span>
            </div>
            <div className="mt-6 relative z-10">
                <div className="text-3xl font-black text-black tracking-tight leading-none mb-1">{loading ? <Loader2 size={20} className="animate-spin text-system-gray" /> : c.value}</div>
                <div className="text-xs font-bold text-black uppercase tracking-wide">{c.name}</div>
                <div className="text-[10px] font-medium text-system-gray uppercase mt-1 tracking-widest">{c.desc}</div>
            </div>
            <TrendingUp size={80} className="absolute -right-4 -bottom-4 text-black/[0.02] -rotate-12 group-hover:text-black/[0.05] transition-colors" />
          </Link>
        ))}
      </div>

      <div className="hig-card p-10 bg-gradient-to-br from-system-blue to-blue-700 text-white relative overflow-hidden group shadow-2xl shadow-system-blue/30 flex flex-col justify-center">
          <div className="relative z-10">
              <h2 className="text-3xl font-black mb-3 tracking-tight">Route Studio Unified Editor</h2>
              <p className="text-white/80 max-w-md mb-8 font-semibold text-lg leading-snug text-balance">Construct paths and sequences in a high-performance GIS environment.</p>
              <Link to="/routes" className="inline-flex items-center px-8 py-4 bg-white text-system-blue rounded-2xl font-black text-sm shadow-2xl hover:bg-zinc-100 transition-all active:scale-95 uppercase tracking-tighter">Open Studio</Link>
          </div>
          <Zap size={300} className="absolute -right-20 -bottom-20 text-white/5 -rotate-12 group-hover:scale-110 transition-transform duration-1000" />
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
              {status?.isDirty ? 'Workspace Dirty' : 'Manifest Integrity'}
            </span>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
              {status?.isDirty ? 'Pending Local Buffer' : 'Cloud Synchronized'}
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
          <div className={`flex flex-col items-start transition-all overflow-hidden ${quickMode === 'add-stop' ? 'w-28 opacity-100' : 'w-0 opacity-0 group-hover:w-28 group-hover:opacity-100'}`}>
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
          <div className={`flex flex-col items-start transition-all overflow-hidden ${quickMode === 'add-route' ? 'w-28 opacity-100' : 'w-0 opacity-0 group-hover:w-28 group-hover:opacity-100'}`}>
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