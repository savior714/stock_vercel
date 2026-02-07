import React from 'react';
import { AlertTriangle, RotateCcw, Trash2, Zap } from 'lucide-react';
import type { AnalysisResult, TabType } from '@/types';
import type { AnalysisSettings } from '@/types/settings';

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
        <div className="bg-white rounded-b-xl p-5 shadow-sm overflow-hidden relative z-[5] border-t-0 border border-gray-100">
            <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-50">
                <div>
                    <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                        {activeTab === 'triple' ? '🎯 트리플 시그널 포착' : '📊 볼린저 밴드 하단 터치'}
                        <span className="text-text-sub font-normal text-base">({results.length}개)</span>
                    </h3>
                    <div className="text-[0.85rem] text-text-sub mt-1">
                        마지막 업데이트: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0">
                    <thead>
                        <tr>
                            <th className="text-left p-2.5 text-text-sub text-[0.75rem] uppercase tracking-wider border-b-2 border-gray-100 font-bold">티커</th>
                            <th className="text-left p-2.5 text-text-sub text-[0.75rem] uppercase tracking-wider border-b-2 border-gray-100 font-bold">현재가</th>
                            <th className="text-left p-2.5 text-text-sub text-[0.75rem] uppercase tracking-wider border-b-2 border-gray-100 font-bold">RSI</th>
                            <th className="text-left p-2.5 text-text-sub text-[0.75rem] uppercase tracking-wider border-b-2 border-gray-100 font-bold">MFI</th>
                            <th className="text-left p-2.5 text-text-sub text-[0.75rem] uppercase tracking-wider border-b-2 border-gray-100 font-bold md:hidden">BB</th>
                            <th className="text-left p-2.5 text-text-sub text-[0.75rem] uppercase tracking-wider border-b-2 border-gray-100 font-bold hidden md:table-cell">볼린저 위치</th>
                            <th className="text-center p-2.5 text-text-sub text-[0.75rem] uppercase tracking-wider border-b-2 border-gray-100 font-bold">삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result) => (
                            <tr key={result.ticker} className={`transition-colors hover:bg-gray-50 ${result.alert ? 'bg-accent/5' : ''}`}>
                                <td className="p-2.5 border-b border-gray-50 text-lg font-black text-primary">{result.ticker}</td>
                                <td className="p-2.5 border-b border-gray-50 text-[0.9rem] text-text-main">
                                    {result.price !== undefined
                                        ? `$${result.price.toFixed(2)}`
                                        : '-'}
                                </td>
                                <td className={`p-2.5 border-b border-gray-50 text-[0.9rem] ${result.rsi !== undefined && result.rsi < settings.rsiTripleSignal ? 'text-accent font-bold' : 'text-text-main'}`}>
                                    {result.rsi !== undefined ? result.rsi.toFixed(1) : '-'}
                                </td>
                                <td className={`p-2.5 border-b border-gray-50 text-[0.9rem] ${result.mfi !== undefined && result.mfi < settings.mfiTripleSignal ? 'text-accent font-bold' : 'text-text-main'}`}>
                                    {result.mfi !== undefined ? result.mfi.toFixed(1) : '-'}
                                </td>
                                <td className="p-2.5 border-b border-gray-50 text-[0.9rem] md:hidden">
                                    <span className={result.bb_touch ? 'text-accent font-bold' : 'text-text-sub/40'}>
                                        {result.bb_touch ? '하단👇' : '―'}
                                    </span>
                                </td>
                                <td className="p-2.5 border-b border-gray-50 text-[0.9rem] hidden md:table-cell">
                                    <span className={result.bb_touch ? 'text-accent font-bold' : 'text-text-sub/40'}>
                                        {result.bb_touch ? '하단 터치 👇' : '범위 내'}
                                    </span>
                                </td>
                                <td className="p-2.5 border-b border-gray-50 text-center">
                                    <button
                                        onClick={() => onRemove(result.ticker)}
                                        className="text-text-sub p-2 rounded-lg hover:bg-accent/10 hover:text-accent transition-all duration-200"
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

            <div className="mt-8">
                <h4 className="text-lg font-bold text-text-main border-t border-gray-100 pt-4">전체 분석 완료: {totalResultsCount}개</h4>
                {results.filter(r => r.error).length > 0 && (
                    <div className="mt-6 bg-accent/5 rounded-xl p-4 border border-accent/10">
                        <div className="flex justify-between items-center mb-4">
                            <h5 className="text-accent font-bold flex items-center gap-2">
                                <AlertTriangle size={18} /> 오류 종목 확인 ({results.filter(r => r.error).length}개)
                            </h5>
                            {failedTickers.length > 0 && (
                                <button
                                    className="px-3 py-1.5 bg-accent text-white rounded-md text-sm font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                                    onClick={onRetryFailed}
                                    disabled={isAnalyzing}
                                >
                                    <RotateCcw size={14} /> 재시도
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            {results.filter(r => r.error).map(r => {
                                const isRateLimit = r.error?.includes('API_RATE_LIMIT');
                                const isBlocked = r.error?.includes('API_BLOCKED');
                                return (
                                    <div key={r.ticker} className={`p-3 rounded-lg text-sm border ${isRateLimit || isBlocked ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-white border-accent/10 text-accent'}`}>
                                        <strong className="font-bold">{r.ticker}</strong> - {r.error}
                                        {isBlocked && (
                                            <div className="mt-2 p-2 bg-white/50 border border-orange-200 rounded text-orange-900 font-medium">
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
