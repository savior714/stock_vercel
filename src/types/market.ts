/**
 * Market Indicators Type Definitions
 * Single Source of Truth for market indicator types
 */

/**
 * 시장 지표 등급 정의
 * - Fear & Greed: Extreme Fear, Fear, Neutral, Greed, Extreme Greed
 * - VIX/PutCall: Low, Neutral, Elevated, High, Extreme
 */
export type IndicatorRating =
    | 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
    | 'Low' | 'Elevated' | 'High' | 'Extreme';

/**
 * 글로벌 시장 심리 및 공포 지수 지표
 */
export interface MarketIndicators {
    /** CNN Fear & Greed Index: 0~100 사이의 시장 심리 */
    fearAndGreed: {
        /** 현재 점수 (0: 극단적 공포, 100: 극단적 탐욕) */
        score: number;
        /** 점수에 따른 시장 등급 */
        rating: IndicatorRating;
        /** 전일 종가 기준 점수 */
        previousClose: number;
    };
    /** VIX (CBOE Volatility Index): 시장 변동성 지수 */
    vix: {
        /** 현재 VIX 지수 값 (보통 20 이상이면 변동성 확대) */
        current: number;
        /** 최근 50일 이동평균값 */
        fiftyDayAvg: number;
        /** 변동성 수준 등급 */
        rating: IndicatorRating;
    };
    /** Put/Call Ratio: 시장의 하락 베팅 대비 상승 베팅 비율 */
    putCallRatio: {
        /** 현재 비율 (1.0 이상이면 비관론 우세) */
        current: number;
        /** 비율에 따른 투자 심리 등급 */
        rating: IndicatorRating;
    };
}
