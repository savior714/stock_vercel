import { httpFetch } from '../http-client';
import type { MarketIndicators } from '../../types';

/**
 * Client-side implementation of Market Indicators API
 * Uses httpFetch to bypass CORS in Capacitor/Tauri
 */
export async function fetchMarketIndicatorsClient(): Promise<MarketIndicators> {
    try {
        console.log('📊 [Client] Fetching market indicators from CNN API using httpFetch...');

        // 1. Fear & Greed Index from CNN
        // Note: Using httpFetch to bypass CORS
        const response = await httpFetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // 기본값 설정
        let fearGreedScore = 50;
        let fearGreedRating = 'Neutral';
        let fearGreedPrevious = 50;
        let putCallRatio = 0.70;
        let putCallRating = 'Neutral';
        let currentVIX = 20;
        let vix50DayAvg = 20;
        let vixRating = 'Neutral';

        if (response.ok) {
            const data = await response.json();

            // 1. Fear & Greed Index
            if (data.fear_and_greed) {
                fearGreedScore = Math.round(data.fear_and_greed.score || 50);
                fearGreedRating = data.fear_and_greed.rating || 'Neutral';
                fearGreedPrevious = Math.round(data.fear_and_greed.previous_close || fearGreedScore);
            }

            // 2. Put/Call Ratio
            if (data.put_call_options?.data?.length > 0) {
                const pcData = data.put_call_options.data;
                const latestPC = pcData[pcData.length - 1];
                putCallRatio = Math.round(latestPC.y * 100) / 100;
                putCallRating = data.put_call_options.rating || 'Neutral';
            }

            // Fallback VIX from CNN if Yahoo fails later
            if (data.market_volatility?.data?.length > 0) {
                const vixData = data.market_volatility.data;
                const latestVix = vixData[vixData.length - 1];
                currentVIX = Math.round(latestVix.y * 100) / 100;
                vixRating = data.market_volatility.rating || 'Neutral';
                vix50DayAvg = currentVIX; // Placeholder
            }
        }

        // 3. VIX from Yahoo Finance (Direct fetch)
        try {
            const endDate = Math.floor(Date.now() / 1000);
            const startDate = endDate - (180 * 24 * 60 * 60);
            const vixUrl = `https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?period1=${startDate}&period2=${endDate}&interval=1d`;

            const vixResponse = await httpFetch(vixUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (vixResponse.ok) {
                const vixData = await vixResponse.json();
                const quotes = vixData.chart?.result?.[0]?.indicators?.quote?.[0];

                if (quotes?.close) {
                    const validCloses = quotes.close.filter((v: number | null) => v !== null && v !== undefined);

                    if (validCloses.length > 0) {
                        currentVIX = Math.round(validCloses[validCloses.length - 1] * 100) / 100;

                        if (validCloses.length >= 50) {
                            const last50 = validCloses.slice(-50);
                            vix50DayAvg = Math.round((last50.reduce((sum: number, v: number) => sum + v, 0) / 50) * 100) / 100;
                        } else {
                            vix50DayAvg = currentVIX;
                        }

                        if (currentVIX < 15) vixRating = 'Low';
                        else if (currentVIX < 20) vixRating = 'Neutral';
                        else if (currentVIX < 30) vixRating = 'Elevated';
                        else vixRating = 'High';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch VIX from Yahoo, using CNN fallback:', error);
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
                rating: vixRating
            },
            putCallRatio: {
                current: putCallRatio,
                rating: putCallRating
            }
        };

    } catch (error) {
        console.error('Error in client-side market indicators:', error);
        throw error;
    }
}
