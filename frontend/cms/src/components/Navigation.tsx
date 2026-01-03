import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe, MapPin, Route, LayoutDashboard, Database, LucideIcon } from 'lucide-react';

interface NavLink {
    path: string;
    name: string;
    icon: LucideIcon;
}

const Navigation: React.FC = () => {
    const location = useLocation();

    const links: NavLink[] = [
        { path: '/', name: 'Dashboard', icon: LayoutDashboard },
        { path: '/agencies', name: 'Agencies', icon: Globe },
        { path: '/stops', name: 'Stops & Routes', icon: MapPin },
        { path: '/routes', name: 'Route Studio', icon: Route },
        { path: '/trips', name: 'Trip Mapping', icon: Database },
    ];

    return (
        <nav className="h-16 bg-white/80 backdrop-blur-md border-b border-black/5 sticky top-0 z-50 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-system-blue rounded-lg flex items-center justify-center text-white shadow-lg shadow-system-blue/20">
                    <Route size={20} />
                </div>
                <span className="font-bold text-lg tracking-tight text-black">GTFS Studio</span>
            </div>

            <div className="flex items-center gap-1">
                {links.map(link => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                        <Link 
                            key={link.path} 
                            to={link.path}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                isActive 
                                ? 'bg-system-blue/10 text-system-blue' 
                                : 'text-system-gray hover:bg-black/5 hover:text-black'
                            }`}
                        >
                            <Icon size={16} />
                            {link.name}
                        </Link>
                    );
                })}
            </div>

            <div className="flex items-center gap-4">
                <div className="h-8 w-px bg-black/5 mx-2"></div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black/5 rounded-full flex items-center justify-center text-xs font-bold text-system-gray">
                        JD
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;