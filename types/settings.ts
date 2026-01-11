export interface AnalysisSettings {
    // RSI Settings
    rsiPeriod: number;
    rsiOversold: number; // 35 or 30
    rsiTripleSignal: number; // usually 30

    // MFI Settings
    mfiPeriod: number;
    mfiOversold: number; // 35 or 30
    mfiTripleSignal: number; // usually 30

    // Bollinger Bands Settings
    bbPeriod: number;
    bbStdDev: number; // usually 2 or 1 (for triple signal)
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
};
