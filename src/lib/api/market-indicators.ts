import { fetchMarketIndicatorsNative } from './market-indicators-tauri';
import { fetchMarketIndicatorsClient } from './market-indicators-direct';
import { isTauriEnvironment } from '@/lib/utils/platform';
import type { MarketIndicators } from '@/types/market';

/**
 * Unified Market Indicators Repository
 * Handles environment-specific fetching logic (Tauri IPC vs. Capacitor/Direct HTTP)
 */
export async function getMarketIndicators(): Promise<MarketIndicators> {
    if (isTauriEnvironment()) {
        try {
            // Priority: Tauri IPC (Rust Backend)
            return await fetchMarketIndicatorsNative();
        } catch (error) {
            console.error('Unified Repository: Tauri IPC failed, falling back to direct fetch', error);
            return await fetchMarketIndicatorsClient();
        }
    }

    // Capacitor/Mobile & Web environments
    return await fetchMarketIndicatorsClient();
}
