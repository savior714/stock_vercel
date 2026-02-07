/**
 * Stock Analysis Type Definitions
 * Single Source of Truth for analysis-related types
 */

/**
 * 기술적 분석 결과 데이터 구조
 */
export interface AnalysisResult {
  /** 종목 티커 (예: AAPL, TSLA) */
  ticker: string;
  /** 트리플 시그널(RSI < 30 & MFI < 30 & BB Under) 발생 여부 */
  alert: boolean;
  /** 상대강도지수 (Relative Strength Index, 유효 범위: 0-100) */
  rsi?: number;
  /** 자금흐름지수 (Money Flow Index, 유효 범위: 0-100) */
  mfi?: number;
  /** 현재 종가가 볼린저 밴드 하단 이하인지 여부 */
  bb_touch?: boolean;
  /** 볼린저 밴드 하단값 (보통 1표준편차) */
  bb_lower?: number;
  /** 볼린저 밴드 상단값 */
  bb_upper?: number;
  /** 볼린저 밴드 중심선 (20일 이동평균선) */
  bb_middle?: number;
  /** 현재가 (실시간 또는 지연 가격) */
  price?: number;
  /** 분석 실패 시 에러 메시지 */
  error?: string;
  /** 메모리/로컬 캐시 데이터 사용 여부 */
  cached?: boolean;
}

/**
 * 차트 분석을 위한 역사적 가격 데이터 구조
 */
export interface HistoricalData {
  /** 날짜 배열 (ISO String: YYYY-MM-DD) */
  dates: string[];
  /** 시가 배열 */
  opens: number[];
  /** 고가 배열 */
  highs: number[];
  /** 저가 배열 */
  lows: number[];
  /** 종가 배열 */
  closes: number[];
  /** 수정 종가 배열 (배당/분할 반영) */
  adj_closes: number[];
  /** 거래량 배열 */
  volumes: number[];
}

/**
 * Tauri Rust 백엔드로부터 전달받는 원본 분석 결과
 */
export interface TauriAnalysisResult {
  ticker: string;
  currentPrice: number;
  rsi: number;
  mfi: number;
  /** 볼린저 밴드 대비 현재가 위치 상황 */
  bollingerPosition: 'below' | 'above' | 'inside';
  bollingerLower: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  tripleSignal: boolean;
  error?: string;
}

/** 분석 결과 탭 분류 */
export type TabType = 'triple' | 'bb';
/** 데이터 분석 실행 모드 (Next.js Edge API vs Rust IPC) */
export type AnalysisModeType = 'server' | 'tauri';
