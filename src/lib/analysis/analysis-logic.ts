import type { AnalysisResult } from '@/types';
import type { AnalysisSettings } from '@/types/settings';

/**
 * Client-side analysis logic (Pure function)
 * Based on Raw Data (rsi, mfi, price, etc.) received from the server,
 * re-determines signal occurrence according to user-defined settings.
 */

export function checkBollingerTouch(
    currentPrice: number,
    lowerBand: number
): boolean {
    if (currentPrice === undefined || lowerBand === undefined) return false;
    return currentPrice <= lowerBand;
}

export function checkTripleSignal(
    rsi: number,
    mfi: number,
    isBollingerTouch: boolean,
    settings: AnalysisSettings
): boolean {
    if (rsi === undefined || mfi === undefined) return false;

    const rsiCondition = rsi < settings.rsiTripleSignal;
    const mfiCondition = mfi < settings.mfiTripleSignal;

    return rsiCondition && mfiCondition && isBollingerTouch;
}

/**
 * Returns a updated result object based on current settings.
 */
export function recalculateResult(
    result: AnalysisResult,
    settings: AnalysisSettings
): AnalysisResult {
    // Current limitation:
    // 1. RSI/MFI threshold changes can be applied client-side.
    // 2. BB StdDev changes require server-side recalculation as band values change.

    // For now, we only recalculate the RSI/MFI alert status.
    // BB Touch status relies on the value provided by the server.

    const rsi = result.rsi ?? 0;
    const mfi = result.mfi ?? 0;

    // Trust existing BB Touch status if Bollinger values are not available
    const isBbTouch = result.bb_touch ?? false;

    const isTripleSignal = checkTripleSignal(rsi, mfi, isBbTouch, settings);

    return {
        ...result,
        alert: isTripleSignal
    };
}
