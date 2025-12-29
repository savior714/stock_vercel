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

// API 차단 방지를 위한 지연 함수
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Finnhub API 요청 속도 제한: 분당 50회 (60초 / 50회 = 1.2초당 1회)
// 마지막 Finnhub API 호출 시간 추적 (모듈 레벨)
let lastFinnhubCallTime = 0;
const FINNHUB_MIN_INTERVAL_MS = 1200; // 1.2초 = 1200ms

// Finnhub API 호출 전 지연 시간 보장
async function ensureFinnhubRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - lastFinnhubCallTime;
    
    if (timeSinceLastCall < FINNHUB_MIN_INTERVAL_MS) {
        const waitTime = FINNHUB_MIN_INTERVAL_MS - timeSinceLastCall;
        await delay(waitTime);
    }
    
    lastFinnhubCallTime = Date.now();
}

// 브라우저와 유사한 User-Agent 목록
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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

// 볼린저 밴드 계산 (표준: 20일 이평 ± 2표준편차)
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
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

// Finnhub API로 주가 데이터 가져오기 (fallback)
async function getStockDataFromFinnhub(ticker: string) {
    // Finnhub API 요청 속도 제한 확인 (분당 50회)
    await ensureFinnhubRateLimit();
    
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        throw new Error('FINNHUB_API_KEY가 설정되지 않았습니다.');
    }

    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (180 * 24 * 60 * 60); // 180 days ago

    // Finnhub은 점(.)을 그대로 사용하지만, 일부 티커는 변환이 필요할 수 있음
    // BRK.B 같은 경우는 그대로 사용
    let finnhubTicker = ticker;
    
    // Finnhub API는 US 주식만 지원하므로, 티커가 US 주식인지 확인 필요
    // 일단 원본 티커로 시도
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${finnhubTicker}&resolution=D&from=${startDate}&to=${endDate}&token=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('API_RATE_LIMIT: Finnhub API 요청 한도 초과');
        }
        if (response.status === 403) {
            // Forbidden 에러 - API 키 문제 또는 티커 문제
            const errorText = await response.text();
            console.error(`Finnhub 403 for ${ticker}:`, errorText);
            
            // 에러 응답 본문을 확인하여 더 구체적인 메시지 제공
            let errorMessage = `Finnhub API Forbidden: 티커를 찾을 수 없습니다. (티커: ${ticker})`;
            
            // API 키 문제인지 티커 문제인지 구분
            if (errorText.includes('Invalid API key') || errorText.includes('API key')) {
                errorMessage = `Finnhub API Forbidden: API 키가 유효하지 않습니다.`;
            } else {
                // 티커를 찾을 수 없는 경우 (Finnhub은 US 주식만 지원)
                errorMessage = `Finnhub: 티커를 찾을 수 없습니다. (티커: ${ticker}) - Finnhub은 US 주식만 지원합니다.`;
            }
            
            throw new Error(errorMessage);
        }
        const errorText = await response.text();
        console.error(`Finnhub API error for ${ticker}:`, response.status, errorText);
        throw new Error(`Finnhub API failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.s !== 'ok' || !data.c || data.c.length === 0) {
        // Finnhub에서 데이터가 없는 경우는 티커를 찾을 수 없는 것으로 간주
        throw new Error(`Finnhub: 티커를 찾을 수 없습니다. (티커: ${ticker}) - Finnhub은 US 주식만 지원합니다.`);
    }

    // Finnhub 데이터 형식: { c: [close], h: [high], l: [low], o: [open], t: [timestamp], v: [volume] }
    // Yahoo Finance 형식으로 변환
    const timestamps = data.t;
    const closes = data.c;
    const highs = data.h;
    const lows = data.l;
    const opens = data.o;
    const volumes = data.v;

    // Finnhub은 수정주가를 제공하지 않으므로 종가를 수정주가로 사용
    // (배당/분할 조정은 없지만, 기본 분석에는 충분)
    const adjCloses = closes;

    return {
        timestamps,
        closes,
        adjCloses,
        highs,
        lows,
        volumes
    };
}

async function getStockData(ticker: string, useFinnhub: boolean = false) {
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (180 * 24 * 60 * 60); // 180 days ago

    // Finnhub을 먼저 사용하도록 요청된 경우
    if (useFinnhub) {
        try {
            return await getStockDataFromFinnhub(ticker);
        } catch (error) {
            console.error(`Finnhub failed for ${ticker}:`, error);
            throw error;
        }
    }

    // Yahoo Finance 시도
    try {
        // Try original ticker first
        let tickerToTry = ticker;
        let url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;

        const userAgent = getRandomUserAgent();
        let response = await fetch(url, {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            }
        });

        // API 차단 감지 (429 Too Many Requests) - Finnhub으로 fallback
        if (response.status === 429) {
            console.log(`Yahoo Finance 429 for ${ticker}, trying Finnhub...`);
            return await getStockDataFromFinnhub(ticker);
        }

        let data = await response.json();

        // If no data and ticker contains a dot, try with dash instead (e.g., BRK.B → BRK-B)
        if ((!data.chart || !data.chart.result || data.chart.result.length === 0) && ticker.includes('.')) {
            console.log(`Ticker ${ticker} failed, trying with dash instead...`);
            tickerToTry = ticker.replace(/\./g, '-');
            url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;

            response = await fetch(url, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache'
                }
            });

            // API 차단 감지 (429 Too Many Requests) - Finnhub으로 fallback
            if (response.status === 429) {
                console.log(`Yahoo Finance 429 for ${ticker} (dash), trying Finnhub...`);
                return await getStockDataFromFinnhub(ticker);
            }

            data = await response.json();

            if (data.chart && data.chart.result && data.chart.result.length > 0) {
                console.log(`✅ Ticker ${ticker} succeeded with ${tickerToTry}`);
            }
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            // 데이터가 없으면 Finnhub으로 fallback
            console.log(`Yahoo Finance no data for ${ticker}, trying Finnhub...`);
            return await getStockDataFromFinnhub(ticker);
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        // 수정주가(adjclose) 사용 - 배당/분할 반영된 가격으로 지표 계산
        const adjCloseData = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

        // null 값 필터링 및 인덱스 동기화
        const validIndices: number[] = [];
        for (let i = 0; i < quotes.close.length; i++) {
            if (quotes.close[i] !== null && quotes.high[i] !== null &&
                quotes.low[i] !== null && quotes.volume[i] !== null) {
                validIndices.push(i);
            }
        }

        return {
            timestamps: validIndices.map(i => timestamps[i]),
            closes: validIndices.map(i => quotes.close[i]),
            adjCloses: validIndices.map(i => adjCloseData[i] || quotes.close[i]),
            highs: validIndices.map(i => quotes.high[i]),
            lows: validIndices.map(i => quotes.low[i]),
            volumes: validIndices.map(i => quotes.volume[i])
        };
    } catch (error) {
        // Yahoo Finance 실패 시 Finnhub으로 fallback
        if (error instanceof Error && error.message.includes('API_RATE_LIMIT')) {
            console.log(`Yahoo Finance rate limit for ${ticker}, trying Finnhub...`);
            try {
                return await getStockDataFromFinnhub(ticker);
            } catch (finnhubError) {
                // Finnhub도 실패하면 원래 에러 throw
                // 단, Finnhub에서 티커를 찾을 수 없는 경우는 정상적인 상황일 수 있으므로 원래 에러 유지
                if (finnhubError instanceof Error && finnhubError.message.includes('티커를 찾을 수 없습니다')) {
                    // Finnhub에서 티커를 찾을 수 없는 경우는 Yahoo Finance 에러를 우선
                    throw error;
                }
                throw finnhubError;
            }
        }
        // 다른 에러도 Finnhub으로 시도
        console.log(`Yahoo Finance error for ${ticker}, trying Finnhub...`);
        try {
            return await getStockDataFromFinnhub(ticker);
        } catch (finnhubError) {
            // Finnhub도 실패하면 원래 에러 throw
            // 단, Finnhub에서 티커를 찾을 수 없는 경우는 정상적인 상황일 수 있으므로 원래 에러 유지
            if (finnhubError instanceof Error && finnhubError.message.includes('티커를 찾을 수 없습니다')) {
                // Finnhub에서 티커를 찾을 수 없는 경우는 Yahoo Finance 에러를 우선
                throw error;
            }
            throw finnhubError;
        }
    }
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

        // 수정주가(adjclose)로 지표 계산 - 토스증권과 동일한 기준
        // Finnhub의 경우 수정주가가 없으므로 종가를 사용
        const rsi = calculateRSI(stockData.adjCloses);
        const mfi = calculateMFI(stockData.highs, stockData.lows, stockData.adjCloses, stockData.volumes);
        const bb = calculateBollingerBands(stockData.adjCloses);

        const latestPrice = stockData.closes[stockData.closes.length - 1];
        const latestAdjPrice = stockData.adjCloses[stockData.adjCloses.length - 1];
        const bbTouch = latestAdjPrice <= bb.lower;

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

        // 병렬 처리 대신 순차 처리 + 지연으로 API 차단 방지
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
