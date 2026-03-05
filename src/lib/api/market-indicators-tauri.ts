'use client';

/**
 * Market Indicators - Rust Backend IPC Version
 * Fear & Greed Index, VIX, Put/Call Ratio를 Rust 백엔드에서 가져옴 (CORS 우회)
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

// 시장 지표 조회 (Rust 백엔드 IPC 사용)
export async function fetchMarketIndicatorsNative(): Promise<MarketIndicators> {
    try {
        console.log('🔄 Fetching market indicators via Rust Backend...');

        // Rust의 fetch_market_indicators 커맨드 호출
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

        // 에러 시 기본값 반환 (UI 깨짐 방지)
        return {
            fearAndGreed: { score: 50, rating: 'Neutral' as IndicatorRating, previousClose: 50 },
            vix: { current: 20, fiftyDayAvg: 20, rating: 'Neutral' as IndicatorRating },
            putCallRatio: { current: 0.70, rating: 'Neutral' as IndicatorRating }
        };
    }
}
