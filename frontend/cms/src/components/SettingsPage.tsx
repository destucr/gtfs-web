import React, { useEffect, useState } from 'react';
import { SidebarHeader } from './SidebarHeader';
import { 
    Settings as SettingsIcon, 
    Moon, 
    Sun, 
    Palette, 
    Map as MapIcon, 
    Save,
    Database,
    Languages,
    Type
} from 'lucide-react';
import { useWorkspace } from '../context/useWorkspace';

const SettingsPage: React.FC = () => {
    const { settings, updateSetting, setStatus } = useWorkspace();
    const [localDarkMode, setLocalDarkMode] = useState(settings['dark_mode'] === 'true');

    // Sync dark mode to document root
    useEffect(() => {
        const isDark = settings['dark_mode'] === 'true';
        setLocalDarkMode(isDark);
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings]);

    const handleToggleDarkMode = async () => {
        const newValue = !localDarkMode;
        setLocalDarkMode(newValue);
        if (newValue) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        await updateSetting('dark_mode', String(newValue));
        setStatus({ message: `Theme switched to ${newValue ? 'Dark' : 'Light'}`, type: 'success' });
        setTimeout(() => setStatus(null), 2000);
    };

    const SettingRow = ({ icon: Icon, title, desc, children }: any) => (
        <div className="flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
            <div className="flex gap-4 items-start pr-8">
                <div className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-zinc-500">
                    <Icon size={16} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">{desc}</p>
                </div>
            </div>
            <div className="shrink-0 min-w-[200px] flex justify-end">
                {children}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 animate-in fade-in duration-300">
            <SidebarHeader title="System Settings" Icon={SettingsIcon} />
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto px-8 py-12">
                    
                    {/* Appearance Section */}
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                            <Palette size={14} className="text-blue-600" />
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Appearance</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <SettingRow 
                                icon={localDarkMode ? Moon : Sun} 
                                title="Dark Mode" 
                                desc="Adjust the interface theme to reduce eye strain in low-light environments."
                            >
                                <button 
                                    onClick={handleToggleDarkMode}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none border ${localDarkMode ? 'bg-blue-600 border-blue-700' : 'bg-zinc-200 border-zinc-300 dark:bg-zinc-700 dark:border-zinc-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </SettingRow>

                            <SettingRow 
                                icon={Type} 
                                title="Transit Sign Style" 
                                desc="Select the global design template for route icons across CMS and Web Viewer."
                            >
                                <select 
                                    className="w-full max-w-[180px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs py-1.5 px-2 outline-none focus:border-blue-400 transition-colors font-bold dark:text-zinc-100"
                                    value={settings['global_sign_style'] || 'standard'}
                                    onChange={(e) => updateSetting('global_sign_style', e.target.value)}
                                >
                                    <option value="standard">Standard (Square)</option>
                                    <option value="singapore">Singapore (LTA)</option>
                                    <option value="london">London (TfL)</option>
                                    <option value="transjakarta">Transjakarta (Blue)</option>
                                    <option value="paris">Paris (Circle)</option>
                                </select>
                            </SettingRow>
                        </div>
                    </div>

                    {/* Infrastructure Section */}
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                            <Database size={14} className="text-blue-600" />
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Infrastructure</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <SettingRow 
                                icon={MapIcon} 
                                title="Default Map Provider" 
                                desc="Select the base layer imagery provider for the Map Studio."
                            >
                                <select 
                                    className="w-full max-w-[180px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs py-1.5 px-2 outline-none focus:border-blue-400 transition-colors font-bold dark:text-zinc-100"
                                    value={settings['map_provider'] || 'carto'}
                                    onChange={(e) => updateSetting('map_provider', e.target.value)}
                                >
                                    <option value="carto">CARTO Voyager (Light)</option>
                                    <option value="osm">OpenStreetMap Standard</option>
                                    <option value="satellite">ESRI World Imagery</option>
                                </select>
                            </SettingRow>

                            <SettingRow 
                                icon={Save} 
                                title="Auto-save Intervals" 
                                desc="Control how often the Route Studio synchronizes changes to the database."
                            >
                                <select 
                                    className="w-full max-w-[180px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs py-1.5 px-2 outline-none focus:border-blue-400 transition-colors font-bold dark:text-zinc-100"
                                    value={settings['autosave_delay'] || '2000'}
                                    onChange={(e) => updateSetting('autosave_delay', e.target.value)}
                                >
                                    <option value="1000">Instant (1s)</option>
                                    <option value="2000">Standard (2s)</option>
                                    <option value="5000">Delayed (5s)</option>
                                    <option value="0">Manual Only</option>
                                </select>
                            </SettingRow>
                        </div>
                    </div>

                    {/* Regional Section */}
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                            <Languages size={14} className="text-blue-600" />
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Regional</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <SettingRow 
                                icon={Languages} 
                                title="Default Language" 
                                desc="Set the primary language for GTFS feed exports and tooltips."
                            >
                                <select className="w-full max-w-[180px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm text-xs py-1.5 px-2 outline-none focus:border-blue-400 transition-colors font-bold dark:text-zinc-100">
                                    <option>English (US)</option>
                                    <option disabled>Indonesian (Soon)</option>
                                </select>
                            </SettingRow>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
