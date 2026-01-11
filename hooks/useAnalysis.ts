import { useState, useRef, useEffect } from 'react';
import type { AnalysisResult, AnalysisModeType, TabType, TauriAnalysisResult } from '../types';
import type { AnalysisSettings } from '../types/settings';
import { UI_CONFIG } from '../constants';
import { delay } from '../lib/utils/async';
import { isTauriEnvironment, isCapacitorEnvironment } from '../lib/utils/platform';
import { recalculateResult } from '../utils/analysis-logic';

export function useAnalysis(tickers: string[], settings: AnalysisSettings) {
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number; currentTicker: string } | null>(null);
    const [failedTickers, setFailedTickers] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('triple');
    const [analysisMode, setAnalysisMode] = useState<AnalysisModeType>('server');

    // 일시정지/중지 제어
    const [isPaused, setIsPaused] = useState(false);
    const [shouldStop, setShouldStop] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const isPausedRef = useRef(false);
    const shouldStopRef = useRef(false);
    const [loaded, setLoaded] = useState(false);

    // Settings 변경 시 결과 재계산 Effect
    useEffect(() => {
        if (results.length > 0) {
            setResults(prevResults =>
                prevResults.map(result => recalculateResult(result, settings))
            );
        }
    }, [settings]);

    // 초기 로드 (Local Storage)
    useEffect(() => {
        const savedResults = localStorage.getItem('stock-analysis-results');
        if (savedResults) {
            try {
                const parsed = JSON.parse(savedResults);
                // 로드된 결과에도 현재 설정 적용
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

        // 환경 감지하여 초기 모드 설정
        if (isTauriEnvironment() || isCapacitorEnvironment()) {
            setAnalysisMode('tauri');
        }

        setLoaded(true);
    }, []);

    // 결과 저장
    useEffect(() => {
        if (loaded) {
            if (results.length > 0) {
                localStorage.setItem('stock-analysis-results', JSON.stringify(results));
            }
            localStorage.setItem('stock-active-tab', activeTab);
        }
    }, [results, activeTab, loaded]);

    const togglePause = () => {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
    };

    const stopAnalysis = () => {
        shouldStopRef.current = true;
        setShouldStop(true);
        isPausedRef.current = false;
        setIsPaused(false);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    // Tauri Native 분석 함수
    const analyzeTauri = async (ticker: string): Promise<AnalysisResult> => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const result = await invoke<TauriAnalysisResult>('analyze_stock', { symbol: ticker });

            // Raw Result -> Recalculate based on Settings
            const analysisResult: AnalysisResult = {
                ...result,
                alert: false, // will be calculated by recalculateResult
                rsi: result.rsi,
                mfi: result.mfi,
                price: result.currentPrice,
                bb_touch: result.bollingerPosition === 'below',
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

    // Server 분석 함수
    const analyzeStock = async (ticker: string, signal?: AbortSignal): Promise<AnalysisResult> => {
        try {
            const response = await fetch(`/api/analyze?ticker=${ticker}`, { signal });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze');
            }

            // Server Result -> Recalculate based on Settings (서버 로직 무시하고 클라이언트 설정 우선)
            return recalculateResult(data, settings);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') throw err;

            if (err instanceof Error && err.message.includes('429')) {
                return {
                    ticker,
                    error: 'API_RATE_LIMIT',
                    alert: false,
                    rsi: 0,
                    mfi: 0,
                    price: 0,
                    bb_touch: false
                };
            }

            console.error(`Error analyzing ${ticker}:`, err);
            return {
                ticker,
                error: err instanceof Error ? err.message : 'Unknown error',
                alert: false,
                rsi: 0,
                mfi: 0,
                price: 0,
                bb_touch: false
            };
        }
    };

    const runAnalysis = async (targetTickers: string[] = tickers) => {
        if (targetTickers.length === 0) return;

        setIsAnalyzing(true);
        setShouldStop(false);
        shouldStopRef.current = false;
        setIsPaused(false);
        isPausedRef.current = false;
        setFailedTickers([]);

        if (targetTickers.length === tickers.length) {
            setResults([]);
            localStorage.removeItem('stock-analysis-results');
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setProgress({ current: 0, total: targetTickers.length, currentTicker: '준비 중...' });

        // Native Mode (Tauri/Capacitor)
        if (analysisMode === 'tauri') {
            let completed = 0;
            for (const ticker of targetTickers) {
                if (shouldStopRef.current) break;

                while (isPausedRef.current && !shouldStopRef.current) {
                    setProgress(prev => prev ? { ...prev, currentTicker: '일시 중지됨...' } : null);
                    await delay(500);
                }

                setProgress({ current: completed, total: targetTickers.length, currentTicker: ticker });

                const result = await analyzeTauri(ticker);

                setResults(prev => {
                    const filtered = prev.filter(r => r.ticker !== ticker);
                    return [...filtered, result];
                });

                if (result.error) setFailedTickers(prev => [...prev, ticker]);

                completed++;
                await delay(100);
            }

        } else {
            // Server Mode (Web)
            for (let i = 0; i < targetTickers.length; i++) {
                if (shouldStopRef.current) break;

                while (isPausedRef.current && !shouldStopRef.current) {
                    setProgress(prev => prev ? { ...prev, currentTicker: '일시 중지됨...' } : null);
                    await delay(500);
                }

                const ticker = targetTickers[i];
                setProgress({ current: i + 1, total: targetTickers.length, currentTicker: ticker });

                try {
                    const result = await analyzeStock(ticker, signal);

                    setResults(prev => {
                        const filtered = prev.filter(r => r.ticker !== ticker);
                        return [...filtered, result];
                    });

                    if (result.error) setFailedTickers(prev => [...prev, ticker]);

                } catch (e) {
                    if (e instanceof Error && e.name === 'AbortError') break;
                    console.error(e);
                }

                await delay(500);
            }
        }

        setIsAnalyzing(false);
        setIsPaused(false);
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
