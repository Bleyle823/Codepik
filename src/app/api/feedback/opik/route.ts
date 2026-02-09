import { NextRequest, NextResponse } from 'next/server';
import { opikClient } from '@/features/opik/server/opik-client';
import { z } from 'zod';

const feedbackSchema = z.object({
  traceId: z.string(),
  score: z.number().min(0).max(1),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { traceId, score, reason } = feedbackSchema.parse(body);

    const result = await opikClient.trackFeedback(traceId, {
      name: 'user_feedback',
      value: score,
      reason: reason
    });

    if (result.error) {
      console.error('Opik feedback error:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}