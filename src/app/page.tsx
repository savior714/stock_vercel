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

  // 1. Market Data Hook
  const { marketIndicators } = useMarketData();

  // 2. Ticker Management Hook
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

  // 2.5 Settings Hook
  const { settings, updateSettings, resetSettings } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 3. Analysis Management Hook
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

  // Ticker Removal Handler (Remove from both list and results)
  const handleRemoveTicker = (ticker: string, removeFromPreset: boolean = false) => {
    removeTicker(ticker, removeFromPreset); // Hook: Remove from ticker list
    removeResult(ticker); // Hook: Remove from analysis results
  };

  // App Lifecycle Handling (Stop analysis on Back button)
  useAppLifecycle({
    onBack: () => {
      if (isAnalyzing) {
        stopAnalysis();
      }
    }
  });

  // Keyboard Enter Handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTicker();
    }
  };

  // Result Filtering (Triple Signal vs Bollinger Bands)
  const tripleSignalResults = results.filter(r => r.alert); // alert field indicates Triple Signal match
  const bbOnlyResults = results.filter(r => r.bb_touch);
  const currentResults = activeTab === 'triple' ? tripleSignalResults : bbOnlyResults;

  return (
    <div className="app-container app-main-layout">
      {/* Settings trigger button */}
      <button
        className="settings-trigger-btn"
        onClick={() => setIsSettingsOpen(true)}
      >
        <Settings size={22} />
      </button>

      {/* Market Indicators Widget */}
      <MarketIndicators data={marketIndicators} />

      <header className="page-header">
        <h1 className="page-title">
          주식 분석
          {isNative && <span className="environment-badge">App</span>}
        </h1>
      </header>

      {/* Ticker Input Section */}
      <TickerInput
        inputValue={inputValue}
        onInputChange={setInputValue}
        onAdd={addTicker}
        onKeyDown={handleKeyDown}
        isAnalyzing={isAnalyzing}
      />

      {/* Analysis Control Button System */}
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
              {isPaused ? <><Play size={20} /> 재개</> : <><Pause size={20} /> 일시 중단</>}
            </button>
            <button
              className="action-button btn-stop"
              onClick={stopAnalysis}
            >
              <Square size={20} /> 중단
            </button>
          </>
        )}

        {failedTickers.length > 0 && !isAnalyzing && (
          <button
            className="action-button btn-retry"
            onClick={retryFailedTickers}
          >
            <RotateCcw size={20} /> 재시도 ({failedTickers.length})
          </button>
        )}
      </div>

      {/* Analysis Progress Component */}
      <AnalysisProgress progress={progress} isAnalyzing={isAnalyzing} />

      {/* Ticker Management List */}
      <div className="ticker-list-container">
        <div className="ticker-list-header">
          <h3 className="ticker-list-title">나의 관심 종목 ({tickers.length})</h3>
          <div className="ticker-list-actions">
            <button
              className="list-action-btn btn-preset-load"
              onClick={() => loadPresetTickers(false)}
              disabled={isAnalyzing}
            >
              <Download size={14} /> 프리셋
            </button>
            <button
              className="list-action-btn btn-preset-save"
              onClick={saveAsPreset}
              disabled={isAnalyzing}
            >
              <Save size={14} /> 동기화
            </button>
            <button
              className="list-action-btn btn-clear-all"
              onClick={clearAllTickers}
              disabled={tickers.length === 0 || isAnalyzing}
            >
              <Trash2 size={14} /> 초기화
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
                <><ChevronDown size={14} style={{ marginRight: '4px' }} /> 접기</> :
                <><ChevronRight size={14} style={{ marginRight: '4px' }} /> +{tickers.length - 10}개 더보기</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Analysis Result Filtering Tabs (Ark UI) */}
      {results.length > 0 && (
        <Tabs.Root
          value={activeTab}
          onValueChange={(details: { value: string }) => setActiveTab(details.value as TabType)}
          className="tabs-root"
        >
          <Tabs.List className="tabs-list">
            <Tabs.Trigger value="triple" className="tabs-trigger">
              🎯 트리플 시그널
              {tripleSignalResults.length > 0 && (
                <span className="tab-badge">{tripleSignalResults.length}</span>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="bb" className="tabs-trigger">
              📊 볼린저 밴드
              {bbOnlyResults.length > 0 && (
                <span className="tab-badge">{bbOnlyResults.length}</span>
              )}
            </Tabs.Trigger>
          </Tabs.List>

          <div className="tab-description-box">
            <Tabs.Content value="triple">
              <p>RSI &lt; {settings.rsiTripleSignal} <span style={{ color: '#667eea', fontWeight: 'bold' }}>그리고</span> MFI &lt; {settings.mfiTripleSignal} <span style={{ color: '#667eea', fontWeight: 'bold' }}>그리고</span> BB 하단 터치</p>
            </Tabs.Content>
            <Tabs.Content value="bb">
              <p>볼린저 밴드 하단 터치 종목</p>
            </Tabs.Content>
          </div>
        </Tabs.Root>
      )}

      {/* Analysis Result Table */}
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

      {/* Settings Modal */}
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
