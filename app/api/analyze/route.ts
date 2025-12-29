import { NextRequest, NextResponse } from 'next/server';

interface AnalysisResult {
    ticker: string;
    alert: boolean;
    rsi?: number;
    mfi?: number;
    bb_touch?: boolean;
    price?: number;
    error?: string;
    cached?: boolean;
}

interface StockData {
    timestamps: number[];
    closes: number[];
    adjCloses: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
}

interface CacheEntry {
    data: StockData;
    timestamp: number;
}

// ============================================================
// 캐시 설정 (5분 TTL)
// ============================================================
const stockDataCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

function getCachedData(ticker: string): StockData | null {
    const entry = stockDataCache.get(ticker.toUpperCase());
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        console.log(`📦 Cache hit for ${ticker}`);
        return entry.data;
    }
    stockDataCache.delete(ticker.toUpperCase());
    return null;
}

function setCachedData(ticker: string, data: StockData): void {
    stockDataCache.set(ticker.toUpperCase(), { data, timestamp: Date.now() });
}

// ============================================================
// 지연 함수
// ============================================================
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// ============================================================
// Yahoo Finance API로 주가 데이터 가져오기
// ============================================================
async function getStockData(ticker: string): Promise<{ data: StockData; cached: boolean }> {
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

    // BRK.B → BRK-B 변환 시도
    if ((!data.chart?.result?.length) && ticker.includes('.')) {
        tickerToTry = ticker.replace(/\./g, '-');
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;
        response = await fetch(url, { headers: { 'User-Agent': userAgent } });
        if (response.status === 429) {
            throw new Error('API_RATE_LIMIT: Yahoo Finance API가 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.');
        }
        data = await response.json();
    }

    if (!data.chart?.result?.length) {
        throw new Error('티커를 찾을 수 없습니다.');
    }

    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    const adjCloseData = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

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

    setCachedData(ticker, stockData);
    return { data: stockData, cached: false };
}

// ============================================================
// 티커 분석 함수
// ============================================================
async function analyzeTicker(ticker: string): Promise<AnalysisResult> {
    try {
        const { data: stockData, cached } = await getStockData(ticker);

        if (stockData.closes.length < 20) {
            return { ticker, alert: false, error: '데이터 부족', cached };
        }

        const rsi = calculateRSI(stockData.adjCloses);
        const mfi = calculateMFI(stockData.highs, stockData.lows, stockData.adjCloses, stockData.volumes);
        const bb = calculateBollingerBands(stockData.adjCloses);
        const latestPrice = stockData.closes[stockData.closes.length - 1];
        const bbTouch = stockData.adjCloses[stockData.adjCloses.length - 1] <= bb.lower;
        const alert = rsi < 35 && mfi < 35 && bbTouch;

        return { ticker, alert, rsi, mfi, bb_touch: bbTouch, price: latestPrice, cached };
    } catch (error) {
        console.error(`Error analyzing ${ticker}:`, error);
        return {
            ticker,
            alert: false,
            error: error instanceof Error ? error.message : '분석 실패'
        };
    }
}

// ============================================================
// API 엔드포인트
// ============================================================
export async function POST(request: NextRequest) {
    try {
        const { tickers } = await request.json();

        if (!Array.isArray(tickers) || tickers.length === 0) {
            return NextResponse.json({ error: 'Invalid tickers' }, { status: 400 });
        }

        const results: AnalysisResult[] = [];
        for (let i = 0; i < tickers.length; i++) {
            const result = await analyzeTicker(tickers[i]);
            results.push(result);

            // 마지막 요청이 아니면 1초 지연
            if (i < tickers.length - 1) {
                await delay(1000);
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Error in analysis:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
