import { useState, useEffect } from 'react';
import { AnalysisSettings, DEFAULT_SETTINGS } from '@/types/settings';

export function useSettings() {
    const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('app_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure new keys exist
                const merged = { ...DEFAULT_SETTINGS, ...parsed };
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setSettings(merged);
                // Apply opacity immediately
                if (merged.opacity) {
                    document.documentElement.style.setProperty('--overlay-opacity', merged.opacity.toString());
                }
            } else {
                // Initial apply of default opacity
                document.documentElement.style.setProperty('--overlay-opacity', DEFAULT_SETTINGS.opacity.toString());
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    }, []);

    const updateSettings = (newSettings: Partial<AnalysisSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        localStorage.setItem('app_settings', JSON.stringify(updated));

        // Apply visual changes immediately
        if (newSettings.opacity !== undefined) {
            document.documentElement.style.setProperty('--overlay-opacity', newSettings.opacity.toString());
        }
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.setItem('app_settings', JSON.stringify(DEFAULT_SETTINGS));
        document.documentElement.style.setProperty('--overlay-opacity', DEFAULT_SETTINGS.opacity.toString());
    };

    return {
        settings,
        updateSettings,
        resetSettings
    };
}
