import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Globe, 
    MapPin, 
    Route as RouteIcon, 
    Database, 
    Settings, 
    Box
} from 'lucide-react';

const Navigation: React.FC = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Overview', icon: LayoutDashboard },
        { type: 'divider' },
        { path: '/agencies', label: 'Agencies', icon: Globe },
        { path: '/stops', label: 'Stops', icon: MapPin },
        { path: '/routes', label: 'Routes', icon: RouteIcon },
        { path: '/trips', label: 'Trips', icon: Database },
        { type: 'divider' },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <aside className="w-[60px] lg:w-[240px] h-full bg-zinc-50 text-zinc-500 flex flex-col border-r border-zinc-200 transition-all duration-300 shrink-0 z-50">
            {/* Brand / Header */}
            <div className="h-14 flex items-center justify-center lg:justify-start px-0 lg:px-4 border-b border-zinc-200 shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center text-white shrink-0">
                    <Box size={18} strokeWidth={3} />
                </div>
                <span className="ml-3 font-bold text-zinc-900 hidden lg:block tracking-tight text-sm">GTFS Manager</span>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2">
                {navItems.map((item, idx) => {
                    if (item.type === 'divider') {
                        return <div key={idx} className="h-px bg-zinc-200 my-2 mx-2" />;
                    }

                    const Icon = item.icon as any;
                    const isActive = location.pathname === item.path;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path!}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-2.5 py-2 rounded-sm transition-colors duration-75 group relative
                                ${isActive 
                                    ? 'bg-white border border-zinc-200 text-blue-600 font-semibold' 
                                    : 'hover:bg-zinc-100 hover:text-zinc-900'
                                }
                            `}
                            title={item.label}
                        >
                            <Icon size={18} strokeWidth={2} className={isActive ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-500'} />
                            <span className="text-xs hidden lg:block">{item.label}</span>
                            
                            {/* Tooltip for collapsed mode */}
                            <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none lg:hidden whitespace-nowrap z-50 border border-zinc-700">
                                {item.label}
                            </div>
                        </NavLink>
                    );
                })}
            </div>

            {/* Footer / User */}
            <div className="p-2 border-t border-zinc-200 shrink-0">
                <button className="w-full flex items-center justify-center lg:justify-start gap-3 p-2 rounded-sm hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors duration-75">
                    <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center shrink-0 border border-zinc-200 text-zinc-700">
                        <span className="text-[10px] font-bold">JD</span>
                    </div>
                    <div className="flex-col items-start hidden lg:flex overflow-hidden">
                        <span className="text-xs font-bold text-zinc-900 truncate">John Doe</span>
                        <span className="text-[10px] text-zinc-500 truncate">Admin Workspace</span>
                    </div>
                </button>
            </div>
        </aside>
    );
};

export default Navigation;