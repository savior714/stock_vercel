import { NextRequest, NextResponse } from 'next/server';

// Finnhub API 연결 테스트 엔드포인트
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ticker = searchParams.get('ticker') || 'AAPL'; // 기본값 AAPL
        
        const apiKey = process.env.FINNHUB_API_KEY;
        
        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'FINNHUB_API_KEY가 환경 변수에 설정되지 않았습니다.',
                apiKeyExists: false
            }, { status: 500 });
        }
        
        // API 키 정보 (보안을 위해 일부만 표시)
        const apiKeyInfo = {
            exists: true,
            length: apiKey.length,
            prefix: apiKey.substring(0, 4),
            suffix: apiKey.substring(apiKey.length - 4)
        };
        
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (30 * 24 * 60 * 60); // 30일 전
        
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&from=${startDate}&to=${endDate}&token=${apiKey}`;
        
        console.log(`[Finnhub Test] Testing ticker: ${ticker}`);
        console.log(`[Finnhub Test] API Key exists: ${!!apiKey}, length: ${apiKey.length}`);
        
        const response = await fetch(url);
        const responseText = await response.text();
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = { raw: responseText };
        }
        
        const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            ticker: ticker,
            apiKeyInfo: apiKeyInfo,
            url: url.replace(apiKey, '***'),
            response: {
                headers: Object.fromEntries(response.headers.entries()),
                body: responseData,
                bodyLength: responseText.length,
                bodyPreview: responseText.substring(0, 500)
            }
        };
        
        if (!response.ok) {
            console.error(`[Finnhub Test] Error for ${ticker}:`, {
                status: response.status,
                statusText: response.statusText,
                body: responseText.substring(0, 200)
            });
        } else {
            console.log(`[Finnhub Test] Success for ${ticker}:`, {
                s: responseData.s,
                dataLength: responseData.c?.length || 0
            });
        }
        
        return NextResponse.json(result);
    } catch (error) {
        console.error('[Finnhub Test] Exception:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}

