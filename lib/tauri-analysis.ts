/**
 * Multi-Platform Stock Analysis Utility
 * Works on Tauri Desktop, Capacitor Mobile, and Web Browser
 * Uses unified HTTP client for CORS-free Yahoo Finance API access
 */

import { httpFetch } from './http-client';
import { isTauriEnvironment, isCapacitorEnvironment } from './utils';
import type { HistoricalData, TauriAnalysisResult } from '../types';

// Analysis result type (exported from types/)
export type { TauriAnalysisResult as AnalysisResult } from '../types';

// RSI calculation
function calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    const changes = [];
    for (let i = 1; i < closes.length; i++) {
        changes.push(closes[i] - closes[i - 1]);
    }

    const recentChanges = changes.slice(-period);
    let gains = 0;
    let losses = 0;

    for (const change of recentChanges) {
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

// MFI calculation
function calculateMFI(
    highs: number[],
    lows: number[],
    closes: number[],
    volumes: number[],
    period: number = 14
): number {
    if (closes.length < period + 1) return 50;

    const typicalPrices = [];
    for (let i = 0; i < closes.length; i++) {
        typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
    }

    const rawMoneyFlow = typicalPrices.map((tp, i) => tp * volumes[i]);

    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
        if (i > 0 && typicalPrices[i] > typicalPrices[i - 1]) {
            positiveFlow += rawMoneyFlow[i];
        } else if (i > 0) {
            negativeFlow += rawMoneyFlow[i];
        }
    }

    if (negativeFlow === 0) return 100;
    const mfr = positiveFlow / negativeFlow;
    return 100 - (100 / (1 + mfr));
}

// Bollinger Bands calculation
function calculateBollingerBands(
    closes: number[],
    period: number = 20,
    stdDev: number = 1
): { upper: number; middle: number; lower: number } {
    if (closes.length < period) {
        return { upper: 0, middle: 0, lower: 0 };
    }

    const recentCloses = closes.slice(-period);
    const middle = recentCloses.reduce((a, b) => a + b, 0) / period;

    const squaredDiffs = recentCloses.map(c => Math.pow(c - middle, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(variance);

    return {
        upper: middle + (std * stdDev),
        middle,
        lower: middle - (std * stdDev),
    };
}

// Convert ticker format for Yahoo Finance API (e.g., BRK.B -> BRK-B)
function formatTickerForYahoo(ticker: string): string {
    return ticker.replace(/\./g, '-');
}

// Fetch stock data from Yahoo Finance (works on all platforms)
export async function fetchStockData(ticker: string): Promise<HistoricalData> {
    const formattedTicker = formatTickerForYahoo(ticker);
    const period1 = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60); // 1 year ago
    const period2 = Math.floor(Date.now() / 1000); // now

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedTicker}?period1=${period1}&period2=${period2}&interval=1d`;

    try {
        console.log(`📊 Fetching data for ${ticker}...`);
        const response = await httpFetch(url);

        console.log(`📊 Response status for ${ticker}:`, response.status);

        const text = await response.text();
        console.log(`📊 Response text length for ${ticker}:`, text.length);
        console.log(`📊 Response text preview for ${ticker}:`, text.substring(0, 300));

        // Parse JSON from text
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error(`📊 JSON parse error for ${ticker}:`, parseError);
            throw new Error(`Failed to parse JSON: ${text.substring(0, 100)}`);
        }

        console.log(`📊 Data structure for ${ticker}:`, Object.keys(data));

        if (!data.chart?.result?.[0]) {
            console.error(`📊 Invalid data structure for ${ticker}:`, JSON.stringify(data).substring(0, 500));
            throw new Error('No data available');
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp || [];
        const quote = result.indicators.quote[0];
        const adjclose = result.indicators.adjclose?.[0]?.adjclose || quote.close;

        console.log(`📊 Successfully parsed ${ticker}: ${timestamps.length} data points`);

        return {
            dates: timestamps.map((ts: number) => new Date(ts * 1000).toISOString().split('T')[0]),
            opens: quote.open || [],
            highs: quote.high || [],
            lows: quote.low || [],
            closes: quote.close || [],
            adj_closes: adjclose || [],
            volumes: quote.volume || [],
        };
    } catch (error) {
        console.error(`❌ Error fetching ${ticker}:`, error);
        return {
            dates: [],
            opens: [],
            highs: [],
            lows: [],
            closes: [],
            adj_closes: [],
            volumes: [],
        };
    }
}

// Analyze single ticker
export async function analyzeTicker(ticker: string): Promise<TauriAnalysisResult> {
    try {
        const data = await fetchStockData(ticker);

        if (data.closes.length === 0) {
            return {
                ticker,
                currentPrice: 0,
                rsi: 50,
                mfi: 50,
                bollingerPosition: 'inside',
                bollingerLower: 0,
                bollingerUpper: 0,
                bollingerMiddle: 0,
                tripleSignal: false,
                error: 'Unable to fetch data',
            };
        }

        const currentPrice = data.adj_closes[data.adj_closes.length - 1];
        const rsi = calculateRSI(data.adj_closes);
        const mfi = calculateMFI(data.highs, data.lows, data.closes, data.volumes);
        const bb = calculateBollingerBands(data.adj_closes);

        let bollingerPosition: 'below' | 'above' | 'inside' = 'inside';
        if (currentPrice <= bb.lower) bollingerPosition = 'below';
        else if (currentPrice >= bb.upper) bollingerPosition = 'above';

        const tripleSignal = rsi < 30 && mfi < 30 && bollingerPosition === 'below';

        return {
            ticker,
            currentPrice,
            rsi,
            mfi,
            bollingerPosition,
            bollingerLower: bb.lower,
            bollingerUpper: bb.upper,
            bollingerMiddle: bb.middle,
            tripleSignal,
        };
    } catch (error) {
        return {
            ticker,
            currentPrice: 0,
            rsi: 50,
            mfi: 50,
            bollingerPosition: 'inside',
            bollingerLower: 0,
            bollingerUpper: 0,
            bollingerMiddle: 0,
            tripleSignal: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Analyze multiple tickers (with progress callback)
export async function analyzeMultipleTickers(
    tickers: string[],
    onProgress?: (current: number, total: number) => void
): Promise<TauriAnalysisResult[]> {
    const results: TauriAnalysisResult[] = [];

    for (let i = 0; i < tickers.length; i++) {
        const result = await analyzeTicker(tickers[i]);
        results.push(result);
        onProgress?.(i + 1, tickers.length);

        // Rate limiting delay (100-300ms random)
        if (i < tickers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        }
    }

    return results;
}

// Platform detection exports
// Platform detection exports are deprecated here. Use lib/utils instead.
