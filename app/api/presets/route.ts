import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 프리셋 파일 경로
const PRESET_FILE_PATH = path.join(process.cwd(), 'public', 'preset_tickers.json');

// GET: 현재 프리셋 티커 목록 조회
export async function GET() {
    try {
        const fileContent = fs.readFileSync(PRESET_FILE_PATH, 'utf8');
        const presets = JSON.parse(fileContent);
        return NextResponse.json({ presets, count: presets.length });
    } catch (error) {
        console.error('Error reading preset file:', error);
        return NextResponse.json({ error: 'Failed to read presets' }, { status: 500 });
    }
}

// PUT: 프리셋 티커 목록 전체 교체
export async function PUT(request: NextRequest) {
    try {
        const { presets } = await request.json();

        if (!Array.isArray(presets)) {
            return NextResponse.json({ error: 'Invalid presets format' }, { status: 400 });
        }

        // 중복 제거 및 정렬
        const uniquePresets = [...new Set(presets)].sort();
        
        fs.writeFileSync(PRESET_FILE_PATH, JSON.stringify(uniquePresets, null, 2));
        
        return NextResponse.json({ 
            success: true, 
            presets: uniquePresets, 
            count: uniquePresets.length 
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

        const fileContent = fs.readFileSync(PRESET_FILE_PATH, 'utf8');
        const currentPresets: string[] = JSON.parse(fileContent);
        
        const updatedPresets = currentPresets.filter(t => !tickersToRemove.includes(t));
        
        fs.writeFileSync(PRESET_FILE_PATH, JSON.stringify(updatedPresets, null, 2));
        
        return NextResponse.json({ 
            success: true, 
            removed: tickersToRemove.filter(t => currentPresets.includes(t)),
            presets: updatedPresets, 
            count: updatedPresets.length 
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

        const fileContent = fs.readFileSync(PRESET_FILE_PATH, 'utf8');
        const currentPresets: string[] = JSON.parse(fileContent);
        
        const uniquePresets = [...new Set([...currentPresets, ...tickersToAdd])];
        
        fs.writeFileSync(PRESET_FILE_PATH, JSON.stringify(uniquePresets, null, 2));
        
        return NextResponse.json({ 
            success: true, 
            added: tickersToAdd.filter(t => !currentPresets.includes(t)),
            presets: uniquePresets, 
            count: uniquePresets.length 
        });
    } catch (error) {
        console.error('Error adding to presets:', error);
        return NextResponse.json({ error: 'Failed to add to presets' }, { status: 500 });
    }
}
