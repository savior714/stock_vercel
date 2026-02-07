import React, { useState } from 'react';
import { X, RotateCcw, Save, AlertCircle } from 'lucide-react';
import type { AnalysisSettings } from '@/types/settings';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AnalysisSettings;
    onSave: (newSettings: AnalysisSettings) => void;
    onReset: () => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave, onReset }: SettingsModalProps) {
    const [inputValues, setInputValues] = useState<Record<keyof AnalysisSettings, string>>({
        rsiPeriod: settings.rsiPeriod.toString(),
        rsiOversold: settings.rsiOversold.toString(),
        rsiTripleSignal: settings.rsiTripleSignal.toString(),
        mfiPeriod: settings.mfiPeriod.toString(),
        mfiOversold: settings.mfiOversold.toString(),
        mfiTripleSignal: settings.mfiTripleSignal.toString(),
        bbPeriod: settings.bbPeriod.toString(),
        bbStdDev: settings.bbStdDev.toString()
    });

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setInputValues({
                rsiPeriod: settings.rsiPeriod.toString(),
                rsiOversold: settings.rsiOversold.toString(),
                rsiTripleSignal: settings.rsiTripleSignal.toString(),
                mfiPeriod: settings.mfiPeriod.toString(),
                mfiOversold: settings.mfiOversold.toString(),
                mfiTripleSignal: settings.mfiTripleSignal.toString(),
                bbPeriod: settings.bbPeriod.toString(),
                bbStdDev: settings.bbStdDev.toString()
            });
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, settings]);

    const [isOverlayMouseDown, setIsOverlayMouseDown] = useState(false);

    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) setIsOverlayMouseDown(true);
        else setIsOverlayMouseDown(false);
    };

    const handleOverlayMouseUp = (e: React.MouseEvent) => {
        if (isOverlayMouseDown && e.target === e.currentTarget) onClose();
        setIsOverlayMouseDown(false);
    };

    if (!isOpen) return null;

    const handleChange = (key: keyof AnalysisSettings, value: string) => {
        setInputValues(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const newSettings: AnalysisSettings = { ...settings };
        (Object.keys(inputValues) as Array<keyof AnalysisSettings>).forEach(key => {
            const val = parseFloat(inputValues[key]);
            if (!isNaN(val)) newSettings[key] = val;
        });
        onSave(newSettings);
        onClose();
    };

    const handleReset = () => {
        if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
            onReset();
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[4px] flex justify-center items-center z-[1000] p-5"
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
        >
            <div
                className="bg-white w-full max-w-[500px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-pop-in"
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-xl">⚙️</span> 분석 설정
                    </h2>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="mb-8">
                        <h3 className="text-gray-800 font-bold mb-4 border-l-4 border-primary pl-3">RSI (Relative Strength Index)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-2 font-medium">기간 (Period)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-[#667eea] outline-none transition-colors"
                                    value={inputValues.rsiPeriod}
                                    onChange={e => handleChange('rsiPeriod', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-2 font-medium">트리플 시그널 기준</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-[#667eea] outline-none transition-colors"
                                    value={inputValues.rsiTripleSignal}
                                    onChange={e => handleChange('rsiTripleSignal', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-gray-800 font-bold mb-4 border-l-4 border-primary pl-3">MFI (Money Flow Index)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-2 font-medium">기간 (Period)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors"
                                    value={inputValues.mfiPeriod}
                                    onChange={e => handleChange('mfiPeriod', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-2 font-medium">트리플 시그널 기준</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors"
                                    value={inputValues.mfiTripleSignal}
                                    onChange={e => handleChange('mfiTripleSignal', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-gray-800 font-bold mb-4 border-l-4 border-primary pl-3">Bollinger Bands</h3>
                        <div className="bg-orange-50 p-3 rounded-lg flex items-start gap-2 mb-4 border border-orange-100 text-orange-800 text-xs">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>주의: 기간 및 표준편차 설정은 서버 API 재호출 시에만 정확히 반영됩니다.</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-2 font-medium">기간 (Period)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors"
                                    value={inputValues.bbPeriod}
                                    onChange={e => handleChange('bbPeriod', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-2 font-medium">표준편차 (Std Dev)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors"
                                    value={inputValues.bbStdDev}
                                    onChange={e => handleChange('bbStdDev', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 bg-gray-50 flex justify-between items-center">
                    <button className="text-gray-400 hover:text-red-500 transition-colors text-sm underline flex items-center gap-1.5" onClick={handleReset}>
                        <RotateCcw size={14} /> 초기화
                    </button>
                    <div className="flex gap-3">
                        <button className="px-6 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors" onClick={onClose}>취소</button>
                        <button className="px-8 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-secondary transition-colors flex items-center gap-2" onClick={handleSave}>
                            <Save size={16} /> 저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
