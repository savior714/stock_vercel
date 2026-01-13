import { useState, useEffect } from 'react';
import { BaseDirectory, readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { isTauriEnvironment, isNativeEnvironment, isCapacitorEnvironment } from '../lib/utils/platform';
import { DEFAULT_PRESETS } from '../constants/presets';

export function useTickers() {
    const [tickers, setTickers] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [showAllTickers, setShowAllTickers] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // 초기 로드
    useEffect(() => {
        const savedTickers = localStorage.getItem('stock-tickers');
        if (savedTickers) {
            try {
                // eslint-disable-next-line
                setTickers(JSON.parse(savedTickers));
            } catch (e) {
                console.error('Failed to parse saved tickers:', e);
            }
        }
        setLoaded(true);
        // eslint-disable-next-line
    }, []);

    // 저장
    useEffect(() => {
        if (loaded) {
            localStorage.setItem('stock-tickers', JSON.stringify(tickers));
        }
    }, [tickers, loaded]);

    const addTicker = () => {
        const ticker = inputValue.trim().toUpperCase();
        if (ticker && !tickers.includes(ticker)) {
            setTickers(prev => [...prev, ticker]);
            setInputValue('');
        }
    };

    const removeTicker = async (ticker: string, alsoRemoveFromPreset: boolean = false) => {
        setTickers(prev => prev.filter(t => t !== ticker));

        if (alsoRemoveFromPreset) {
            if (isCapacitorEnvironment()) {
                // Capacitor: 로컬 스토리지 프리셋에서 제거
                const saved = localStorage.getItem('stock-preset-tickers');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const updated = parsed.filter((t: string) => t !== ticker);
                    localStorage.setItem('stock-preset-tickers', JSON.stringify(updated));
                }
                return;
            }

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

    const loadPresetTickers = async () => {
        try {
            const isNative = isNativeEnvironment();
            const isTauri = isTauriEnvironment();

            if (isNative) {
                // Tauri 환경: 로컬 데이터 폴더 우선 확인
                if (isTauri) {
                    try {
                        const fileName = 'preset_tickers.json';
                        const userPresetExists = await exists(fileName, { baseDir: BaseDirectory.AppLocalData });

                        if (userPresetExists) {
                            console.log('🖥️ Loading presets from AppLocalData');
                            const contents = await readTextFile(fileName, { baseDir: BaseDirectory.AppLocalData });
                            const presets = JSON.parse(contents);
                            setTickers(presets || []);
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to read local preset, falling back to bundle:', e);
                    }
                }

                // 정적 빌드된 파일에서 직접 로드 (번들) 또는 로컬 스토리지
                console.log('📱 Loading presets from local source');

                if (isCapacitorEnvironment()) {
                    const savedLocal = localStorage.getItem('stock-preset-tickers');
                    if (savedLocal) {
                        console.log('📱 Found saved local preset');
                        setTickers(JSON.parse(savedLocal));
                        return;
                    }
                }

                // fallback: 번들된 상수 사용 (파일 fetch 실패 방지)
                console.log('📦 Using bundled default presets');
                setTickers(DEFAULT_PRESETS);
            } else {
                // 웹 환경: API 사용
                try {
                    const response = await fetch('/api/presets');
                    if (!response.ok) {
                        throw new Error(`API error: ${response.status}`);
                    }
                    const data = await response.json();
                    setTickers(data.presets || DEFAULT_PRESETS);
                } catch (err) {
                    console.warn('API load failed, using defaults', err);
                    setTickers(DEFAULT_PRESETS);
                }
            }
        } catch (error) {
            console.error('Failed to load preset tickers:', error);
            // 최후의 수단
            setTickers(DEFAULT_PRESETS);
        }
    };

    const saveAsPreset = async () => {
        if (tickers.length === 0) {
            alert('저장할 티커가 없습니다.');
            return;
        }
        if (confirm(`현재 ${tickers.length}개 티커를 프리셋으로 저장하시겠습니까?`)) {
            const isTauri = isTauriEnvironment();

            // Tauri 환경: 로컬 파일 시스템에 저장
            if (isTauri) {
                try {
                    const fileName = 'preset_tickers.json';
                    const dirExists = await exists('', { baseDir: BaseDirectory.AppLocalData });
                    if (!dirExists) {
                        await mkdir('', { baseDir: BaseDirectory.AppLocalData, recursive: true });
                    }

                    await writeTextFile(fileName, JSON.stringify(tickers), { baseDir: BaseDirectory.AppLocalData });
                    alert(`프리셋이 로컬에 저장되었습니다. (${tickers.length}개)`);
                } catch (error) {
                    console.error('Failed to save local preset:', error);
                    alert('프리셋 저장에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
                }
                return;
            }

            // Capacitor 환경: 로컬 스토리지에 저장
            if (isCapacitorEnvironment()) {
                localStorage.setItem('stock-preset-tickers', JSON.stringify(tickers));
                alert(`프리셋이 기기에 저장되었습니다. (${tickers.length}개)`);
                return;
            }

            // 웹 환경: API 사용
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
                alert('프리셋 저장에 실패했습니다: ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    };

    const clearAllTickers = () => {
        if (confirm('정말 모든 티커를 삭제하시겠습니까?')) {
            setTickers([]);
        }
    };

    return {
        tickers,
        setTickers,
        inputValue,
        setInputValue,
        showAllTickers,
        setShowAllTickers,
        addTicker,
        removeTicker,
        loadPresetTickers,
        saveAsPreset,
        clearAllTickers
    };
}
