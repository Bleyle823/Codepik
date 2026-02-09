import { NextRequest, NextResponse } from 'next/server';
import { opikClient } from '@/features/opik/server/opik-client';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '10');
    const name = searchParams.get('name') || undefined;

    const result = await opikClient.getPrompts(page, size, name);

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, tags } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const result = await opikClient.createPrompt(name, description, tags);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result.data);
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
