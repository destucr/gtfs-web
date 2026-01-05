import React from 'react';
import { Route } from '../types';
import { useSettings } from '../hooks/useSettings';

interface RouteSignProps {
    route: Route;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const RouteSign: React.FC<RouteSignProps> = ({ route, size = 'sm', className = '' }) => {
    const { settings } = useSettings();

    const template = settings['global_sign_style'] || 'standard';
    const color = `#${(route.color || '007AFF').replace('#', '')}`;
    const textColor = route.text_color ? `#${route.text_color.replace('#', '')}` : '#FFFFFF';

    const sizeClasses = {
        sm: 'w-6 h-6 text-[9px]',
        md: 'w-8 h-8 text-[11px]',
        lg: 'w-12 h-12 text-[14px]'
    };

    const baseClasses = `flex items-center justify-center font-bold shrink-0 shadow-none overflow-hidden ${sizeClasses[size]} ${className}`;

    switch (template) {
        case 'singapore':
            return (
                <div
                    className={`${baseClasses} rounded-[4px] border border-black/5`}
                    style={{ backgroundColor: color, color: textColor, fontWeight: 800 }}
                >
                    {route.short_name}
                </div>
            );
        case 'london':
            return (
                <div
                    className={`${baseClasses} rounded-none border-b-2 border-black/20`}
                    style={{ backgroundColor: color, color: textColor }}
                >
                    {route.short_name}
                </div>
            );
        case 'transjakarta':
            return (
                <div
                    className={`${baseClasses} rounded-full`}
                    style={{ backgroundColor: color, color: textColor }}
                >
                    {route.short_name}
                </div>
            );
        case 'paris':
            return (
                <div
                    className={`${baseClasses} rounded-full border-2 bg-white`}
                    style={{ borderColor: color, color: '#000000' }}
                >
                    <div className="w-[85%] h-[85%] flex items-center justify-center rounded-full" style={{ backgroundColor: color, color: textColor }}>
                        {route.short_name}
                    </div>
                </div>
            );
        case 'standard':
        default:
            return (
                <div
                    className={`${baseClasses} rounded-sm`}
                    style={{ backgroundColor: color, color: textColor }}
                >
                    {route.short_name}
                </div>
            );
    }
};