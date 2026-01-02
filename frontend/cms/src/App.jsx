import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navigation from './components/Navigation';
import Agencies from './components/Agencies';
import Stops from './components/Stops';
import RouteStudio from './components/Routes';
import Trips from './components/Trips';
import { LayoutDashboard, Globe, MapPin, Route as RouteIcon, Database, ArrowRight } from 'lucide-react';

const Home = () => {
  const stats = [
    { name: 'Agencies', icon: Globe, path: '/agencies', color: 'bg-blue-500' },
    { name: 'Stops', icon: MapPin, path: '/stops', color: 'bg-orange-500' },
    { name: 'Routes', icon: RouteIcon, path: '/routes', color: 'bg-green-500' },
    { name: 'Trips', icon: Database, path: '/trips', color: 'bg-purple-500' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-black mb-2">Transit Control Center</h1>
        <p className="text-xl text-system-gray font-medium">Manage your transit network infrastructure and geographic data.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map(s => (
          <Link key={s.path} to={s.path} className="hig-card p-6 flex flex-col group hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
            <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/20`}>
              <s.icon size={24} />
            </div>
            <h3 className="font-bold text-lg mb-1">{s.name}</h3>
            <div className="flex items-center text-system-gray text-sm font-medium mt-auto group-hover:text-system-blue transition-colors">
              Configure {s.name} <ArrowRight size={14} className="ml-1" />
            </div>
          </Link>
        ))}
      </div>

      <div className="hig-card p-8 bg-gradient-to-br from-system-blue to-blue-600 text-white relative overflow-hidden group shadow-2xl shadow-system-blue/30">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Route Studio Unified Editor</h2>
          <p className="text-white/80 max-w-md mb-6 font-medium">Design route geometries, snap paths to the road network, and manage stop sequences in a single integrated workspace.</p>
          <Link to="/routes" className="inline-flex items-center px-6 py-3 bg-white text-system-blue rounded-full font-bold text-sm shadow-xl hover:bg-opacity-90 transition-all active:scale-95">
            Open Route Studio
          </Link>
        </div>
        <RouteIcon size={200} className="absolute -right-10 -bottom-10 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-system-background">
        <Navigation />
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
