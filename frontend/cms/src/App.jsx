import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Agencies from './components/Agencies';
import Stops from './components/Stops';
import RouteStudio from './components/Routes';
import Trips from './components/Trips';
import api from './api';
import { 
  LayoutDashboard, Globe, MapPin, Route as RouteIcon, Database, 
  ArrowRight, Activity, ShieldCheck, Zap, AlertCircle, Loader2, TrendingUp 
} from 'lucide-react';

const ShortcutManager = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const handleKeyDown = (e) => {
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

const Home = () => {
  const [stats, setStats] = useState({ agencies: 0, stops: 0, routes: 0, trips: 0 });
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState('checking');

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
          <h1 className="text-4xl font-black tracking-tight text-black mb-2">Transit Control Center</h1>
          <p className="text-lg text-system-gray font-semibold">Network Infrastructure & GTFS Lifecycle Management</p>
        </div>
        
        <div className="flex gap-3">
            <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border shadow-sm ${health === 'online' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <Activity size={16} className={health === 'online' ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">Database: {health.toUpperCase()}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white border border-black/5 shadow-sm flex items-center gap-2 text-system-gray">
                <ShieldCheck size={16} className="text-system-blue" />
                <span className="text-[10px] font-black uppercase tracking-widest">Secure Environment</span>
            </div>
        </div>
      </header>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((c, i) => (
          <Link key={c.path} to={c.path} className="hig-card p-6 group hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-3 rounded-xl ${c.bg} ${c.color} shadow-inner`}>
                    <c.icon size={24} />
                </div>
                <span className="text-[9px] font-black text-system-gray bg-black/5 px-2 py-1 rounded uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Shortcut ^ {i+1}</span>
            </div>
            <div className="mt-6 relative z-10">
                <div className="text-3xl font-black text-black tracking-tight leading-none mb-1">
                    {loading ? <Loader2 size={20} className="animate-spin text-system-gray" /> : c.value}
                </div>
                <div className="text-xs font-bold text-black uppercase tracking-wide">{c.name}</div>
                <div className="text-[10px] font-medium text-system-gray uppercase mt-1 tracking-widest">{c.desc}</div>
            </div>
            <TrendingUp size={80} className="absolute -right-4 -bottom-4 text-black/[0.02] -rotate-12 group-hover:text-black/[0.05] transition-colors" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Featured App */}
        <div className="lg:col-span-2">
            <div className="hig-card p-10 bg-gradient-to-br from-system-blue to-blue-700 text-white relative overflow-hidden group shadow-2xl shadow-system-blue/30 h-full flex flex-col justify-center">
                <div className="relative z-10">
                    <div className="bg-white/20 backdrop-blur-md w-fit px-3 py-1 rounded-full text-[10px] font-black tracking-widest mb-4 border border-white/10 uppercase">Advanced Geographic Engine</div>
                    <h2 className="text-3xl font-black mb-3 tracking-tight">Route Studio &bull; Unified Workspace</h2>
                    <p className="text-white/80 max-w-md mb-8 font-semibold text-lg leading-snug text-balance">Construct paths using OSRM smart-routing, assign stop sequences, and visualize your entire fleet geometry in a high-performance GIS environment.</p>
                    <Link to="/routes" className="inline-flex items-center px-8 py-4 bg-white text-system-blue rounded-2xl font-black text-sm shadow-2xl hover:bg-zinc-100 transition-all active:scale-95 uppercase tracking-tighter">
                        Launch Mapping Studio
                    </Link>
                </div>
                <Zap size={300} className="absolute -right-20 -bottom-20 text-white/5 -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-transform duration-1000" />
            </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
            <div className="hig-card p-6 shadow-sm">
                <h3 className="text-xs font-black text-system-gray uppercase tracking-widest mb-6 flex items-center gap-2">
                    <AlertCircle size={14} className="text-system-blue" /> Quick Data Summary
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-black/5 pb-3">
                        <span className="text-xs font-bold text-system-gray uppercase tracking-wider">Network Density</span>
                        <span className="text-sm font-black text-black">{stats.routes > 0 ? (stats.stops / stats.routes).toFixed(1) : 0} <span className="text-[10px] text-system-gray">STOPS / LINE</span></span>
                    </div>
                    <div className="flex justify-between items-end border-b border-black/5 pb-3">
                        <span className="text-xs font-bold text-system-gray uppercase tracking-wider">Geographic Links</span>
                        <span className="text-sm font-black text-black">{stats.trips} <span className="text-[10px] text-system-gray">ACTIVE BINDINGS</span></span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-system-gray uppercase tracking-wider">System Version</span>
                        <span className="text-[10px] font-black text-system-blue bg-system-blue/10 px-2 py-1 rounded">V1.24 GOLANG</span>
                    </div>
                </div>
            </div>

            <div className="hig-card p-6 shadow-sm bg-black text-white border-none">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Real-time Synchronization</h3>
                <p className="text-sm font-bold leading-relaxed mb-4">All geographic and metadata changes are broadcasted to the public viewer via high-frequency polling every 5 seconds.</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-system-blue uppercase tracking-widest bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/5">
                    <Zap size={12} /> Sync Engine Active
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-system-background">
        <Navigation />
        <ShortcutManager />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/agencies" element={<Agencies />} />
            <Route path="/stops" element={<Stops />} />
            <Route path="/routes" element={<RouteStudio />} />
            <Route path="/trips" element={<Trips />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
