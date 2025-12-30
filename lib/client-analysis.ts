// ============================================================
// 클라이언트 사이드 분석 유틸리티
// NAS 프록시를 통해 Yahoo Finance 데이터 조회 및 기술적 지표 계산
// ============================================================

export interface StockData {
    timestamps: number[];
    closes: number[];
    adjCloses: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
}

export interface AnalysisResult {
    ticker: string;
    alert: boolean;
    rsi?: number;
    mfi?: number;
    bb_touch?: boolean;
    price?: number;
    error?: string;
    cached?: boolean;
}

// ============================================================
// 브라우저 캐시 (localStorage 기반)
// ============================================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

interface CacheEntry {
    data: StockData;
    timestamp: number;
}

export function getCachedData(ticker: string): StockData | null {
    if (typeof window === 'undefined') return null;

    try {
        const key = `stock_cache_${ticker.toUpperCase()}`;
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
            console.log(`📦 Client cache hit for ${ticker}`);
            return entry.data;
        }

        // 만료된 캐시 삭제
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Cache read error:', e);
    }
    return null;
}

export function setCachedData(ticker: string, data: StockData): void {
    if (typeof window === 'undefined') return;

    try {
        const key = `stock_cache_${ticker.toUpperCase()}`;
        const entry: CacheEntry = { data, timestamp: Date.now() };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
        console.error('Cache write error:', e);
    }
}

// ============================================================
// 기술적 지표 계산 함수들
// ============================================================

export function calculateRSI(prices: number[], period: number = 14): number {
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

export function calculateMFI(
    highs: number[],
    lows: number[],
    closes: number[],
    volumes: number[],
    period: number = 14
): number {
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

export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 1) {
    if (prices.length < period) return { upper: NaN, middle: NaN, lower: NaN };
    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((a, b) => a + b, 0) / period;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    return { upper: mean + (std * stdDev), middle: mean, lower: mean - (std * stdDev) };
}

// ============================================================
// NAS 프록시를 통한 데이터 조회
// ============================================================

export async function fetchStockDataViaNAS(
    ticker: string,
    nasProxyUrl: string
): Promise<{ data: StockData; cached: boolean }> {
    // 1. 캐시 확인
    const cached = getCachedData(ticker);
    if (cached) {
        return { data: cached, cached: true };
    }

    // 2. API 요청 준비
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (180 * 24 * 60 * 60); // 180일

    let tickerToTry = ticker;
    let url = `${nasProxyUrl}?ticker=${encodeURIComponent(tickerToTry)}&period1=${startDate}&period2=${endDate}`;

    console.log(`🔄 Fetching ${ticker} via NAS Proxy...`);

    let response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });

    if (response.status === 429) {
        throw new Error('API_RATE_LIMIT: Yahoo Finance API가 일시적으로 차단되었습니다.');
    }

    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    // HTML 응답 감지 (차단 페이지 등)
    if (!contentType.includes('application/json') ||
        responseText.trim().startsWith('<!DOCTYPE') ||
        responseText.trim().startsWith('<html')) {
        throw new Error('API_BLOCKED: NAS 프록시가 HTML 페이지를 반환했습니다.');
    }

    let data: any;
    try {
        data = JSON.parse(responseText);
        if (data.error) {
            throw new Error(`API_ERROR: ${data.error} - ${data.message || '알 수 없는 오류'}`);
        }
    } catch (parseError) {
        if (parseError instanceof Error && parseError.message.startsWith('API_')) {
            throw parseError;
        }
        throw new Error('API_ERROR: 응답 데이터를 파싱할 수 없습니다.');
    }

    // BRK.B → BRK-B 변환 시도
    if ((!data.chart?.result?.length) && ticker.includes('.')) {
        tickerToTry = ticker.replace(/\./g, '-');
        url = `${nasProxyUrl}?ticker=${encodeURIComponent(tickerToTry)}&period1=${startDate}&period2=${endDate}`;
        response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 429) {
            throw new Error('API_RATE_LIMIT: Yahoo Finance API가 일시적으로 차단되었습니다.');
        }

        const retryText = await response.text();
        try {
            data = JSON.parse(retryText);
        } catch {
            throw new Error('API_ERROR: 응답 데이터를 파싱할 수 없습니다.');
        }
    }

    if (!data.chart?.result?.length) {
        throw new Error('티커를 찾을 수 없습니다.');
    }

    const result = data.chart.result[0];

    // 데이터 구조 검증
    if (!result.indicators?.quote?.[0]) {
        throw new Error('데이터 구조가 올바르지 않습니다.');
    }

    const quotes = result.indicators.quote[0];

    if (!quotes.close || !quotes.high || !quotes.low || !quotes.volume) {
        throw new Error('필수 주가 데이터가 누락되었습니다.');
    }

    if (!quotes.close.length) {
        throw new Error('주가 데이터가 비어있습니다.');
    }

    const adjCloseData = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

    // null 값 필터링
    const validIndices: number[] = [];
    for (let i = 0; i < quotes.close.length; i++) {
        if (quotes.close[i] != null && quotes.high[i] != null &&
            quotes.low[i] != null && quotes.volume[i] != null) {
            validIndices.push(i);
        }
    }

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

    // 캐시에 저장
    setCachedData(ticker, stockData);
    return { data: stockData, cached: false };
}

// ============================================================
// 클라이언트 사이드 티커 분석
// ============================================================

export async function analyzeTickerClientSide(
    ticker: string,
    nasProxyUrl: string
): Promise<AnalysisResult> {
    try {
        const { data: stockData, cached } = await fetchStockDataViaNAS(ticker, nasProxyUrl);

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
// 배치 분석 (재시도 로직 포함)
// ============================================================

export async function analyzeTickersClientSide(
    tickers: string[],
    nasProxyUrl: string,
    onProgress?: (current: number, total: number, ticker: string) => void,
    shouldStop?: () => boolean
): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (let i = 0; i < tickers.length; i++) {
        // 중지 확인
        if (shouldStop?.()) {
            break;
        }

        const ticker = tickers[i];
        onProgress?.(i, tickers.length, ticker);

        // 분석 수행 (최대 2회 재시도)
        let result: AnalysisResult | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            result = await analyzeTickerClientSide(ticker, nasProxyUrl);

            // Rate limit 에러가 아니면 반환
            if (!result.error?.includes('API_RATE_LIMIT')) {
                break;
            }

            // Rate limit 시 대기 후 재시도
            if (attempt < 2) {
                await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
            }
        }

        results.push(result!);

        // Rate limit 방지를 위한 딜레이 (클라이언트에서도 필요)
        if (i < tickers.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    return results;
}
