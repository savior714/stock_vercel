'use client';

import { useState, useEffect, useRef } from 'react';

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

  // ?°ì´??ê²€ì¦???ê´€???íƒœ
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

  // localStorage?ì„œ ?°ì»¤ ëª©ë¡ ë¡œë“œ
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

  // ?°ì»¤ ëª©ë¡ ë³€ê²???localStorage???€??
  useEffect(() => {
    if (loaded && tickers.length >= 0) {
      localStorage.setItem('stock-tickers', JSON.stringify(tickers));
    }
  }, [tickers, loaded]);

  // ë§ˆì¼“ ?¸ë””ì¼€?´í„° ê°€?¸ì˜¤ê¸?
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
    // 5ë¶„ë§ˆ???…ë°?´íŠ¸
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

    // ?„ë¦¬?‹ì—?œë„ ?œê±° (?œë²„??ë°˜ì˜)
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
      // ?œë²„ ?„ë¦¬?‹ìœ¼ë¡?êµì²´ (ê¸°ì¡´ ?°ì»¤ ?€ì²?
      setTickers(data.presets || []);
      setResults([]); // ë¶„ì„ ê²°ê³¼??ì´ˆê¸°??
    } catch (error) {
      console.error('Failed to load preset tickers:', error);
    }
  };

  // ?„ì¬ ?°ì»¤ ëª©ë¡???„ë¦¬?‹ìœ¼ë¡??€??
  const saveAsPreset = async () => {
    if (tickers.length === 0) {
      alert('?€?¥í•  ?°ì»¤ê°€ ?†ìŠµ?ˆë‹¤.');
      return;
    }
    if (confirm(`?„ì¬ ${tickers.length}ê°??°ì»¤ë¥??„ë¦¬?‹ìœ¼ë¡??€?¥í•˜?œê² ?µë‹ˆê¹?`)) {
      try {
        const response = await fetch('/api/presets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presets: tickers })
        });
        const data = await response.json();
        if (data.success) {
          alert(`?„ë¦¬?‹ì´ ?€?¥ë˜?ˆìŠµ?ˆë‹¤. (${data.count}ê°?`);
        }
      } catch (error) {
        console.error('Failed to save preset:', error);
        alert('?„ë¦¬???€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.');
      }
    }
  };

  const clearAllTickers = () => {
    if (confirm('?•ë§ ëª¨ë“  ?°ì»¤ë¥??? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?')) {
      setTickers([]);
      setResults([]);
    }
  };

  const [progress, setProgress] = useState<{ current: number; total: number; currentTicker: string } | null>(null);
  const [failedTickers, setFailedTickers] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // useRefë¡?ìµœì‹  ?íƒœ ì°¸ì¡° (?´ë¡œ?€ ë¬¸ì œ ?´ê²°)
  const isPausedRef = useRef(false);
  const shouldStopRef = useRef(false);

  // ?íƒœ ë³€ê²???ref???…ë°?´íŠ¸
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    shouldStopRef.current = shouldStop;
  }, [shouldStop]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // ë°°ì¹˜ ì²˜ë¦¬ + 100% ?±ê³µë¥??¬ì‹œ???¨ìˆ˜
  const runAnalysisWithFullRetry = async () => {
    if (tickers.length === 0) return;

    setIsAnalyzing(true);
    setShouldStop(false);
    setIsPaused(false);
    setResults([]);
    setFailedTickers([]);
    abortControllerRef.current = new AbortController(); // ì¤‘ì? ë²„íŠ¼??

    const BATCH_SIZE = 3; // ë°°ì¹˜ ?¬ê¸° ì¶•ì†Œ (?¼ì‹œ?•ì? ë°˜ì‘???¥ìƒ)
    const totalTickers = tickers.length;
    let allSuccessfulResults: AnalysisResult[] = [];
    let retryRound = 0;
    const MAX_ROUNDS = 3; // ?¬ì‹œ???¼ìš´???œí•œ (ë¬´í•œ ë£¨í”„ ë°©ì?)

    // 1. ?°ì»¤ë¥?ë°°ì¹˜ë¡?ë¶„í• 
    const batches: string[][] = [];
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      batches.push(tickers.slice(i, i + BATCH_SIZE));
    }

    console.log(`?“¦ Total ${totalTickers} tickers split into ${batches.length} batches (${BATCH_SIZE} each)`);

    try {
      // 2. ê°?ë°°ì¹˜ ì²˜ë¦¬
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (shouldStopRef.current) break;

        // ?¼ì‹œ?•ì? ?•ì¸ (ë°°ì¹˜ ?œì‘ ??
        console.log(`?” Batch ${batchIndex + 1}: Checking pause state, isPaused=${isPausedRef.current}`);
        while (isPausedRef.current && !shouldStopRef.current) {
          console.log(`?¸ï¸ Batch ${batchIndex + 1}: PAUSED, waiting...`);
          setProgress(prev => prev ? { ...prev, currentTicker: '?¸ï¸ ?¼ì‹œ ì¤‘ì???..' } : null);
          await delay(500);
        }
        console.log(`?¶ï¸ Batch ${batchIndex + 1}: Resumed or never paused, isPaused=${isPausedRef.current}`);

        if (shouldStopRef.current) break;

        const batch = batches[batchIndex];
        let tickersToAnalyze = [...batch];
        let batchRetryRound = 0;

        console.log(`\n?”„ Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} tickers)`);

        // 3. ë°°ì¹˜ ?´ì—???¬ì‹œ??ë£¨í”„
        while (tickersToAnalyze.length > 0 && batchRetryRound < MAX_ROUNDS && !shouldStopRef.current) {
          // ?¼ì‹œ?•ì? ?•ì¸ (?¬ì‹œ??ë£¨í”„ ?œì‘ ??
          while (isPausedRef.current && !shouldStopRef.current) {
            setProgress(prev => prev ? { ...prev, currentTicker: '?¸ï¸ ?¼ì‹œ ì¤‘ì???..' } : null);
            await delay(500);
          }

          if (shouldStopRef.current) break;

          if (batchRetryRound > 0) {
            const waitTime = Math.min(5000 * batchRetryRound, 30000);
            setProgress({
              current: allSuccessfulResults.length,
              total: totalTickers,
              currentTicker: `?”„ ë°°ì¹˜ ${batchIndex + 1} ?¬ì‹œ???¼ìš´??${batchRetryRound} - ${waitTime / 1000}ì´??€ê¸?.. (?¨ì?: ${tickersToAnalyze.length}ê°?`
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

          // ?¼ì‹œ?•ì? ?•ì¸ (ë°°ì¹˜ API ?¸ì¶œ ??
          while (isPausedRef.current && !shouldStopRef.current) {
            setProgress(prev => prev ? { ...prev, currentTicker: '?¸ï¸ ?¼ì‹œ ì¤‘ì???..' } : null);
            await delay(500);
          }

          if (shouldStopRef.current) break;

          // 4. ë°°ì¹˜ API ?¸ì¶œ
          setProgress({
            current: allSuccessfulResults.length,
            total: totalTickers,
            currentTicker: `?“¦ ë°°ì¹˜ ${batchIndex + 1}/${batches.length} ë¶„ì„ ì¤?.. (${tickersToAnalyze.length}ê°?`
          });

          try {
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tickers: tickersToAnalyze }),
              signal: abortControllerRef.current?.signal // ì¤‘ì? ë²„íŠ¼?¼ë¡œ fetch ì·¨ì†Œ ê°€??
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Batch API error:', errorData);
              break;
            }

            const data = await response.json();
            const roundResults = data.results || [];

            // 5. ?±ê³µ/?¤íŒ¨ ë¶„ë¦¬
            const successful = roundResults.filter((r: AnalysisResult) =>
              !r.error || !r.error.includes('API_RATE_LIMIT')
            );
            const failed = roundResults.filter((r: AnalysisResult) =>
              r.error?.includes('API_RATE_LIMIT')
            );

            // ?±ê³µ??ê²°ê³¼ ?„ì 
            allSuccessfulResults.push(...successful);
            setResults([...allSuccessfulResults]);

            // ?¤ìŒ ?¼ìš´?œìš© ?¤íŒ¨ ?°ì»¤ (Rate Limitë§?
            tickersToAnalyze = failed.map((r: AnalysisResult) => r.ticker);
            setFailedTickers(tickersToAnalyze);

            console.log(`??Batch ${batchIndex + 1} Round ${batchRetryRound + 1}: ${successful.length} success, ${failed.length} rate-limited`);

            // Rate Limit???„ë‹Œ ?ëŸ¬??ë¡œê·¸ë§?ì¶œë ¥
            const otherErrors = roundResults.filter((r: AnalysisResult) =>
              r.error && !r.error.includes('API_RATE_LIMIT')
            );
            if (otherErrors.length > 0) {
              console.warn(`? ï¸ Non-rate-limit errors:`, otherErrors.map((r: AnalysisResult) => `${r.ticker}: ${r.error}`));
            }

            batchRetryRound++;

            if (tickersToAnalyze.length === 0) {
              break; // ë°°ì¹˜ ?„ë£Œ
            }

            // ìµœë? ?¬ì‹œ???„ë‹¬ ??ê²½ê³ 
            if (batchRetryRound >= MAX_ROUNDS && tickersToAnalyze.length > 0) {
              console.warn(`? ï¸ Batch ${batchIndex + 1} reached MAX_ROUNDS (${MAX_ROUNDS}). Skipping ${tickersToAnalyze.length} tickers:`, tickersToAnalyze);
              break;
            }
          } catch (error) {
            // AbortError???•ìƒ?ì¸ ì¤‘ì??´ë?ë¡?ë£¨í”„ ì¢…ë£Œ
            if (error instanceof Error && error.name === 'AbortError') {
              console.log(`Batch ${batchIndex + 1} aborted by user`);
              break;
            }
            // TypeError: Failed to fetch???¤íŠ¸?Œí¬ ?ëŸ¬?´ë?ë¡??¬ì‹œ??
            if (error instanceof TypeError && error.message.includes('fetch')) {
              console.warn(`Batch ${batchIndex + 1} network error, will retry:`, error);
              // ?¬ì‹œ?„ë? ?„í•´ break?˜ì? ?ŠìŒ
              batchRetryRound++;
              if (batchRetryRound >= MAX_ROUNDS) {
                console.error(`Batch ${batchIndex + 1} max retries exceeded`);
                break;
              }
              continue; // ?¤ìŒ ?¬ì‹œ???¼ìš´?œë¡œ
            }
            // ê¸°í? ?ëŸ¬??ë¡œê·¸ë§?ì¶œë ¥?˜ê³  ê³„ì† ì§„í–‰
            console.error(`Batch ${batchIndex + 1} error:`, error);
            break;
          }

          // ì¤‘ì? ?•ì¸ (ë°°ì¹˜ API ?¸ì¶œ ??
          if (shouldStopRef.current) break;
        }

        // 6. ë°°ì¹˜ ê°??€ê¸?(5ì´? ?¼ì‹œ?•ì?/ì¤‘ì? ì²´í¬ ?¬í•¨)
        if (batchIndex < batches.length - 1 && !shouldStopRef.current) {
          setProgress({
            current: allSuccessfulResults.length,
            total: totalTickers,
            currentTicker: `?¸ï¸ ?¤ìŒ ë°°ì¹˜ ??5ì´??€ê¸?.. (${allSuccessfulResults.length}/${totalTickers} ?„ë£Œ)`
          });

          // 5ì´??€ê¸?ì¤‘ì—???¼ì‹œ?•ì?/ì¤‘ì? ì²´í¬
          const startTime = Date.now();
          while (Date.now() - startTime < 5000 && !shouldStopRef.current) {
            // ?¼ì‹œ?•ì? ì²´í¬
            if (isPausedRef.current) {
              setProgress(prev => prev ? { ...prev, currentTicker: '?¸ï¸ ?¼ì‹œ ì¤‘ì???..' } : null);
              while (isPausedRef.current && !shouldStopRef.current) {
                await delay(500);
              }
              // ?¬ê°œ?˜ë©´ ?€ê¸??œê°„ ì´ˆê¸°?”í•˜ì§€ ?Šê³  ê³„ì† ì§„í–‰
            }
            if (shouldStopRef.current) break;
            await delay(500);
          }
        }
      }

      // 7. ìµœì¢… ê²°ê³¼ ?œì‹œ
      if (shouldStop) {
        // ì¤‘ì???ê²½ìš°
        setProgress({
          current: allSuccessfulResults.length,
          total: totalTickers,
          currentTicker: `?¹ï¸ ì¤‘ì???(${allSuccessfulResults.length}/${totalTickers} ?„ë£Œ)`
        });
      } else {
        // ?•ìƒ ?„ë£Œ??ê²½ìš°
        setProgress({
          current: allSuccessfulResults.length,
          total: totalTickers,
          currentTicker: `???„ë£Œ! (${allSuccessfulResults.length}/${totalTickers} ?±ê³µ)`
        });
      }
      await delay(2000); // ë©”ì‹œì§€ ?œì‹œ ?œê°„ ì¦ê?
    } catch (error) {
      console.error('Analysis failed:', error);
      // AbortError???•ìƒ?ì¸ ì¤‘ì??´ë?ë¡?ë³„ë„ ì²˜ë¦¬
      if (error instanceof Error && error.name === 'AbortError') {
        setProgress({
          current: allSuccessfulResults.length,
          total: totalTickers,
          currentTicker: `?¹ï¸ ì¤‘ì???(${allSuccessfulResults.length}/${totalTickers} ?„ë£Œ)`
        });
      } else {
        setProgress({ current: 0, total: totalTickers, currentTicker: '???¤ë¥˜ ë°œìƒ' });
      }
    } finally {
      setIsAnalyzing(false);
      setIsPaused(false);
      setTimeout(() => setProgress(null), 3000); // ë©”ì‹œì§€ ?œì‹œ ?œê°„ ì¦ê?
    }
  };



  const runAnalysis = async (tickersToAnalyze?: string[]) => {
    const targetTickers = tickersToAnalyze || tickers;
    if (targetTickers.length === 0) return;

    setIsAnalyzing(true);
    setShouldStop(false);
    setIsPaused(false);
    // ?ˆë¡œ??AbortController ?ì„±
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (!tickersToAnalyze) {
      setResults([]); // ??ë¶„ì„ ?œì‘ ?œì—ë§?ì´ˆê¸°??
      setFailedTickers([]);
    }
    // ì´ˆê¸° ì§„í–‰ë¥??œì‹œ (0%ë¡??œì‘)
    setProgress({ current: 0, total: targetTickers.length, currentTicker: 'ì¤€ë¹?ì¤?..' });

    try {
      // ?´ë¼?´ì–¸?¸ì—???œì°¨ ì²˜ë¦¬ (ì§„í–‰ë¥??œì‹œ ë°??œë²„ ê³¼ë???ì°¨ë‹¨ ë°©ì?)
      for (let i = 0; i < targetTickers.length; i++) {
        // ì¤‘ì? ?”ì²­ ?•ì¸
        if (shouldStop) {
          setProgress({ current: i, total: targetTickers.length, currentTicker: 'ì¤‘ì??? });
          break;
        }

        // ?¼ì‹œ ì¤‘ì? ?•ì¸
        while (isPausedRef.current && !shouldStopRef.current) {
          setProgress(prev => prev ? { ...prev, currentTicker: '?¼ì‹œ ì¤‘ì???..' } : null);
          await delay(500);
        }

        if (shouldStopRef.current) break;

        const ticker = targetTickers[i];
        // ë¶„ì„ ?œì‘ ?„ì— ì§„í–‰ë¥??…ë°?´íŠ¸
        setProgress({ current: i, total: targetTickers.length, currentTicker: ticker });

        // UI ?…ë°?´íŠ¸ë¥??„í•œ ì§§ì? ì§€??
        await delay(50);

        try {
          // ì¤‘ì? ?”ì²­ ?•ì¸ (fetch ??
          if (shouldStop) {
            break;
          }

          // ?œë²„ API ?¸ì¶œ
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
              error: 'API_RATE_LIMIT: Yahoo Finance APIê°€ ?¼ì‹œ?ìœ¼ë¡?ì°¨ë‹¨?˜ì—ˆ?µë‹ˆ?? ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.'
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

          // ?„ë£Œ ??ì§„í–‰ë¥??…ë°?´íŠ¸
          setProgress({ current: i + 1, total: targetTickers.length, currentTicker: ticker });
        } catch (err) {
          // ì¤‘ì? ?”ì²­?¼ë¡œ ?¸í•œ ?ëŸ¬???•ìƒ ì¢…ë£Œ
          if (err instanceof Error && (err.message.includes('stopped by user') || err.name === 'AbortError')) {
            break;
          }
          console.error(`Failed to analyze ${ticker}:`, err);

          const errorResult: AnalysisResult = {
            ticker,
            alert: false,
            error: err instanceof Error ? err.message : 'ë¶„ì„ ?¤íŒ¨'
          };
          setResults(prev => {
            const filtered = prev.filter(r => r.ticker !== ticker);
            return [...filtered, errorResult];
          });
          setFailedTickers(prev => prev.includes(ticker) ? prev : [...prev, ticker]);
          setProgress({ current: i + 1, total: targetTickers.length, currentTicker: `${ticker} (?¤ë¥˜)` });
        }

        // ì¤‘ì? ?”ì²­ ?•ì¸
        if (shouldStop) {
          break;
        }

        // ?œë²„ 429 ë°©ì?ë¥??„í•œ ?´ë¼?´ì–¸??ì§€??(0.5ì´? - ì¤‘ì?/?¼ì‹œ ì¤‘ì? ì²´í¬ ?¬í•¨
        if (i < targetTickers.length - 1) {
          const startTime = Date.now();
          while (Date.now() - startTime < 500) {
            if (shouldStop) {
              break;
            }
            if (isPausedRef.current) {
              while (isPausedRef.current && !shouldStopRef.current) {
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

      // ëª¨ë“  ë¶„ì„ ?„ë£Œ
      if (!shouldStop) {
        setProgress({ current: targetTickers.length, total: targetTickers.length, currentTicker: '?„ë£Œ!' });
        await delay(500); // ?„ë£Œ ë©”ì‹œì§€ë¥?? ì‹œ ë³´ì—¬ì¤?
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setProgress({ current: 0, total: targetTickers.length, currentTicker: '?¤ë¥˜ ë°œìƒ' });
    } finally {
      setIsAnalyzing(false);
      setIsPaused(false);
      // ?„ë£Œ ??? ì‹œ ?€ê¸???ì§„í–‰ë¥??¨ê?
      setTimeout(() => setProgress(null), 1000);
    }
  };

  // ?¤íŒ¨???°ì»¤ë§??¬ì‹œ??
  const retryFailedTickers = () => {
    if (failedTickers.length === 0) {
      alert('?¬ì‹œ?„í•  ?¤íŒ¨???°ì»¤ê°€ ?†ìŠµ?ˆë‹¤.');
      return;
    }
    runAnalysis(failedTickers);
  };

  // ë¶„ì„ ì¤‘ì?
  const stopAnalysis = () => {
    setShouldStop(true);
    setIsPaused(false);
    // ì§„í–‰ ì¤‘ì¸ fetch ?”ì²­ ì·¨ì†Œ
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // ë¶„ì„ ?¼ì‹œ ì¤‘ì?/?¬ê°œ
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // ?°ì´??ê²€ì¦??¨ìˆ˜
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
      setDebugError(error instanceof Error ? error.message : '?°ì´??ì¡°íšŒ ?¤íŒ¨');
    } finally {
      setDebugLoading(false);
    }
  };

  // ?¸ë¦¬???œê·¸?? RSI < 35 AND MFI < 35 AND BB ?°ì¹˜
  const tripleSignalResults = results.filter(r =>
    r.rsi !== undefined && r.mfi !== undefined && r.bb_touch !== undefined &&
    r.rsi < 35 && r.mfi < 35 && r.bb_touch === true
  );

  // ë³¼ë¦°?€ ë°´ë“œ ?œê·¸?? BB ?°ì¹˜ë§?
  const bbOnlyResults = results.filter(r => r.bb_touch === true);

  const currentResults = activeTab === 'triple' ? tripleSignalResults : bbOnlyResults;

  return (
    <div className="container">
      <h1>?“ˆ ì£¼ê? ë¶„ì„ ?€?œë³´??/h1>

      {/* ë§ˆì¼“ ?¸ë””ì¼€?´í„° ?„ì ¯ */}
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

      {/* ???¤ë¹„ê²Œì´??*/}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'triple' ? 'active' : ''}`}
          onClick={() => setActiveTab('triple')}
        >
          ?¯ ?¸ë¦¬???œê·¸??
          {tripleSignalResults.length > 0 && (
            <span className="badge">{tripleSignalResults.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'bb' ? 'active' : ''}`}
          onClick={() => setActiveTab('bb')}
        >
          ?“Š ë³¼ë¦°?€ ë°´ë“œ
          {bbOnlyResults.length > 0 && (
            <span className="badge">{bbOnlyResults.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'debug' ? 'active' : ''}`}
          onClick={() => setActiveTab('debug')}
        >
          ?” ?°ì´??ê²€ì¦?
        </button>
      </div>

      {/* ???¤ëª… */}
      <div className="tab-description">
        {activeTab === 'triple' ? (
          <p>RSI &lt; 35 <strong>AND</strong> MFI &lt; 35 <strong>AND</strong> ë³¼ë¦°?€ ë°´ë“œ ?˜ë‹¨ ?°ì¹˜</p>
        ) : activeTab === 'bb' ? (
          <p>ë³¼ë¦°?€ ë°´ë“œ ?˜ë‹¨ ?°ì¹˜ ì¢…ëª©</p>
        ) : (
          <p>Yahoo Finance ?ë³¸ ?°ì´?°ì? ê³„ì‚°??ì§€?œë? ?•ì¸?˜ì—¬ ? ìŠ¤ì¦ê¶Œê³?ë¹„êµ?????ˆìŠµ?ˆë‹¤</p>
        )}
      </div>

      {/* ?°ì»¤ ?…ë ¥ */}
      <div className="input-section">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="?°ì»¤ ?…ë ¥ (?? AAPL)"
          disabled={isAnalyzing}
        />
        <button onClick={addTicker} disabled={isAnalyzing}>ì¶”ê?</button>
        <button
          className="analyze-btn"
          onClick={() => runAnalysisWithFullRetry()}
          disabled={tickers.length === 0 || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className="spinner">??/span> ë¶„ì„ ì¤?..
              {progress && ` (${progress.current}/${progress.total})`}
            </>
          ) : (
            '?? ë¶„ì„ ?¤í–‰'
          )}
        </button>
        {isAnalyzing && (
          <>
            <button
              className="pause-btn"
              onClick={togglePause}
            >
              {isPaused ? '?¶ï¸ ?¬ê°œ' : '?¸ï¸ ?¼ì‹œ ì¤‘ì?'}
            </button>
            <button
              className="stop-btn"
              onClick={stopAnalysis}
            >
              ?¹ï¸ ì¤‘ì?
            </button>
          </>
        )}
        {failedTickers.length > 0 && !isAnalyzing && (
          <button
            className="retry-btn"
            onClick={retryFailedTickers}
          >
            ?”„ ?¤íŒ¨???°ì»¤ ?¬ì‹œ??({failedTickers.length}ê°?
          </button>
        )}
      </div>

      {/* ì§„í–‰ ?í™© ?„ë¡œ?¸ìŠ¤ ë°?*/}
      {(isAnalyzing || progress) && progress && (
        <div className="progress-container">
          <div className="progress-header">
            <span>
              ë¶„ì„ ì§„í–‰ ì¤? <span className="progress-ticker">{progress.currentTicker}</span>
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

      {/* ?±ë¡???°ì»¤ ëª©ë¡ */}
      <div className="ticker-list">
        <div className="ticker-header">
          <h3>?±ë¡???°ì»¤ ({tickers.length}ê°?</h3>
          <div className="ticker-actions">
            <button className="preset-btn" onClick={loadPresetTickers}>
              ?“¥ ?„ë¦¬??ë¶ˆëŸ¬?¤ê¸°
            </button>
            <button className="save-preset-btn" onClick={saveAsPreset}>
              ?’¾ ?„ë¦¬???€??
            </button>
            <button className="clear-btn" onClick={clearAllTickers}>
              ?—‘ï¸??„ì²´ ?? œ
            </button>
          </div>
        </div>
        <div className="tickers">
          {(showAllTickers ? tickers : tickers.slice(0, 10)).map(ticker => (
            <span key={ticker} className="ticker-tag">
              {ticker}
              <button onClick={() => removeTicker(ticker)}>Ã—</button>
            </span>
          ))}
          {tickers.length > 10 && !showAllTickers && (
            <button
              className="show-more-btn"
              onClick={() => setShowAllTickers(true)}
            >
              + {tickers.length - 10}ê°??”ë³´ê¸?
            </button>
          )}
          {tickers.length > 10 && showAllTickers && (
            <button
              className="show-more-btn"
              onClick={() => setShowAllTickers(false)}
            >
              ?‘ê¸°
            </button>
          )}
        </div>
      </div>

      {/* ?°ì´??ê²€ì¦????´ìš© */}
      {activeTab === 'debug' && (
        <div className="debug-section">
          <div className="debug-input">
            <input
              type="text"
              value={debugTicker}
              onChange={(e) => setDebugTicker(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchDebugData()}
              placeholder="?°ì»¤ ?…ë ¥ (?? AAPL)"
            />
            <button onClick={fetchDebugData} disabled={debugLoading}>
              {debugLoading ? 'ì¡°íšŒ ì¤?..' : '?” ?°ì´??ì¡°íšŒ'}
            </button>
          </div>

          {debugError && (
            <div className="debug-error">
              ? ï¸ ?¤ë¥˜: {debugError}
            </div>
          )}

          {debugData && (
            <div className="debug-results">
              <div className="debug-summary">
                <h4>?“Š {debugData.ticker} ?”ì•½</h4>
                <div className="summary-grid">
                  <div><strong>ìµœì‹  ? ì§œ:</strong> {debugData.summary.latestDate}</div>
                  <div><strong>ì¢…ê?:</strong> ${debugData.summary.latestClose}</div>
                  <div><strong>?˜ì •ì¢…ê?:</strong> ${debugData.summary.latestAdjClose}</div>
                  <div className={debugData.summary.closeVsAdjCloseDiff ? 'diff-warning' : ''}>
                    <strong>ì¢…ê?? ìˆ˜?•ì¢…ê°€:</strong> {debugData.summary.closeVsAdjCloseDiff ? '? ï¸ ??(ë°°ë‹¹/ë¶„í• )' : '???™ì¼'}
                  </div>
                  <div><strong>RSI(14):</strong> {debugData.summary.latestRSI?.toFixed(2) || 'N/A'}</div>
                  <div><strong>MFI(14):</strong> {debugData.summary.latestMFI?.toFixed(2) || 'N/A'}</div>
                  <div><strong>BB ?˜ë‹¨:</strong> ${debugData.summary.latestBBLower?.toFixed(2) || 'N/A'}</div>
                  <div><strong>BB ?ë‹¨:</strong> ${debugData.summary.latestBBUpper?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>

              <h4>?“… ìµœê·¼ 20???¼ë´‰ ?°ì´??/h4>
              <div className="debug-table-wrapper">
                <table className="debug-table">
                  <thead>
                    <tr>
                      <th>? ì§œ</th>
                      <th>?œê?</th>
                      <th>ê³ ê?</th>
                      <th>?€ê°€</th>
                      <th>ì¢…ê?</th>
                      <th>?˜ì •ì¢…ê?</th>
                      <th>ê±°ë˜??/th>
                      <th>RSI</th>
                      <th>MFI</th>
                      <th>BB?˜ë‹¨</th>
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
                ?’¡ <strong>ë¹„êµ ë°©ë²•:</strong> ? ìŠ¤ì¦ê¶Œ ?±ì—???™ì¼ ì¢…ëª©???¼ë´‰ ì°¨íŠ¸ë¥??´ì–´ ? ì§œë³???ê³??€/ì¢…ê??€ RSI ê°’ì„ ë¹„êµ?´ë³´?¸ìš”.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ë¶„ì„ ê²°ê³¼ */}
      {activeTab !== 'debug' && results.length > 0 && (
        <div className="results">
          <h3>
            {activeTab === 'triple' ? '?¯ ?¸ë¦¬???œê·¸???ŒëŒ' : '?“Š ë³¼ë¦°?€ ë°´ë“œ ?ŒëŒ'}
            ({currentResults.length}ê°?
          </h3>
          {currentResults.length === 0 ? (
            <p className="no-alerts">?„ì¬ ì¡°ê±´??ë§Œì¡±?˜ëŠ” ì¢…ëª©???†ìŠµ?ˆë‹¤.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>?°ì»¤</th>
                  <th>ê°€ê²?/th>
                  <th>RSI(14)</th>
                  <th>MFI(14)</th>
                  <th>BB ?°ì¹˜</th>
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
                    <td>{result.bb_touch ? '?? : '??}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ?„ì²´ ë¶„ì„ ê²°ê³¼ ?”ì•½ */}
          <div className="summary">
            <h4>?„ì²´ ë¶„ì„ ?„ë£Œ: {results.length}ê°?/h4>
            {results.filter(r => r.error).length > 0 && (
              <div className="error-section">
                <div className="error-header">
                  <h5>? ï¸ ?¤ë¥˜ ì¢…ëª© ?•ì¸ ({results.filter(r => r.error).length}ê°?</h5>
                  {failedTickers.length > 0 && (
                    <button
                      className="retry-small-btn"
                      onClick={retryFailedTickers}
                    >
                      ?”„ ?¬ì‹œ??
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
                            ?’¡ <strong>?´ê²° ë°©ë²•:</strong> NAS ?„ë¡?œë? ?¤ì •?˜ê±°??? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.
                            <br />?ì„¸???´ìš©?€ <code>docs/nas-proxy/SETUP.md</code>ë¥?ì°¸ê³ ?˜ì„¸??
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
