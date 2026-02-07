import { useState, useEffect } from 'react';
import { DEFAULT_SETTINGS, type AnalysisSettings } from '@/types/settings';

const SETTINGS_KEY = 'stock-analysis-settings';

export function useSettings() {
    const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // eslint-disable-next-line
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            } catch (e) {
                console.error('Failed to parse settings:', e);
            }
        }
        setLoaded(true);
    }, []);

    const updateSettings = (newSettings: Partial<AnalysisSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    };

    return { settings, updateSettings, resetSettings, loaded };
}
