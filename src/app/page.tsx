"use client";

import React, { useState } from 'react';
import { Settings, Rocket, Play, Pause, Square, RotateCcw, Download, Save, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useMarketData, useTickers, useAnalysis, useAppLifecycle, useSettings } from '@/hooks';
import { MarketIndicators, TickerInput, AnalysisProgress, ResultTable, SettingsModal } from '@/components';
import { isNativeEnvironment } from '@/lib/utils/platform';

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
    // analysisMode,
    // setAnalysisMode,
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
    <div className="max-w-[1100px] mx-auto px-4 py-5 relative min-h-screen">
      <button
        className="absolute top-10 left-5 glass rounded-full w-11 h-11 flex items-center justify-center text-text-sub hover:rotate-90 hover:bg-white hover:text-primary transition-all duration-300 z-[100]"
        onClick={() => setIsSettingsOpen(true)}
        title="설정"
      >
        <Settings size={22} />
      </button>

      {/* 시장 지표 위젯 */}
      <MarketIndicators data={marketIndicators} />

      <h1 className="text-center text-text-main mb-8 text-3xl font-black tracking-tight drop-shadow-sm">
        Stock Technical Analysis
        {isNative && <span className="text-[0.8rem] bg-primary text-white px-2.5 py-1 rounded-xl align-middle ml-2.5 font-bold shadow-sm">App</span>}
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
      <div className="flex justify-center gap-4 mb-8 flex-wrap">
        {!isAnalyzing ? (
          <button
            className="px-8 py-4 rounded-full text-base font-bold transition-all duration-300 shadow-md shadow-primary/20 flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:grayscale disabled:transform-none"
            onClick={() => runAnalysis()}
            disabled={tickers.length === 0}
          >
            <Rocket size={20} /> 전체 분석 시작 ({tickers.length}개)
          </button>
        ) : (
          <>
            <button
              className="px-8 py-4 rounded-full text-base font-bold transition-all duration-300 shadow-md shadow-orange-500/20 flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:-translate-y-0.5 hover:shadow-lg"
              onClick={togglePause}
            >
              {isPaused ? <><Play size={20} /> 재개</> : <><Pause size={20} /> 일시 중지</>}
            </button>
            <button
              className="px-8 py-4 rounded-full text-base font-bold transition-all duration-300 shadow-md shadow-accent/20 flex items-center gap-2 bg-gradient-to-r from-accent to-orange-500 text-white hover:-translate-y-0.5 hover:shadow-lg"
              onClick={stopAnalysis}
            >
              <Square size={20} /> 중지
            </button>
          </>
        )}

        {failedTickers.length > 0 && !isAnalyzing && (
          <button
            className="px-8 py-4 rounded-full text-base font-bold transition-all duration-300 shadow-md shadow-emerald-500/20 flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:-translate-y-0.5 hover:shadow-lg"
            onClick={retryFailedTickers}
          >
            <RotateCcw size={20} /> 실패 재시도 ({failedTickers.length}개)
          </button>
        )}
      </div>

      {/* 진행 상황 프로세스 바 */}
      <AnalysisProgress progress={progress} isAnalyzing={isAnalyzing} />

      {/* 등록된 티커 목록 */}
      <div className="bg-white p-6 rounded-xl mb-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-5 border-b border-gray-50 pb-4">
          <h3 className="text-lg text-text-main font-black">등록된 티커 ({tickers.length}개)</h3>
          <div className="flex gap-2">
            <button
              className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all duration-200 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1.5"
              onClick={loadPresetTickers}
              disabled={isAnalyzing}
            >
              <Download size={14} /> 프리셋 로드
            </button>
            <button
              className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all duration-200 bg-gray-50 text-text-sub hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5"
              onClick={saveAsPreset}
              disabled={isAnalyzing}
            >
              <Save size={14} /> 프리셋 저장
            </button>
            <button
              className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all duration-200 bg-accent/5 text-accent hover:bg-accent/10 disabled:opacity-50 flex items-center gap-1.5"
              onClick={clearAllTickers}
              disabled={tickers.length === 0 || isAnalyzing}
            >
              <Trash2 size={14} /> 전체 삭제
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {(showAllTickers ? tickers : tickers.slice(0, 10)).map(ticker => (
            <span key={ticker} className="bg-gray-50 px-4 py-2 rounded-full text-[0.9rem] text-text-main font-bold border border-gray-200 flex items-center gap-2.5 transition-all duration-200 hover:bg-white hover:border-primary hover:scale-105 hover:shadow-sm">
              {ticker}
              <button
                className="w-5 h-5 rounded-full bg-accent text-white text-[10px] flex items-center justify-center hover:opacity-80 disabled:opacity-50"
                onClick={() => handleRemoveTicker(ticker)}
                disabled={isAnalyzing}
              >
                ×
              </button>
            </span>
          ))}
          {tickers.length > 10 && !showAllTickers && (
            <button
              className="bg-gradient-to-r from-primary to-secondary text-white rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 hover:opacity-90 shadow-sm"
              onClick={() => setShowAllTickers(true)}
            >
              <ChevronRight size={14} className="inline mr-1" /> {tickers.length - 10}개 더보기
            </button>
          )}
          {tickers.length > 10 && showAllTickers && (
            <button
              className="bg-gradient-to-r from-primary to-secondary text-white rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 hover:opacity-90 shadow-sm"
              onClick={() => setShowAllTickers(false)}
            >
              <ChevronDown size={14} className="inline mr-1" /> 접기
            </button>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 (결과 있을 때만 표시) */}
      {results.length > 0 && (
        <div className="flex gap-2.5 mb-0 px-2 relative z-10 top-px">
          <button
            className={`flex-1 p-4 rounded-t-xl font-black transition-all duration-300 border-x border-t border-b-0 ${activeTab === 'triple' ? 'bg-white text-primary border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-20 relative' : 'bg-white/40 text-text-sub border-transparent'}`}
            onClick={() => setActiveTab('triple')}
          >
            🎯 트리플 시그널
            {tripleSignalResults.length > 0 && (
              <span className="bg-accent text-white px-2 py-0.5 rounded-full text-[10px] align-middle ml-2">{tripleSignalResults.length}</span>
            )}
          </button>
          <button
            className={`flex-1 p-4 rounded-t-xl font-black transition-all duration-300 border-x border-t border-b-0 ${activeTab === 'bb' ? 'bg-white text-primary border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-20 relative' : 'bg-white/40 text-text-sub border-transparent'}`}
            onClick={() => setActiveTab('bb')}
          >
            📊 볼린저 밴드
            {bbOnlyResults.length > 0 && (
              <span className="bg-accent text-white px-2 py-0.5 rounded-full text-[10px] align-middle ml-2">{bbOnlyResults.length}</span>
            )}
          </button>
        </div>
      )}

      {/* 탭 설명 */}
      {results.length > 0 && (
        <div className="bg-white p-4 text-center text-text-sub text-[0.85rem] border-b border-gray-100 border-x border-gray-100 mb-0 relative z-[15] font-medium">
          {activeTab === 'triple' ? (
            <p>RSI &lt; {settings.rsiTripleSignal} <span className="text-primary font-bold mx-1">AND</span> MFI &lt; {settings.mfiTripleSignal} <span className="text-primary font-bold mx-1">AND</span> 볼린저 밴드 하단 터치</p>
          ) : (
            <p>볼린저 밴드 하단 터치 종목</p>
          )}
        </div>
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
