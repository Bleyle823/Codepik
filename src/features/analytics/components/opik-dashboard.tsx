'use client';

import { useState, useEffect, useCallback } from 'react';
import { dashboardService, DashboardMetrics, TraceAnalytics, RealTimeStats } from '../services/opik-dashboard-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Interfaces moved to service file

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  description?: string;
}

function MetricCard({ title, value, change, description }: MetricCardProps) {
  const changeColor = change && change > 0 ? 'text-green-600' : 'text-red-600';
  const changeIcon = change && change > 0 ? '↗' : '↘';
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={`text-xs ${changeColor} flex items-center gap-1`}>
            <span>{changeIcon}</span>
            {Math.abs(change).toFixed(1)}% from last period
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TraceTimelineChart({ analytics }: { analytics?: TraceAnalytics }) {
  if (!analytics || analytics.timelineData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Interactions Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Interactions Timeline</CardTitle>
        <CardDescription>Daily AI interaction volume and response times</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="interactions" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Interactions"
            />
            <Line 
              type="monotone" 
              dataKey="avgResponseTime" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Avg Response Time (ms)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PerformanceDistributionChart({ analytics }: { analytics?: TraceAnalytics }) {
  if (!analytics || !analytics.performanceData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Distribution</CardTitle>
        <CardDescription>Key performance metrics overview</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}`, 'Score']} />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function CostAnalysisChart({ metrics }: { metrics?: DashboardMetrics }) {
  if (!metrics || !metrics.costBreakdown || metrics.costBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No cost data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Analysis</CardTitle>
        <CardDescription>AI usage cost breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={metrics.costBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#3b82f6"
              dataKey="value"
            >
              {metrics.costBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cost']} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function QualityMetricsChart({ metrics }: { metrics?: DashboardMetrics }) {
  if (!metrics || !metrics.qualityMetrics) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Metrics</CardTitle>
        <CardDescription>AI output quality trends</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span>Average Quality Score</span>
              <span>{(metrics.qualityMetrics.avgQuality * 100).toFixed(1)}%</span>
            </div>
            <Progress value={metrics.qualityMetrics.avgQuality * 100} className="mt-2" />
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={metrics.qualityMetrics.qualityTrend > 0 ? 'default' : 'destructive'}>
              {metrics.qualityMetrics.qualityTrend > 0 ? '↗' : '↘'} 
              {Math.abs(metrics.qualityMetrics.qualityTrend).toFixed(1)}%
            </Badge>
            <span className="text-sm text-muted-foreground">
              Quality trend from last period
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RealTimeStatsPanel({ stats }: { stats?: RealTimeStats }) {
  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-Time Statistics</CardTitle>
        <CardDescription>Live system performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Active Users</span>
              <Badge variant="secondary">{stats.activeUsers}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Current Sessions</span>
              <Badge variant="secondary">{stats.currentSessions}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Traces/Min</span>
              <Badge variant="secondary">{stats.tracesPerMinute}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Avg Latency</span>
              <Badge variant="outline">{stats.avgLatency}ms</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Error Rate</span>
              <Badge variant={stats.errorRate > 5 ? 'destructive' : 'secondary'}>
                {stats.errorRate.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OpikAnalyticsDashboard() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [traceAnalytics, setTraceAnalytics] = useState<TraceAnalytics | null>(null);
  const [realTimeStats, setRealTimeStats] = useState<RealTimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check connection first
      const isConnected = await dashboardService.checkConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      
      if (!isConnected) {
        setError('Unable to connect to Opik. Using cached data.');
      }
      
      // Load all dashboard data
      const [metrics, analytics, stats] = await Promise.all([
        dashboardService.getDashboardMetrics(),
        dashboardService.getTraceAnalytics(timeRange),
        dashboardService.getRealTimeStats()
      ]);
      
      setDashboardMetrics(metrics);
      setTraceAnalytics(analytics);
      setRealTimeStats(stats);
      
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
    
    // Set up event listeners for real-time updates
    const handleMetricsUpdate = (event: string, data: any) => {
      if (event === 'metrics-updated') {
        setDashboardMetrics(data);
      } else if (event === 'analytics-updated') {
        setTraceAnalytics(data);
      } else if (event === 'realtime-stats-updated') {
        setRealTimeStats(data);
      }
    };

    dashboardService.addEventListener(handleMetricsUpdate);
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      if (connectionStatus === 'connected') {
        dashboardService.getRealTimeStats().then(setRealTimeStats);
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      dashboardService.removeEventListener(handleMetricsUpdate);
      clearInterval(refreshInterval);
    };
  }, [loadAnalytics, connectionStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading Opik analytics...</p>
          <p className="text-xs text-muted-foreground">Connecting to workspace...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Make sure Opik is properly configured with API key and workspace
          </p>
          <Button 
            onClick={loadAnalytics} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="opik-dashboard space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Opik Analytics Dashboard</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm text-muted-foreground">
              {connectionStatus === 'connected' ? 'Connected to Opik' : 
               connectionStatus === 'disconnected' ? 'Disconnected' : 'Checking connection...'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
        </div>
      )}

      {/* Real-time Stats */}
      {realTimeStats && (
        <RealTimeStatsPanel stats={realTimeStats} />
      )}

      {/* Main Metrics */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="AI Interactions"
            value={dashboardMetrics?.totalTraces || 0}
            change={dashboardMetrics?.traceGrowth}
            description="Total AI interactions this period"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${dashboardMetrics?.avgResponseTime || 0}ms`}
            change={dashboardMetrics?.responseTimeChange}
            description="Average AI response time"
          />
          <MetricCard
            title="Token Cost"
            value={`$${dashboardMetrics?.totalCost?.toFixed(2) || '0.00'}`}
            change={dashboardMetrics?.costChange}
            description="Total AI usage cost"
          />
          <MetricCard
            title="Success Rate"
            value={`${dashboardMetrics?.successRate?.toFixed(1) || 0}%`}
            change={dashboardMetrics?.successRateChange}
            description="AI task success rate"
          />
        </div>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TraceTimelineChart analytics={traceAnalytics} />
            <PerformanceDistributionChart analytics={traceAnalytics} />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TraceTimelineChart analytics={traceAnalytics} />
            <QualityMetricsChart metrics={dashboardMetrics} />
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostAnalysisChart metrics={dashboardMetrics} />
            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Use intelligent caching for repeated AI requests</li>
                  <li>• Optimize prompt lengths and complexity</li>
                  <li>• Choose appropriate models for different tasks</li>
                  <li>• Implement smart rate limiting and batching</li>
                  <li>• Monitor and analyze usage patterns</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QualityMetricsChart metrics={dashboardMetrics} />
            <Card>
              <CardHeader>
                <CardTitle>Quality Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Code Suggestions Accepted</span>
                    <Badge variant="secondary">
                      {realTimeStats?.topFeatures.find(f => f.feature === 'AI Suggestions')?.usage || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Chat Helpfulness</span>
                    <Badge variant="secondary">
                      {((dashboardMetrics?.qualityMetrics.avgQuality || 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Edit Accuracy</span>
                    <Badge variant="secondary">
                      {dashboardMetrics?.successRate?.toFixed(0) || 0}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate</span>
                    <Badge variant={realTimeStats && realTimeStats.errorRate > 5 ? 'destructive' : 'secondary'}>
                      {realTimeStats?.errorRate.toFixed(1) || 0}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}