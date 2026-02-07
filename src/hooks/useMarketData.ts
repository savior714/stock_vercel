import { useState, useEffect } from 'react';
import { fetchMarketIndicatorsNative } from '@/lib/market-indicators';
import { fetchMarketIndicatorsClient } from '@/lib/api-client/market-indicators';
import type { MarketIndicators } from '@/types';
import { UI_CONFIG } from '@/constants';
import { isTauriEnvironment } from '@/lib/utils/platform';

export function useMarketData() {
    const [marketIndicators, setMarketIndicators] = useState<MarketIndicators | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMarketData = async () => {
        try {
            setLoading(true);
            let data: MarketIndicators;
            if (isTauriEnvironment()) {
                // Tauri 환경: Rust IPC 사용 우선 (CORS 우회)
                data = await fetchMarketIndicatorsNative();
            } else {
                // Capacitor 및 Web 환경: 통합 클라이언트 사용
                // (내부적으로 Web 폴백 및 Capacitor httpFetch 처리됨)
                data = await fetchMarketIndicatorsClient();
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
