import { NextRequest, NextResponse } from 'next/server';

interface DayData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number;
    volume: number;
    rsi?: number;
    mfi?: number;
    bbUpper?: number;
    bbMiddle?: number;
    bbLower?: number;
}

interface StockDataDebug {
    timestamps: number[];
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    adjCloses: number[];
    volumes: number[];
    currency: string;
    exchangeTimezoneName: string;
}

interface CacheEntry {
    data: StockDataDebug;
    timestamp: number;
}

// ============================================================
// 캐시 설정 (5분 TTL)
// ============================================================
const stockDataCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

function getCachedData(ticker: string): StockDataDebug | null {
    const entry = stockDataCache.get(ticker.toUpperCase());
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        console.log(`📦 [Debug] Cache hit for ${ticker}`);
        return entry.data;
    }
    stockDataCache.delete(ticker.toUpperCase());
    return null;
}

function setCachedData(ticker: string, data: StockDataDebug): void {
    stockDataCache.set(ticker.toUpperCase(), { data, timestamp: Date.now() });
}

// ============================================================
// User-Agent 목록 (10개)
// ============================================================
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0'
];

function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ============================================================
// 기술적 지표 계산 함수들
// ============================================================

function calculateRSIArray(prices: number[], period: number = 14): number[] {
    const rsiArray: number[] = [];
    if (prices.length < period + 1) return rsiArray;

    const changes = prices.slice(1).map((price, i) => price - prices[i]);

    let gains = 0;
    let losses = 0;

    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) gains += changes[i];
        else losses += Math.abs(changes[i]);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = 0; i < period; i++) {
        rsiArray.push(NaN);
    }

    if (avgLoss === 0) {
        rsiArray.push(100);
    } else {
        const rs = avgGain / avgLoss;
        rsiArray.push(100 - (100 / (1 + rs)));
    }

    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;

        if (avgLoss === 0) {
            rsiArray.push(100);
        } else {
            const rs = avgGain / avgLoss;
            rsiArray.push(100 - (100 / (1 + rs)));
        }
    }

    return rsiArray;
}

function calculateMFIArray(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 14): number[] {
    const mfiArray: number[] = [];
    const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
    const moneyFlows = typicalPrices.map((tp, i) => tp * volumes[i]);

    for (let i = 0; i < closes.length; i++) {
        if (i < period) {
            mfiArray.push(NaN);
            continue;
        }

        let posFlow = 0;
        let negFlow = 0;

        for (let j = i - period + 1; j <= i; j++) {
            if (j === 0) continue;
            if (typicalPrices[j] > typicalPrices[j - 1]) {
                posFlow += moneyFlows[j];
            } else if (typicalPrices[j] < typicalPrices[j - 1]) {
                negFlow += moneyFlows[j];
            }
        }

        if (negFlow === 0) {
            mfiArray.push(100);
        } else {
            const mfiRatio = posFlow / negFlow;
            mfiArray.push(100 - (100 / (1 + mfiRatio)));
        }
    }

    return mfiArray;
}

function calculateBBArray(prices: number[], period: number = 20, stdDev: number = 1): { upper: number[], middle: number[], lower: number[] } {
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            upper.push(NaN);
            middle.push(NaN);
            lower.push(NaN);
            continue;
        }

        const slice = prices.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        const std = Math.sqrt(variance);

        middle.push(mean);
        upper.push(mean + (std * stdDev));
        lower.push(mean - (std * stdDev));
    }

    return { upper, middle, lower };
}

