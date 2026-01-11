import React from 'react';
import type { AnalysisResult, TabType } from '../types';
import type { AnalysisSettings } from '../types/settings';

interface ResultTableProps {
    results: AnalysisResult[];
    activeTab: TabType;
    onRemoveTicker: (ticker: string) => void;
    isAnalyzing: boolean;
    failedTickers: string[];
    onRetryFailed: () => void;
    settings: AnalysisSettings;
}

export function ResultTable({ results, activeTab, onRemoveTicker, isAnalyzing, failedTickers, onRetryFailed, settings }: ResultTableProps) {
    if (results.length === 0) return null;

    return (
        <div className="result-section">
            <h3>
                {activeTab === 'triple' ? '🎯 트리플 시그널 포착' : '📊 볼린저 밴드 하단 터치'}
                <span className="result-count">({results.length}개)</span>
                <span className="last-updated">
                    마지막 업데이트: {new Date().toLocaleTimeString()}
                </span>
            </h3>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>티커</th>
                            <th>현재가</th>
                            <th>RSI</th>
                            <th>MFI</th>
                            <th>볼린저 위치</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result) => (
                            <tr key={result.ticker} className={result.alert ? 'alert-row' : ''}>
                                <td className="ticker-cell">{result.ticker}</td>
                                <td>
                                    {result.price !== undefined
                                        ? `$${result.price.toFixed(2)}`
                                        : '-'}
                                </td>
                                <td className={result.rsi !== undefined && result.rsi < settings.rsiTripleSignal ? 'signal-value' : ''}>
                                    {result.rsi !== undefined ? result.rsi.toFixed(1) : '-'}
                                </td>
                                <td className={result.mfi !== undefined && result.mfi < settings.mfiTripleSignal ? 'signal-value' : ''}>
                                    {result.mfi !== undefined ? result.mfi.toFixed(1) : '-'}
                                </td>
                                <td className={result.bb_touch ? 'signal-value' : ''}>
                                    {result.bb_touch ? '하단 터치 👇' : '범위 내'}
                                </td>
                                <td>
                                    {result.error ? (
                                        <span className="error-text">{result.error}</span>
                                    ) : result.alert ? (
                                        <span className="signal-text">매수 시그널 ⚡</span>
                                    ) : (
                                        <span className="normal-text">관망</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 전체 분석 결과 요약 및 에러 목록 */}
            <div className="summary">
                <h4>전체 분석 완료: {results.length}개</h4>
                {results.filter(r => r.error).length > 0 && (
                    <div className="error-section">
                        <div className="error-header">
                            <h5>⚠️ 오류 종목 확인 ({results.filter(r => r.error).length}개)</h5>
                            {failedTickers.length > 0 && (
                                <button
                                    className="retry-small-btn"
                                    onClick={onRetryFailed}
                                    disabled={isAnalyzing}
                                >
                                    🔄 재시도
                                </button>
                            )}
                        </div>
                        <div className="error-list">
                            {results.filter(r => r.error).map(r => {
                                const isRateLimit = r.error?.includes('API_RATE_LIMIT');
                                const isBlocked = r.error?.includes('API_BLOCKED');
                                return (
                                    <div key={r.ticker} className={`error-item ${isRateLimit ? 'rate-limit-error' : ''} ${isBlocked ? 'blocked-error' : ''}`}>
                                        <strong>{r.ticker}</strong> - {r.error}
                                        {isBlocked && (
                                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '0.9em' }}>
                                                💡 <strong>해결 방법:</strong> Vercel API 서버를 통해 다시 시도해주세요.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
