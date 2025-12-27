import { NextRequest, NextResponse } from 'next/server';

interface AnalysisResult {
    ticker: string;
    alert: boolean;
    rsi?: number;
    mfi?: number;
    bb_touch?: boolean;
    price?: number;
    error?: string;
}

// RSI 계산 (Wilder's smoothing)
function calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return NaN;

    const changes = prices.slice(1).map((price, i) => price - prices[i]);

    let gains = 0;
    let losses = 0;

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
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

// MFI 계산
function calculateMFI(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 14): number {
    if (closes.length < period + 1) return NaN;

    const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
    const moneyFlows = typicalPrices.map((tp, i) => tp * volumes[i]);

    let posFlow = 0;
    let negFlow = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
        if (i === 0) continue;
        if (typicalPrices[i] > typicalPrices[i - 1]) {
            posFlow += moneyFlows[i];
        } else if (typicalPrices[i] < typicalPrices[i - 1]) {
            negFlow += moneyFlows[i];
        }
    }

    if (negFlow === 0) return 100;
    const mfiRatio = posFlow / negFlow;
    return 100 - (100 / (1 + mfiRatio));
}

// 볼린저 밴드 계산
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 1) {
    if (prices.length < period) return { upper: NaN, middle: NaN, lower: NaN };

    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((a, b) => a + b, 0) / period;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
        upper: mean + (std * stdDev),
        middle: mean,
        lower: mean - (std * stdDev)
    };
}

async function getStockData(ticker: string) {
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (180 * 24 * 60 * 60); // 180 days ago

    // Try original ticker first
    let tickerToTry = ticker;
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;

    let response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    let data = await response.json();

    // If no data and ticker contains a dot, try with dash instead (e.g., BRK.B → BRK-B)
    if ((!data.chart || !data.chart.result || data.chart.result.length === 0) && ticker.includes('.')) {
        console.log(`Ticker ${ticker} failed, trying with dash instead...`);
        tickerToTry = ticker.replace(/\./g, '-');
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;

        response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        data = await response.json();

        if (data.chart && data.chart.result && data.chart.result.length > 0) {
            console.log(`✅ Ticker ${ticker} succeeded with ${tickerToTry}`);
        }
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('Not Found');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    return {
        timestamps,
        closes: quotes.close.filter((c: number | null) => c !== null),
        highs: quotes.high.filter((h: number | null) => h !== null),
        lows: quotes.low.filter((l: number | null) => l !== null),
        volumes: quotes.volume.filter((v: number | null) => v !== null)
    };
}

async function analyzeTicker(ticker: string): Promise<AnalysisResult> {
    try {
        const stockData = await getStockData(ticker);

        if (stockData.closes.length < 20) {
            return {
                ticker,
                alert: false,
                error: '데이터 부족'
            };
        }

        const rsi = calculateRSI(stockData.closes);
        const mfi = calculateMFI(stockData.highs, stockData.lows, stockData.closes, stockData.volumes);
        const bb = calculateBollingerBands(stockData.closes);

        const latestPrice = stockData.closes[stockData.closes.length - 1];
        const bbTouch = latestPrice <= bb.lower;

        const alert = rsi < 35 && mfi < 35 && bbTouch;

        return {
            ticker,
            alert,
            rsi,
            mfi,
            bb_touch: bbTouch,
            price: latestPrice
        };
    } catch (error) {
        console.error(`Error analyzing ${ticker}:`, error);
        return {
            ticker,
            alert: false,
            error: error instanceof Error ? error.message : '분석 실패'
        };
    }
}

export async function POST(request: NextRequest) {
    try {
        const { tickers } = await request.json();

        if (!Array.isArray(tickers) || tickers.length === 0) {
            return NextResponse.json({ error: 'Invalid tickers' }, { status: 400 });
        }

        // 모든 티커 병렬 분석
        const results = await Promise.all(
            tickers.map(ticker => analyzeTicker(ticker))
        );

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Error in analysis:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
