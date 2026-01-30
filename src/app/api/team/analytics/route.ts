import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { TeamAnalyticsService } from '@/features/team/services/team-analytics';

const teamAnalyticsSchema = z.object({
  teamId: z.string(),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  includePerformers: z.boolean().optional(),
  includeReport: z.boolean().optional()
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
    const { teamId, timeRange, includePerformers, includeReport } = teamAnalyticsSchema.parse(body);

    // TODO: Verify user has access to this team
    // This would typically check team membership or admin permissions

    const teamAnalytics = new TeamAnalyticsService();

    // Calculate time range
    const defaultTimeRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    };

    const actualTimeRange = timeRange ? {
      start: new Date(timeRange.start),
      end: new Date(timeRange.end)
    } : defaultTimeRange;

    // Get team insights
    const dashboard = await teamAnalytics.getTeamInsights(teamId, actualTimeRange);

    const response: any = {
      success: true,
      dashboard
    };

    // Include top performers if requested
    if (includePerformers) {
      const topPerformers = await teamAnalytics.identifyTopPerformers(teamId);
      response.topPerformers = topPerformers;
    }

    // Include detailed report if requested
    if (includeReport) {
      const report = await teamAnalytics.generateTeamReport(teamId);
      response.report = report;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Team analytics API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate team analytics' },
      { status: 500 }
    );
  }
}

// GET endpoint for quick team stats
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
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const teamAnalytics = new TeamAnalyticsService();

    // Get basic team metrics for the last 7 days
    const timeRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    const dashboard = await teamAnalytics.getTeamInsights(teamId, timeRange);

    // Return simplified metrics for dashboard widgets
    const quickStats = {
      totalInteractions: dashboard.metrics.productivity.totalAIInteractions,
      avgQuality: Math.round(dashboard.metrics.codeQuality.avgQualityScore * 100),
      successRate: Math.round(dashboard.metrics.aiEfficiency.successRate),
      avgResponseTime: Math.round(dashboard.metrics.aiEfficiency.avgResponseTime),
      teamSize: dashboard.metrics.productivity.mostActiveUsers.length,
      productivityTrend: dashboard.metrics.productivity.productivityTrend,
      qualityTrend: dashboard.metrics.codeQuality.qualityTrend,
      topPerformer: dashboard.metrics.codeQuality.topPerformers[0] || 'N/A',
      riskLevel: dashboard.insights.risks.length > 0 ? 'medium' : 'low',
      recommendations: dashboard.recommendations.length
    };

    return NextResponse.json({
      success: true,
      teamId,
      timeRange: '7d',
      stats: quickStats
    });

  } catch (error) {
    console.error('Team quick stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team statistics' },
      { status: 500 }
    );
  }
}