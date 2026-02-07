import React from 'react';

interface AnalysisProgressProps {
    progress: {
        current: number;
        total: number;
        currentTicker: string;
    } | null;
    isAnalyzing: boolean;
}

export function AnalysisProgress({ progress, isAnalyzing }: AnalysisProgressProps) {
    if (!progress && !isAnalyzing) return null;
    if (!progress) return null;

    const percentage = Math.round((progress.current / progress.total) * 100);

    return (
        <div className="bg-white px-6 py-5 rounded-xl shadow-md mb-8 border border-gray-100 animate-[slideUp_0.4s_ease]">
            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
            <div className="flex justify-between mb-4 font-semibold text-gray-700">
                <span>
                    분석 진행 중: <span className="text-[#667eea]">{progress.currentTicker}</span>
                </span>
                <span className="text-gray-500">
                    {progress.current} / {progress.total} ({percentage}%)
                </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(1, percentage)}%` }}
                />
            </div>
        </div>
    );
}
