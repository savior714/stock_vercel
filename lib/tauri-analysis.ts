/**
 * Tauri 앱에서 Rust 백엔드를 통해 주가 분석하는 유틸리티
 * CORS 제약 없이 Yahoo Finance API 직접 호출 가능
 */

// Tauri 환경에서만 invoke 사용 가능
const isTauri = typeof window !== 'undefined' && (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window
);

// 히스토리컬 데이터 타입
export interface HistoricalData {
    dates: string[];
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    adj_closes: number[];
    volumes: number[];
}

// 분석 결과 타입
export interface AnalysisResult {
    ticker: string;
    currentPrice: number;
    rsi: number;
    mfi: number;
    bollingerPosition: 'below' | 'above' | 'inside';
    bollingerLower: number;
    bollingerUpper: number;
    bollingerMiddle: number;
    tripleSignal: boolean;
    error?: string;
}

// RSI 계산
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

// MFI 계산
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

// 볼린저 밴드 계산
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

// 주가 데이터 가져오기 (Tauri 환경)
export async function fetchStockDataTauri(ticker: string): Promise<HistoricalData> {
    if (!isTauri) {
        throw new Error('Tauri 환경에서만 사용 가능합니다.');
    }

    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<HistoricalData>('fetch_stock_data', { ticker });
}

// 여러 티커 데이터 가져오기
export async function fetchMultipleStocksTauri(tickers: string[]): Promise<HistoricalData[]> {
    if (!isTauri) {
        throw new Error('Tauri 환경에서만 사용 가능합니다.');
    }

    const { invoke } = await import('@tauri-apps/api/core');
    const results = await invoke<Array<{ Ok?: HistoricalData; Err?: string }>>('fetch_multiple_stocks', { tickers });

    return results.map((r, i) => {
        if (r.Err) {
            console.error(`Error fetching ${tickers[i]}: ${r.Err}`);
            return { dates: [], opens: [], highs: [], lows: [], closes: [], adj_closes: [], volumes: [] };
        }
        return r.Ok!;
    });
}

// 단일 티커 분석
export async function analyzeTicker(ticker: string): Promise<AnalysisResult> {
    try {
        const data = await fetchStockDataTauri(ticker);

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
                error: '데이터를 가져올 수 없습니다.',
            };
        }

        const currentPrice = data.adj_closes[data.adj_closes.length - 1];
        const rsi = calculateRSI(data.adj_closes);
        const mfi = calculateMFI(data.highs, data.lows, data.closes, data.volumes);
        const bb = calculateBollingerBands(data.adj_closes);

        let bollingerPosition: 'below' | 'above' | 'inside' = 'inside';
        if (currentPrice <= bb.lower) bollingerPosition = 'below';
        else if (currentPrice >= bb.upper) bollingerPosition = 'above';

        const tripleSignal = rsi < 35 && mfi < 35 && bollingerPosition === 'below';

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
            error: error instanceof Error ? error.message : '알 수 없는 오류',
        };
    }
}

// 여러 티커 분석 (진행률 콜백 지원)
export async function analyzeMultipleTickers(
    tickers: string[],
    onProgress?: (current: number, total: number) => void
): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (let i = 0; i < tickers.length; i++) {
        const result = await analyzeTicker(tickers[i]);
        results.push(result);
        onProgress?.(i + 1, tickers.length);

        // Rate limiting
        if (i < tickers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
}

// Tauri 환경 체크
export function isTauriEnvironment(): boolean {
    return isTauri;
}
