/**
 * Market Indicators Type Definitions
 * Single Source of Truth for market indicator types
 */

export interface MarketIndicators {
    fearAndGreed: {
        score: number;
        rating: string;
        previousClose: number;
    };
    vix: {
        current: number;
        fiftyDayAvg: number;
        rating: string;
    };
    putCallRatio: {
        current: number;
        rating: string;
    };
}
