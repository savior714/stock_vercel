/**
 * 기술적 분석을 위한 매개변수 설정
 */
export interface AnalysisSettings {
    // --- RSI Settings ---
    /** RSI 계산 기간 (표준: 14일) */
    rsiPeriod: number;
    /** 일반적인 과매도 기준선 (보통 30~35) */
    rsiOversold: number;
    /** 트리플 시그널 발생을 위한 임계값 (과매도보다 엄격해야 함, 예: 30) */
    rsiTripleSignal: number;

    // --- MFI Settings ---
    /** MFI 계산 기간 (표준: 14일) */
    mfiPeriod: number;
    /** 일반적인 과매도 기준선 (보통 20~30) */
    mfiOversold: number;
    /** 트리플 시그널 발생을 위한 임계값 (예: 25) */
    mfiTripleSignal: number;

    // --- Bollinger Bands Settings ---
    /** 볼린저 밴드 계산 기간 (표준: 20일) */
    bbPeriod: number;
    /** 볼린저 밴드 너비(표준편차배수). 트리플 시그널용으로는 1.0을 권장 */

    bbStdDev: number;

    // --- UI Settings ---
    /** 오버레이 모드 투명도 (0.1 ~ 1.0) */
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
