import React from 'react';
import { Route } from '../types';
import { useWorkspace } from '../context/useWorkspace';

interface RouteSignProps {
    route: Route;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    templateOverride?: string;
}

export const RouteSign: React.FC<RouteSignProps> = ({ route, size = 'sm', className = '', templateOverride }) => {
    const { settings } = useWorkspace();
    const template = templateOverride || settings['global_sign_style'] || 'standard';
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
            // LTA style: Very clean rounded rectangle, bold font
            return (
                <div 
                    className={`${baseClasses} rounded-[4px] border border-black/5`} 
                    style={{ backgroundColor: color, color: textColor, fontWeight: 800 }}
                >
                    {route.short_name}
                </div>
            );
        case 'london':
            // TfL bus style: Red rectangle (usually) with white text, but here we use route color
            return (
                <div 
                    className={`${baseClasses} rounded-none border-b-2 border-black/20`} 
                    style={{ backgroundColor: color, color: textColor }}
                >
                    {route.short_name}
                </div>
            );
        case 'transjakarta':
            // Transjakarta: Circle background one color and then only number
            return (
                <div 
                    className={`${baseClasses} rounded-full`} 
                    style={{ backgroundColor: color, color: textColor }}
                >
                    {route.short_name}
                </div>
            );
        case 'paris':
            // RATP Metro Style: Circle with specific border
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