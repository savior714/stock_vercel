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

export default function Home() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('triple');
  const [loaded, setLoaded] = useState(false);
  const [showAllTickers, setShowAllTickers] = useState(false);

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

  const currentResults = activeTab === 'triple' ? tripleSignalResults : bbOnlyResults;

  return (
    <div className="container">
      <h1>📈 주가 분석 대시보드</h1>

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
      `}</style>
    </div>
  );
}
