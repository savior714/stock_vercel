import React from 'react';
import type { MarketIndicators as MarketIndicatorsType } from '@/types';

interface MarketIndicatorsProps {
    data: MarketIndicatorsType | null;
}

export function MarketIndicators({ data }: MarketIndicatorsProps) {
    if (!data) return null;

    const getFearGreedColor = (rating: string) => {
        const r = rating.toLowerCase();
        if (r.includes('extreme fear')) return 'text-[#eb3b5a]';
        if (r.includes('fear')) return 'text-[#fa8231]';
        if (r.includes('neutral')) return 'text-[#f7b731]';
        if (r.includes('extreme greed')) return 'text-[#0fb9b1]';
        if (r.includes('greed')) return 'text-[#20bf6b]';
        return 'text-gray-800';
    };

    const getVixColor = (rating: string) => {
        const r = rating.toLowerCase();
        if (r.includes('high')) return 'text-[#eb3b5a]';
        if (r.includes('elevated')) return 'text-[#fa8231]';
        return 'text-[#f7b731]';
    };

    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
            <div className="glass p-5 rounded-xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="text-[0.75rem] text-text-sub uppercase tracking-widest mb-1 font-bold">Fear & Greed Index</div>
                <div className={`text-4xl font-extrabold my-2 bg-gradient-to-br from-text-main to-gray-600 bg-clip-text text-transparent break-words ${getFearGreedColor(data.fearAndGreed.rating)}`}>
                    {data.fearAndGreed.score}
                </div>
                <div className="text-[0.9rem] text-text-sub font-medium">{data.fearAndGreed.rating}</div>
            </div>
            <div className="glass p-5 rounded-xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="text-[0.75rem] text-text-sub uppercase tracking-widest mb-1 font-bold">VIX</div>
                <div className={`text-4xl font-extrabold my-2 bg-gradient-to-br from-text-main to-gray-600 bg-clip-text text-transparent break-words ${getVixColor(data.vix.rating)}`}>
                    {data.vix.current}
                </div>
                <div className="text-[0.9rem] text-text-sub font-medium">
                    50-day avg: {data.vix.fiftyDayAvg}
                </div>
            </div>
            <div className="glass p-5 rounded-xl text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="text-[0.75rem] text-text-sub uppercase tracking-widest mb-1 font-bold">Put/Call Ratio</div>
                <div className={`text-4xl font-extrabold my-2 bg-gradient-to-br from-text-main to-gray-600 bg-clip-text text-transparent break-words ${getFearGreedColor(data.putCallRatio.rating)}`}>
                    {data.putCallRatio.current.toFixed(2)}
                </div>
                <div className="text-[0.9rem] text-text-sub font-medium">{data.putCallRatio.rating}</div>
            </div>
        </div>
    );
}
