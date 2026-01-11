import React from 'react';
import type { MarketIndicators as MarketIndicatorsType } from '../types';

interface MarketIndicatorsProps {
    data: MarketIndicatorsType | null;
}

export function MarketIndicators({ data }: MarketIndicatorsProps) {
    if (!data) return null;

    return (
        <div className="market-indicators">
            <div className="indicator">
                <div className="indicator-label">Fear & Greed Index</div>
                <div className={`indicator-value fear-greed-${data.fearAndGreed.rating.toLowerCase().replace(' ', '-')}`}>
                    {data.fearAndGreed.score}
                </div>
                <div className="indicator-rating">{data.fearAndGreed.rating}</div>
            </div>
            <div className="indicator">
                <div className="indicator-label">VIX</div>
                <div className={`indicator-value vix-${data.vix.rating.toLowerCase()}`}>
                    {data.vix.current}
                </div>
                <div className="indicator-rating">
                    50-day avg: {data.vix.fiftyDayAvg}
                </div>
            </div>
            <div className="indicator">
                <div className="indicator-label">Put/Call Ratio</div>
                <div className={`indicator-value putcall-${data.putCallRatio.rating.toLowerCase().replace(' ', '-')}`}>
                    {data.putCallRatio.current.toFixed(2)}
                </div>
                <div className="indicator-rating">{data.putCallRatio.rating}</div>
            </div>
        </div>
    );
}
