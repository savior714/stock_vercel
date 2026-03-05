/**
 * Market Indicators Type Definitions
 * Single Source of Truth for market indicator types
 */

/**
 * Market Indicator Rating Definitions
 * - Fear & Greed: Extreme Fear, Fear, Neutral, Greed, Extreme Greed
 * - VIX/PutCall: Low, Neutral, Elevated, High, Extreme
 */
export type IndicatorRating =
    | 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
    | 'Low' | 'Elevated' | 'High' | 'Extreme';

/**
 * Global Market Sentiment and Fear Index Indicators
 */
export interface MarketIndicators {
    /** CNN Fear & Greed Index: Market sentiment between 0 and 100 */
    fearAndGreed: {
        /** Current score (0: Extreme Fear, 100: Extreme Greed) */
        score: number;
        /** Market rating based on score */
        rating: IndicatorRating;
        /** Previous close score */
        previousClose: number;
    };
    /** VIX (CBOE Volatility Index): Market volatility index */
    vix: {
        /** Current VIX value (Volatility increases above 20) */
        current: number;
        /** 50-day moving average */
        fiftyDayAvg: number;
        /** Volatility level rating */
        rating: IndicatorRating;
    };
    /** Put/Call Ratio: Ratio of bearish vs bullish bets */
    putCallRatio: {
        /** Current ratio (Pessimism dominates above 1.0) */
        current: number;
        /** Sentiment rating based on ratio */
        rating: IndicatorRating;
    };
}
