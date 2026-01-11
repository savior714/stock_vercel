import React from 'react';
import type { AnalysisModeType } from '../types';

interface TickerInputProps {
    inputValue: string;
    onInputChange: (value: string) => void;
    onAdd: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    isAnalyzing: boolean;
    analysisMode: AnalysisModeType;
    isNativeEnv: boolean;
    onModeChange: (mode: AnalysisModeType) => void;
}

export function TickerInput({
    inputValue,
    onInputChange,
    onAdd,
    onKeyDown,
    isAnalyzing,
    analysisMode,
    isNativeEnv,
    onModeChange
}: TickerInputProps) {
    return (
        <div className="input-section">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                        onKeyDown(e);
                    }
                }}
                placeholder="티커 입력 (예: AAPL)"
                disabled={isAnalyzing}
            />
            <button onClick={onAdd} disabled={isAnalyzing}>추가</button>

            {/* 분석 모드 토글 (Native 환경일 때만 표시) */}
            {isNativeEnv && (
                <div className="mode-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={analysisMode === 'tauri'}
                            onChange={(e) => onModeChange(e.target.checked ? 'tauri' : 'server')}
                            disabled={isAnalyzing}
                        />
                        Native Mode (Direct API)
                    </label>
                </div>
            )}
        </div>
    );
}
