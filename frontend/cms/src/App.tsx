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
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-bottom-4 duration-300">
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
  const { mapLayers, status, quickMode, setQuickMode } = useWorkspace();
  const location = useLocation();
  if (location.pathname === '/') return null;

  return (
    <div className="absolute top-4 left-4 z-[1000] pointer-events-none flex flex-col gap-2">
      {/* Quick Mode Indicator */}
      {quickMode && (
        <div className="bg-system-blue text-white px-4 py-2 rounded-xl border border-blue-400/30 shadow-2xl flex items-center justify-between gap-6 animate-in zoom-in duration-300 pointer-events-auto">
          <div className="flex items-center gap-3">
            {quickMode === 'add-stop' ? <MapPin size={16} className="animate-bounce" /> : <Zap size={16} className="animate-pulse" />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {quickMode === 'add-stop' ? 'Click Map to Drop Stop' : 'Click Map to Start Path'}
            </span>
          </div>
          <button onClick={() => setQuickMode(null)} className="hover:bg-white/20 p-1 rounded-lg transition-colors"><X size={14}/></button>
        </div>
      )}

      {/* Persistence Indicator */}
      {(status?.isDirty || mapLayers.activeShape.length > 0) && (
        <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-white/10 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
          <div className={`w-2 h-2 rounded-full ${status?.isDirty ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {status?.isDirty ? 'Unsaved Changes' : 'All Changes Synced'}
          </span>
        </div>
      )}
    </div>
  );
};

const QuickActionMenu: React.FC = () => {
  const { setQuickMode, quickMode } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  
  if (location.pathname === '/') return null;

  const handleAction = (mode: 'add-stop' | 'add-route') => {
    setQuickMode(mode);
    if (mode === 'add-stop') navigate('/stops');
    if (mode === 'add-route') navigate('/routes');
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 animate-in slide-in-from-right-4">
      <button 
        onClick={() => handleAction('add-stop')}
        className={`group flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border transition-all hover:scale-105 active:scale-95 ${quickMode === 'add-stop' ? 'bg-orange-500 border-orange-400 text-white' : 'bg-white border-black/5 text-orange-600'}`}
      >
        <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${quickMode === 'add-stop' ? 'block' : 'hidden group-hover:block'}`}>Drop Stop</span>
        <MapPin size={18} />
      </button>
      <button 
        onClick={() => handleAction('add-route')}
        className={`group flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border transition-all hover:scale-105 active:scale-95 ${quickMode === 'add-route' ? 'bg-system-blue border-blue-400 text-white' : 'bg-white border-black/5 text-system-blue'}`}
      >
        <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${quickMode === 'add-route' ? 'block' : 'hidden group-hover:block'}`}>Trace Route</span>
        <RouteIcon size={18} />
      </button>
    </div>
  );
};

const WorkspaceContainer: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useWorkspace();
  const isHome = location.pathname === '/';

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative text-black font-bold">
      <FloatingFeedback />
      
      {/* Sidebar Content */}
      <div 
        className={`${isHome ? 'flex-1' : ''} h-full transition-all duration-300 overflow-hidden shrink-0 relative`}
        style={{ width: isHome ? '100%' : (sidebarOpen ? '450px' : '0') }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/stops" element={<Stops />} />
          <Route path="/routes" element={<RouteStudio />} />
          <Route path="/trips" element={<Trips />} />
        </Routes>
      </div>

      {/* Unified Toggle Handle - Only visible when not on home */}
      {!isHome && (
        <div 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute top-1/2 -translate-y-1/2 z-[2000] w-6 h-24 bg-white shadow-2xl border border-black/5 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 group shadow-system-blue/10 ${sidebarOpen ? 'left-[438px]' : 'left-2'}`}
        >
          {sidebarOpen ? <ChevronLeft size={16} className="text-system-gray group-hover:text-system-blue" /> : <ChevronRight size={16} className="text-system-blue" />}
        </div>
      )}

      {/* Persistent Map */}
      <div 
        className={`flex-1 relative border-l border-black/5 h-full ${isHome ? 'hidden' : 'block'}`}
        style={{ minHeight: '100%' }}
      >
        <MapHUD />
        <QuickActionMenu />
        <UnifiedMap />
      </div>
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