import React from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import type { AnalysisResult, TabType } from '@/types';
import type { AnalysisSettings } from '@/types/settings';
import '../styles/components/ResultTable.css';

interface ResultTableProps {
    results: AnalysisResult[];
    activeTab: TabType;
    isAnalyzing: boolean;
    failedTickers: string[];
    onRetryFailed: () => void;
    onRemove: (ticker: string) => void;
    settings: AnalysisSettings;
    totalResultsCount: number;
}

export function ResultTable({ results, activeTab, isAnalyzing, failedTickers, onRetryFailed, onRemove, settings, totalResultsCount }: ResultTableProps) {
    if (results.length === 0) return null;

    return (
        <div className="result-table-root">
            <header className="result-table-header">
                <div>
                    <h3 className="result-table-title">
                        {activeTab === 'triple' ? '🎯 트리플 시그널 포착' : '📊 볼린저 밴드 하단 터치'}
                        <span className="result-table-count">({results.length}개 결과)</span>
                    </h3>
                    <div className="result-table-timestamp">
                        최근 업데이트: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </header>

            <div className="result-table-scroll">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>티커</th>
                            <th>현재가</th>
                            <th>RSI</th>
                            <th>MFI</th>
                            <th className="md:hidden">BB</th>
                            <th className="desktop-only">BB 위치</th>
                            <th style={{ textAlign: 'center' }}>삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result) => (
                            <tr key={result.ticker} className={result.alert ? 'alert-row' : ''}>
                                <td
                                    className="ticker-name"
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        try {
                                            const { open } = await import('@tauri-apps/plugin-shell');
                                            await open(`https://www.tossinvest.com/stocks/${result.ticker}`);
                                        } catch (e) {
                                            console.error('Failed to open link:', e);
                                            window.open(`https://www.tossinvest.com/stocks/${result.ticker}`, '_blank');
                                        }
                                    }}
                                    title="토스증권에서 보기"
                                >
                                    {result.ticker}
                                </td>
                                <td>
                                    {result.price !== undefined
                                        ? `$${result.price.toFixed(2)}`
                                        : '-'}
                                </td>
                                <td className={result.rsi !== undefined && result.rsi < settings.rsiTripleSignal ? 'alert-value' : ''}>
                                    {result.rsi !== undefined ? result.rsi.toFixed(1) : '-'}
                                </td>
                                <td className={result.mfi !== undefined && result.mfi < settings.mfiTripleSignal ? 'alert-value' : ''}>
                                    {result.mfi !== undefined ? result.mfi.toFixed(1) : '-'}
                                </td>
                                <td className="md:hidden">
                                    <span className={result.bb_touch ? 'alert-value' : 'inactive-value'}>
                                        {result.bb_touch ? '하단👇' : '―'}
                                    </span>
                                </td>
                                <td className="desktop-only">
                                    <span className={result.bb_touch ? 'alert-value' : 'inactive-value'}>
                                        {result.bb_touch ? '하단 터치 👇' : '범위 내'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => onRemove(result.ticker)}
                                        className="remove-btn"
                                        title="티커 삭제"
                                        disabled={isAnalyzing}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <section className="summary-section">
                <h4 className="summary-title">전체 분석 완료: {totalResultsCount}</h4>
                {results.filter(r => r.error).length > 0 && (
                    <div className="error-section">
                        <div className="error-header">
                            <h5 className="error-title">
                                <AlertTriangle size={18} /> 오류 발생 ({results.filter(r => r.error).length})
                            </h5>
                            {failedTickers.length > 0 && (
                                <button
                                    className="retry-btn"
                                    onClick={onRetryFailed}
                                    disabled={isAnalyzing}
                                >
                                    <RotateCcw size={14} /> 재시도
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {results.filter(r => r.error).map(r => {
                                const isRateLimit = r.error?.includes('API_RATE_LIMIT');
                                const isBlocked = r.error?.includes('API_BLOCKED');
                                return (
                                    <div key={r.ticker} className={`error-item ${isRateLimit || isBlocked ? 'warning' : ''}`}>
                                        <strong style={{ fontWeight: 900 }}>{r.ticker}</strong> - {r.error}
                                        {isBlocked && (
                                            <div className="suggestion-box">
                                                💡 <strong>해결 방법:</strong> Vercel API 서버를 통해 다시 시도해 주세요.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
