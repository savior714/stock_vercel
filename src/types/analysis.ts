/**
 * Stock Analysis Type Definitions
 * Single Source of Truth for analysis-related types
 */

/**
 * Data structure for technical analysis results
 */
export interface AnalysisResult {
  /** Stock ticker (e.g. AAPL, TSLA) */
  ticker: string;
  /** Whether Triple Signal (RSI < 30 & MFI < 30 & BB Under) occurred */
  alert: boolean;
  /** Relative Strength Index (0-100) */
  rsi?: number;
  /** Money Flow Index (0-100) */
  mfi?: number;
  /** Whether the current close is at or below the lower Bollinger Band */
  bb_touch?: boolean;
  /** Lower Bollinger Band value (typically 1 standard deviation) */
  bb_lower?: number;
  /** Upper Bollinger Band value */
  bb_upper?: number;
  /** Middle Bollinger Band line (20-day moving average) */
  bb_middle?: number;
  /** Current price (real-time or delayed) */
  price?: number;
  /** Error message if analysis fails */
  error?: string;
  /** Whether data is from memory/local cache */
  cached?: boolean;
}

/**
 * Historical price data structure for chart analysis
 */
export interface HistoricalData {
  /** Array of dates (ISO String: YYYY-MM-DD) */
  dates: string[];
  /** Open prices */
  opens: number[];
  /** High prices */
  highs: number[];
  /** Low prices */
  lows: number[];
  /** Close prices */
  closes: number[];
  /** Adjusted close prices (reflecting dividends/splits) */
  adj_closes: number[];
  /** Volume data */
  volumes: number[];
}

/**
 * Raw analysis results from the Tauri Rust backend
 */
export interface TauriAnalysisResult {
  ticker: string;
  currentPrice: number;
  rsi: number;
  mfi: number;
  /** Price position relative to Bollinger Bands */
  bollingerPosition: 'below' | 'above' | 'inside';
  bollingerLower: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  tripleSignal: boolean;
  error?: string;
}

/** Tab categories for analysis results */
export type TabType = 'triple' | 'bb';
/** Data analysis execution mode (Next.js Edge API vs Rust IPC) */
export type AnalysisModeType = 'server' | 'tauri';
