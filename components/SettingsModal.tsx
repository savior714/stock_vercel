import React, { useState } from 'react';
import type { AnalysisSettings } from '../types/settings';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AnalysisSettings;
    onSave: (newSettings: AnalysisSettings) => void;
    onReset: () => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave, onReset }: SettingsModalProps) {
    const [localSettings, setLocalSettings] = useState<AnalysisSettings>(settings);

    // 모달 열릴 때 local state 동기화
    React.useEffect(() => {
        if (isOpen) {
            setLocalSettings(settings);
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleChange = (key: keyof AnalysisSettings, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setLocalSettings(prev => ({ ...prev, [key]: numValue }));
        }
    };

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    const handleReset = () => {
        if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
            onReset();
            onClose(); // 저장 로직이 onReset 내부에 있다고 가정하거나, 부모가 처리 후 다시 열어야 갱신됨.
            // 보통 onReset이 부모 state를 바꾸므로 여기서는 그냥 닫으면 됨.
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>⚙️ 분석 설정</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="setting-group">
                        <h3>RSI (Relative Strength Index)</h3>
                        <div className="setting-row">
                            <label>기간 (Period)</label>
                            <input
                                type="number"
                                value={localSettings.rsiPeriod}
                                onChange={e => handleChange('rsiPeriod', e.target.value)}
                            />
                        </div>
                        <div className="setting-row">
                            <label>트리플 시그널 기준</label>
                            <input
                                type="number"
                                value={localSettings.rsiTripleSignal}
                                onChange={e => handleChange('rsiTripleSignal', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="setting-group">
                        <h3>MFI (Money Flow Index)</h3>
                        <div className="setting-row">
                            <label>기간 (Period)</label>
                            <input
                                type="number"
                                value={localSettings.mfiPeriod}
                                onChange={e => handleChange('mfiPeriod', e.target.value)}
                            />
                        </div>
                        <div className="setting-row">
                            <label>트리플 시그널 기준</label>
                            <input
                                type="number"
                                value={localSettings.mfiTripleSignal}
                                onChange={e => handleChange('mfiTripleSignal', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="setting-group">
                        <h3>Bollinger Bands</h3>
                        <div className="alert-box">
                            ⚠️ 주의: 기간 및 표준편차 설정은 서버 API 재호출 시에만 정확히 반영됩니다.
                        </div>
                        <div className="setting-row">
                            <label>기간 (Period)</label>
                            <input
                                type="number"
                                value={localSettings.bbPeriod}
                                onChange={e => handleChange('bbPeriod', e.target.value)}
                            />
                        </div>
                        <div className="setting-row">
                            <label>표준편차 (Std Dev)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={localSettings.bbStdDev}
                                onChange={e => handleChange('bbStdDev', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="reset-btn" onClick={handleReset}>초기화</button>
                    <div className="action-buttons">
                        <button className="cancel-btn" onClick={onClose}>취소</button>
                        <button className="save-btn" onClick={handleSave}>저장</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
