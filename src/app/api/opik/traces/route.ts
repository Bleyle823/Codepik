import { NextRequest, NextResponse } from 'next/server';
import { opikClient } from '@/features/opik/server/opik-client';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '10');
    const projectId = searchParams.get('projectId') || undefined;
    const projectName = searchParams.get('projectName') || undefined;
    const workspaceName = searchParams.get('workspaceName') || undefined;

    const result = await opikClient.getTraces(page, size, { projectId, projectName, workspaceName });

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
}
