import { useState, useEffect } from 'react';
import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { isTauriEnvironment, isNativeEnvironment, isCapacitorEnvironment } from '@/lib/utils/platform';
import { DEFAULT_PRESETS } from '@/constants/presets';

export function useTickers() {
    const [tickers, setTickers] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [showAllTickers, setShowAllTickers] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // 초기 로드
    useEffect(() => {
        const init = async () => {
            const savedTickers = localStorage.getItem('stock-tickers');
            if (savedTickers) {
                try {
                    const parsed = JSON.parse(savedTickers);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setTickers(parsed);
                        setLoaded(true);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse saved tickers:', e);
                }
            }

            // 저장된 티커가 없으면(최초 실행 등) 자동으로 GitHub/로컬 프리셋 로드
            await loadPresetTickers(true);
            setLoaded(true);
        };

        init();
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

        }
    };

    const loadPresetTickers = async (silent: boolean = false) => {
        try {
            const isNative = isNativeEnvironment();
            const isTauri = isTauriEnvironment();
            const PRESET_URL = 'https://raw.githubusercontent.com/savior714/stock_vercel/main/presets.json';

            // 1. GitHub Raw URL에서 최신 데이터 시도 (모든 플랫폼 공통)
            try {
                console.log('🌐 Fetching latest presets from GitHub...');
                const ghResponse = await fetch(`${PRESET_URL}?t=${Date.now()}`); // 캐시 방지
                if (ghResponse.ok) {
                    const ghPresets = await ghResponse.json();
                    if (Array.isArray(ghPresets) && ghPresets.length > 0) {
                        console.log(`✅ Loaded ${ghPresets.length} presets from GitHub`);
                        setTickers(ghPresets);
                        if (!silent) alert(`GitHub에서 ${ghPresets.length}개의 프리셋을 로드했습니다.`);
                        return;
                    }
                }
            } catch (e) {
                console.warn('GitHub fetch failed, falling back to local/KV:', e);
            }

            if (isNative) {
                // Tauri/Capacitor 환경: GitHub 실패 시 로컬 확인
                if (isTauri) {
                    try {
                        const fileName = 'preset_tickers.json';
                        const userPresetExists = await exists(fileName, { baseDir: BaseDirectory.AppLocalData });

                        if (userPresetExists) {
                            console.log('🖥️ Loading presets from AppLocalData');
                            const contents = await readTextFile(fileName, { baseDir: BaseDirectory.AppLocalData });
                            const presets = JSON.parse(contents);
                            setTickers(presets || []);
                            if (!silent) alert(`로컬 저장소에서 ${presets.length}개의 프리셋을 로드했습니다.`);
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to read local preset:', e);
                    }
                }

                if (isCapacitorEnvironment()) {
                    const savedLocal = localStorage.getItem('stock-preset-tickers');
                    if (savedLocal) {
                        setTickers(JSON.parse(savedLocal));
                        if (!silent) alert(`기기 저장소에서 ${JSON.parse(savedLocal).length}개의 프리셋을 로드했습니다.`);
                        return;
                    }
                }

                setTickers(DEFAULT_PRESETS);
                if (!silent) alert(`기본 프리셋 ${DEFAULT_PRESETS.length}개를 로드했습니다.`);
            } else {
                // 웹(Tauri/Capacitor 아님) 환경: API 라우트 제거됨, 로컬 스토리지 사용 권장
                // 또는 단순 메모리/기본값 사용
                setTickers(DEFAULT_PRESETS);
                if (!silent) alert(`기본 프리셋 ${DEFAULT_PRESETS.length}개를 로드했습니다.`);
            }
        } catch (error) {
            console.error('Failed to load preset tickers:', error);
            setTickers(DEFAULT_PRESETS);
        }
    };

    const saveAsPreset = async () => {
        if (tickers.length === 0) {
            alert('저장할 티커가 없습니다.');
            return;
        }

        if (confirm(`현재 ${tickers.length}개 티커를 프리셋으로 저장하고 GitHub에 동기화하시겠습니까?`)) {
            const isTauri = isTauriEnvironment();

            if (isTauri) {
                try {
                    // 1. Repository 사용: GitHub Sync 로직 분리
                    const { GithubSyncRepo } = await import('@/lib/api/github-sync.repo');
                    const syncResult = await GithubSyncRepo.syncPresets(tickers);

                    if (!syncResult.success) {
                        throw new Error(syncResult.error || 'GitHub 동기화 실패');
                    }

                    alert(`✅ 프리셋이 저장되었으며 GitHub 동기화가 완료되었습니다. (${tickers.length}개)`);

                    // AppLocalData에도 백업 저장
                    const jsonContent = JSON.stringify(tickers);
                    await writeTextFile('preset_tickers.json', jsonContent, { baseDir: BaseDirectory.AppLocalData });

                } catch (error) {
                    console.error('Tauri sync error:', error);
                    alert('저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
                }
                return;
            }

            // 웹/Capacitor 기존 대체 로직
            if (isCapacitorEnvironment()) {
                localStorage.setItem('stock-preset-tickers', JSON.stringify(tickers));
                alert(`프리셋이 기기에 저장되었습니다. (${tickers.length}개)`);
                return;
            }

            // 웹 환경: API 라우트 제거됨, 로컬 스토리지 저장 (이미 위에서 처리되지 않은 경우)
            localStorage.setItem('stock-preset-tickers', JSON.stringify(tickers));
            alert('프리셋이 브라우저 로컬 스토리지에 저장되었습니다.');
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
