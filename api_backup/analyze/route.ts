import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

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
// 캐시 설정 (이중 캐싱: 메모리 + Vercel KV)
// ============================================================
const stockDataCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분
const KV_CACHE_TTL_SECONDS = 5 * 60; // 5분 (Vercel KV용)

// 메모리 캐시 (빠른 접근)
function getMemoryCachedData(ticker: string): StockData | null {
    const entry = stockDataCache.get(ticker.toUpperCase());
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        console.log(`📦 Memory cache hit for ${ticker}`);
        return entry.data;
    }
    stockDataCache.delete(ticker.toUpperCase());
    return null;
}

function setMemoryCachedData(ticker: string, data: StockData): void {
    stockDataCache.set(ticker.toUpperCase(), { data, timestamp: Date.now() });
}

// Vercel KV 캐시 (영구 보존)
async function getKVCachedData(ticker: string): Promise<StockData | null> {
    try {
        const cached = await kv.get<StockData>(`stock:${ticker.toUpperCase()}`);
        if (cached) {
            console.log(`💾 KV cache hit for ${ticker}`);
            // KV에서 가져온 데이터를 메모리 캐시에도 저장
            setMemoryCachedData(ticker, cached);
            return cached;
        }
    } catch (error) {
        console.error(`KV cache read error for ${ticker}:`, error);
    }
    return null;
}

async function setKVCachedData(ticker: string, data: StockData): Promise<void> {
    try {
        await kv.set(`stock:${ticker.toUpperCase()}`, data, { ex: KV_CACHE_TTL_SECONDS });
        console.log(`💾 KV cache set for ${ticker}`);
    } catch (error) {
        console.error(`KV cache write error for ${ticker}:`, error);
    }
}

// 통합 캐시 조회 (메모리 → KV 순서)
async function getCachedData(ticker: string): Promise<StockData | null> {
    // 1. 메모리 캐시 확인 (빠름)
    const memoryCache = getMemoryCachedData(ticker);
    if (memoryCache) return memoryCache;

    // 2. Vercel KV 캐시 확인 (느리지만 영구 보존)
    const kvCache = await getKVCachedData(ticker);
    if (kvCache) return kvCache;

    return null;
}

// 통합 캐시 저장 (메모리 + KV 동시)
async function setCachedData(ticker: string, data: StockData): Promise<void> {
    setMemoryCachedData(ticker, data);
    await setKVCachedData(ticker, data);
}

// ============================================================
// 지연 함수
// ============================================================
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 동적 랜덤 지연 (1~3초) - yfinance 권장 방식
// 고정된 간격은 패턴 분석에 걸리기 쉬우므로 랜덤 지연 사용
function randomDelay(): Promise<void> {
    const minMs = 1000;  // 1초
    const maxMs = 3000;  // 3초
    const randomMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    console.log(`⏱️ Random delay: ${randomMs}ms`);
    return delay(randomMs);
}

// Rate Limit 감지 시 더 긴 대기 (10초)
function rateLimitDelay(): Promise<void> {
    console.log('⚠️ Rate limit detected, waiting 10 seconds...');
    return delay(10000);
}

// ============================================================
// User-Agent 목록 (최신 브라우저 버전으로 업데이트)
// ============================================================
const USER_AGENTS = [
    // Chrome (최신)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // Firefox (최신)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
    // Safari (최신)
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    // Edge (최신)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    // Opera
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/107.0.0.0',
    // Linux Chrome
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
];

