import type { AnalysisResult } from '../types';
import type { AnalysisSettings } from '../types/settings';

/**
 * 클라이언트 사이드 분석 로직 (순수 함수)
 * 서버에서 받은 Raw Data(rsi, mfi, price 등)를 기반으로
 * 사용자가 정의한 설정값에 따라 시그널 발생 여부를 재판단합니다.
 */

export function checkBollingerTouch(
    currentPrice: number,
    lowerBand: number,
    tolerance: number = 0 // 필요 시 오차 범위 추가 가능 (현재는 사용 안 함)
): boolean {
    if (currentPrice === undefined || lowerBand === undefined) return false;
    return currentPrice <= lowerBand;
    // 기존 로직: bollingerPosition === 'below'를 서버가 판단.
    // 여기서는 값을 비교하여 판단.
    // 주의: 서버가 lowerBand 값을 정확히 준다면 비교 가능.
}

export function checkTripleSignal(
    rsi: number,
    mfi: number,
    // 볼린저 밴드는 외부에서 판단한 결과를 넘기거나 값을 넘김
    isBollingerTouch: boolean,
    settings: AnalysisSettings
): boolean {
    if (rsi === undefined || mfi === undefined) return false;

    const rsiCondition = rsi < settings.rsiTripleSignal;
    const mfiCondition = mfi < settings.mfiTripleSignal;

    return rsiCondition && mfiCondition && isBollingerTouch;
}

/**
 * 원본 결과를 설정값에 기반해 업데이트한 새 결과 객체를 반환
 */
export function recalculateResult(
    result: AnalysisResult,
    settings: AnalysisSettings
): AnalysisResult {
    // 만약 API 결과에 원시 데이터가 부족하다면 재계산 불가.
    // 서버가 기본적으로 rsi, mfi, price, bollingerLower 등을 줘야 함.

    // Tauri 모드에서는 bollingerLower를 주는지 확인 필요.
    // types/analysis.ts 정의 상 TauriAnalysisResult는 bollingerLower를 포함함.

    // 하지만 AnalysisResult(공통)에는 bollingerLower가 없습니다! (Step 291 view_file)
    // AnalysisResult: { ticker, alert, rsi?, mfi?, bb_touch?, price?, error? }
    // bollingerLower 값이 없으면 재계산이 불가능합니다.

    // 해결책:
    // 1. AnalysisResult 타입에 bollingerLower, bollingerUpper 등을 추가.
    // 2. 아니면 재계산 가능한 범위(RSI/MFI 임계값 체크)만 수행하고, BB Touch는 서버 판단 신뢰.

    // 여기서는 RSI/MFI 임계값 변경만 반영하는 것으로 타협하거나 타입을 확장해야 합니다.
    // 설정을 바꾸는 목적이 '민감도 조절'이라면 RSI < 30 대신 RSI < 35로 바꾸고 싶을 수 있습니다.
    // BB는 StdDev를 바꾸려면 Band 값 자체가 바뀌어야 하므로 서버 재계산 필요.
    // -> BB 설정은 서버 API 파라미터로 넘겨야 정확함. client logic으로는 한계가 있음.

    // 결론: Client Logic에서는 '이미 계산된 지표값'을 가지고 '판단 기준'만 바꿀 수 있음.
    // 따라서 BB StdDev 설정 변경은 API Parameter 전달 없이는 불가능함.
    // 하지만 RSI/MFI Signal Threshold 변경은 가능.

    // BB StdDev 변경은 '차후 서버 파라미터 지원 시' 가능으로 미두고,
    // 현재는 RSI/MFI 기준 변경만 적용.

    // 하지만 사용자가 BB StdDev 설정을 바꿨는데 적용 안 되면 혼란스러움.
    // -> 설정 UI에서 안내 멘트 필요 ("서버 재계산 필요한 항목은 API 지원 시 적용됩니다" 등)
    // 혹은, BB StdDev는 설정에서 빼거나 비활성화.

    // 일단 RSI/MFI Alert 기준 재계산 로직만 구현.

    const rsi = result.rsi ?? 0;
    const mfi = result.mfi ?? 0;

    // BB Touch 여부는 서버 값 신뢰 (Bollinger 값을 모르므로)
    const isBbTouch = result.bb_touch ?? false;

    const isTripleSignal = checkTripleSignal(rsi, mfi, isBbTouch, settings);

    return {
        ...result,
        alert: isTripleSignal
    };
}
