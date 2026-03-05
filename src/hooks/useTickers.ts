import { useState, useEffect } from 'react';
import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { isTauriEnvironment, isNativeEnvironment, isCapacitorEnvironment } from '@/lib/utils/platform';
import { DEFAULT_PRESETS } from '@/constants/presets';

export function useTickers() {
    const [tickers, setTickers] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [showAllTickers, setShowAllTickers] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Initial load
    useEffect(() => {
        const init = async () => {
            const savedTickers = localStorage.getItem('stock-tickers');
            if (savedTickers) {
                try {
                    const parsed = JSON.parse(savedTickers);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setTickers(parsed);
                        setLoaded(true);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse saved tickers:', e);
                }
            }

            // If no saved tickers (first run, etc.), automatically load GitHub/local presets
            await loadPresetTickers(true);
            setLoaded(true);
        };

        init();
    }, []);

    // Persistence
    useEffect(() => {
        if (loaded) {
            localStorage.setItem('stock-tickers', JSON.stringify(tickers));
        }
    }, [tickers, loaded]);

    const addTicker = () => {
        const ticker = inputValue.trim().toUpperCase();
        if (ticker && !tickers.includes(ticker)) {
            setTickers(prev => [...prev, ticker]);
            setInputValue('');
        }
    };

    const removeTicker = async (ticker: string, alsoRemoveFromPreset: boolean = false) => {
        setTickers(prev => prev.filter(t => t !== ticker));

        if (alsoRemoveFromPreset) {
            if (isCapacitorEnvironment()) {
                // Capacitor: Remove from local storage preset
                const saved = localStorage.getItem('stock-preset-tickers');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const updated = parsed.filter((t: string) => t !== ticker);
                    localStorage.setItem('stock-preset-tickers', JSON.stringify(updated));
                }
                return;
            }

        }
    };

    const loadPresetTickers = async (silent: boolean = false) => {
        try {
            const isNative = isNativeEnvironment();
            const isTauri = isTauriEnvironment();
            const PRESET_URL = 'https://raw.githubusercontent.com/savior714/stock_vercel/main/presets.json';

            // 1. Attempt fetching latest data from GitHub Raw URL (Common for all platforms)
            try {
                console.log('🌐 Fetching latest presets from GitHub...');
                const ghResponse = await fetch(`${PRESET_URL}?t=${Date.now()}`); // Prevent caching
                if (ghResponse.ok) {
                    const ghPresets = await ghResponse.json();
                    if (Array.isArray(ghPresets) && ghPresets.length > 0) {
                        console.log(`✅ Loaded ${ghPresets.length} presets from GitHub`);
                        setTickers(ghPresets);
                        if (!silent) alert(`Loaded ${ghPresets.length} presets from GitHub.`);
                        return;
                    }
                }
            } catch (e) {
                console.warn('GitHub fetch failed, falling back to local/KV:', e);
            }

            if (isNative) {
                // Native/Capacitor environment: fallback to local if GitHub fails
                if (isTauri) {
                    try {
                        const fileName = 'preset_tickers.json';
                        const userPresetExists = await exists(fileName, { baseDir: BaseDirectory.AppLocalData });

                        if (userPresetExists) {
                            console.log('🖥️ Loading presets from AppLocalData');
                            const contents = await readTextFile(fileName, { baseDir: BaseDirectory.AppLocalData });
                            const presets = JSON.parse(contents);
                            setTickers(presets || []);
                            if (!silent) alert(`Loaded ${presets.length} presets from local storage.`);
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to read local preset:', e);
                    }
                }

                if (isCapacitorEnvironment()) {
                    const savedLocal = localStorage.getItem('stock-preset-tickers');
                    if (savedLocal) {
                        setTickers(JSON.parse(savedLocal));
                        if (!silent) alert(`Loaded ${JSON.parse(savedLocal).length} presets from device storage.`);
                        return;
                    }
                }

                setTickers(DEFAULT_PRESETS);
                if (!silent) alert(`Loaded ${DEFAULT_PRESETS.length} default presets.`);
            } else {
                // Web environment (not Tauri/Capacitor): just use defaults for now
                setTickers(DEFAULT_PRESETS);
                if (!silent) alert(`Loaded ${DEFAULT_PRESETS.length} default presets.`);
            }
        } catch (error) {
            console.error('Failed to load preset tickers:', error);
            setTickers(DEFAULT_PRESETS);
        }
    };

    const saveAsPreset = async () => {
        if (tickers.length === 0) {
            alert('No tickers to save.');
            return;
        }

        if (confirm(`Save current ${tickers.length} tickers as presets and sync with GitHub?`)) {
            const isTauri = isTauriEnvironment();

            if (isTauri) {
                try {
                    // 1. Use Repository: Decoupled GitHub sync logic
                    const { GithubSyncRepo } = await import('@/lib/api/github-sync.repo');
                    const syncResult = await GithubSyncRepo.syncPresets(tickers);

                    if (!syncResult.success) {
                        throw new Error(syncResult.error || 'GitHub sync failed');
                    }

                    alert(`✅ Presets saved and synced with GitHub (${tickers.length} tickers).`);

                    // Backup to AppLocalData
                    const jsonContent = JSON.stringify(tickers);
                    await writeTextFile('preset_tickers.json', jsonContent, { baseDir: BaseDirectory.AppLocalData });

                } catch (error) {
                    console.error('Tauri sync error:', error);
                    alert('Error while saving: ' + (error instanceof Error ? error.message : String(error)));
                }
                return;
            }

            if (isCapacitorEnvironment()) {
                localStorage.setItem('stock-preset-tickers', JSON.stringify(tickers));
                alert(`Presets saved to device (${tickers.length} tickers).`);
                return;
            }

            // Web environment: Save to local storage
            localStorage.setItem('stock-preset-tickers', JSON.stringify(tickers));
            alert('Presets saved to browser local storage.');
        }
    };

    const clearAllTickers = () => {
        if (confirm('Are you sure you want to clear all tickers?')) {
            setTickers([]);
        }
    };

    return {
        tickers,
        setTickers,
        inputValue,
        setInputValue,
        showAllTickers,
        setShowAllTickers,
        addTicker,
        removeTicker,
        loadPresetTickers,
        saveAsPreset,
        clearAllTickers
    };
}
