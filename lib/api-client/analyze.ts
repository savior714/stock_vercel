import { httpFetch } from '../http-client';
import type { AnalysisResult } from '../../types/analysis';


interface StockData {
    timestamps: number[];
    closes: number[];
    adjCloses: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
}

// Simple in-memory cache
const stockDataCache = new Map<string, { data: StockData; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Helper functions (copied from route.ts logic)
function calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return NaN;
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    let gains = 0, losses = 0;
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) gains += changes[i];
        else losses += Math.abs(changes[i]);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    }
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateMFI(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 14): number {
    if (closes.length < period + 1) return NaN;
    const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
    const moneyFlows = typicalPrices.map((tp, i) => tp * volumes[i]);
    let posFlow = 0, negFlow = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        if (i === 0) continue;
        if (typicalPrices[i] > typicalPrices[i - 1]) posFlow += moneyFlows[i];
        else if (typicalPrices[i] < typicalPrices[i - 1]) negFlow += moneyFlows[i];
    }
    if (negFlow === 0) return 100;
    return 100 - (100 / (1 + posFlow / negFlow));
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 1) {
    if (prices.length < period) return { upper: NaN, middle: NaN, lower: NaN };
    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((a, b) => a + b, 0) / period;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    return { upper: mean + (std * stdDev), middle: mean, lower: mean - (std * stdDev) };
}

async function getStockData(ticker: string): Promise<{ data: StockData; cached: boolean }> {
    // 1. Check Memory Cache
    const cachedEntry = stockDataCache.get(ticker);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        return { data: cachedEntry.data, cached: true };
    }

    // 2. Fetch from Yahoo Finance
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (180 * 24 * 60 * 60);

    // Handle BRK.B format
    const tickerToTry = ticker.replace(/\./g, '-');
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;

    // Use httpFetch for native capabilities
    const response = await httpFetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
        throw new Error('No data found for ticker');
    }

    const quotes = result.indicators.quote[0];
    const adjCloseData = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

    if (!quotes.close || !quotes.close.length) {
        throw new Error('Empty price data');
    }

    const validIndices: number[] = [];
    for (let i = 0; i < quotes.close.length; i++) {
        if (quotes.close[i] != null && quotes.high[i] != null && quotes.low[i] != null && quotes.volume[i] != null) {
            validIndices.push(i);
        }
    }

    const stockData: StockData = {
        timestamps: validIndices.map(i => result.timestamp[i]),
        closes: validIndices.map(i => quotes.close[i]),
        adjCloses: validIndices.map(i => adjCloseData[i] || quotes.close[i]),
        highs: validIndices.map(i => quotes.high[i]),
        lows: validIndices.map(i => quotes.low[i]),
        volumes: validIndices.map(i => quotes.volume[i])
    };

    // Update Cache
    stockDataCache.set(ticker, { data: stockData, timestamp: Date.now() });

    return { data: stockData, cached: false };
}

// Main Analysis Function
export async function analyzeStockClient(ticker: string): Promise<AnalysisResult> {
    try {
        const { data: stockData, cached } = await getStockData(ticker);

        if (stockData.closes.length < 20) {
            return { ticker, alert: false, error: 'Not enough data', cached };
        }

        const rsi = calculateRSI(stockData.adjCloses);
        const mfi = calculateMFI(stockData.highs, stockData.lows, stockData.adjCloses, stockData.volumes);
        const bb = calculateBollingerBands(stockData.adjCloses, 20, 1.0); // Match Rust/Config (1.0)

        const latestPrice = stockData.closes[stockData.closes.length - 1];
        const latestAdjClose = stockData.adjCloses[stockData.adjCloses.length - 1];
        const bbTouch = latestAdjClose <= bb.lower;

        // Triple Signal: RSI < 35 AND MFI < 35 AND BB Touch
        const alert = rsi < 35 && mfi < 35 && bbTouch;

        return {
            ticker,
            alert,
            rsi,
            mfi,
            bb_touch: bbTouch,
            bb_lower: bb.lower,
            bb_upper: bb.upper,
            bb_middle: bb.middle,
            price: latestPrice,
            cached
        };

    } catch (error) {
        console.error(`Client analysis failed for ${ticker}:`, error);
        return {
            ticker,
            alert: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
            rsi: 0,
            mfi: 0,
            price: 0,
            bb_touch: false
        };
    }
}
