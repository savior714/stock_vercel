'use client';

import { useState, useEffect, useRef } from 'react';
import { analyzeTicker as analyzeTickerTauri, isTauriEnvironment } from '../lib/tauri-analysis';

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
type AnalysisModeType = 'server' | 'tauri';

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

  // 분석 모드 관련 상태
  // 분석 모드 관련 상태 (초기값 설정으로 단순화)
  const isTauriEnv = isTauriEnvironment();
  const [analysisMode, setAnalysisMode] = useState<AnalysisModeType>(isTauriEnv ? 'tauri' : 'server');
  const [isTauri, setIsTauri] = useState(isTauriEnv);

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

  // localStorage에서 티커 목록 로드 및 Tauri 감지
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

  const [progress, setProgress] = useState<{ current: number; total: number; currentTicker: string } | null>(null);
  const [failedTickers, setFailedTickers] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // useRef로 최신 상태 참조 (클로저 문제 해결)
  const isPausedRef = useRef(false);
  const shouldStopRef = useRef(false);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 일시정지/중지 토글 함수
  const togglePauseRef = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  };

  const stopAnalysisRef = () => {
    shouldStopRef.current = true;
    setShouldStop(true);
    abortControllerRef.current?.abort();
  };

  // 배치 처리 + 100% 성공률 재시도 함수
  const runAnalysisWithFullRetry = async () => {
    if (tickers.length === 0) return;

    if (tickers.length === 0) return;

    setIsAnalyzing(true);
    setShouldStop(false);
    shouldStopRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setResults([]);
    setFailedTickers([]);
    abortControllerRef.current = new AbortController(); // 중지 버튼용

    const totalTickers = tickers.length;

    // ======== Tauri 모드: Rust 백엔드 직접 호출 ========
    if (analysisMode === 'tauri') {
      console.log(`🚀 Tauri native analysis started with ${totalTickers} tickers`);

      try {
        const tauriResults: AnalysisResult[] = [];

        for (let i = 0; i < tickers.length; i++) {
          if (shouldStopRef.current) break;

          const ticker = tickers[i];
          setProgress({ current: i, total: totalTickers, currentTicker: ticker });

          // Tauri Rust 함수 호출
          try {
            const r = await analyzeTickerTauri(ticker);

            const convertedResult: AnalysisResult = {
              ticker: r.ticker,
              alert: r.tripleSignal,
              rsi: r.rsi,
              mfi: r.mfi,
              bb_touch: r.bollingerPosition === 'below',
              price: r.currentPrice,
              error: r.error
            };

            tauriResults.push(convertedResult);

            // 결과 실시간 업데이트 (하나씩 추가)
            setResults(prev => {
              const filtered = prev.filter(p => p.ticker !== ticker);
              return [...filtered, convertedResult];
            });

            // 실패 티커 수집
            if (r.error) {
              setFailedTickers(prev => [...prev, ticker]);
            }

          } catch (err) {
            console.error(`Tauri analysis error for ${ticker}:`, err);
            const errorResult: AnalysisResult = {
              ticker,
              alert: false,
              error: err instanceof Error ? err.message : 'Tauri Error'
            };
            tauriResults.push(errorResult);
            setResults(prev => [...prev.filter(p => p.ticker !== ticker), errorResult]);
            setFailedTickers(prev => [...prev, ticker]);
          }

          // 약간의 지연 (UI 업데이트 및 과부하 방지)
          await delay(100);
        }

        if (shouldStopRef.current) {
          setProgress({
            current: tauriResults.length,
            total: totalTickers,
            currentTicker: `⏹️ 중지됨 (${tauriResults.length}/${totalTickers} 완료)`
          });
        } else {
          setProgress({
            current: totalTickers,
            total: totalTickers,
            currentTicker: `✅ 완료! (${tauriResults.length}/${totalTickers} 처리됨)`
          });
        }
        await delay(2000);
      } catch (error) {
        console.error('Tauri analysis failed:', error);
        setProgress({ current: 0, total: totalTickers, currentTicker: '❌ Tauri 오류 발생' });
      } finally {
        setIsAnalyzing(false);
        setIsPaused(false);
        setTimeout(() => setProgress(null), 3000);
      }
    }
    return;

    // ======== 서버 모드: 기존 Vercel API 사용 ========
    const BATCH_SIZE = 3; // 배치 크기 축소 (일시정지 반응성 향상)
    let allSuccessfulResults: AnalysisResult[] = [];
    let retryRound = 0;
    const MAX_ROUNDS = 3; // 재시도 라운드 제한 (무한 루프 방지)

    // 1. 티커를 배치로 분할
    const batches: string[][] = [];
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      batches.push(tickers.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Total ${totalTickers} tickers split into ${batches.length} batches (${BATCH_SIZE} each)`);

    try {
      // 2. 각 배치 처리
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (shouldStopRef.current) break;

        // 일시정지 확인 (배치 시작 전)
        console.log(`🔍 Batch ${batchIndex + 1}: Checking pause state, isPaused=${isPausedRef.current}`);
        while (isPausedRef.current && !shouldStopRef.current) {
          console.log(`⏸️ Batch ${batchIndex + 1}: PAUSED, waiting...`);
          setProgress(prev => prev ? { ...prev, currentTicker: '⏸️ 일시 중지됨...' } : null);
          await delay(500);
        }
        console.log(`▶️ Batch ${batchIndex + 1}: Resumed or never paused, isPaused=${isPausedRef.current}`);

        if (shouldStopRef.current) break;

        const batch = batches[batchIndex];
        let tickersToAnalyze = [...batch];
        let batchRetryRound = 0;

        console.log(`\n🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} tickers)`);

        // 3. 배치 내에서 재시도 루프
        while (tickersToAnalyze.length > 0 && batchRetryRound < MAX_ROUNDS && !shouldStopRef.current) {
          // 일시정지 확인 (재시도 루프 시작 시)
          while (isPausedRef.current && !shouldStopRef.current) {
            setProgress(prev => prev ? { ...prev, currentTicker: '⏸️ 일시 중지됨...' } : null);
            await delay(500);
          }

          if (shouldStopRef.current) break;

          if (batchRetryRound > 0) {
            const waitTime = Math.min(5000 * batchRetryRound, 30000);
            setProgress({
              current: allSuccessfulResults.length,
              total: totalTickers,
              currentTicker: `🔄 배치 ${batchIndex + 1} 재시도 라운드 ${batchRetryRound} - ${waitTime / 1000}초 대기... (남은: ${tickersToAnalyze.length}개)`
            });

            const startTime = Date.now();
            while (Date.now() - startTime < waitTime && !shouldStopRef.current) {
              if (isPausedRef.current) {
                while (isPausedRef.current && !shouldStopRef.current) {
                  await delay(500);
                }
              }
              if (shouldStopRef.current) break;
              await delay(500);
            }
          }

          if (shouldStopRef.current) break;

          // 일시정지 확인 (배치 API 호출 전)
          while (isPaused && !shouldStop) {
            setProgress(prev => prev ? { ...prev, currentTicker: '⏸️ 일시 중지됨...' } : null);
            await delay(500);
          }

          if (shouldStop) break;

          // 4. 배치 API 호출
          setProgress({
            current: allSuccessfulResults.length,
            total: totalTickers,
            currentTicker: `📦 배치 ${batchIndex + 1}/${batches.length} 분석 중... (${tickersToAnalyze.length}개)`
          });

          try {
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tickers: tickersToAnalyze }),
              signal: abortControllerRef.current?.signal // 중지 버튼으로 fetch 취소 가능
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Batch API error:', errorData);
              break;
            }

            const data = await response.json();
            const roundResults = data.results || [];

            // 5. 성공/실패 분리
            const successful = roundResults.filter((r: AnalysisResult) =>
              !r.error || !r.error.includes('API_RATE_LIMIT')
            );
            const failed = roundResults.filter((r: AnalysisResult) =>
              r.error?.includes('API_RATE_LIMIT')
            );

            // 성공한 결과 누적
            allSuccessfulResults.push(...successful);
            setResults([...allSuccessfulResults]);

            // 다음 라운드용 실패 티커 (Rate Limit만)
            tickersToAnalyze = failed.map((r: AnalysisResult) => r.ticker);
            setFailedTickers(tickersToAnalyze);

            console.log(`✅ Batch ${batchIndex + 1} Round ${batchRetryRound + 1}: ${successful.length} success, ${failed.length} rate-limited`);

            // Rate Limit이 아닌 에러는 로그만 출력
            const otherErrors = roundResults.filter((r: AnalysisResult) =>
              r.error && !r.error.includes('API_RATE_LIMIT')
            );
            if (otherErrors.length > 0) {
              console.warn(`⚠️ Non-rate-limit errors:`, otherErrors.map((r: AnalysisResult) => `${r.ticker}: ${r.error}`));
            }

            batchRetryRound++;

            if (tickersToAnalyze.length === 0) {
              break; // 배치 완료
            }

            // 최대 재시도 도달 시 경고
            if (batchRetryRound >= MAX_ROUNDS && tickersToAnalyze.length > 0) {
              console.warn(`⚠️ Batch ${batchIndex + 1} reached MAX_ROUNDS (${MAX_ROUNDS}). Skipping ${tickersToAnalyze.length} tickers:`, tickersToAnalyze);
              break;
            }
          } catch (error) {
            // AbortError는 정상적인 중지이므로 루프 종료
            if (error instanceof Error && error.name === 'AbortError') {
              console.log(`Batch ${batchIndex + 1} aborted by user`);
              break;
            }
            // TypeError: Failed to fetch는 네트워크 에러이므로 재시도
            if (error instanceof TypeError && error.message.includes('fetch')) {
              console.warn(`Batch ${batchIndex + 1} network error, will retry:`, error);
              // 재시도를 위해 break하지 않음
              batchRetryRound++;
              if (batchRetryRound >= MAX_ROUNDS) {
                console.error(`Batch ${batchIndex + 1} max retries exceeded`);
                break;
              }
              continue; // 다음 재시도 라운드로
            }
            // 기타 에러는 로그만 출력하고 계속 진행
            console.error(`Batch ${batchIndex + 1} error:`, error);
            break;
          }

          // 중지 확인 (배치 API 호출 후)
          if (shouldStopRef.current) break;
        }

        // 6. 배치 간 대기 (5초, 일시정지/중지 체크 포함)
        if (batchIndex < batches.length - 1 && !shouldStopRef.current) {
          setProgress({
            current: allSuccessfulResults.length,
            total: totalTickers,
            currentTicker: `⏸️ 다음 배치 전 5초 대기... (${allSuccessfulResults.length}/${totalTickers} 완료)`
          });

          // 5초 대기 중에도 일시정지/중지 체크
          const startTime = Date.now();
          while (Date.now() - startTime < 5000 && !shouldStopRef.current) {
            // 일시정지 체크
            if (isPausedRef.current) {
              setProgress(prev => prev ? { ...prev, currentTicker: '⏸️ 일시 중지됨...' } : null);
              while (isPausedRef.current && !shouldStopRef.current) {
                await delay(500);
              }
              // 재개되면 대기 시간 초기화하지 않고 계속 진행
            }
            if (shouldStopRef.current) break;
            await delay(500);
          }
        }
      }

      // 7. 최종 결과 표시
      if (shouldStopRef.current) {
        // 중지된 경우
        setProgress({
          current: allSuccessfulResults.length,
          total: totalTickers,
          currentTicker: `⏹️ 중지됨 (${allSuccessfulResults.length}/${totalTickers} 완료)`
        });
      } else {
        // 정상 완료된 경우
        setProgress({
          current: allSuccessfulResults.length,
          total: totalTickers,
          currentTicker: `✅ 완료! (${allSuccessfulResults.length}/${totalTickers} 성공)`
        });
      }
      await delay(2000); // 메시지 표시 시간 증가
    } catch (error) {
      console.error('Analysis failed:', error);
      // AbortError는 정상적인 중지이므로 별도 처리
      if (error instanceof Error && error.name === 'AbortError') {
        setProgress({
          current: allSuccessfulResults.length,
          total: totalTickers,
          currentTicker: `⏹️ 중지됨 (${allSuccessfulResults.length}/${totalTickers} 완료)`
        });
      } else {
        setProgress({ current: 0, total: totalTickers, currentTicker: '❌ 오류 발생' });
      }
    } finally {
      setIsAnalyzing(false);
      setIsPaused(false);
      setTimeout(() => setProgress(null), 3000); // 메시지 표시 시간 증가
    }
  };



  const runAnalysis = async (tickersToAnalyze?: string[]) => {
    const targetTickers = tickersToAnalyze || tickers;
    if (targetTickers.length === 0) return;

    setIsAnalyzing(true);
    setShouldStop(false);
    setIsPaused(false);
    // 새로운 AbortController 생성
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (!tickersToAnalyze) {
      setResults([]); // 새 분석 시작 시에만 초기화
      setFailedTickers([]);
    }
    // 초기 진행률 표시 (0%로 시작)
    setProgress({ current: 0, total: targetTickers.length, currentTicker: '준비 중...' });

    try {
      // 클라이언트에서 순차 처리 (진행률 표시 및 서버 과부하/차단 방지)
      for (let i = 0; i < targetTickers.length; i++) {
        // 중지 요청 확인
        if (shouldStop) {
          setProgress({ current: i, total: targetTickers.length, currentTicker: '중지됨' });
          break;
        }

        // 일시 중지 확인
        while (isPaused && !shouldStop) {
          setProgress(prev => prev ? { ...prev, currentTicker: '일시 중지됨...' } : null);
          await delay(500);
        }

        if (shouldStop) break;

        const ticker = targetTickers[i];
        // 분석 시작 전에 진행률 업데이트
        setProgress({ current: i, total: targetTickers.length, currentTicker: ticker });

        // UI 업데이트를 위한 짧은 지연
        await delay(50);

        try {
          // 중지 요청 확인 (fetch 전)
          if (shouldStop) {
            break;
          }

          // 서버 API 호출
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: [ticker] }),
            signal: signal
          });

          if (response.status === 429) {
            setFailedTickers(prev => [...prev, ticker]);
            setResults(prev => [...prev, {
              ticker,
              alert: false,
              error: 'API_RATE_LIMIT: Yahoo Finance API가 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.'
            }]);
            setProgress({ current: i + 1, total: targetTickers.length, currentTicker: `${ticker} (429)` });
            continue;
          }

          const data = await response.json();
          if (data.results?.[0]) {
            const result = data.results[0];
            setResults(prev => {
              const filtered = prev.filter(r => r.ticker !== ticker);
              return [...filtered, result];
            });
            if (result.error) {
              setFailedTickers(prev => prev.includes(ticker) ? prev : [...prev, ticker]);
            }
          }

          // 완료 후 진행률 업데이트
          setProgress({ current: i + 1, total: targetTickers.length, currentTicker: ticker });
        } catch (err) {
          // 중지 요청으로 인한 에러는 정상 종료
          if (err instanceof Error && (err.message.includes('stopped by user') || err.name === 'AbortError')) {
            break;
          }
          console.error(`Failed to analyze ${ticker}:`, err);

          const errorResult: AnalysisResult = {
            ticker,
            alert: false,
            error: err instanceof Error ? err.message : '분석 실패'
          };
          setResults(prev => {
            const filtered = prev.filter(r => r.ticker !== ticker);
            return [...filtered, errorResult];
          });
          setFailedTickers(prev => prev.includes(ticker) ? prev : [...prev, ticker]);
          setProgress({ current: i + 1, total: targetTickers.length, currentTicker: `${ticker} (오류)` });
        }

        // 중지 요청 확인
        if (shouldStop) {
          break;
        }

        // 서버 429 방지를 위한 클라이언트 지연 (0.5초) - 중지/일시 중지 체크 포함
        if (i < targetTickers.length - 1) {
          const startTime = Date.now();
          while (Date.now() - startTime < 500) {
            if (shouldStop) {
              break;
            }
            if (isPaused) {
              while (isPaused && !shouldStop) {
                await delay(500);
              }
              if (shouldStop) {
                break;
              }
            }
            await delay(100);
          }
        }
      }

      // 모든 분석 완료
      if (!shouldStop) {
        setProgress({ current: targetTickers.length, total: targetTickers.length, currentTicker: '완료!' });
        await delay(500); // 완료 메시지를 잠시 보여줌
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setProgress({ current: 0, total: targetTickers.length, currentTicker: '오류 발생' });
    } finally {
      setIsAnalyzing(false);
      setIsPaused(false);
      // 완료 후 잠시 대기 후 진행률 숨김
      setTimeout(() => setProgress(null), 1000);
    }
  };

  // 실패한 티커만 재시도
  const retryFailedTickers = () => {
    if (failedTickers.length === 0) {
      alert('재시도할 실패한 티커가 없습니다.');
      return;
    }
    runAnalysis(failedTickers);
  };

  // 분석 중지
  const stopAnalysis = () => {
    shouldStopRef.current = true; // ref도 업데이트
    setShouldStop(true);
    isPausedRef.current = false;
    setIsPaused(false);
    // 진행 중인 fetch 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 분석 일시 중지/재개
  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current; // ref도 업데이트
    setIsPaused(isPausedRef.current);
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
          disabled={isAnalyzing}
        />
        <button onClick={addTicker} disabled={isAnalyzing}>추가</button>
        <button
          className="analyze-btn"
          onClick={() => runAnalysisWithFullRetry()}
          disabled={tickers.length === 0 || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className="spinner">⏳</span> 분석 중...
              {progress && ` (${progress.current}/${progress.total})`}
            </>
          ) : (
            '🚀 분석 실행'
          )}
        </button>
        {isAnalyzing && (
          <>
            <button
              className="pause-btn"
              onClick={togglePause}
            >
              {isPaused ? '▶️ 재개' : '⏸️ 일시 중지'}
            </button>
            <button
              className="stop-btn"
              onClick={stopAnalysis}
            >
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
      {(isAnalyzing || progress) && progress && (
        <div className="progress-container">
          <div className="progress-header">
            <span>
              분석 진행 중: <span className="progress-ticker">{progress.currentTicker}</span>
            </span>
            <span className="progress-count">
              {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(1, (progress.current / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

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
                <div className="error-header">
                  <h5>⚠️ 오류 종목 확인 ({results.filter(r => r.error).length}개)</h5>
                  {failedTickers.length > 0 && (
                    <button
                      className="retry-small-btn"
                      onClick={retryFailedTickers}
                    >
                      🔄 재시도
                    </button>
                  )}
                </div>
                <div className="error-list">
                  {results.filter(r => r.error).map(r => {
                    const isRateLimit = r.error?.includes('API_RATE_LIMIT');
                    const isBlocked = r.error?.includes('API_BLOCKED');
                    return (
                      <div key={r.ticker} className={`error-item ${isRateLimit ? 'rate-limit-error' : ''} ${isBlocked ? 'blocked-error' : ''}`}>
                        <strong>{r.ticker}</strong> - {r.error}
                        {isBlocked && (
                          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '0.9em' }}>
                            💡 <strong>해결 방법:</strong> Vercel API 서버를 통해 다시 시도해주세요.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
