import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { SuggestionTracer } from '@/features/editor/services/opik-suggestion-tracer';
import { QuickEditTracer } from '@/features/editor/services/opik-quick-edit-tracer';
import { ChatTracer } from '@/features/conversations/services/opik-chat-tracer';

const feedbackSchema = z.object({
  traceId: z.string(),
  feature: z.enum(['suggestion', 'quick-edit', 'chat']),
  outcome: z.enum(['accepted', 'rejected', 'modified', 'helpful', 'not_helpful', 'partially_helpful']),
  details: z.object({
    // For suggestions
    modificationDetails: z.object({
      originalLength: z.number(),
      finalLength: z.number(),
      charactersChanged: z.number()
    }).optional(),
    
    // For quick edits
    qualityMetrics: z.object({
      syntaxCorrect: z.boolean(),
      followsInstruction: z.boolean(),
      maintainsStyle: z.boolean(),
      userSatisfaction: z.number().min(0).max(1)
    }).optional(),
    
    // For chat
    userFeedback: z.string().optional(),
    
    // Timing information
    timings: z.object({
      generationTime: z.number(),
      displayTime: z.number(),
      userDecisionTime: z.number()
    }).optional()
  }).optional()
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { traceId, feature, outcome, details } = feedbackSchema.parse(body);

    // Record feedback based on feature type
    switch (feature) {
      case 'suggestion':
        await recordSuggestionFeedback(traceId, outcome, details);
        break;
      
      case 'quick-edit':
        await recordQuickEditFeedback(traceId, outcome, details);
        break;
      
      case 'chat':
        await recordChatFeedback(traceId, outcome, details);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid feature type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    );
  }
}

async function recordSuggestionFeedback(
  traceId: string, 
  outcome: string, 
  details?: any
) {
  const suggestionTracer = new SuggestionTracer();
  
  // Record outcome
  await suggestionTracer.recordSuggestionOutcome(
    traceId,
    outcome as 'accepted' | 'rejected' | 'modified',
    details?.modificationDetails
  );
  
  // Record timing if available
  if (details?.timings) {
    await suggestionTracer.recordSuggestionTiming(traceId, details.timings);
  }
}

async function recordQuickEditFeedback(
  traceId: string, 
  outcome: string, 
  details?: any
) {
  const quickEditTracer = new QuickEditTracer();
  
  // Record outcome with quality metrics
  await quickEditTracer.recordEditOutcome(
    traceId,
    outcome as 'accepted' | 'rejected' | 'modified',
    details?.qualityMetrics
  );
}

async function recordChatFeedback(
  traceId: string, 
  outcome: string, 
  details?: any
) {
  const chatTracer = new ChatTracer();
  
  // Record conversation outcome
  await chatTracer.recordConversationOutcome(
    traceId,
    outcome as 'helpful' | 'not_helpful' | 'partially_helpful',
    details?.userFeedback
  );
}

// GET endpoint to retrieve feedback statistics
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature');
    const timeRange = searchParams.get('timeRange') || '7d';

    // This would typically fetch aggregated feedback statistics from Opik
    // For now, return mock statistics
    const mockStats = {
      suggestion: {
        totalFeedback: 156,
        acceptanceRate: 0.73,
        modificationRate: 0.18,
        rejectionRate: 0.09,
        avgResponseTime: 420,
        avgDecisionTime: 2300
      },
      'quick-edit': {
        totalFeedback: 89,
        acceptanceRate: 0.84,
        modificationRate: 0.12,
        rejectionRate: 0.04,
        avgSatisfaction: 0.87,
        syntaxAccuracy: 0.94
      },
      chat: {
        totalFeedback: 234,
        helpfulRate: 0.81,
        partiallyHelpfulRate: 0.14,
        notHelpfulRate: 0.05,
        avgSatisfaction: 0.83
      }
    };

    const stats = feature ? { [feature]: mockStats[feature as keyof typeof mockStats] } : mockStats;

    return NextResponse.json({
      success: true,
      timeRange,
      stats
    });

  } catch (error) {
    console.error('Feedback stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback statistics' },
      { status: 500 }
    );
  }
}