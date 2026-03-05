/**
 * Configuration parameters for technical analysis.
 */
export interface AnalysisSettings {
    // --- RSI Settings ---
    /** RSI calculation period (Standard: 14 days) */
    rsiPeriod: number;
    /** General oversold baseline (Typical: 30~35) */
    rsiOversold: number;
    /** Threshold for triple signal (Should be stricter than oversold, e.g., 30) */
    rsiTripleSignal: number;

    // --- MFI Settings ---
    /** MFI calculation period (Standard: 14 days) */
    mfiPeriod: number;
    /** General oversold baseline (Typical: 20~30) */
    mfiOversold: number;
    /** Threshold for triple signal (e.g., 25) */
    mfiTripleSignal: number;

    // --- Bollinger Bands Settings ---
    /** Bollinger Bands calculation period (Standard: 20 days) */
    bbPeriod: number;
    /** BB standard deviation multiplier. 1.0 recommended for Triple Signal. */
    bbStdDev: number;

    // --- UI Settings ---
    /** Overlay mode opacity (0.1 ~ 1.0) */
    opacity: number;
}

export const DEFAULT_SETTINGS: AnalysisSettings = {
    rsiPeriod: 14,
    rsiOversold: 35,
    rsiTripleSignal: 30,

    mfiPeriod: 14,
    mfiOversold: 35,
    mfiTripleSignal: 30,

    bbPeriod: 20,

    bbStdDev: 1,

    opacity: 0.15,
};
