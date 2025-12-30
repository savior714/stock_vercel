'use client';

import { useState } from 'react';

export default function CorsTest() {
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [nasProxyUrl, setNasProxyUrl] = useState('');

    const testDirectCall = async () => {
        setLoading(true);
        setResult('테스트 중...\n');

        const ticker = 'AAPL';
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (30 * 24 * 60 * 60); // 30일

        // Yahoo Finance chart API 직접 호출 테스트
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d`;

        try {
            setResult(prev => prev + `📡 요청 URL: ${url}\n\n`);

            const startTime = Date.now();
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            const elapsed = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();
                const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
                const latestPrice = closes[closes.length - 1];

                setResult(prev => prev + `✅ 성공! (${elapsed}ms)\n\n`);
                setResult(prev => prev + `📊 ${ticker} 최신 종가: $${latestPrice?.toFixed(2)}\n`);
                setResult(prev => prev + `📈 데이터 포인트: ${closes.length}개\n\n`);
                setResult(prev => prev + `🎉 CORS 문제 없음! 클라이언트 사이드 분석 가능!\n`);
            } else {
                setResult(prev => prev + `❌ HTTP 에러: ${response.status} ${response.statusText}\n`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

            if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
                setResult(prev => prev + `❌ CORS 블록됨!\n\n`);
                setResult(prev => prev + `에러: ${errorMessage}\n\n`);
                setResult(prev => prev + `💡 해결책:\n`);
                setResult(prev => prev + `1. 서버 사이드 프록시 사용 (현재 방식)\n`);
                setResult(prev => prev + `2. CORS 프록시 서비스 사용\n`);
                setResult(prev => prev + `3. NAS 프록시에 CORS 헤더 추가\n`);
            } else {
                setResult(prev => prev + `❌ 오류: ${errorMessage}\n`);
            }
        } finally {
            setLoading(false);
        }
    };

    // 병렬 테스트 (5개 동시)
    const testParallel = async () => {
        setLoading(true);
        setResult('병렬 테스트 중...\n\n');

        const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (30 * 24 * 60 * 60);

        const startTime = Date.now();

        try {
            const promises = tickers.map(async (ticker) => {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d`;
                const response = await fetch(url);
                const data = await response.json();
                const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
                return { ticker, price: closes[closes.length - 1] };
            });

            const results = await Promise.all(promises);
            const elapsed = Date.now() - startTime;

            setResult(prev => prev + `✅ 5개 종목 병렬 조회 완료! (${elapsed}ms)\n\n`);
            results.forEach(r => {
                setResult(prev => prev + `${r.ticker}: $${r.price?.toFixed(2)}\n`);
            });
            setResult(prev => prev + `\n🚀 평균 ${Math.round(elapsed / 5)}ms/종목\n`);
            setResult(prev => prev + `📊 360종목 예상 시간: ${Math.round((elapsed / 5) * 360 / 1000 / 60)}분\n`);
        } catch (error) {
            setResult(prev => prev + `❌ 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n`);
        } finally {
            setLoading(false);
        }
    };

    // NAS 프록시 테스트
    const testNasProxy = async () => {
        if (!nasProxyUrl.trim()) {
            setResult('❌ NAS 프록시 URL을 입력하세요!\n\n예: http://your-nas-ip:port/yahoo-proxy/index.php');
            return;
        }

        setLoading(true);
        setResult('NAS 프록시 테스트 중...\n\n');

        const ticker = 'AAPL';
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (30 * 24 * 60 * 60);

        // NAS 프록시 URL 생성
        const url = `${nasProxyUrl.trim()}?ticker=${ticker}&period1=${startDate}&period2=${endDate}`;

        try {
            setResult(prev => prev + `📡 NAS 프록시 URL: ${url}\n\n`);

            const startTime = Date.now();
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            const elapsed = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();
                const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
                const latestPrice = closes[closes.length - 1];

                setResult(prev => prev + `✅ NAS 프록시 성공! (${elapsed}ms)\n\n`);
                setResult(prev => prev + `📊 ${ticker} 최신 종가: $${latestPrice?.toFixed(2)}\n`);
                setResult(prev => prev + `📈 데이터 포인트: ${closes.length}개\n\n`);
                setResult(prev => prev + `🎉 NAS 프록시로 CORS 우회 성공!\n`);
                setResult(prev => prev + `💡 이제 클라이언트에서 직접 NAS 프록시를 호출하면 됩니다.\n`);
            } else {
                const errorText = await response.text();
                setResult(prev => prev + `❌ HTTP 에러: ${response.status}\n${errorText}\n`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            setResult(prev => prev + `❌ 오류: ${errorMessage}\n\n`);

            if (errorMessage.includes('Failed to fetch')) {
                setResult(prev => prev + `💡 가능한 원인:\n`);
                setResult(prev => prev + `1. NAS 프록시 서버가 실행 중이 아님\n`);
                setResult(prev => prev + `2. NAS 프록시 URL이 잘못됨\n`);
                setResult(prev => prev + `3. NAS가 외부에서 접근 불가능\n`);
                setResult(prev => prev + `4. CORS 헤더가 설정되지 않음\n`);
            }
        } finally {
            setLoading(false);
        }
    };

    // NAS 프록시 병렬 테스트 (5개)
    const testNasProxyParallel = async () => {
        if (!nasProxyUrl.trim()) {
            setResult('❌ NAS 프록시 URL을 입력하세요!');
            return;
        }

        setLoading(true);
        setResult('NAS 프록시 병렬 테스트 중...\n\n');

        const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (30 * 24 * 60 * 60);

        const startTime = Date.now();

        try {
            const promises = tickers.map(async (ticker) => {
                const url = `${nasProxyUrl.trim()}?ticker=${ticker}&period1=${startDate}&period2=${endDate}`;
                const response = await fetch(url);
                const data = await response.json();
                const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
                return { ticker, price: closes[closes.length - 1] };
            });

            const results = await Promise.all(promises);
            const elapsed = Date.now() - startTime;

            // 성공/실패 종목 구분
            const successResults = results.filter(r => r.price !== undefined && r.price !== null);
            const failedResults = results.filter(r => r.price === undefined || r.price === null);

            if (failedResults.length === 0) {
                setResult(prev => prev + `✅ NAS 프록시로 5개 종목 병렬 조회 완료! (${elapsed}ms)\n\n`);
            } else if (successResults.length > 0) {
                setResult(prev => prev + `⚠️ NAS 프록시로 ${successResults.length}개 성공, ${failedResults.length}개 실패! (${elapsed}ms)\n\n`);
            } else {
                setResult(prev => prev + `❌ NAS 프록시 조회 전체 실패! (${elapsed}ms)\n\n`);
            }

            // 성공 종목
            successResults.forEach(r => {
                setResult(prev => prev + `✅ ${r.ticker}: $${r.price?.toFixed(2)}\n`);
            });

            // 실패 종목
            failedResults.forEach(r => {
                setResult(prev => prev + `❌ ${r.ticker}: 데이터 없음\n`);
            });

            if (successResults.length > 0) {
                setResult(prev => prev + `\n🚀 평균 ${Math.round(elapsed / successResults.length)}ms/종목\n`);
                setResult(prev => prev + `📊 360종목 예상 시간: ${Math.round((elapsed / successResults.length) * 360 / 1000 / 60)}분\n`);
            }

            if (failedResults.length > 0) {
                setResult(prev => prev + `\n⚠️ ${failedResults.length}개 종목 데이터 조회 실패\n`);
                setResult(prev => prev + `💡 Yahoo Finance API 응답에 데이터가 없습니다. 티커 심볼 또는 시간대를 확인하세요.\n`);
            } else {
                setResult(prev => prev + `\n🎉 NAS 프록시로 클라이언트 사이드 분석 가능!\n`);
            }
        } catch (error) {
            setResult(prev => prev + `❌ 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: '2rem',
            maxWidth: '800px',
            margin: '0 auto',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#1a1a2e',
            minHeight: '100vh',
            color: '#eee'
        }}>
            <h1 style={{ color: '#4cc9f0' }}>🧪 Yahoo Finance CORS 테스트</h1>

            <p style={{ color: '#aaa', marginBottom: '2rem' }}>
                브라우저에서 Yahoo Finance API를 직접 호출할 수 있는지 테스트합니다.
                <br />
                성공하면 Vercel 서버 우회가 가능합니다!
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button
                    onClick={testDirectCall}
                    disabled={loading}
                    style={{
                        padding: '1rem 2rem',
                        fontSize: '1rem',
                        backgroundColor: loading ? '#555' : '#4361ee',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? '⏳ 테스트 중...' : '🔍 Yahoo 직접 호출 (CORS 테스트)'}
                </button>
            </div>

            {/* NAS 프록시 테스트 섹션 */}
            <div style={{
                backgroundColor: '#0f3460',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '2rem',
            }}>
                <h3 style={{ color: '#4cc9f0', marginTop: 0 }}>🔧 NAS 프록시 테스트</h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    NAS 프록시를 통해 CORS 우회가 가능한지 테스트합니다.
                </p>
                <input
                    type="text"
                    placeholder="NAS 프록시 URL (예: http://192.168.1.100:8080/yahoo-proxy/index.php)"
                    value={nasProxyUrl}
                    onChange={(e) => setNasProxyUrl(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #4cc9f0',
                        backgroundColor: '#1a1a2e',
                        color: '#eee',
                        marginBottom: '1rem',
                    }}
                />
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={testNasProxy}
                        disabled={loading}
                        style={{
                            padding: '1rem 2rem',
                            fontSize: '1rem',
                            backgroundColor: loading ? '#555' : '#2ec4b6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? '⏳ 테스트 중...' : '🔍 NAS 프록시 단일 테스트'}
                    </button>
                    <button
                        onClick={testNasProxyParallel}
                        disabled={loading}
                        style={{
                            padding: '1rem 2rem',
                            fontSize: '1rem',
                            backgroundColor: loading ? '#555' : '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? '⏳ 테스트 중...' : '🚀 NAS 프록시 병렬 테스트 (5개)'}
                    </button>
                </div>
            </div>

            <div style={{
                backgroundColor: '#16213e',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #0f3460',
                minHeight: '300px',
            }}>
                <h3 style={{ color: '#4cc9f0', marginTop: 0 }}>📋 결과</h3>
                <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#eee',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                }}>
                    {result || '테스트 버튼을 클릭하세요...'}
                </pre>
            </div>

            <div style={{ marginTop: '2rem', color: '#888', fontSize: '0.85rem' }}>
                <p>💡 개발자 도구(F12) → Network 탭에서 상세 정보 확인 가능</p>
                <p>💡 Console 탭에서 CORS 에러 메시지 확인 가능</p>
            </div>
        </div>
    );
}
