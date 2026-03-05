'use client';

/**
 * Market Indicators - Rust Backend IPC Version
 * Fetches Fear & Greed Index, VIX, and Put/Call Ratio via Rust backend (CORS bypass)
 */

import { invoke } from '@tauri-apps/api/core';
import type { MarketIndicators, IndicatorRating } from '@/types/market';

interface RustMarketIndicatorsResult {
    fearAndGreed: {
        current: number;
        rating: string;
        additionalInfo?: number;
    };
    vix: {
        current: number;
        rating: string;
        additionalInfo?: number;
    };
    putCallRatio: {
        current: number;
        rating: string;
        additionalInfo?: number;
    };
}

// Fetch market indicators using Rust backend IPC
export async function fetchMarketIndicatorsNative(): Promise<MarketIndicators> {
    try {
        console.log('🔄 Fetching market indicators via Rust Backend...');

        // Call the fetch_market_indicators command in Rust
        const result = await invoke<RustMarketIndicatorsResult>('fetch_market_indicators');

        console.log('✅ Market Indicators received:', result);

        return {
            fearAndGreed: {
                score: result.fearAndGreed.current,
                rating: result.fearAndGreed.rating as IndicatorRating,
                previousClose: result.fearAndGreed.additionalInfo || 50,
            },
            vix: {
                current: result.vix.current,
                fiftyDayAvg: result.vix.additionalInfo || result.vix.current,
                rating: result.vix.rating as IndicatorRating,
            },
            putCallRatio: {
                current: result.putCallRatio.current,
                rating: result.putCallRatio.rating as IndicatorRating,
            }
        };

    } catch (error) {
        console.error('❌ Failed to fetch market indicators from Rust:', error);

        // Return default values on error to prevent UI breakage
        return {
            fearAndGreed: { score: 50, rating: 'Neutral' as IndicatorRating, previousClose: 50 },
            vix: { current: 20, fiftyDayAvg: 20, rating: 'Neutral' as IndicatorRating },
            putCallRatio: { current: 0.70, rating: 'Neutral' as IndicatorRating }
        };
    }
}
