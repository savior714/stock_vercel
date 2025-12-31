import { NextRequest, NextResponse } from 'next/server';

// 로컬 개발용 메모리 저장소 (Vercel KV 대체)
let localTickers: string[] = [];

export async function GET() {
    try {
        return NextResponse.json({ tickers: localTickers });
    } catch (error) {
        console.error('Error fetching tickers:', error);
        return NextResponse.json({ error: 'Failed to fetch tickers' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { tickers: newTickers } = await request.json();

        if (!Array.isArray(newTickers) || newTickers.length === 0) {
            return NextResponse.json({ error: 'Invalid tickers' }, { status: 400 });
        }

        const uniqueTickers = [...new Set([...localTickers, ...newTickers])];
        localTickers = uniqueTickers;

        return NextResponse.json({ tickers: uniqueTickers });
    } catch (error) {
        console.error('Error adding tickers:', error);
        return NextResponse.json({ error: 'Failed to add tickers' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { tickers: tickersToRemove } = await request.json();

        if (!Array.isArray(tickersToRemove) || tickersToRemove.length === 0) {
            return NextResponse.json({ error: 'Invalid tickers' }, { status: 400 });
        }

        localTickers = localTickers.filter(t => !tickersToRemove.includes(t));

        return NextResponse.json({ tickers: localTickers });
    } catch (error) {
        console.error('Error removing tickers:', error);
        return NextResponse.json({ error: 'Failed to remove tickers' }, { status: 500 });
    }
}
