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
        <aside className="w-[64px] hover:w-[240px] h-full bg-zinc-50 text-zinc-500 flex flex-col border-r border-zinc-200 transition-all duration-200 ease-in-out shrink-0 z-50 group/sidebar overflow-hidden">
            {/* Brand / Header */}
            <div className="h-14 flex items-center px-[18px] border-b border-zinc-200 shrink-0">
                <div className="w-7 h-7 bg-blue-600 rounded-sm flex items-center justify-center text-white shrink-0">
                    <Box size={16} strokeWidth={3} />
                </div>
                <span className="ml-3 font-bold text-zinc-900 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm">
                    GTFS Manager
                </span>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2">
                {navItems.map((item, idx) => {
                    if (item.type === 'divider') {
                        return <div key={idx} className="h-px w-full bg-zinc-200 my-2 px-2" />;
                    }

                    const Icon = item.icon as any;
                    const isActive = location.pathname === item.path;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path!}
                            className={({ isActive }) => `
                                flex items-center h-10 rounded-sm transition-colors duration-75 group relative px-[10px]
                                ${isActive 
                                    ? 'bg-white border border-zinc-200 text-blue-600' 
                                    : 'hover:bg-zinc-100 hover:text-zinc-900'
                                }
                            `}
                        >
                            <Icon size={18} strokeWidth={2} className={`${isActive ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-500'} shrink-0`} />
                            
                            <span className="ml-3 text-xs font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                {item.label}
                            </span>

                            {/* Tooltip (hidden when sidebar is expanded) */}
                            <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold rounded-sm opacity-0 group-hover:group-hover/sidebar:opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] border border-zinc-700 shadow-xl transition-opacity">
                                {item.label}
                            </div>
                        </NavLink>
                    );
                })}
            </div>

            {/* Footer / User */}
            <div className="p-2 border-t border-zinc-200 shrink-0">
                <button className="w-full h-10 flex items-center px-2 rounded-sm hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors duration-75 group relative">
                    <div className="w-7 h-7 rounded-sm bg-white flex items-center justify-center shrink-0 border border-zinc-200 text-zinc-700">
                        <span className="text-[10px] font-bold">JD</span>
                    </div>
                    <div className="ml-3 flex flex-col items-start opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 overflow-hidden">
                        <span className="text-[11px] font-bold text-zinc-900 leading-none">John Doe</span>
                        <span className="text-[9px] text-zinc-400">Administrator</span>
                    </div>
                </button>
            </div>
        </aside>
    );
};

export default Navigation;