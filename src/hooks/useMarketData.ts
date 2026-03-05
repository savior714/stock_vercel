import { useState, useEffect } from 'react';
import { getMarketIndicators } from '@/lib/api/market-indicators';
import type { MarketIndicators } from '@/types/market';
import { UI_CONFIG } from '@/constants';

export function useMarketData() {
    const [marketIndicators, setMarketIndicators] = useState<MarketIndicators | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMarketData = async () => {
        try {
            setLoading(true);
            const data = await getMarketIndicators();
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
