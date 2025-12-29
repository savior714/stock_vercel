'use client';

import { useState, useEffect } from 'react';

interface AnalysisResult {
  ticker: string;
  alert: boolean;
  rsi?: number;
  mfi?: number;
  bb_touch?: boolean;
  price?: number;
  error?: string;
}

type TabType = 'triple' | 'bb' | 'debug';

interface MarketIndicators {
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

export default function Home() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('triple');
  const [loaded, setLoaded] = useState(false);
  const [showAllTickers, setShowAllTickers] = useState(false);
  const [marketIndicators, setMarketIndicators] = useState<MarketIndicators | null>(null);

  // 데이터 검증 탭 관련 상태
  const [debugTicker, setDebugTicker] = useState('');
  const [debugData, setDebugData] = useState<{
    ticker: string;
    data: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      adjClose: number;
      volume: number;
      rsi?: number;
      mfi?: number;
      bbUpper?: number;
      bbMiddle?: number;
      bbLower?: number;
    }>;
    summary: {
      latestDate: string;
      latestClose: number;
      latestAdjClose: number;
      closeVsAdjCloseDiff: boolean;
      latestRSI?: number;
      latestMFI?: number;
      latestBBLower?: number;
      latestBBUpper?: number;
    };
  } | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  // localStorage에서 티커 목록 로드
  useEffect(() => {
    const savedTickers = localStorage.getItem('stock-tickers');
    if (savedTickers) {
      try {
        setTickers(JSON.parse(savedTickers));
      } catch (e) {
        console.error('Failed to parse saved tickers:', e);
      }
    }
    setLoaded(true);
  }, []);

  // 티커 목록 변경 시 localStorage에 저장
  useEffect(() => {
    if (loaded && tickers.length >= 0) {
      localStorage.setItem('stock-tickers', JSON.stringify(tickers));
    }
  }, [tickers, loaded]);

  // 마켓 인디케이터 가져오기
  useEffect(() => {
    const fetchMarketIndicators = async () => {
      try {
        const response = await fetch('/api/market-indicators');
        const data = await response.json();
        setMarketIndicators(data);
      } catch (error) {
        console.error('Failed to fetch market indicators:', error);
      }
    };

    fetchMarketIndicators();
    // 5분마다 업데이트
    const interval = setInterval(fetchMarketIndicators, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const addTicker = () => {
    const ticker = inputValue.trim().toUpperCase();
    if (ticker && !tickers.includes(ticker)) {
      setTickers([...tickers, ticker]);
      setInputValue('');
    }
  };

  const removeTicker = async (ticker: string, alsoRemoveFromPreset: boolean = false) => {
    setTickers(tickers.filter(t => t !== ticker));
    setResults(results.filter(r => r.ticker !== ticker));

    // 프리셋에서도 제거 (서버에 반영)
    if (alsoRemoveFromPreset) {
      try {
        await fetch('/api/presets', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: [ticker] })
        });
      } catch (error) {
        console.error('Failed to remove from preset:', error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTicker();
    }
  };

  const loadPresetTickers = async () => {
    try {
      const response = await fetch('/api/presets');
      const data = await response.json();
      // 서버 프리셋으로 교체 (기존 티커 대체)
      setTickers(data.presets || []);
      setResults([]); // 분석 결과도 초기화
    } catch (error) {
      console.error('Failed to load preset tickers:', error);
    }
  };

  // 현재 티커 목록을 프리셋으로 저장
  const saveAsPreset = async () => {
    if (tickers.length === 0) {
      alert('저장할 티커가 없습니다.');
      return;
    }
    if (confirm(`현재 ${tickers.length}개 티커를 프리셋으로 저장하시겠습니까?`)) {
      try {
        const response = await fetch('/api/presets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presets: tickers })
        });
        const data = await response.json();
        if (data.success) {
          alert(`프리셋이 저장되었습니다. (${data.count}개)`);
        }
      } catch (error) {
        console.error('Failed to save preset:', error);
        alert('프리셋 저장에 실패했습니다.');
      }
    }
  };

  const clearAllTickers = () => {
    if (confirm('정말 모든 티커를 삭제하시겠습니까?')) {
      setTickers([]);
      setResults([]);
    }
  };

  const runAnalysis = async () => {
    if (tickers.length === 0) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });

      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 데이터 검증 함수
  const fetchDebugData = async () => {
    if (!debugTicker.trim()) return;

    setDebugLoading(true);
    setDebugError(null);
    setDebugData(null);

    try {
      const response = await fetch(`/api/debug?ticker=${debugTicker.trim().toUpperCase()}&days=20`);
      const data = await response.json();

      if (data.error) {
        setDebugError(data.error);
      } else {
        setDebugData(data);
      }
    } catch (error) {
      setDebugError(error instanceof Error ? error.message : '데이터 조회 실패');
    } finally {
      setDebugLoading(false);
    }
  };

  // 트리플 시그널: RSI < 35 AND MFI < 35 AND BB 터치
  const tripleSignalResults = results.filter(r =>
    r.rsi !== undefined && r.mfi !== undefined && r.bb_touch !== undefined &&
    r.rsi < 35 && r.mfi < 35 && r.bb_touch === true
  );

  // 볼린저 밴드 시그널: BB 터치만
  const bbOnlyResults = results.filter(r => r.bb_touch === true);

  const currentResults = activeTab === 'triple' ? tripleSignalResults : bbOnlyResults;

  return (
    <div className="container">
      <h1>📈 주가 분석 대시보드</h1>

      {/* 마켓 인디케이터 위젯 */}
      {marketIndicators && (
        <div className="market-indicators">
          <div className="indicator">
            <div className="indicator-label">Fear & Greed Index</div>
            <div className={`indicator-value fear-greed-${marketIndicators.fearAndGreed.rating.toLowerCase().replace(' ', '-')}`}>
              {marketIndicators.fearAndGreed.score}
            </div>
            <div className="indicator-rating">{marketIndicators.fearAndGreed.rating}</div>
          </div>
          <div className="indicator">
            <div className="indicator-label">VIX</div>
            <div className={`indicator-value vix-${marketIndicators.vix.rating.toLowerCase()}`}>
              {marketIndicators.vix.current}
            </div>
            <div className="indicator-rating">
              50-day avg: {marketIndicators.vix.fiftyDayAvg}
            </div>
          </div>
          <div className="indicator">
            <div className="indicator-label">Put/Call Ratio</div>
            <div className={`indicator-value putcall-${marketIndicators.putCallRatio.rating.toLowerCase().replace(' ', '-')}`}>
              {marketIndicators.putCallRatio.current.toFixed(2)}
            </div>
            <div className="indicator-rating">{marketIndicators.putCallRatio.rating}</div>
          </div>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'triple' ? 'active' : ''}`}
          onClick={() => setActiveTab('triple')}
        >
          🎯 트리플 시그널
          {tripleSignalResults.length > 0 && (
            <span className="badge">{tripleSignalResults.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'bb' ? 'active' : ''}`}
          onClick={() => setActiveTab('bb')}
        >
          📊 볼린저 밴드
          {bbOnlyResults.length > 0 && (
            <span className="badge">{bbOnlyResults.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'debug' ? 'active' : ''}`}
          onClick={() => setActiveTab('debug')}
        >
          🔍 데이터 검증
        </button>
      </div>

      {/* 탭 설명 */}
      <div className="tab-description">
        {activeTab === 'triple' ? (
          <p>RSI &lt; 35 <strong>AND</strong> MFI &lt; 35 <strong>AND</strong> 볼린저 밴드 하단 터치</p>
        ) : activeTab === 'bb' ? (
          <p>볼린저 밴드 하단 터치 종목</p>
        ) : (
          <p>Yahoo Finance 원본 데이터와 계산된 지표를 확인하여 토스증권과 비교할 수 있습니다</p>
        )}
      </div>

      {/* 티커 입력 */}
      <div className="input-section">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="티커 입력 (예: AAPL)"
        />
        <button onClick={addTicker}>추가</button>
        <button
          className="analyze-btn"
          onClick={runAnalysis}
          disabled={tickers.length === 0 || isAnalyzing}
        >
          {isAnalyzing ? '분석 중...' : '🚀 분석 실행'}
        </button>
      </div>

      {/* 등록된 티커 목록 */}
      <div className="ticker-list">
        <div className="ticker-header">
          <h3>등록된 티커 ({tickers.length}개)</h3>
          <div className="ticker-actions">
            <button className="preset-btn" onClick={loadPresetTickers}>
              📥 프리셋 불러오기
            </button>
            <button className="save-preset-btn" onClick={saveAsPreset}>
              💾 프리셋 저장
            </button>
            <button className="clear-btn" onClick={clearAllTickers}>
              🗑️ 전체 삭제
            </button>
          </div>
        </div>
        <div className="tickers">
          {(showAllTickers ? tickers : tickers.slice(0, 10)).map(ticker => (
            <span key={ticker} className="ticker-tag">
              {ticker}
              <button onClick={() => removeTicker(ticker)}>×</button>
            </span>
          ))}
          {tickers.length > 10 && !showAllTickers && (
            <button
              className="show-more-btn"
              onClick={() => setShowAllTickers(true)}
            >
              + {tickers.length - 10}개 더보기
            </button>
          )}
          {tickers.length > 10 && showAllTickers && (
            <button
              className="show-more-btn"
              onClick={() => setShowAllTickers(false)}
            >
              접기
            </button>
          )}
        </div>
      </div>

      {/* 데이터 검증 탭 내용 */}
      {activeTab === 'debug' && (
        <div className="debug-section">
          <div className="debug-input">
            <input
              type="text"
              value={debugTicker}
              onChange={(e) => setDebugTicker(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchDebugData()}
              placeholder="티커 입력 (예: AAPL)"
            />
            <button onClick={fetchDebugData} disabled={debugLoading}>
              {debugLoading ? '조회 중...' : '🔍 데이터 조회'}
            </button>
          </div>

          {debugError && (
            <div className="debug-error">
              ⚠️ 오류: {debugError}
            </div>
          )}

          {debugData && (
            <div className="debug-results">
              <div className="debug-summary">
                <h4>📊 {debugData.ticker} 요약</h4>
                <div className="summary-grid">
                  <div><strong>최신 날짜:</strong> {debugData.summary.latestDate}</div>
                  <div><strong>종가:</strong> ${debugData.summary.latestClose}</div>
                  <div><strong>수정종가:</strong> ${debugData.summary.latestAdjClose}</div>
                  <div className={debugData.summary.closeVsAdjCloseDiff ? 'diff-warning' : ''}>
                    <strong>종가≠수정종가:</strong> {debugData.summary.closeVsAdjCloseDiff ? '⚠️ 예 (배당/분할)' : '✅ 동일'}
                  </div>
                  <div><strong>RSI(14):</strong> {debugData.summary.latestRSI?.toFixed(2) || 'N/A'}</div>
                  <div><strong>MFI(14):</strong> {debugData.summary.latestMFI?.toFixed(2) || 'N/A'}</div>
                  <div><strong>BB 하단:</strong> ${debugData.summary.latestBBLower?.toFixed(2) || 'N/A'}</div>
                  <div><strong>BB 상단:</strong> ${debugData.summary.latestBBUpper?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>

              <h4>📅 최근 20일 일봉 데이터</h4>
              <div className="debug-table-wrapper">
                <table className="debug-table">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>시가</th>
                      <th>고가</th>
                      <th>저가</th>
                      <th>종가</th>
                      <th>수정종가</th>
                      <th>거래량</th>
                      <th>RSI</th>
                      <th>MFI</th>
                      <th>BB하단</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugData.data.map((day, idx) => (
                      <tr key={day.date} className={idx === debugData.data.length - 1 ? 'latest-row' : ''}>
                        <td>{day.date}</td>
                        <td>${day.open.toFixed(2)}</td>
                        <td>${day.high.toFixed(2)}</td>
                        <td>${day.low.toFixed(2)}</td>
                        <td>${day.close.toFixed(2)}</td>
                        <td className={day.close !== day.adjClose ? 'diff-cell' : ''}>
                          ${day.adjClose.toFixed(2)}
                        </td>
                        <td>{(day.volume / 1000000).toFixed(1)}M</td>
                        <td className={day.rsi && day.rsi < 35 ? 'oversold' : ''}>
                          {day.rsi?.toFixed(1) || '-'}
                        </td>
                        <td className={day.mfi && day.mfi < 35 ? 'oversold' : ''}>
                          {day.mfi?.toFixed(1) || '-'}
                        </td>
                        <td>${day.bbLower?.toFixed(2) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="debug-tip">
                💡 <strong>비교 방법:</strong> 토스증권 앱에서 동일 종목의 일봉 차트를 열어 날짜별 시/고/저/종가와 RSI 값을 비교해보세요.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 분석 결과 */}
      {activeTab !== 'debug' && results.length > 0 && (
        <div className="results">
          <h3>
            {activeTab === 'triple' ? '🎯 트리플 시그널 알람' : '📊 볼린저 밴드 알람'}
            ({currentResults.length}개)
          </h3>
          {currentResults.length === 0 ? (
            <p className="no-alerts">현재 조건을 만족하는 종목이 없습니다.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>티커</th>
                  <th>가격</th>
                  <th>RSI(14)</th>
                  <th>MFI(14)</th>
                  <th>BB 터치</th>
                </tr>
              </thead>
              <tbody>
                {currentResults.map(result => (
                  <tr key={result.ticker} className="alert-row">
                    <td className="ticker-cell">{result.ticker}</td>
                    <td>${result.price?.toFixed(2) || 'N/A'}</td>
                    <td className={result.rsi && result.rsi < 35 ? 'oversold' : ''}>
                      {result.rsi?.toFixed(2) || 'N/A'}
                    </td>
                    <td className={result.mfi && result.mfi < 35 ? 'oversold' : ''}>
                      {result.mfi?.toFixed(2) || 'N/A'}
                    </td>
                    <td>{result.bb_touch ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 전체 분석 결과 요약 */}
          <div className="summary">
            <h4>전체 분석 완료: {results.length}개</h4>
            {results.filter(r => r.error).length > 0 && (
              <div className="error-section">
                <h5>⚠️ 오류 종목 확인</h5>
                {results.filter(r => r.error).map(r => (
                  <div key={r.ticker} className="error-item">
                    <strong>{r.ticker}</strong> - {r.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
