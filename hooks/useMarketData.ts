import { useState, useEffect } from 'react';
import { fetchMarketIndicatorsNative } from '../lib/market-indicators';
import { fetchMarketIndicatorsClient } from '../lib/api-client/market-indicators';
import type { MarketIndicators } from '../types';
import { UI_CONFIG } from '../constants';
import { isNativeEnvironment, isTauriEnvironment, isCapacitorEnvironment } from '../lib/utils/platform';

export function useMarketData() {
    const [marketIndicators, setMarketIndicators] = useState<MarketIndicators | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMarketData = async () => {
        try {
            setLoading(true);
            const isNative = isNativeEnvironment();
            let data: MarketIndicators;

            if (isNative && isTauriEnvironment()) {
                // Tauri 환경: Rust IPC 사용 (CORS 우회)
                data = await fetchMarketIndicatorsNative();
            } else if (isCapacitorEnvironment()) {
                // Capacitor 환경: 클라이언트 로직 직접 실행 (httpFetch 사용)
                data = await fetchMarketIndicatorsClient();
            } else {
                // Web 환경: 서버 API 사용
                const response = await fetch('/api/market-indicators');
                if (!response.ok) throw new Error('Failed to fetch market indicators');
                data = await response.json();
            }

            setMarketIndicators(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch market indicators:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMarketData();
        const intervalId = setInterval(fetchMarketData, UI_CONFIG.MARKET_INDICATORS_REFRESH_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, []);

    return { marketIndicators, loading, error, refetch: fetchMarketData };
}
