import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Save, AlertCircle } from 'lucide-react';
import { Dialog, Portal, Slider, NumberInput } from '@ark-ui/react';
import type { AnalysisSettings } from '@/types/settings';
import '../styles/components/SettingsModal.css';

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
        bbStdDev: settings.bbStdDev.toString(),
        opacity: settings.opacity.toString()
    });

    useEffect(() => {
        if (isOpen) {
            // Avoid synchronous setState in effect to prevent cascading renders
            requestAnimationFrame(() => {
                setInputValues({
                    rsiPeriod: settings.rsiPeriod.toString(),
                    rsiOversold: settings.rsiOversold.toString(),
                    rsiTripleSignal: settings.rsiTripleSignal.toString(),
                    mfiPeriod: settings.mfiPeriod.toString(),
                    mfiOversold: settings.mfiOversold.toString(),
                    mfiTripleSignal: settings.mfiTripleSignal.toString(),
                    bbPeriod: settings.bbPeriod.toString(),
                    bbStdDev: settings.bbStdDev.toString(),
                    opacity: settings.opacity.toString()
                });
            });
        }
    }, [isOpen, settings]);

    const handleChange = (key: keyof AnalysisSettings, value: string) => {
        setInputValues(prev => ({ ...prev, [key]: value }));

        // Live Preview for Opacity
        if (key === 'opacity') {
            const opacityVal = parseFloat(value);
            if (!isNaN(opacityVal)) {
                document.documentElement.style.setProperty('--overlay-opacity', opacityVal.toString());
                document.body.classList.add('overlay-mode');
            }
        }
    };

    const handleReleaseSlider = () => {
        document.body.classList.remove('overlay-mode');
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
        <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()}>
            <Portal>
                <Dialog.Backdrop className="settings-backdrop" />
                <Dialog.Positioner className="settings-container">
                    <Dialog.Content className="settings-content">
                        <header className="settings-header">
                            <Dialog.Title className="settings-title">
                                분석 설정
                            </Dialog.Title>
                            <Dialog.CloseTrigger className="settings-close-trigger">
                                <X size={24} />
                            </Dialog.CloseTrigger>
                        </header>

                        <div className="settings-body">
                            {/* Opacity Slider Section */}
                            <section className="settings-section">
                                <h3 className="settings-section-title">투명도 설정 (Ghost Mode)</h3>
                                <Slider.Root
                                    min={0.1}
                                    max={0.4}
                                    step={0.05}
                                    value={[parseFloat(inputValues.opacity || '0.15')]}
                                    onValueChange={(details) => handleChange('opacity', details.value[0].toString())}
                                    onValueChangeEnd={handleReleaseSlider}
                                    className="ark-slider"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <Slider.Label className="settings-field-label">오버레이 투명도</Slider.Label>
                                        <Slider.ValueText className="slider-value-text">
                                            {(parseFloat(inputValues.opacity || '0.15') * 100).toFixed(0)}%
                                        </Slider.ValueText>
                                    </div>
                                    <Slider.Control className="slider-control">
                                        <Slider.Track className="slider-track">
                                            <Slider.Range className="slider-range" />
                                        </Slider.Track>
                                        <Slider.Thumb index={0} className="slider-thumb" />
                                    </Slider.Control>
                                </Slider.Root>
                                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                                    * 슬라이더를 움직이면 배경 투명도가 즉시 반영됩니다 (0.1 = 매우 투명).
                                </p>
                            </section>

                            <section className="settings-section">
                                <h3 className="settings-section-title">RSI (상대강도지수)</h3>
                                <div className="settings-grid">
                                    <div>
                                        <NumberInput.Root
                                            value={inputValues.rsiPeriod}
                                            onValueChange={(details) => handleChange('rsiPeriod', details.value)}
                                        >
                                            <NumberInput.Label className="settings-field-label">기간</NumberInput.Label>
                                            <NumberInput.Input className="settings-input" />
                                        </NumberInput.Root>
                                    </div>
                                    <div>
                                        <NumberInput.Root
                                            value={inputValues.rsiTripleSignal}
                                            onValueChange={(details) => handleChange('rsiTripleSignal', details.value)}
                                        >
                                            <NumberInput.Label className="settings-field-label">트리플 시그널 임계값</NumberInput.Label>
                                            <NumberInput.Input className="settings-input" />
                                        </NumberInput.Root>
                                    </div>
                                </div>
                            </section>

                            <section className="settings-section">
                                <h3 className="settings-section-title">MFI (자금흐름지수)</h3>
                                <div className="settings-grid">
                                    <div>
                                        <label className="settings-field-label">기간</label>
                                        <input
                                            type="number"
                                            className="settings-input"
                                            value={inputValues.mfiPeriod}
                                            onChange={e => handleChange('mfiPeriod', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="settings-field-label">트리플 시그널 임계값</label>
                                        <input
                                            type="number"
                                            className="settings-input"
                                            value={inputValues.mfiTripleSignal}
                                            onChange={e => handleChange('mfiTripleSignal', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="settings-section">
                                <h3 className="settings-section-title">볼린저 밴드</h3>
                                <div className="settings-warning">
                                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>주의: 기간 및 표준편차 변경사항은 정확한 반영을 위해 서버 재조회가 필요합니다.</span>
                                </div>
                                <div className="settings-grid">
                                    <div>
                                        <label className="settings-field-label">기간</label>
                                        <input
                                            type="number"
                                            className="settings-input"
                                            value={inputValues.bbPeriod}
                                            onChange={e => handleChange('bbPeriod', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="settings-field-label">표준편차</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="settings-input"
                                            value={inputValues.bbStdDev}
                                            onChange={e => handleChange('bbStdDev', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <footer className="settings-footer">
                            <button className="settings-reset-btn" onClick={handleReset}>
                                <RotateCcw size={14} /> 초기화
                            </button>
                            <div className="settings-button-group">
                                <button className="btn-ghost" onClick={onClose}>취소</button>
                                <button className="btn-primary" onClick={handleSave}>
                                    <Save size={16} /> 저장
                                </button>
                            </div>
                        </footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
