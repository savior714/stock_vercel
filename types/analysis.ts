/**
 * Stock Analysis Type Definitions
 * Single Source of Truth for analysis-related types
 */

export interface AnalysisResult {
  ticker: string;
  alert: boolean;
  rsi?: number;
  mfi?: number;
  bb_touch?: boolean;
  bb_lower?: number;
  bb_upper?: number;
  bb_middle?: number;
  price?: number;
  error?: string;
  cached?: boolean;
}

export interface HistoricalData {
  dates: string[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  adj_closes: number[];
  volumes: number[];
}

export interface TauriAnalysisResult {
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

export type TabType = 'triple' | 'bb';
export type AnalysisModeType = 'server' | 'tauri';
