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
                        {activeTab === 'triple' ? '🎯 Triple Signal Detected' : '📊 Bollinger Bands Lower Touch'}
                        <span className="result-table-count">({results.length} results)</span>
                    </h3>
                    <div className="result-table-timestamp">
                        Last Updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </header>

            <div className="result-table-scroll">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Price</th>
                            <th>RSI</th>
                            <th>MFI</th>
                            <th className="md:hidden">BB</th>
                            <th className="desktop-only">BB Position</th>
                            <th style={{ textAlign: 'center' }}>Remove</th>
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
                                    title="View on Toss Securities"
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
                                        {result.bb_touch ? 'Lower👇' : '―'}
                                    </span>
                                </td>
                                <td className="desktop-only">
                                    <span className={result.bb_touch ? 'alert-value' : 'inactive-value'}>
                                        {result.bb_touch ? 'Lower Touch 👇' : 'In Range'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => onRemove(result.ticker)}
                                        className="remove-btn"
                                        title="Delete Ticker"
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
                <h4 className="summary-title">Total Analysis Completed: {totalResultsCount}</h4>
                {results.filter(r => r.error).length > 0 && (
                    <div className="error-section">
                        <div className="error-header">
                            <h5 className="error-title">
                                <AlertTriangle size={18} /> Errors Detected ({results.filter(r => r.error).length})
                            </h5>
                            {failedTickers.length > 0 && (
                                <button
                                    className="retry-btn"
                                    onClick={onRetryFailed}
                                    disabled={isAnalyzing}
                                >
                                    <RotateCcw size={14} /> Retry
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
                                                💡 <strong>Solution:</strong> Please try again through Vercel API server.
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
