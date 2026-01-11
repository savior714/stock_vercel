"use client";

import React, { useState } from 'react';
import { useMarketData, useTickers, useAnalysis, useAppLifecycle, useSettings } from '../hooks';
import { MarketIndicators, TickerInput, AnalysisProgress, ResultTable, SettingsModal } from '../components';
import { isNativeEnvironment } from '../lib/utils/platform';

export default function Home() {
  const [isNative, setIsNative] = useState(false);

  React.useEffect(() => {
    setIsNative(isNativeEnvironment());
  }, []);

  // 1. 시장 지표 훅
  const { marketIndicators } = useMarketData();

  // 2. 티커 관리 훅
  const {
    tickers,
    inputValue,
    setInputValue,
    showAllTickers,
    setShowAllTickers,
    addTicker,
    removeTicker,
    loadPresetTickers,
    saveAsPreset,
    clearAllTickers
  } = useTickers();

  // 2.5 설정 훅
  const { settings, updateSettings, resetSettings } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 3. 분석 관리 훅
  const {
    results,
    isAnalyzing,
    progress,
    failedTickers,
    activeTab,
    setActiveTab,
    analysisMode,
    setAnalysisMode,
    isPaused,
    runAnalysis,
    stopAnalysis,
    togglePause,
    retryFailedTickers,
    removeResult
  } = useAnalysis(tickers, settings);

  // 티커 삭제 핸들러 (목록 및 결과에서 모두 제거)
  const handleRemoveTicker = (ticker: string, removeFromPreset: boolean = false) => {
    removeTicker(ticker, removeFromPreset); // Hook: 티커 목록에서 제거
    removeResult(ticker); // Hook: 분석 결과에서 제거
  };

  // 앱 생명주기 처리 (Back 버튼 시 분석 중지)
  useAppLifecycle({
    onBack: () => {
      if (isAnalyzing) {
        stopAnalysis();
      }
    }
  });

  // 키보드 엔터 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTicker();
    }
  };

  // 결과 필터링 (트리플 시그널 vs 볼린저 밴드)
  const tripleSignalResults = results.filter(r => r.alert); // alert 필드는 트리플 시그널 여부
  const bbOnlyResults = results.filter(r => r.bb_touch);

  const currentResults = activeTab === 'triple' ? tripleSignalResults : bbOnlyResults;

  return (
    <div className="container">
      <button
        className="settings-btn"
        onClick={() => setIsSettingsOpen(true)}
        title="설정"
      >
        ⚙️
      </button>

      {/* 시장 지표 위젯 */}
      <MarketIndicators data={marketIndicators} />

      <h1 className="title">
        Stock Technical Analysis
        {isNative && <span className="app-badge">App</span>}
      </h1>

      {/* 티커 입력 및 설정 */}
      <TickerInput
        inputValue={inputValue}
        onInputChange={setInputValue}
        onAdd={addTicker}
        onKeyDown={handleKeyDown}
        isAnalyzing={isAnalyzing}
      />

      {/* 분석 제어 버튼 */}
      <div className="controls">
        {!isAnalyzing ? (
          <button
            className="analyze-btn"
            onClick={() => runAnalysis()}
            disabled={tickers.length === 0}
          >
            🚀 전체 분석 시작 ({tickers.length}개)
          </button>
        ) : (
          <>
            <button className="pause-btn" onClick={togglePause}>
              {isPaused ? '▶️ 재개' : '⏸️ 일시 중지'}
            </button>
            <button className="stop-btn" onClick={stopAnalysis}>
              ⏹️ 중지
            </button>
          </>
        )}

        {failedTickers.length > 0 && !isAnalyzing && (
          <button
            className="retry-btn"
            onClick={retryFailedTickers}
          >
            🔄 실패한 티커 재시도 ({failedTickers.length}개)
          </button>
        )}
      </div>

      {/* 진행 상황 프로세스 바 */}
      <AnalysisProgress progress={progress} isAnalyzing={isAnalyzing} />

      {/* 등록된 티커 목록 */}
      <div className="ticker-list">
        <div className="ticker-header">
          <h3>등록된 티커 ({tickers.length}개)</h3>
          <div className="ticker-actions">
            <button className="preset-btn" onClick={loadPresetTickers} disabled={isAnalyzing}>
              📥 프리셋 불러오기
            </button>
            <button className="save-preset-btn" onClick={saveAsPreset} disabled={isAnalyzing}>
              💾 프리셋 저장
            </button>
            <button className="clear-btn" onClick={clearAllTickers} disabled={tickers.length === 0 || isAnalyzing}>
              🗑️ 전체 삭제
            </button>
          </div>
        </div>
        <div className="tickers">
          {(showAllTickers ? tickers : tickers.slice(0, 10)).map(ticker => (
            <span key={ticker} className="ticker-tag">
              {ticker}
              <button onClick={() => handleRemoveTicker(ticker)} disabled={isAnalyzing}>×</button>
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

      {/* 탭 네비게이션 (결과 있을 때만 표시) */}
      {results.length > 0 && (
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
      )}

      {/* 탭 설명 */}
      {results.length > 0 && (
        <div className="tab-description">
          {activeTab === 'triple' ? (
            <p>RSI &lt; 30 <strong>AND</strong> MFI &lt; 30 <strong>AND</strong> 볼린저 밴드 하단 터치</p>
          ) : (
            <p>볼린저 밴드 하단 터치 종목</p>
          )}
        </div>
      )}

      {/* 분석 결과 테이블 */}
      <ResultTable
        results={currentResults}
        activeTab={activeTab}
        onRemoveTicker={(ticker) => handleRemoveTicker(ticker, true)} // 결과 테이블에서 삭제 시 프리셋에서도 삭제할지? 기존 로직은 true였음
        isAnalyzing={isAnalyzing}
        failedTickers={failedTickers}
        onRetryFailed={retryFailedTickers}
      />

      {/* 설정 모달 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={updateSettings}
        onReset={resetSettings}
      />
    </div>
  );
}
