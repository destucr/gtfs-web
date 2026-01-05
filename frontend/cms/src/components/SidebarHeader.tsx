import React from 'react';
import { ChevronLeft, LucideIcon, PanelLeftClose } from 'lucide-react';

interface SidebarHeaderProps {
  title: string;
  Icon: LucideIcon;
  onBack?: () => void;
  actions?: React.ReactNode;
  onToggleSidebar?: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ title, Icon, onBack, actions, onToggleSidebar }) => {
  return (
    <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-white sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button onClick={onBack} className="p-1.5 -ml-1.5 hover:bg-zinc-100 rounded-sm transition-colors text-blue-600">
            <ChevronLeft size={18} />
          </button>
        ) : (
          <div className="w-7 h-7 bg-white border border-zinc-200 rounded-sm flex items-center justify-center text-zinc-700">
            <Icon size={16} />
          </div>
        )}
        <h1 className="text-sm font-bold tracking-tight text-zinc-900 uppercase">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar} 
            className="p-1.5 hover:bg-zinc-100 rounded-sm transition-colors text-zinc-400 hover:text-zinc-900"
            title="Hide Sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
