'use client';

/**
 * Market Indicators - CNN Fear & Greed API 기반
 * Fear & Greed Index, VIX, Put/Call Ratio를 CNN API에서 모두 가져옴
 */

import { httpFetch } from './http-client';

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

// VIX rating 계산
function getVixRating(vix: number): string {
    if (vix < 15) return 'Low';
    if (vix < 20) return 'Neutral';
    if (vix < 30) return 'Elevated';
    return 'High';
}

// 시장 지표 조회 (CNN API 통합)
export async function fetchMarketIndicatorsNative(): Promise<MarketIndicators> {
    // 기본값
    let fearGreedScore = 50;
    let fearGreedRating = 'Neutral';
    let fearGreedPrevious = 50;
    let currentVIX = 20;
    let vix50DayAvg = 20;
    let vixRating = 'Neutral';
    let putCallRatio = 0.70;
    let putCallRating = 'Neutral';

    try {
        console.log('📊 Fetching market indicators from CNN API...');
        const response = await httpFetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata');

        if (response.ok) {
            const data = await response.json();

            // 1. Fear & Greed Index
            if (data.fear_and_greed) {
                fearGreedScore = Math.round(data.fear_and_greed.score || 50);
                fearGreedRating = data.fear_and_greed.rating || 'Neutral';
                fearGreedPrevious = Math.round(data.fear_and_greed.previous_close || fearGreedScore);
                console.log('✅ Fear & Greed:', fearGreedScore, fearGreedRating);
            }

            // 2. Put/Call Ratio (5-day average)
            if (data.put_call_options?.data?.length > 0) {
                const pcData = data.put_call_options.data;
                const latestPC = pcData[pcData.length - 1];
                putCallRatio = Math.round(latestPC.y * 100) / 100;
                putCallRating = data.put_call_options.rating || 'Neutral';
                console.log('✅ Put/Call Ratio:', putCallRatio, putCallRating);
            }

            // 3. VIX는 Yahoo Finance에서 직접 가져오기 (CNN API의 market_volatility는 부정확할 수 있음)
            try {
                const endDate = Math.floor(Date.now() / 1000);
                const startDate = endDate - (180 * 24 * 60 * 60); // 180일 전
                const vixUrl = `https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?period1=${startDate}&period2=${endDate}&interval=1d`;
                
                const vixResponse = await httpFetch(vixUrl);

                if (vixResponse.ok) {
                    const vixData = await vixResponse.json();
                    if (vixData.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                        const closes = vixData.chart.result[0].indicators.quote[0].close;
                        const validCloses = closes.filter((v: number | null) => v !== null && v !== undefined);
                        
                        if (validCloses.length > 0) {
                            // 현재 VIX (마지막 유효한 값)
                            currentVIX = Math.round(validCloses[validCloses.length - 1] * 100) / 100;
                            
                            // 50일 평균 계산
                            if (validCloses.length >= 50) {
                                const last50 = validCloses.slice(-50);
                                vix50DayAvg = Math.round((last50.reduce((sum: number, v: number) => sum + v, 0) / 50) * 100) / 100;
                            } else {
                                vix50DayAvg = Math.round((validCloses.reduce((sum: number, v: number) => sum + v, 0) / validCloses.length) * 100) / 100;
                            }
                            
                            vixRating = getVixRating(currentVIX);
                            console.log('✅ VIX (Yahoo Finance):', currentVIX, vixRating);
                        }
                    }
                } else {
                    console.warn('⚠️ Yahoo Finance VIX API failed, using CNN fallback');
                    // CNN fallback
                    if (data.market_volatility?.data?.length > 0) {
                        const vixData = data.market_volatility.data;
                        const latestVix = vixData[vixData.length - 1];
                        currentVIX = Math.round(latestVix.y * 100) / 100;
                        vixRating = data.market_volatility.rating || getVixRating(currentVIX);
                        if (vixData.length >= 50) {
                            const last50 = vixData.slice(-50);
                            vix50DayAvg = Math.round((last50.reduce((sum: number, d: { y: number }) => sum + d.y, 0) / 50) * 100) / 100;
                        } else {
                            vix50DayAvg = currentVIX;
                        }
                    }
                }
            } catch (vixError) {
                console.error('❌ VIX fetch error:', vixError);
                // CNN fallback
                if (data.market_volatility?.data?.length > 0) {
                    const vixData = data.market_volatility.data;
                    const latestVix = vixData[vixData.length - 1];
                    currentVIX = Math.round(latestVix.y * 100) / 100;
                    vixRating = data.market_volatility.rating || getVixRating(currentVIX);
                    if (vixData.length >= 50) {
                        const last50 = vixData.slice(-50);
                        vix50DayAvg = Math.round((last50.reduce((sum: number, d: { y: number }) => sum + d.y, 0) / 50) * 100) / 100;
                    } else {
                        vix50DayAvg = currentVIX;
                    }
                }
            }
        } else {
            console.error('❌ CNN API Response not OK:', response.status);
        }
    } catch (error) {
        console.error('❌ CNN API fetch failed:', error);
    }

    return {
        fearAndGreed: {
            score: fearGreedScore,
            rating: fearGreedRating,
            previousClose: fearGreedPrevious,
        },
        vix: {
            current: currentVIX,
            fiftyDayAvg: vix50DayAvg,
            rating: vixRating,
        },
        putCallRatio: {
            current: putCallRatio,
            rating: putCallRating,
        },
    };
}
