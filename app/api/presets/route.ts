import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// KV 키 이름
const PRESET_KEY = 'preset_tickers';

// 기본 프리셋 (KV에 데이터가 없을 때 사용)
const getDefaultPresets = async (): Promise<string[]> => {
    try {
        const response = await fetch(new URL('/preset_tickers.json', process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000'));
        return await response.json();
    } catch {
        return [];
    }
};

// GET: 현재 프리셋 티커 목록 조회
export async function GET() {
    try {
        let presets = await kv.get<string[]>(PRESET_KEY);

        // KV에 데이터가 없으면 기본 프리셋 로드
        if (!presets || presets.length === 0) {
            presets = await getDefaultPresets();
        }

        return NextResponse.json({ presets, count: presets.length });
    } catch (error) {
        console.error('Error reading presets from KV:', error);
        // KV 연결 실패 시 기본 프리셋 반환
        const defaultPresets = await getDefaultPresets();
        return NextResponse.json({ presets: defaultPresets, count: defaultPresets.length });
    }
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

        await kv.set(PRESET_KEY, uniquePresets);

        return NextResponse.json({
            success: true,
            presets: uniquePresets,
            count: uniquePresets.length
        });
    } catch (error) {
        console.error('Error updating presets in KV:', error);
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

        let currentPresets = await kv.get<string[]>(PRESET_KEY);

        if (!currentPresets) {
            currentPresets = await getDefaultPresets();
        }

        const updatedPresets = currentPresets.filter(t => !tickersToRemove.includes(t));

        await kv.set(PRESET_KEY, updatedPresets);

        return NextResponse.json({
            success: true,
            removed: tickersToRemove.filter(t => currentPresets!.includes(t)),
            presets: updatedPresets,
            count: updatedPresets.length
        });
    } catch (error) {
        console.error('Error removing from presets in KV:', error);
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

        let currentPresets = await kv.get<string[]>(PRESET_KEY);

        if (!currentPresets) {
            currentPresets = await getDefaultPresets();
        }

        const uniquePresets = [...new Set([...currentPresets, ...tickersToAdd])];

        await kv.set(PRESET_KEY, uniquePresets);

        return NextResponse.json({
            success: true,
            added: tickersToAdd.filter(t => !currentPresets!.includes(t)),
            presets: uniquePresets,
            count: uniquePresets.length
        });
    } catch (error) {
        console.error('Error adding to presets in KV:', error);
        return NextResponse.json({ error: 'Failed to add to presets' }, { status: 500 });
    }
}
