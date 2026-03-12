import React from 'react';
import { Plus } from 'lucide-react';
import '../styles/components/TickerInput.css';

interface TickerInputProps {
    inputValue: string;
    onInputChange: (value: string) => void;
    onAdd: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    isAnalyzing: boolean;
}

export function TickerInput({
    inputValue,
    onInputChange,
    onAdd,
    onKeyDown,
    isAnalyzing
}: TickerInputProps) {
    return (
        <div className="ticker-input-root">
            <input
                type="text"
                className="ticker-input-field"
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
            <button
                className="ticker-add-button"
                onClick={onAdd}
                disabled={isAnalyzing}
            >
                <Plus size={18} /> 추가
            </button>
        </div>
    );
}
