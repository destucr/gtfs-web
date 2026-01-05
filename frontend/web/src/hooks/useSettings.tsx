import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../api';

interface SettingsContextType {
    settings: Record<string, string>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchSettings = () => {
            api.get('/settings')
                .then(res => setSettings(res.data || {}))
                .catch(err => {
                    console.error('Failed to fetch settings:', err);
                    // Optionally keep old settings or set to empty, currently we just log
                });
        };

        fetchSettings();
        const interval = setInterval(fetchSettings, 10000); // Poll every 10s

        return () => clearInterval(interval);
    }, []);

    return (
        <SettingsContext.Provider value={{ settings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
