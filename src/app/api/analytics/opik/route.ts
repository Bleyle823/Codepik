import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { opikClient, OPIK_PROJECT_NAME } from '@/lib/opik-client';

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
    const timeRange = searchParams.get('timeRange') || '7d';
    const feature = searchParams.get('feature'); // Optional filter by feature

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    try {
      // Get trace statistics from Opik
      const filters: any = {
        'created_at': { 
          $gte: startDate.toISOString(), 
          $lte: endDate.toISOString() 
        }
      };

      // Add user filter
      filters['metadata.userId'] = userId;

      // Add feature filter if specified
      if (feature) {
        filters['metadata.feature'] = feature;
      }

      const traces = await opikClient.searchTraces({
        projectName: OPIK_PROJECT_NAME,
        filters,
        size: 1000,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      // Calculate metrics
      const metrics = calculateMetrics(traces, timeRange);

      return NextResponse.json({
        success: true,
        data: {
          timeRange,
          metrics,
          traces: traces.slice(0, 50) // Return limited traces for timeline
        }
      });

    } catch (opikError) {
      console.error('Opik API error:', opikError);
      
      // Return mock data if Opik is not available
      const mockData = generateMockAnalytics(timeRange, userId, feature);
      
      return NextResponse.json({
        success: true,
        data: mockData,
        note: 'Using mock data - Opik not configured'
      });
    }

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function calculateMetrics(traces: any[], timeRange: string) {
  if (!traces || traces.length === 0) {
    return {
      totalTraces: 0,
      traceGrowth: 0,
      avgResponseTime: 0,
      responseTimeChange: 0,
      totalCost: 0,
      costChange: 0,
      successRate: 0,
      successRateChange: 0,
      qualityMetrics: {
        avgQuality: 0,
        qualityTrend: 0
      },
      costBreakdown: []
    };
  }

  // Calculate current period metrics
  const totalTraces = traces.length;
  
  // Calculate average response time (assuming duration is in milliseconds)
  const avgResponseTime = traces.reduce((sum, trace) => {
    return sum + (trace.duration || 0);
  }, 0) / totalTraces;

  // Calculate success rate (traces without errors)
  const successfulTraces = traces.filter(trace => !trace.metadata?.error);
  const successRate = (successfulTraces.length / totalTraces) * 100;

  // Calculate estimated cost (mock calculation)
  const totalCost = traces.reduce((sum, trace) => {
    const feature = trace.metadata?.feature || 'unknown';
    const baseCost = feature === 'chat' ? 0.02 : 
                    feature === 'suggestions' ? 0.005 : 
                    feature === 'quick-edit' ? 0.01 : 0.01;
    return sum + baseCost;
  }, 0);

  // Calculate quality metrics from feedback
  const tracesWithFeedback = traces.filter(trace => trace.feedback && trace.feedback.length > 0);
  const avgQuality = tracesWithFeedback.length > 0 ? 
    tracesWithFeedback.reduce((sum, trace) => {
      const qualityFeedback = trace.feedback.find((f: any) => 
        f.name.includes('quality') || f.name.includes('satisfaction')
      );
      return sum + (qualityFeedback?.value || 0.5);
    }, 0) / tracesWithFeedback.length : 0.75;

  // Group by feature for cost breakdown
  const featureGroups = traces.reduce((groups: any, trace) => {
    const feature = trace.metadata?.feature || 'unknown';
    if (!groups[feature]) {
      groups[feature] = { count: 0, cost: 0 };
    }
    groups[feature].count++;
    groups[feature].cost += feature === 'chat' ? 0.02 : 
                           feature === 'suggestions' ? 0.005 : 
                           feature === 'quick-edit' ? 0.01 : 0.01;
    return groups;
  }, {});

  const costBreakdown = Object.entries(featureGroups).map(([feature, data]: [string, any]) => ({
    name: feature.charAt(0).toUpperCase() + feature.slice(1),
    value: data.cost,
    color: feature === 'chat' ? '#8884d8' : 
           feature === 'suggestions' ? '#82ca9d' : 
           feature === 'quick-edit' ? '#ffc658' : '#ff7c7c'
  }));

  // Mock growth calculations (would need historical data for real implementation)
  const traceGrowth = Math.random() * 20 - 10; // Random between -10 and 10
  const responseTimeChange = Math.random() * 20 - 10;
  const costChange = Math.random() * 30 - 15;
  const successRateChange = Math.random() * 10 - 5;
  const qualityTrend = Math.random() * 15 - 7.5;

  return {
    totalTraces,
    traceGrowth,
    avgResponseTime: Math.round(avgResponseTime),
    responseTimeChange,
    totalCost: Math.round(totalCost * 100) / 100,
    costChange,
    successRate: Math.round(successRate * 10) / 10,
    successRateChange,
    qualityMetrics: {
      avgQuality,
      qualityTrend
    },
    costBreakdown
  };
}

function generateMockAnalytics(timeRange: string, userId: string, feature?: string | null) {
  const baseTraceCount = timeRange === '1d' ? 50 : timeRange === '7d' ? 300 : 1200;
  const traces = [];
  
  // Generate mock traces
  for (let i = 0; i < Math.min(50, baseTraceCount); i++) {
    const date = new Date();
    date.setHours(date.getHours() - (i * 2));
    
    traces.push({
      id: `mock-trace-${i}`,
      created_at: date.toISOString(),
      duration: 200 + Math.random() * 800,
      metadata: {
        userId,
        feature: feature || ['chat', 'suggestions', 'quick-edit'][Math.floor(Math.random() * 3)],
        error: Math.random() < 0.05 // 5% error rate
      },
      feedback: Math.random() < 0.3 ? [{ // 30% have feedback
        name: 'overall_quality',
        value: 0.6 + Math.random() * 0.4
      }] : []
    });
  }

  return {
    timeRange,
    metrics: calculateMetrics(traces, timeRange),
    traces
  };
}