function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 브라우저 모방을 위한 추가 헤더
function getBrowserHeaders(): Record<string, string> {
    return {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        // Referer를 추가하여 브라우저처럼 보이게 함
        'Referer': 'https://finance.yahoo.com/'
    };
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
    // 1. 캐시 확인 (메모리 → KV)
    const cached = await getCachedData(ticker);
    if (cached) {
        return { data: cached, cached: true };
    }

    // 2. API 요청 준비
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (180 * 24 * 60 * 60);

    // NAS 프록시 사용 여부 확인
    const nasProxyUrl = process.env.NAS_PROXY_URL;
    let tickerToTry = ticker;
    let url: string;

    if (nasProxyUrl) {
        // NAS Reverse Proxy 사용
        url = `${nasProxyUrl}?ticker=${encodeURIComponent(tickerToTry)}&period1=${startDate}&period2=${endDate}`;
        console.log(`🔄 Using NAS Proxy for ${ticker}:`, nasProxyUrl.split('?')[0]);
    } else {
        // 직접 Yahoo Finance 호출
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;
        console.log(`⚠️ NAS_PROXY_URL not set, using direct Yahoo Finance for ${ticker}`);
    }

    // 브라우저 헤더로 요청 (봇 탐지 회피)
    const headers = getBrowserHeaders();
    let response = await fetch(url, { headers });

    if (response.status === 429) {
        throw new Error('API_RATE_LIMIT: Yahoo Finance API가 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.');
    }

    // HTML 응답 감지 (차단 페이지 등)
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    if (!contentType.includes('application/json') || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        const proxyStatus = nasProxyUrl ? `프록시 사용 중: ${nasProxyUrl.split('?')[0]}` : '프록시 미사용 (환경 변수 미설정)';
        console.error(`❌ HTML 응답 감지 (${ticker}):`, {
            proxyStatus,
            contentType,
            responsePreview: responseText.substring(0, 200),
            url: url.split('?')[0]
        });
        throw new Error('API_BLOCKED: Yahoo Finance API가 HTML 페이지를 반환했습니다. IP가 차단되었거나 요청이 거부되었습니다. 잠시 후 다시 시도하거나 NAS 프록시를 사용해주세요.');
    }

    let data: any;
    try {
        data = JSON.parse(responseText);

        // NAS 프록시나 API에서 에러를 JSON으로 반환한 경우
        if (data.error) {
            if (data.error === 'API_BLOCKED' || data.error === 'API_RATE_LIMIT') {
                throw new Error(`${data.error}: ${data.message || 'Yahoo Finance API가 차단되었습니다.'}`);
            }
            throw new Error(`API_ERROR: ${data.error} - ${data.message || '알 수 없는 오류'}`);
        }
    } catch (parseError) {
        // 이미 Error 객체인 경우 그대로 throw
        if (parseError instanceof Error) {
            throw parseError;
        }
        console.error(`❌ JSON 파싱 실패 (${ticker}):`, responseText.substring(0, 200));
        throw new Error('API_ERROR: 응답 데이터를 파싱할 수 없습니다. API가 예상과 다른 형식의 데이터를 반환했습니다.');
    }

    // BRK.B → BRK-B 변환 시도
    if ((!data.chart?.result?.length) && ticker.includes('.')) {
        tickerToTry = ticker.replace(/\./g, '-');
        if (nasProxyUrl) {
            url = `${nasProxyUrl}?ticker=${encodeURIComponent(tickerToTry)}&period1=${startDate}&period2=${endDate}`;
        } else {
            url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?period1=${startDate}&period2=${endDate}&interval=1d`;
        }
        response = await fetch(url, { headers: getBrowserHeaders() });
        if (response.status === 429) {
            throw new Error('API_RATE_LIMIT: Yahoo Finance API가 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.');
        }

        // HTML 응답 감지 (차단 페이지 등)
        const contentType = response.headers.get('content-type') || '';
        const responseText = await response.text();

        if (!contentType.includes('application/json') || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            console.error(`❌ HTML 응답 감지 (${tickerToTry}):`, responseText.substring(0, 200));
            throw new Error('API_BLOCKED: Yahoo Finance API가 HTML 페이지를 반환했습니다. IP가 차단되었거나 요청이 거부되었습니다. 잠시 후 다시 시도하거나 NAS 프록시를 사용해주세요.');
        }

        try {
            data = JSON.parse(responseText);

            // NAS 프록시나 API에서 에러를 JSON으로 반환한 경우
            if (data.error) {
                if (data.error === 'API_BLOCKED' || data.error === 'API_RATE_LIMIT') {
                    throw new Error(`${data.error}: ${data.message || 'Yahoo Finance API가 차단되었습니다.'}`);
                }
                throw new Error(`API_ERROR: ${data.error} - ${data.message || '알 수 없는 오류'}`);
            }
        } catch (parseError) {
            // 이미 Error 객체인 경우 그대로 throw
            if (parseError instanceof Error) {
                throw parseError;
            }
            console.error(`❌ JSON 파싱 실패 (${tickerToTry}):`, responseText.substring(0, 200));
            throw new Error('API_ERROR: 응답 데이터를 파싱할 수 없습니다. API가 예상과 다른 형식의 데이터를 반환했습니다.');
        }
    }

    if (!data.chart?.result?.length) {
        throw new Error('티커를 찾을 수 없습니다.');
    }

    const result = data.chart.result[0];

    // 방어 로직: indicators 구조 검증
    if (!result.indicators || !result.indicators.quote || !result.indicators.quote[0]) {
        console.error(`❌ Invalid data structure for ${ticker}:`, JSON.stringify(result).substring(0, 200));
        throw new Error('데이터 구조가 올바르지 않습니다.');
    }

    const quotes = result.indicators.quote[0];

    // 방어 로직: 필수 데이터 존재 확인
    if (!quotes.close || !quotes.high || !quotes.low || !quotes.volume) {
        console.error(`❌ Missing required quote data for ${ticker}:`, {
            hasClose: !!quotes.close,
            hasHigh: !!quotes.high,
            hasLow: !!quotes.low,
            hasVolume: !!quotes.volume
        });
        throw new Error('필수 주가 데이터가 누락되었습니다.');
    }

    // 방어 로직: 배열 길이 확인
    if (!quotes.close.length || quotes.close.length === 0) {
        throw new Error('주가 데이터가 비어있습니다.');
    }

    const adjCloseData = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

    const validIndices: number[] = [];
    for (let i = 0; i < quotes.close.length; i++) {
        if (quotes.close[i] != null && quotes.high[i] != null && quotes.low[i] != null && quotes.volume[i] != null) {
            validIndices.push(i);
        }
    }

    // 방어 로직: 유효한 데이터 포인트 확인
    if (validIndices.length === 0) {
        throw new Error('유효한 주가 데이터가 없습니다.');
    }

    const stockData: StockData = {
        timestamps: validIndices.map(i => result.timestamp[i]),
        closes: validIndices.map(i => quotes.close[i]),
        adjCloses: validIndices.map(i => adjCloseData[i] || quotes.close[i]),
        highs: validIndices.map(i => quotes.high[i]),
        lows: validIndices.map(i => quotes.low[i]),
        volumes: validIndices.map(i => quotes.volume[i])
    };

    await setCachedData(ticker, stockData);
    return { data: stockData, cached: false };
}

// ============================================================
// 티커 분석 함수 (재시도 로직 포함)
// ============================================================

// 지수 백오프 재시도 로직
async function analyzeWithRetry(ticker: string, maxRetries = 3): Promise<AnalysisResult> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await analyzeTicker(ticker);

            // Rate limit 에러가 아니면 바로 반환 (성공 또는 다른 에러)
            if (!result.error || !result.error.includes('API_RATE_LIMIT')) {
                return result;
            }

            // Rate limit 에러이고 재시도 가능한 경우
            if (attempt < maxRetries) {
                const waitTime = 3000 * Math.pow(2, attempt); // 3s, 6s, 12s
                console.log(`🔄 Retrying ${ticker} in ${waitTime / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
                await delay(waitTime);
                continue;
            }

            // 최대 재시도 횟수 초과
            console.warn(`❌ Max retries exceeded for ${ticker}`);
            return result;

        } catch (error) {
            console.error(`Error in analyzeWithRetry for ${ticker}:`, error);
            return {
                ticker,
                alert: false,
                error: error instanceof Error ? error.message : '분석 실패'
            };
        }
    }

    // 이론상 도달 불가
    return { ticker, alert: false, error: '최대 재시도 횟수 초과' };
}

// 기본 티커 분석 함수
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
        const alert = rsi < 30 && mfi < 30 && bbTouch;

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
// API 엔드포인트 (배치 크기 제한 추가)
// ============================================================
// ============================================================
// API 엔드포인트
// ============================================================
const MAX_BATCH_SIZE = 30;

// GET: 단일 티커 분석
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const result = await analyzeWithRetry(ticker);
    return NextResponse.json(result);
}

// POST: 다중 티커 분석 (배치)
export async function POST(request: NextRequest) {
    try {
        const { tickers } = await request.json();

        if (!Array.isArray(tickers) || tickers.length === 0) {
            return NextResponse.json({ error: 'Invalid tickers' }, { status: 400 });
        }

        if (tickers.length > MAX_BATCH_SIZE) {
            return NextResponse.json({
                error: `배치 크기 초과. 최대 ${MAX_BATCH_SIZE}개까지 가능합니다. 클라이언트에서 배치 처리를 사용하세요.`
            }, { status: 400 });
        }

        const results: AnalysisResult[] = [];
        for (let i = 0; i < tickers.length; i++) {
            const result = await analyzeWithRetry(tickers[i]);
            results.push(result);

            if (i < tickers.length - 1) {
                await randomDelay();
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Error in analysis:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
