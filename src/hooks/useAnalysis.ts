import { useState, useRef, useEffect } from 'react';
import type { AnalysisResult, AnalysisModeType, TabType, TauriAnalysisResult } from '@/types';
import type { AnalysisSettings } from '@/types/settings';
import { UI_CONFIG } from '@/constants';
import { delay } from '@/lib/utils/async';
import { isTauriEnvironment, isCapacitorEnvironment } from '@/lib/utils/platform';
import { recalculateResult } from '@/utils/analysis-logic';
import { analyzeStockClient } from '@/lib/api-client/analyze';

export function useAnalysis(tickers: string[], settings: AnalysisSettings) {
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number; currentTicker: string } | null>(null);
    const [failedTickers, setFailedTickers] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('triple');
    const [analysisMode, setAnalysisMode] = useState<AnalysisModeType>('server');

    // Pause State
    const [isPaused, setIsPaused] = useState(false);
    // const [shouldStop, setShouldStop] = useState(false); // Redundant with shouldStopRef

    const abortControllerRef = useRef<AbortController | null>(null);
    // Refs for immediate access in loops
    const isPausedRef = useRef(false);
    const shouldStopRef = useRef(false);
    // Resolver to unlock the pause promise
    const resumeResolverRef = useRef<((value: void | PromiseLike<void>) => void) | null>(null);

    const [loaded, setLoaded] = useState(false);

    // Load and re-calculate results
    useEffect(() => {
        const loadAndRecalculate = () => {
            const savedResults = localStorage.getItem('stock-analysis-results');
            if (savedResults) {
                try {
                    const parsed = JSON.parse(savedResults);
                    const recalculated = parsed.map((r: AnalysisResult) => recalculateResult(r, settings));
                    setResults(recalculated);
                } catch (e) {
                    console.error('Failed to parse saved results:', e);
                }
            }
            const savedTab = localStorage.getItem('stock-active-tab');
            if (savedTab === 'triple' || savedTab === 'bb') {
                setActiveTab(savedTab);
            }

            if (isTauriEnvironment()) {
                setAnalysisMode('tauri');
            }

            setLoaded(true);
        };

        if (!loaded) {
            loadAndRecalculate();
        } else {
            // Settings changed, recalculate existing results
            setResults(prevResults =>
                prevResults.map(result => recalculateResult(result, settings))
            );
        }
    }, [settings, loaded]);

    // Save results
    useEffect(() => {
        if (loaded) {
            if (results.length > 0) {
                localStorage.setItem('stock-analysis-results', JSON.stringify(results));
            }
            localStorage.setItem('stock-active-tab', activeTab);
        }
    }, [results, activeTab, loaded]);

    const togglePause = () => {
        console.log('[Hook] togglePause triggered');

        if (isPausedRef.current) {
            // RESUME
            console.log('▶️ [Hook] RESUMING...');
            isPausedRef.current = false;
            setIsPaused(false);

            if (resumeResolverRef.current) {
                console.log('🔓 [Hook] Resolving pause promise');
                resumeResolverRef.current();
                resumeResolverRef.current = null;
            }
        } else {
            // PAUSE
            console.log('⏸️ [Hook] PAUSING requested...');
            isPausedRef.current = true;
            setIsPaused(true);
        }
    };

    const stopAnalysis = () => {
        console.log('🛑 [Hook] Stopping analysis...');
        shouldStopRef.current = true;
        // setShouldStop(true);

        // Unblock if paused so it can check stop condition and exit
        if (isPausedRef.current) {
            isPausedRef.current = false;
            setIsPaused(false);
            if (resumeResolverRef.current) {
                resumeResolverRef.current();
                resumeResolverRef.current = null;
            }
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    // Helper to check pause state and wait if needed
    const checkAndPause = async () => {
        if (shouldStopRef.current) return;

        if (isPausedRef.current) {
            console.log('⏳ [Hook] Execution LOCKED. Waiting for resume...');
            setProgress(prev => prev ? { ...prev, currentTicker: `일시 중지됨 (${prev.current}/${prev.total})` } : null);

            // Create a promise that waits indefinitely until resumeResolverRef is called
            await new Promise<void>((resolve) => {
                resumeResolverRef.current = resolve;
            });

            console.log('🚀 [Hook] Execution UNLOCKED. Resuming loop...');
        }
    };

    const analyzeTauri = async (ticker: string): Promise<AnalysisResult> => {
        try {
            // Dynamic import
            const { invoke } = await import('@tauri-apps/api/core');
            const result = await invoke<TauriAnalysisResult>('analyze_stock', { symbol: ticker });

            const analysisResult: AnalysisResult = {
                ...result,
                alert: false,
                rsi: result.rsi,
                mfi: result.mfi,
                price: result.currentPrice,
                bb_touch: result.bollingerPosition === 'below',
                bb_lower: result.bollingerLower,
                bb_upper: result.bollingerUpper,
                bb_middle: result.bollingerMiddle,
            };

            return recalculateResult(analysisResult, settings);
        } catch (error) {
            console.error(`Tauri analysis failed for ${ticker}:`, error);
            return {
                ticker,
                error: error instanceof Error ? error.message : String(error),
                bb_touch: false,
                rsi: 0,
                mfi: 0,
                price: 0,
                alert: false
            };
        }
    };


    const runAnalysis = async (targetTickers: string[] = tickers) => {
        console.log('🚀 [Hook] Analysis Process Started');
        if (targetTickers.length === 0) return;

        setIsAnalyzing(true);
        // setShouldStop(false);
        shouldStopRef.current = false;
        setIsPaused(false);
        isPausedRef.current = false;
        resumeResolverRef.current = null;
        setFailedTickers([]);

        if (targetTickers.length === tickers.length) {
            setResults([]);
            localStorage.removeItem('stock-analysis-results');
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setProgress({ current: 0, total: targetTickers.length, currentTicker: '준비 중...' });

        const isTauri = analysisMode === 'tauri';
        let completed = 0;

        for (const ticker of targetTickers) {
            if (shouldStopRef.current) break;
            await checkAndPause();
            if (shouldStopRef.current) break;

            setProgress({ current: completed + 1, total: targetTickers.length, currentTicker: ticker });

            let result: AnalysisResult;
            if (isTauri) {
                result = await analyzeTauri(ticker);
            } else {
                // Native/Capacitor Client-side
                result = await analyzeStockClient(ticker);
                result = recalculateResult(result, settings);
            }

            setResults(prev => {
                const filtered = prev.filter(r => r.ticker !== ticker);
                return [...filtered, result];
            });

            if (result.error) setFailedTickers(prev => [...prev, ticker]);

            completed++;
            await delay(isTauri ? 100 : 300);
        }

        console.log('🏁 [Hook] Analysis Finished');
        setIsAnalyzing(false);
        setIsPaused(false);
        isPausedRef.current = false;
        setTimeout(() => setProgress(null), UI_CONFIG.COMPLETION_MESSAGE_DISPLAY_MS);
    };

    const retryFailedTickers = () => {
        if (failedTickers.length > 0) {
            runAnalysis(failedTickers);
        }
    };

    const removeResult = (ticker: string) => {
        setResults(prev => prev.filter(r => r.ticker !== ticker));
    };

    return {
        results,
        isAnalyzing,
        progress,
        failedTickers,
        activeTab,
        setActiveTab,
        analysisMode,
        setAnalysisMode,
        isPaused,
        runAnalysis,
        stopAnalysis,
        togglePause,
        retryFailedTickers,
        removeResult
    };
}
