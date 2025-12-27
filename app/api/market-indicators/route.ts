import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (60 * 24 * 60 * 60); // 60 days ago

        // Fetch CNN Fear & Greed Index
        let fearGreedScore = 50;
        let fearGreedRating = 'Neutral';
        let fearGreedPrevious = 50;

        try {
            const fgResponse = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (fgResponse.ok) {
                const fgData = await fgResponse.json();
                fearGreedScore = fgData.fear_and_greed.score;
                fearGreedRating = fgData.fear_and_greed.rating;
                fearGreedPrevious = fgData.fear_and_greed.previous_close || fearGreedScore;
            }
        } catch (error) {
            console.error('Failed to fetch Fear & Greed Index:', error);
        }

        // Fetch VIX data
        const vixUrl = `https://query1.finance.yahoo.com/v8/finance/chart/^VIX?period1=${startDate}&period2=${endDate}&interval=1d`;
        const vixResponse = await fetch(vixUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const vixData = await vixResponse.json();

        const vixQuotes = vixData.chart.result[0].indicators.quote[0];
        const vixClose = vixQuotes.close.filter((c: number | null) => c !== null);
        const currentVIX = vixClose[vixClose.length - 1];
        const vix50DayAvg = vixClose.slice(-50).reduce((a: number, b: number) => a + b, 0) / Math.min(50, vixClose.length);

        // Determine VIX rating
        let vixRating = 'Neutral';
        if (currentVIX < 15) {
            vixRating = 'Low';
        } else if (currentVIX < 20) {
            vixRating = 'Neutral';
        } else if (currentVIX < 30) {
            vixRating = 'Elevated';
        } else {
            vixRating = 'High';
        }

        // Fetch Put/Call Ratio (CBOE data via Yahoo Finance)
        // Using ^CPCE (CBOE Equity Put/Call Ratio)
        let putCallRatio = 0.70;
        let putCallRating = 'Neutral';

        try {
            const pcUrl = `https://query1.finance.yahoo.com/v8/finance/chart/^CPCE?period1=${startDate}&period2=${endDate}&interval=1d`;
            const pcResponse = await fetch(pcUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (pcResponse.ok) {
                const pcData = await pcResponse.json();
                const pcQuotes = pcData.chart.result[0].indicators.quote[0];
                const pcClose = pcQuotes.close.filter((c: number | null) => c !== null);
                putCallRatio = pcClose[pcClose.length - 1];

                // Determine Put/Call rating
                if (putCallRatio > 1.0) {
                    putCallRating = 'Extreme Fear';
                } else if (putCallRatio > 0.8) {
                    putCallRating = 'Fear';
                } else {
                    putCallRating = 'Neutral';
                }
            }
        } catch (error) {
            console.error('Failed to fetch Put/Call Ratio:', error);
        }

        return NextResponse.json({
            fearAndGreed: {
                score: fearGreedScore,
                rating: fearGreedRating,
                previousClose: fearGreedPrevious,
            },
            vix: {
                current: Math.round(currentVIX * 100) / 100,
                fiftyDayAvg: Math.round(vix50DayAvg * 100) / 100,
                rating: vixRating
            },
            putCallRatio: {
                current: Math.round(putCallRatio * 100) / 100,
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
