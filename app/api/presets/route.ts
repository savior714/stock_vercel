import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 로컬 메모리 저장소 (Vercel KV 대체 - 빌드 에러 회피 및 로컬 테스트용)
// 주의: 서버리스 환경(Vercel)에서는 인스턴스가 뜰 때마다 초기화될 수 있음.
// 영구 저장을 위해서는 Vercel KV 설정이 필요하며, 사용 시 이 파일을 원래대로 복구해야 함.
let localPresets: string[] = [];

// 기본 프리셋 로드
const loadDefaultPresets = async () => {
    if (localPresets.length === 0) {
        try {
            // 로컬 파일에서 로드 시도 (public/preset_tickers.json)
            // 서버 환경에서는 fetch 사용
            const response = await fetch(new URL('/preset_tickers.json', process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : 'http://localhost:3000'));
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    localPresets = data;
                }
            }
        } catch (e) {
            console.warn('Failed to load default presets:', e);
        }
    }
    return localPresets;
};

// GET: 현재 프리셋 티커 목록 조회
export async function GET() {
    await loadDefaultPresets();
    return NextResponse.json({ presets: localPresets, count: localPresets.length });
}

// PUT: 프리셋 티커 목록 전체 교체
export async function PUT(request: NextRequest) {
    try {
        const { presets } = await request.json();

        if (!Array.isArray(presets)) {
            return NextResponse.json({ error: 'Invalid presets format' }, { status: 400 });
        }

        // 중복 제거
        const uniquePresets = [...new Set(presets)];
        localPresets = uniquePresets as string[];

        return NextResponse.json({
            success: true,
            presets: localPresets,
            count: localPresets.length
        });
    } catch (error) {
        console.error('Error updating presets:', error);
        return NextResponse.json({ error: 'Failed to update presets' }, { status: 500 });
    }
}

// DELETE: 특정 티커들을 프리셋에서 제거
export async function DELETE(request: NextRequest) {
    try {
        const { tickers: tickersToRemove } = await request.json();

        if (!Array.isArray(tickersToRemove) || tickersToRemove.length === 0) {
            return NextResponse.json({ error: 'Invalid tickers to remove' }, { status: 400 });
        }

        await loadDefaultPresets();
        localPresets = localPresets.filter(t => !tickersToRemove.includes(t));

        return NextResponse.json({
            success: true,
            presets: localPresets,
            count: localPresets.length
        });
    } catch (error) {
        console.error('Error removing from presets:', error);
        return NextResponse.json({ error: 'Failed to remove from presets' }, { status: 500 });
    }
}

// POST: 특정 티커들을 프리셋에 추가
export async function POST(request: NextRequest) {
    try {
        const { tickers: tickersToAdd } = await request.json();

        if (!Array.isArray(tickersToAdd) || tickersToAdd.length === 0) {
            return NextResponse.json({ error: 'Invalid tickers to add' }, { status: 400 });
        }

        await loadDefaultPresets();
        const uniquePresets = [...new Set([...localPresets, ...tickersToAdd])];
        localPresets = uniquePresets as string[];

        return NextResponse.json({
            success: true,
            presets: localPresets,
            count: localPresets.length
        });
    } catch (error) {
        console.error('Error adding to presets:', error);
        return NextResponse.json({ error: 'Failed to add to presets' }, { status: 500 });
    }
}