// ============================================================
// Yahoo Finance API로 주가 데이터 가져오기
// ============================================================
async function getStockDataDebug(ticker: string): Promise<{ data: StockDataDebug; cached: boolean }> {
    // 1. 캐시 확인
    const cached = getCachedData(ticker);
    if (cached) {
        return { data: cached, cached: true };
    }

    // 2. Yahoo Finance 요청
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (180 * 24 * 60 * 60);

    let tickerToTry = ticker;
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;

    const userAgent = getRandomUserAgent();
    let response = await fetch(url, {
        headers: {
            'User-Agent': userAgent,
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });

    if (response.status === 429) {
        throw new Error('API_RATE_LIMIT: Yahoo Finance API가 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.');
    }

    let data = await response.json();

    if ((!data.chart || !data.chart.result || data.chart.result.length === 0) && ticker.includes('.')) {
        tickerToTry = ticker.replace(/\./g, '-');
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;

        response = await fetch(url, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (response.status === 429) {
            throw new Error('API_RATE_LIMIT: Yahoo Finance API가 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.');
        }

        data = await response.json();
    }

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('Not Found');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

    const stockData: StockDataDebug = {
        timestamps,
        opens: quotes.open,
        highs: quotes.high,
        lows: quotes.low,
        closes: quotes.close,
        adjCloses: adjClose,
        volumes: quotes.volume,
        currency: result.meta?.currency || 'USD',
        exchangeTimezoneName: result.meta?.exchangeTimezoneName || 'America/New_York'
    };

    setCachedData(ticker, stockData);
    return { data: stockData, cached: false };
}

// ============================================================
// API 엔드포인트
// ============================================================
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker');
        const days = parseInt(searchParams.get('days') || '30');

        if (!ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        const { data: stockData, cached } = await getStockDataDebug(ticker.toUpperCase());

        const validIndices: number[] = [];
        for (let i = 0; i < stockData.closes.length; i++) {
            if (stockData.closes[i] !== null &&
                stockData.highs[i] !== null &&
                stockData.lows[i] !== null &&
                stockData.opens[i] !== null) {
                validIndices.push(i);
            }
        }

        const closes = validIndices.map(i => stockData.closes[i]);
        const highs = validIndices.map(i => stockData.highs[i]);
        const lows = validIndices.map(i => stockData.lows[i]);
        const volumes = validIndices.map(i => stockData.volumes[i] || 0);

        const rsiArray = calculateRSIArray(closes);
        const mfiArray = calculateMFIArray(highs, lows, closes, volumes);
        const bbArrays = calculateBBArray(closes);

        const dayData: DayData[] = [];

        for (let i = 0; i < validIndices.length; i++) {
            const idx = validIndices[i];
            const timestamp = stockData.timestamps[idx];
            const date = new Date(timestamp * 1000);

            dayData.push({
                date: date.toISOString().split('T')[0],
                open: Math.round(stockData.opens[idx] * 100) / 100,
                high: Math.round(stockData.highs[idx] * 100) / 100,
                low: Math.round(stockData.lows[idx] * 100) / 100,
                close: Math.round(stockData.closes[idx] * 100) / 100,
                adjClose: Math.round((stockData.adjCloses[idx] || stockData.closes[idx]) * 100) / 100,
                volume: stockData.volumes[idx] || 0,
                rsi: rsiArray[i] !== undefined ? Math.round(rsiArray[i] * 100) / 100 : undefined,
                mfi: mfiArray[i] !== undefined ? Math.round(mfiArray[i] * 100) / 100 : undefined,
                bbUpper: bbArrays.upper[i] !== undefined ? Math.round(bbArrays.upper[i] * 100) / 100 : undefined,
                bbMiddle: bbArrays.middle[i] !== undefined ? Math.round(bbArrays.middle[i] * 100) / 100 : undefined,
                bbLower: bbArrays.lower[i] !== undefined ? Math.round(bbArrays.lower[i] * 100) / 100 : undefined
            });
        }

        const recentData = dayData.slice(-days);

        return NextResponse.json({
            ticker: ticker.toUpperCase(),
            currency: stockData.currency,
            timezone: stockData.exchangeTimezoneName,
            totalDays: dayData.length,
            requestedDays: days,
            cached,
            data: recentData,
            summary: {
                latestDate: recentData[recentData.length - 1]?.date,
                latestClose: recentData[recentData.length - 1]?.close,
                latestAdjClose: recentData[recentData.length - 1]?.adjClose,
                closeVsAdjCloseDiff: recentData[recentData.length - 1]?.close !== recentData[recentData.length - 1]?.adjClose,
                latestRSI: recentData[recentData.length - 1]?.rsi,
                latestMFI: recentData[recentData.length - 1]?.mfi,
                latestBBLower: recentData[recentData.length - 1]?.bbLower,
                latestBBUpper: recentData[recentData.length - 1]?.bbUpper
            }
        });
    } catch (error) {
        console.error('Debug API error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
