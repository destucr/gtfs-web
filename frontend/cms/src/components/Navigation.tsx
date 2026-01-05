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
        <aside className="w-[64px] h-full bg-zinc-50 text-zinc-500 flex flex-col border-r border-zinc-200 transition-all duration-300 shrink-0 z-50">
            {/* Brand / Header */}
            <div className="h-14 flex items-center justify-center border-b border-zinc-200 shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center text-white shrink-0">
                    <Box size={18} strokeWidth={3} />
                </div>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2 items-center">
                {navItems.map((item, idx) => {
                    if (item.type === 'divider') {
                        return <div key={idx} className="h-px w-8 bg-zinc-200 my-2" />;
                    }

                    const Icon = item.icon as any;
                    const isActive = location.pathname === item.path;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path!}
                            className={({ isActive }) => `
                                flex items-center justify-center w-10 h-10 rounded-sm transition-colors duration-75 group relative
                                ${isActive 
                                    ? 'bg-white border border-zinc-200 text-blue-600' 
                                    : 'hover:bg-zinc-100 hover:text-zinc-900'
                                }
                            `}
                            title={item.label}
                        >
                            <Icon size={18} strokeWidth={2} className={isActive ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-500'} />
                            
                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] border border-zinc-700 shadow-xl transition-opacity">
                                {item.label}
                            </div>
                        </NavLink>
                    );
                })}
            </div>

            {/* Footer / User */}
            <div className="p-2 border-t border-zinc-200 shrink-0 flex justify-center">
                <button className="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors duration-75 group relative">
                    <div className="w-8 h-8 rounded-sm bg-white flex items-center justify-center shrink-0 border border-zinc-200 text-zinc-700">
                        <span className="text-[10px] font-bold">JD</span>
                    </div>
                    {/* Tooltip for User */}
                    <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-[10px] font-bold rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] border border-zinc-700 shadow-xl transition-opacity">
                        John Doe (Admin)
                    </div>
                </button>
            </div>
        </aside>
    );
};

export default Navigation;