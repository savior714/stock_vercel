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

type TabType = 'triple' | 'bb';

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
  const [previousAlertedTickers, setPreviousAlertedTickers] = useState<string[]>([]);  // 이전 알람 티커
  const [newlyAlertedTickers, setNewlyAlertedTickers] = useState<string[]>([]);  // 이번 조회에서 새로 알람 발생한 티커

  // localStorage에서 티커 목록 및 이전 알람 티커 로드
  useEffect(() => {
    const savedTickers = localStorage.getItem('stock-tickers');
    if (savedTickers) {
      try {
        setTickers(JSON.parse(savedTickers));
      } catch (e) {
        console.error('Failed to parse saved tickers:', e);
      }
    }

    // 이전 알람 티커 로드
    const savedAlertedTickers = localStorage.getItem('stock-alerted-tickers');
    if (savedAlertedTickers) {
      try {
        setPreviousAlertedTickers(JSON.parse(savedAlertedTickers));
      } catch (e) {
        console.error('Failed to parse saved alerted tickers:', e);
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

  const removeTicker = (ticker: string) => {
    setTickers(tickers.filter(t => t !== ticker));
    setResults(results.filter(r => r.ticker !== ticker));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTicker();
    }
  };

  const loadPresetTickers = async () => {
    try {
      const response = await fetch('/preset_tickers.json');
      const presetTickers = await response.json();
      // 기존 티커와 합치고 중복 제거
      const combined = [...new Set([...tickers, ...presetTickers])];
      setTickers(combined);
    } catch (error) {
      console.error('Failed to load preset tickers:', error);
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

      // 트리플 시그널 조건을 만족하는 티커 추출
      const currentAlertedTickers = data.results
        .filter((r: AnalysisResult) =>
          r.rsi !== undefined && r.mfi !== undefined && r.bb_touch !== undefined &&
          r.rsi < 35 && r.mfi < 35 && r.bb_touch === true
        )
        .map((r: AnalysisResult) => r.ticker);

      // 이전에 알람이 없었던 티커 중 이번에 새로 알람이 발생한 티커
      const newlyAlerted = currentAlertedTickers.filter(
        (ticker: string) => !previousAlertedTickers.includes(ticker)
      );
      setNewlyAlertedTickers(newlyAlerted);

      // 현재 알람 티커를 이전 알람으로 저장 (다음 조회 시 비교용)
      setPreviousAlertedTickers(currentAlertedTickers);
      localStorage.setItem('stock-alerted-tickers', JSON.stringify(currentAlertedTickers));

    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 트리플 시그널: RSI < 35 AND MFI < 35 AND BB 터치
  const tripleSignalResults = results.filter(r =>
    r.rsi !== undefined && r.mfi !== undefined && r.bb_touch !== undefined &&
    r.rsi < 35 && r.mfi < 35 && r.bb_touch === true
  );

  // 볼린저 밴드 시그널: BB 터치만
  const bbOnlyResults = results.filter(r => r.bb_touch === true);

  // 신규 알람 티커 우선 정렬 (신규 상단, 기존 하단)
  const sortByNewAlert = (a: AnalysisResult, b: AnalysisResult) => {
    const aIsNew = newlyAlertedTickers.includes(a.ticker);
    const bIsNew = newlyAlertedTickers.includes(b.ticker);
    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;
    return 0;
  };

  const sortedTripleResults = [...tripleSignalResults].sort(sortByNewAlert);
  const sortedBbResults = [...bbOnlyResults].sort(sortByNewAlert);

  const currentResults = activeTab === 'triple' ? sortedTripleResults : sortedBbResults;

  // 신규/기존 알람 카운트
  const newAlertCount = currentResults.filter(r => newlyAlertedTickers.includes(r.ticker)).length;
  const existingAlertCount = currentResults.length - newAlertCount;

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
      </div>

      {/* 탭 설명 */}
      <div className="tab-description">
        {activeTab === 'triple' ? (
          <p>RSI &lt; 35 <strong>AND</strong> MFI &lt; 35 <strong>AND</strong> 볼린저 밴드 하단 터치</p>
        ) : (
          <p>볼린저 밴드 하단 터치 종목</p>
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
              📥 프리셋 불러오기 (360개)
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

      {/* 분석 결과 */}
      {results.length > 0 && (
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

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        h1 {
          text-align: center;
          color: #1a1a2e;
          margin-bottom: 30px;
        }

        .market-indicators {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
        }

        .indicator {
          background: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          transition: transform 0.3s;
        }

        .indicator:hover {
          transform: translateY(-5px);
        }

        .indicator-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .indicator-value {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .indicator-rating {
          font-size: 13px;
          color: #888;
          font-weight: 500;
        }

        /* Fear & Greed colors */
        .fear-greed-extreme-fear {
          color: #ff4757;
        }

        .fear-greed-fear {
          color: #ff6348;
        }

        .fear-greed-neutral {
          color: #ffa502;
        }

        .fear-greed-greed {
          color: #26de81;
        }

        .fear-greed-extreme-greed {
          color: #20bf6b;
        }

        /* VIX colors */
        .vix-neutral {
          color: #26de81;
        }

        .vix-elevated {
          color: #ffa502;
        }

        .vix-high {
          color: #ff4757;
        }

        /* Put/Call colors */
        .putcall-extreme-fear {
          color: #ff4757;
        }

        .putcall-fear {
          color: #ff6348;
        }

        .putcall-neutral {
          color: #26de81;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }

        .tab {
          flex: 1;
          padding: 15px 20px;
          border: none;
          border-radius: 10px 10px 0 0;
          background: #e0e0e0;
          color: #666;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .tab:hover:not(.active) {
          background: #ccc;
        }

        .badge {
          background: #ff4757;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .tab-description {
          background: #f8f9fa;
          padding: 10px 20px;
          border-radius: 0 0 10px 10px;
          margin-bottom: 20px;
          color: #666;
          font-size: 14px;
        }

        .tab-description p {
          margin: 0;
        }

        .input-section {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.3s;
        }

        input:focus {
          border-color: #667eea;
        }

        button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          background: #667eea;
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s, background 0.3s;
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #5a6fd6;
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .analyze-btn {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .analyze-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #e085ec 0%, #e64a5f 100%);
        }

        .ticker-list {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .ticker-list h3 {
          margin: 0;
          color: #333;
        }

        .ticker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ticker-actions {
          display: flex;
          gap: 10px;
        }

        .preset-btn {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          font-size: 14px;
          padding: 8px 16px;
        }

        .preset-btn:hover {
          background: linear-gradient(135deg, #0f8a80 0%, #2dd36f 100%);
        }

        .clear-btn {
          background: #ff6b6b;
          font-size: 14px;
          padding: 8px 16px;
        }

        .clear-btn:hover {
          background: #ee5a5a;
        }

        .tickers {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ticker-tag {
          background: white;
          padding: 6px 12px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #ddd;
          font-size: 14px;
        }

        .ticker-tag button {
          background: #ff4757;
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          padding: 0;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .show-more-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 20px;
          padding: 6px 16px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 500;
        }

        .show-more-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .results {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .results h3 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .no-alerts {
          text-align: center;
          color: #888;
          padding: 40px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #555;
        }

        .alert-row {
          background: linear-gradient(90deg, rgba(255,71,87,0.1) 0%, rgba(255,71,87,0.05) 100%);
        }

        .ticker-cell {
          font-weight: 700;
          color: #667eea;
        }

        .oversold {
          color: #ff4757;
          font-weight: 600;
        }

        .summary {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 14px;
          color: #666;
        }

        .summary h4 {
          margin: 0 0 5px 0;
        }

        .summary p {
          margin: 0;
        }

        .error-section {
          margin-top: 15px;
          padding: 12px;
          background: #fff3cd;
          border-left: 4px solid #ff6b6b;
          border-radius: 6px;
        }

        .error-section h5 {
          margin: 0 0 10px 0;
          color: #856404;
          font-size: 14px;
        }

        .error-item {
          padding: 6px 0;
          color: #333;
          font-size: 13px;
          border-bottom: 1px solid #ffe8a1;
        }

        .error-item:last-child {
          border-bottom: none;
        }

        .error-item strong {
          color: #ff4757;
          font-weight: 600;
        }

        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .container {
            padding: 15px;
          }

          .market-indicators {
            grid-template-columns: 1fr;
            padding: 15px;
            gap: 10px;
          }

          .indicator {
            padding: 15px;
          }

          .indicator-value {
            font-size: 28px;
          }

          .input-section {
            flex-direction: column;
            gap: 8px;
          }

          .input-section input {
            width: 100%;
            padding: 10px 14px;
            font-size: 15px;
          }

          .input-section button {
            width: 100%;
            padding: 10px 20px;
            font-size: 15px;
          }

          .tabs {
            flex-direction: column;
            gap: 5px;
          }

          .tab {
            padding: 12px 16px;
            font-size: 14px;
          }

          .ticker-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .ticker-actions {
            width: 100%;
            flex-direction: column;
          }

          .ticker-actions button {
            width: 100%;
          }

          table {
            font-size: 13px;
          }

          th, td {
            padding: 8px 6px;
          }
        }

        @media (max-width: 480px) {
          h1 {
            font-size: 22px;
            margin-bottom: 20px;
          }

          .indicator-label {
            font-size: 10px;
          }

          .indicator-value {
            font-size: 24px;
          }

          .indicator-rating {
            font-size: 11px;
          }

          table {
            font-size: 12px;
          }

          th, td {
            padding: 6px 4px;
          }
        }
      `}</style>
    </div>
  );
}
