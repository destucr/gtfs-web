import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Agencies from './components/Agencies';
import Stops from './components/Stops';
import RouteStudio from './components/Routes';
import Trips from './components/Trips';
import SettingsPage from './components/SettingsPage';
import { Dashboard } from './components/Dashboard';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { useWorkspace } from './context/useWorkspace';
import {
  MapPin, Route as RouteIcon, Zap, AlertCircle, Loader2,
  X, PanelLeftOpen, ShieldCheck
} from 'lucide-react';

const ShortcutManager: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedEntityId, setQuickMode, settings } = useWorkspace();

  // Sync dark mode to document root
  useEffect(() => {
    if (settings['dark_mode'] === 'true') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

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
  if (location.pathname === '/' || location.pathname === '/settings') return null;
  return (
    <div className="absolute top-6 z-[1000] pointer-events-none flex flex-col gap-3 transition-[left] duration-500" style={{ left: sidebarOpen ? 424 : 24 }}>
      {(status?.isDirty || mapLayers.activeShape.length > 0) && (
        <div className="bg-black/80 backdrop-blur-xl text-white px-5 py-3 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500 pointer-events-auto">
          <div className="relative flex h-3 w-3"><div className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status?.isDirty ? 'bg-orange-400' : 'bg-green-400'}`} /><div className={`relative inline-flex rounded-full h-3 w-3 ${status?.isDirty ? 'bg-orange-500' : 'bg-green-500'}`} /></div>
          <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-[0.15em]">{status?.isDirty ? 'Unsaved changes detected' : 'Registry synchronized'}</span><p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{status?.isDirty ? 'Click Save to update the server' : 'Your workspace matches the server'}</p></div>
        </div>
      )}
      {quickMode && (
        <div className="bg-system-blue/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl border border-blue-400/30 shadow-[0_20px_50px_rgba(0,122,255,0.3)] flex items-center justify-between gap-8 animate-in zoom-in slide-in-from-top-4 duration-500 pointer-events-auto">
          <div className="flex items-center gap-4"><div className="bg-white/20 p-2 rounded-xl animate-pulse">{quickMode === 'add-stop' ? <MapPin size={18} /> : <Zap size={18} />}</div><div><span className="text-[11px] font-black uppercase tracking-[0.1em] block">Interactive Mode</span><p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{quickMode === 'add-stop' ? 'Click on the map to add a stop' : 'Click on the map to trace your route'}</p></div></div>
          <button onClick={() => setQuickMode(null)} className="hover:bg-white/20 p-2 rounded-xl transition-all active:scale-90"><X size={16} /></button>
        </div>
      )}
    </div>
  );
};

const QuickActionMenu: React.FC = () => {
  const { setQuickMode, quickMode, sidebarOpen } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/' || location.pathname === '/settings') return null;
  const handleAction = (mode: 'add-stop' | 'add-route') => { if (quickMode === mode) { setQuickMode(null); } else { setQuickMode(mode); if (mode === 'add-stop') navigate('/stops'); if (mode === 'add-route') navigate('/routes'); } };
  return (
    <div className="absolute bottom-10 z-[1000] flex flex-col gap-3 transition-[left] duration-500 pointer-events-none" style={{ left: sidebarOpen ? 424 : 24 }}>
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
  const navigate = useNavigate();
  
  // Handle any path that shouldn't be seen by HashRouter (shouldn't happen, but just in case)
  React.useEffect(() => {
    const pathname = location.pathname;
    if (pathname.includes('/gtfs-cms/') || pathname.includes('/index.html')) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);
  
  const isHome = location.pathname === '/';
  const isSettings = location.pathname === '/settings';
  return (
    <div className="flex-1 h-full overflow-hidden relative text-zinc-900 dark:text-zinc-100 font-bold bg-zinc-50 dark:bg-zinc-900">
      <FloatingFeedback />
      {!isHome && !isSettings && <><MapHUD /><QuickActionMenu /></>}
      <div className={`absolute inset-0 ${isHome || isSettings ? 'z-30 pointer-events-auto' : 'z-20 pointer-events-none'}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/stops" element={<Stops />} />
          <Route path="/routes" element={<RouteStudio />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
      {!isHome && !isSettings && !sidebarOpen && (
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
  // Handle initial path issues (e.g., when accessing /gtfs-cms/index.html directly)
  React.useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    // If we're on a path that includes /gtfs-cms/ or /index.html but no hash, redirect to hash-based route
    if ((path.includes('/gtfs-cms/') || path.includes('/index.html')) && !hash) {
      // Only redirect if there's no hash already
      window.location.replace('#/');
    }
  }, []);

  return (
    <Router>
      <WorkspaceProvider>
        <div className="flex h-full w-full overflow-hidden bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
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