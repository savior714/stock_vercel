import React from 'react';
import { Plus } from 'lucide-react';

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
        <div className="flex gap-3 mb-8 bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
            <input
                type="text"
                className="flex-1 px-5 py-3.5 border border-gray-100 rounded-lg text-base outline-none bg-gray-50 focus:bg-white focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-300"
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
                className="px-8 py-0 border-none rounded-lg bg-primary text-white font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-secondary hover:-translate-y-px disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                onClick={onAdd}
                disabled={isAnalyzing}
            >
                <Plus size={18} /> 추가
            </button>
        </div>
    );
}
