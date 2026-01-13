/**
 * Analysis Configuration Constants
 * Single Source of Truth for analysis-related configuration values
 */

export const ANALYSIS_CONFIG = {
    // Batch processing
    BATCH_SIZE: 3,
    MAX_RETRY_ROUNDS: 3,
    BATCH_DELAY_MS: 5000,

    // Timing
    PAUSE_CHECK_INTERVAL_MS: 500,
    RATE_LIMIT_DELAY_MIN_MS: 100,
    RATE_LIMIT_DELAY_MAX_MS: 300,

    // Technical indicators thresholds
    RSI_OVERSOLD_THRESHOLD: 35,
    MFI_OVERSOLD_THRESHOLD: 35,
    RSI_TRIPLE_SIGNAL_THRESHOLD: 35,
    MFI_TRIPLE_SIGNAL_THRESHOLD: 35,

    // Bollinger Bands
    BB_PERIOD: 20,
    BB_STD_DEV: 1,

    // RSI/MFI calculation
    RSI_PERIOD: 14,
    MFI_PERIOD: 14,
} as const;

export const UI_CONFIG = {
    // Ticker display
    MAX_VISIBLE_TICKERS: 10,

    // Auto-refresh
    MARKET_INDICATORS_REFRESH_INTERVAL_MS: 5 * 60 * 1000, // 5분

    // Progress display
    PROGRESS_MESSAGE_DISPLAY_MS: 3000,
    COMPLETION_MESSAGE_DISPLAY_MS: 2000,
} as const;
