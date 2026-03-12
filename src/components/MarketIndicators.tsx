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

const translateRating = (rating: string): string => {
    const r = rating.toLowerCase();
    if (r === 'extreme fear') return '극도의 공포';
    if (r === 'fear') return '공포';
    if (r === 'neutral') return '중립';
    if (r === 'greed') return '탐욕';
    if (r === 'extreme greed') return '극도의 탐욕';
    if (r === 'low') return '낮음';
    if (r === 'elevated') return '높음';
    if (r === 'high') return '매우 높음';
    if (r === 'extreme') return '극심';
    return rating;
};

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
                label="공포와 탐욕 지수"
                value={data.fearAndGreed.score}
                rating={translateRating(data.fearAndGreed.rating)}
                statusClass={getStatusClass(data.fearAndGreed.rating)}
                description="CNN Business에서 제공하는 시장 심리 지수입니다. 0(극도의 공포)에서 100(극도의 탐욕) 사이의 범위를 가집니다."
            />

            <IndicatorCard
                label="변동성 지수 (VIX)"
                value={data.vix.current}
                rating={`50일 평균: ${data.vix.fiftyDayAvg}`}
                statusClass={getVixStatusClass(data.vix.rating)}
                description="S&P 500 지수 옵션을 바탕으로 한 향후 30일간의 시장 변동성 기대치입니다. '공포 지수'라고도 합니다."
            />

            <IndicatorCard
                label="풋/콜 비율"
                value={data.putCallRatio.current.toFixed(2)}
                rating={translateRating(data.putCallRatio.rating)}
                statusClass={getStatusClass(data.putCallRatio.rating)}
                description="풋 옵션 거래량을 콜 옵션 거래량으로 나눈 비율입니다. 비율이 높을수록 시장에 공포가 만연함을 나타냅니다."
            />
        </div>
    );
}
