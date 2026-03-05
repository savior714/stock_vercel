import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from '@ark-ui/react';
import type { MarketIndicators as MarketIndicatorsType } from '@/types/market';
import '../styles/components/MarketIndicators.css';
import '../styles/components/Tooltip.css';

interface MarketIndicatorsProps {
    data: MarketIndicatorsType | null;
}

interface IndicatorCardProps {
    label: string;
    value: string | number;
    rating: string;
    statusClass: string;
    description: string;
}

const IndicatorCard = ({ label, value, rating, statusClass, description }: IndicatorCardProps) => (
    <div className="indicator-card">
        <div className="indicator-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {label}
            <Tooltip.Root openDelay={100} closeDelay={100}>
                <Tooltip.Trigger asChild>
                    <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'help', display: 'flex' }}>
                        <Info size={12} />
                    </button>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                    <Tooltip.Content className="tooltip-content">
                        <Tooltip.Arrow><div className="tooltip-arrow" /></Tooltip.Arrow>
                        {description}
                    </Tooltip.Content>
                </Tooltip.Positioner>
            </Tooltip.Root>
        </div>
        <div className={`indicator-value ${statusClass}`}>
            {value}
        </div>
        <div className="indicator-rating">{rating}</div>
    </div>
);

export function MarketIndicators({ data }: MarketIndicatorsProps) {
    if (!data) return null;

    const getStatusClass = (rating: string) => {
        const r = rating.toLowerCase();
        if (r.includes('extreme fear')) return 'market-extreme-fear';
        if (r.includes('fear')) return 'market-fear';
        if (r.includes('neutral')) return 'market-neutral';
        if (r.includes('extreme greed')) return 'market-extreme-greed';
        if (r.includes('greed')) return 'market-greed';
        return '';
    };

    const getVixStatusClass = (rating: string) => {
        const r = rating.toLowerCase();
        if (r.includes('high')) return 'market-extreme-fear';
        if (r.includes('elevated')) return 'market-fear';
        return 'market-neutral';
    };

    return (
        <div className="market-indicators-root">
            <IndicatorCard
                label="Fear & Greed Index"
                value={data.fearAndGreed.score}
                rating={data.fearAndGreed.rating}
                statusClass={getStatusClass(data.fearAndGreed.rating)}
                description="CNN Business에서 제공하는 시장 심리 지수입니다. 0(극도의 공포)에서 100(극도의 탐욕) 사이의 값을 가집니다."
            />

            <IndicatorCard
                label="Volatility Index (VIX)"
                value={data.vix.current}
                rating={`50-day: ${data.vix.fiftyDayAvg}`}
                statusClass={getVixStatusClass(data.vix.rating)}
                description="S&P 500 지수 옵션의 향후 30일간 변동성에 대한 시장의 기대를 나타내는 지수입니다. '공포 지수'라고도 불립니다."
            />

            <IndicatorCard
                label="Put/Call Ratio"
                value={data.putCallRatio.current.toFixed(2)}
                rating={data.putCallRatio.rating}
                statusClass={getStatusClass(data.putCallRatio.rating)}
                description="풋 옵션 거래량을 콜 옵션 거래량으로 나눈 수치입니다. 이 비율이 높을수록 시장에 공포가 팽배함을 의미합니다."
            />
        </div>
    );
}
