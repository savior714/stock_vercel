"use client";

import React, { useState } from 'react';
import { Settings, Rocket, Play, Pause, Square, RotateCcw, Download, Save, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Tabs } from '@ark-ui/react';
import { useMarketData, useTickers, useAnalysis, useAppLifecycle, useSettings } from '@/hooks';
import { MarketIndicators, TickerInput, AnalysisProgress, ResultTable, SettingsModal } from '@/components';
import { isNativeEnvironment } from '@/lib/utils/platform';
import type { TabType } from '@/types';
import '../styles/components/TabNavigation.css';
import '../styles/components/MainPage.css';
import '../styles/components/TickerList.css';

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
    <div className="app-container app-main-layout">
      {/* 설정 트리거 버튼 */}
      <button
        className="settings-trigger-btn"
        onClick={() => setIsSettingsOpen(true)}
      >
        <Settings size={22} />
      </button>

      {/* 시장 지표 위젯 */}
      <MarketIndicators data={marketIndicators} />

      <header className="page-header">
        <h1 className="page-title">
          Stock Analysis
          {isNative && <span className="environment-badge">App</span>}
        </h1>
      </header>

      {/* 티커 입력 섹션 */}
      <TickerInput
        inputValue={inputValue}
        onInputChange={setInputValue}
        onAdd={addTicker}
        onKeyDown={handleKeyDown}
        isAnalyzing={isAnalyzing}
      />

      {/* 분석 제어 버튼 시스템 */}
      <div className="actions-bar">
        {!isAnalyzing ? (
          <button
            className="action-button btn-analyze"
            onClick={() => runAnalysis()}
            disabled={tickers.length === 0}
          >
            <Rocket size={20} /> 분석 시작 ({tickers.length})
          </button>
        ) : (
          <>
            <button
              className="action-button btn-pause"
              onClick={togglePause}
            >
              {isPaused ? <><Play size={20} /> 재개</> : <><Pause size={20} /> Pause</>}
            </button>
            <button
              className="action-button btn-stop"
              onClick={stopAnalysis}
            >
              <Square size={20} /> STOP
            </button>
          </>
        )}

        {failedTickers.length > 0 && !isAnalyzing && (
          <button
            className="action-button btn-retry"
            onClick={retryFailedTickers}
          >
            <RotateCcw size={20} /> Retry ({failedTickers.length})
          </button>
        )}
      </div>

      {/* 진행 상황 컴포넌트 */}
      <AnalysisProgress progress={progress} isAnalyzing={isAnalyzing} />

      {/* 티커 관리 리스트 */}
      <div className="ticker-list-container">
        <div className="ticker-list-header">
          <h3 className="ticker-list-title">My Watchlist ({tickers.length})</h3>
          <div className="ticker-list-actions">
            <button
              className="list-action-btn btn-preset-load"
              onClick={() => loadPresetTickers(false)}
              disabled={isAnalyzing}
            >
              <Download size={14} /> Presets
            </button>
            <button
              className="list-action-btn btn-preset-save"
              onClick={saveAsPreset}
              disabled={isAnalyzing}
            >
              <Save size={14} /> Sync
            </button>
            <button
              className="list-action-btn btn-clear-all"
              onClick={clearAllTickers}
              disabled={tickers.length === 0 || isAnalyzing}
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>

        <div className="ticker-tags-wrapper">
          {(showAllTickers ? tickers : tickers.slice(0, 10)).map(ticker => (
            <span key={ticker} className="ticker-tag">
              {ticker}
              <button
                className="ticker-remove-btn"
                onClick={() => handleRemoveTicker(ticker)}
                disabled={isAnalyzing}
              >
                ×
              </button>
            </span>
          ))}

          {tickers.length > 10 && (
            <button
              className="show-more-toggle"
              onClick={() => setShowAllTickers(!showAllTickers)}
            >
              {showAllTickers ?
                <><ChevronDown size={14} style={{ marginRight: '4px' }} /> Collapse</> :
                <><ChevronRight size={14} style={{ marginRight: '4px' }} /> +{tickers.length - 10} More</>
              }
            </button>
          )}
        </div>
      </div>

      {/* 결과 필터링 탭 (Ark UI) */}
      {results.length > 0 && (
        <Tabs.Root
          value={activeTab}
          onValueChange={(details: { value: string }) => setActiveTab(details.value as TabType)}
          className="tabs-root"
        >
          <Tabs.List className="tabs-list">
            <Tabs.Trigger value="triple" className="tabs-trigger">
              🎯 Triple Signal
              {tripleSignalResults.length > 0 && (
                <span className="tab-badge">{tripleSignalResults.length}</span>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="bb" className="tabs-trigger">
              📊 Bollinger Bands
              {bbOnlyResults.length > 0 && (
                <span className="tab-badge">{bbOnlyResults.length}</span>
              )}
            </Tabs.Trigger>
          </Tabs.List>

          <div className="tab-description-box">
            <Tabs.Content value="triple">
              <p>RSI &lt; {settings.rsiTripleSignal} <span style={{ color: '#667eea', fontWeight: 'bold' }}>AND</span> MFI &lt; {settings.mfiTripleSignal} <span style={{ color: '#667eea', fontWeight: 'bold' }}>AND</span> BB Lower Touch</p>
            </Tabs.Content>
            <Tabs.Content value="bb">
              <p>Bollinger Bands Lower Touch Symbols</p>
            </Tabs.Content>
          </div>
        </Tabs.Root>
      )}

      {/* 분석 결과 테이블 */}
      <ResultTable
        results={currentResults}
        activeTab={activeTab}
        isAnalyzing={isAnalyzing}
        failedTickers={failedTickers}
        onRetryFailed={retryFailedTickers}
        onRemove={handleRemoveTicker}
        settings={settings}
        totalResultsCount={results.filter(r => !r.error).length}
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
