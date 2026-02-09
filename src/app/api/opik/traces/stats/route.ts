import { NextRequest, NextResponse } from 'next/server';
import { opikClient } from '@/features/opik/server/opik-client';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId') || undefined;
    const projectName = searchParams.get('projectName') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const workspaceName = searchParams.get('workspaceName') || undefined;

    const result = await opikClient.getTraceStats({ projectId, projectName, startDate, endDate, workspaceName });

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
}
