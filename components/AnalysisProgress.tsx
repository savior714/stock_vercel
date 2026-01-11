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

    return (
        <div className="progress-container">
            <div className="progress-header">
                <span>
                    분석 진행 중: <span className="progress-ticker">{progress.currentTicker}</span>
                </span>
                <span className="progress-count">
                    {progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
                </span>
            </div>
            <div className="progress-bar-bg">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.max(1, (progress.current / progress.total) * 100)}%` }}
                />
            </div>
        </div>
    );
}
