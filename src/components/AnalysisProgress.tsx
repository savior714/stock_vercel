import React from 'react';
import { Progress as ArkProgress } from '@ark-ui/react';
import '../styles/components/AnalysisProgress.css';

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
        <ArkProgress.Root value={percentage} className="progress-root">
            <div className="progress-label-group">
                <ArkProgress.Label>
                    분석 진행 중: <span className="progress-ticker-name">{progress.currentTicker}</span>
                </ArkProgress.Label>
                <ArkProgress.ValueText className="progress-stats">
                    {progress.current} / {progress.total} ({percentage}%)
                </ArkProgress.ValueText>
            </div>
            <ArkProgress.Track className="progress-track">
                <ArkProgress.Range className="progress-range" />
            </ArkProgress.Track>
        </ArkProgress.Root>
    );
}
