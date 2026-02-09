'use client';

import {
  checkOpikHealth,
  OpikTrace
} from '@/lib/opik-client-safe';
import { getTraceStatisticsAction } from '@/lib/opik-actions';

export interface DashboardMetrics {
  totalTraces: number;
  traceGrowth: number;
  avgResponseTime: number;
  responseTimeChange: number;
  totalCost: number;
  costChange: number;
  successRate: number;
  successRateChange: number;
  qualityMetrics: {
    avgQuality: number;
    qualityTrend: number;
  };
  costBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface TraceAnalytics {
  traces: OpikTrace[];
  timelineData: Array<{
    date: string;
    interactions: number;
    avgResponseTime: number;
    successRate: number;
  }>;
  performanceData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface RealTimeStats {
  activeUsers: number;
  currentSessions: number;
  tracesPerMinute: number;
  avgLatency: number;
  errorRate: number;
  topFeatures: Array<{
    feature: string;
    usage: number;
    trend: number;
  }>;
}

export class OpikDashboardService {
  private static instance: OpikDashboardService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds
  private eventListeners: Array<(event: string, data: any) => void> = [];

  static getInstance(): OpikDashboardService {
    if (!OpikDashboardService.instance) {
      OpikDashboardService.instance = new OpikDashboardService();
    }
    return OpikDashboardService.instance;
  }

  // Event system for real-time updates
  addEventListener(callback: (event: string, data: any) => void) {
    this.eventListeners.push(callback);
  }

  removeEventListener(callback: (event: string, data: any) => void) {
    const index = this.eventListeners.indexOf(callback);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    this.eventListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  // Cache management
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Health check
  async checkConnection(): Promise<boolean> {
    try {
      return await checkOpikHealth();
    } catch (error) {
      console.error('Opik connection check failed:', error);
      return false;
    }
  }

  // Fetch dashboard metrics using our new API
  async getDashboardMetrics(projectId?: string): Promise<DashboardMetrics | null> {
    const cacheKey = `dashboard-metrics-${projectId || 'all'}`;
    const cached = this.getCachedData<DashboardMetrics>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch stats from our new API endpoint
      const url = new URL('/api/opik/traces/stats', window.location.origin);
      if (projectId) url.searchParams.append('projectId', projectId);

      const response = await fetch(url.toString());
      const statsResponse = await response.json();

      if (response.ok && statsResponse && statsResponse.stats) {
        // Transform the API response (TraceStatsResponse) to DashboardMetrics
        const statsArray = statsResponse.stats; // Array of daily/bucketed stats

        // Aggregate the stats
        const totalTraces = statsArray.reduce((acc: number, curr: any) => acc + (curr.trace_count || 0), 0);
        const totalCost = statsArray.reduce((acc: number, curr: any) => acc + (curr.cost || 0), 0);
        // Average duration is a bit harder if we only have counts and not totals, but assuming we might get it or approximate it
        // If stats contains total_duration we could divide, otherwise we leave it 0 or mock
        // Looking at types, we have completion_tokens, prompt_tokens, etc.

        // Let's assume we can calculate a rough average if we had total_duration, but we don't in the type def.
        const avgResponseTime = 0;

        // Success rate: API stats don't explicitly have "error_count", so we might default to 100% or need a different endpoint
        const successRate = 100;

        const metrics: DashboardMetrics = {
          totalTraces,
          traceGrowth: 0,
          avgResponseTime,
          responseTimeChange: 0,
          totalCost,
          costChange: 0,
          successRate,
          successRateChange: 0,
          qualityMetrics: {
            avgQuality: 0, // Not in stats API
            qualityTrend: 0
          },
          costBreakdown: [
            // Rough breakdown based on token usage if available
            { name: 'Prompt Tokens', value: statsArray.reduce((acc: number, curr: any) => acc + (curr.prompt_tokens || 0), 0), color: '#3b82f6' },
            { name: 'Completion Tokens', value: statsArray.reduce((acc: number, curr: any) => acc + (curr.completion_tokens || 0), 0), color: '#10b981' }
          ]
        };

        this.setCachedData(cacheKey, metrics);
        this.emit('metrics-updated', metrics);
        return metrics;
      }

      // If API fails or returns empty, try the fallback/server action
      const realStats = await getTraceStatisticsAction(); // Action might need update too if we want server-side filtering there
      if (realStats) {
        // cast because realStats has extra properties but satisfies most
        const metrics: DashboardMetrics = {
          totalTraces: realStats.totalCount,
          traceGrowth: realStats.growthRate,
          avgResponseTime: realStats.avgDuration,
          responseTimeChange: realStats.durationChange,
          totalCost: realStats.totalCost,
          costChange: realStats.costChange,
          successRate: realStats.successRate,
          successRateChange: realStats.successRateChange,
          qualityMetrics: {
            avgQuality: realStats.avgQuality,
            qualityTrend: realStats.qualityTrend
          },
          costBreakdown: realStats.costBreakdown
        };
        this.setCachedData(cacheKey, metrics);
        return metrics;
      }

      return this.getFallbackMetrics();

    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      return this.getFallbackMetrics();
    }
  }

  // Get trace analytics
  async getTraceAnalytics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h', projectId?: string): Promise<TraceAnalytics | null> {
    const cacheKey = `trace-analytics-${timeRange}-${projectId || 'all'}`;
    const cached = this.getCachedData<TraceAnalytics>(cacheKey);
    if (cached) return cached;

    try {
      const traces = await this.fetchTraces(timeRange, projectId);
      const analytics = this.processTraceAnalytics(traces);

      this.setCachedData(cacheKey, analytics);
      this.emit('analytics-updated', analytics);

      return analytics;
    } catch (error) {
      console.error('Failed to fetch trace analytics:', error);
      return this.getFallbackAnalytics();
    }
  }

  // Get real-time statistics
  async getRealTimeStats(projectId?: string): Promise<RealTimeStats | null> {
    try {
      // For real-time, we can query the traces endpoint for very recent traces
      // or keep using mocked/simulated data until Opik supports stream/socket
      const stats: RealTimeStats = {
        activeUsers: await this.getActiveUserCount(),
        currentSessions: await this.getCurrentSessionCount(),
        tracesPerMinute: await this.getTracesPerMinute(),
        avgLatency: await this.getAverageLatency(),
        errorRate: await this.getErrorRate(),
        topFeatures: await this.getTopFeatures()
      };

      this.emit('realtime-stats-updated', stats);
      return stats;
    } catch (error) {
      console.error('Failed to fetch real-time stats:', error);
      return null;
    }
  }

  // Private helper methods

  private async fetchTraces(timeRange: string, projectId?: string) {
    try {
      // Fetch traces from our new API
      const url = new URL('/api/opik/traces', window.location.origin);
      url.searchParams.append('size', '100');
      if (projectId) url.searchParams.append('projectId', projectId);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (response.ok && data && data.content) {
        return data.content;
      }
      return [];
    } catch (error) {
      console.error('Error fetching traces:', error);
      return [];
    }
  }

  private processTraceAnalytics(traces: any[]): TraceAnalytics {
    // Process traces into timeline data
    const timelineMap = new Map();

    traces.forEach(trace => {
      const date = new Date(trace.created_at).toLocaleDateString();
      const existing = timelineMap.get(date) || {
        date,
        interactions: 0,
        totalDuration: 0,
        successCount: 0,
        totalCount: 0
      };

      existing.interactions += 1;
      existing.totalDuration += trace.duration || 0;
      existing.totalCount += 1;
      // Assume success if no error_info or tags don't contain error
      if (!trace.error_info && (!trace.tags || !trace.tags.includes('error'))) {
        existing.successCount += 1;
      }

      timelineMap.set(date, existing);
    });

    const timelineData = Array.from(timelineMap.values()).map(item => ({
      date: item.date,
      interactions: item.interactions,
      avgResponseTime: item.totalCount > 0 ? item.totalDuration / item.totalCount : 0,
      successRate: item.totalCount > 0 ? (item.successCount / item.totalCount) * 100 : 0
    }));

    // Process performance data
    const performanceData = [
      { name: 'Response Time', value: traces.length > 0 ? traces.reduce((sum, t) => sum + (t.duration || 0), 0) / traces.length : 0, color: '#3b82f6' },
      { name: 'Success Rate', value: traces.length > 0 ? (traces.filter(t => !t.error_info).length / traces.length) * 100 : 0, color: '#10b981' },
      { name: 'Quality Score', value: traces.length > 0 ? (traces.reduce((sum, t) => sum + (t.feedback_scores?.[0]?.value || 0.8), 0) / traces.length) * 100 : 0, color: '#f59e0b' }
    ];

    return {
      traces: traces as OpikTrace[],
      timelineData,
      performanceData
    };
  }

  private async getActiveUserCount(): Promise<number> {
    return Math.floor(Math.random() * 20) + 5; // Placeholder
  }

  private async getCurrentSessionCount(): Promise<number> {
    return Math.floor(Math.random() * 50) + 10; // Placeholder
  }

  private async getTracesPerMinute(): Promise<number> {
    return Math.floor(Math.random() * 100) + 20; // Placeholder
  }

  private async getAverageLatency(): Promise<number> {
    return Math.floor(Math.random() * 300) + 100; // Placeholder
  }

  private async getErrorRate(): Promise<number> {
    return Math.random() * 5 + 1; // Placeholder
  }

  private async getTopFeatures(): Promise<Array<{ feature: string; usage: number; trend: number }>> {
    // Could eventually come from aggregating trace tags
    return [
      { feature: 'AI Suggestions', usage: Math.floor(Math.random() * 1000) + 500, trend: (Math.random() - 0.5) * 20 },
      { feature: 'Code Analysis', usage: Math.floor(Math.random() * 800) + 300, trend: (Math.random() - 0.5) * 15 },
      { feature: 'Chat Interactions', usage: Math.floor(Math.random() * 600) + 200, trend: (Math.random() - 0.5) * 25 },
      { feature: 'Quick Edits', usage: Math.floor(Math.random() * 400) + 100, trend: (Math.random() - 0.5) * 30 }
    ];
  }

  private getFallbackMetrics(): DashboardMetrics {
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

  private getFallbackAnalytics(): TraceAnalytics {
    return {
      traces: [],
      timelineData: [],
      performanceData: []
    };
  }

  // Cleanup
  destroy() {
    this.cache.clear();
    this.eventListeners = [];
  }
}

// Export singleton instance
export const dashboardService = OpikDashboardService.getInstance();