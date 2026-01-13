import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 기본값
        let fearGreedScore = 50;
        let fearGreedRating = 'Neutral';
        let fearGreedPrevious = 50;
        let currentVIX = 20;
        let vix50DayAvg = 20;
        let vixRating = 'Neutral';
        let putCallRatio = 0.70;
        let putCallRating = 'Neutral';

        // CNN Fear & Greed API에서 모든 지표 가져오기
        console.log('📊 [Server] Fetching market indicators from CNN API...');
        const response = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // 1. Fear & Greed Index
            if (data.fear_and_greed) {
                fearGreedScore = Math.round(data.fear_and_greed.score || 50);
                fearGreedRating = data.fear_and_greed.rating || 'Neutral';
                fearGreedPrevious = Math.round(data.fear_and_greed.previous_close || fearGreedScore);
                console.log('✅ [Server] Fear & Greed:', fearGreedScore, fearGreedRating);
            }

            // 2. Put/Call Ratio (5-day average)
            if (data.put_call_options?.data?.length > 0) {
                const pcData = data.put_call_options.data;
                const latestPC = pcData[pcData.length - 1];
                putCallRatio = Math.round(latestPC.y * 100) / 100;
                putCallRating = data.put_call_options.rating || 'Neutral';
                console.log('✅ [Server] Put/Call Ratio:', putCallRatio, putCallRating);
            }

            // 3. VIX는 Yahoo Finance에서 직접 가져오기 (CNN API의 market_volatility는 부정확할 수 있음)
            try {
                const endDate = Math.floor(Date.now() / 1000);
                const startDate = endDate - (180 * 24 * 60 * 60); // 180일 전
                const vixUrl = `https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?period1=${startDate}&period2=${endDate}&interval=1d`;

                const vixResponse = await fetch(vixUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

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

                            // VIX rating 계산
                            if (currentVIX < 15) vixRating = 'Low';
                            else if (currentVIX < 20) vixRating = 'Neutral';
                            else if (currentVIX < 30) vixRating = 'Elevated';
                            else vixRating = 'High';

                            console.log('✅ [Server] VIX (Yahoo Finance):', currentVIX, vixRating);
                        }
                    }
                } else {
                    console.warn('⚠️ [Server] Yahoo Finance VIX API failed, using CNN fallback');
                    // CNN fallback
                    if (data.market_volatility?.data?.length > 0) {
                        const vixData = data.market_volatility.data;
                        const latestVix = vixData[vixData.length - 1];
                        currentVIX = Math.round(latestVix.y * 100) / 100;
                        vixRating = data.market_volatility.rating || 'Neutral';
                        if (vixData.length >= 50) {
                            const last50 = vixData.slice(-50);
                            vix50DayAvg = Math.round((last50.reduce((sum: number, d: { y: number }) => sum + d.y, 0) / 50) * 100) / 100;
                        } else {
                            vix50DayAvg = currentVIX;
                        }
                    }
                }
            } catch (vixError) {
                console.error('❌ [Server] VIX fetch error:', vixError);
                // CNN fallback
                if (data.market_volatility?.data?.length > 0) {
                    const vixData = data.market_volatility.data;
                    const latestVix = vixData[vixData.length - 1];
                    currentVIX = Math.round(latestVix.y * 100) / 100;
                    vixRating = data.market_volatility.rating || 'Neutral';
                    if (vixData.length >= 50) {
                        const last50 = vixData.slice(-50);
                        vix50DayAvg = Math.round((last50.reduce((sum: number, d: { y: number }) => sum + d.y, 0) / 50) * 100) / 100;
                    } else {
                        vix50DayAvg = currentVIX;
                    }
                }
            }
        } else {
            console.error('❌ [Server] CNN API Response not OK:', response.status);
        }

        return NextResponse.json({
            fearAndGreed: {
                score: fearGreedScore,
                rating: fearGreedRating,
                previousClose: fearGreedPrevious,
            },
            vix: {
                current: currentVIX,
                fiftyDayAvg: vix50DayAvg,
                rating: vixRating
            },
            putCallRatio: {
                current: putCallRatio,
                rating: putCallRating
            }
        });
    } catch (error) {
        console.error('Error fetching market indicators:', error);
        return NextResponse.json(
            { error: 'Failed to fetch market indicators' },
            { status: 500 }
        );
    }
}
