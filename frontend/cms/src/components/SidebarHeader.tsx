import React from 'react';
import { ChevronLeft, LucideIcon } from 'lucide-react';

interface SidebarHeaderProps {
  title: string;
  Icon: LucideIcon;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ title, Icon, onBack, actions }) => {
  return (
    <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0 bg-white sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-black/5 rounded-lg transition-colors text-system-blue">
            <ChevronLeft size={20} />
          </button>
        ) : (
          <div className="w-8 h-8 bg-system-blue rounded-lg flex items-center justify-center text-white shadow-lg shadow-system-blue/20">
            <Icon size={18} />
          </div>
        )}
        <h1 className="text-xl font-black tracking-tight leading-none text-black">{title}</h1>
      </div>
      <div className="flex gap-2">
        {actions}
      </div>
    </div>
  );
};
