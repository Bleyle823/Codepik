'use client';

import { useState, useEffect } from 'react';
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

interface TraceStats {
  totalTraces: number;
  traceGrowth: number;
  traces: any[];
}

interface PerformanceMetrics {
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
  costBreakdown: {
    name: string;
    value: number;
    color: string;
  }[];
}

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

function TraceTimelineChart({ traces }: { traces?: any[] }) {
  if (!traces || traces.length === 0) {
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

  // Process traces for timeline chart
  const timelineData = traces.reduce((acc: any[], trace) => {
    const date = new Date(trace.created_at).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.interactions += 1;
      existing.avgResponseTime = (existing.avgResponseTime + (trace.duration || 0)) / 2;
    } else {
      acc.push({
        date,
        interactions: 1,
        avgResponseTime: trace.duration || 0
      });
    }
    
    return acc;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Interactions Timeline</CardTitle>
        <CardDescription>Daily AI interaction volume and response times</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="interactions" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Interactions"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PerformanceDistributionChart({ metrics }: { metrics?: PerformanceMetrics }) {
  if (!metrics) return null;

  const performanceData = [
    { name: 'Response Time', value: Math.max(0, 100 - (metrics.avgResponseTime / 20)), color: '#8884d8' },
    { name: 'Success Rate', value: metrics.successRate, color: '#82ca9d' },
    { name: 'Quality Score', value: metrics.qualityMetrics.avgQuality * 100, color: '#ffc658' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Distribution</CardTitle>
        <CardDescription>Key performance metrics overview</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Score']} />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function CostAnalysisChart({ costData }: { costData?: PerformanceMetrics['costBreakdown'] }) {
  if (!costData || costData.length === 0) {
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
              data={costData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {costData.map((entry, index) => (
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

function QualityMetricsChart({ qualityData }: { qualityData?: PerformanceMetrics['qualityMetrics'] }) {
  if (!qualityData) return null;

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
              <span>{(qualityData.avgQuality * 100).toFixed(1)}%</span>
            </div>
            <Progress value={qualityData.avgQuality * 100} className="mt-2" />
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={qualityData.qualityTrend > 0 ? 'default' : 'destructive'}>
              {qualityData.qualityTrend > 0 ? '↗' : '↘'} 
              {Math.abs(qualityData.qualityTrend).toFixed(1)}%
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

export function OpikAnalyticsDashboard() {
  const [traceStats, setTraceStats] = useState<TraceStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError(null);
        
        // Mock data for now - in real implementation, this would fetch from Opik API
        const mockTraceStats: TraceStats = {
          totalTraces: 1247,
          traceGrowth: 15.3,
          traces: [
            { created_at: '2026-01-25', duration: 450 },
            { created_at: '2026-01-26', duration: 380 },
            { created_at: '2026-01-27', duration: 520 },
            { created_at: '2026-01-28', duration: 290 },
            { created_at: '2026-01-29', duration: 410 },
            { created_at: '2026-01-30', duration: 350 }
          ]
        };
        
        const mockPerformanceMetrics: PerformanceMetrics = {
          avgResponseTime: 385,
          responseTimeChange: -8.2,
          totalCost: 24.67,
          costChange: 12.1,
          successRate: 94.2,
          successRateChange: 2.1,
          qualityMetrics: {
            avgQuality: 0.87,
            qualityTrend: 5.3
          },
          costBreakdown: [
            { name: 'Chat', value: 15.20, color: '#8884d8' },
            { name: 'Suggestions', value: 6.80, color: '#82ca9d' },
            { name: 'Quick Edit', value: 2.67, color: '#ffc658' }
          ]
        };
        
        setTraceStats(mockTraceStats);
        setPerformanceMetrics(mockPerformanceMetrics);
      } catch (err) {
        setError('Failed to load analytics data');
        console.error('Analytics loading error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Make sure Opik is properly configured
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="opik-dashboard space-y-6">
      {/* Real-time Metrics */}
      <div>
        <h2 className="text-2xl font-bold mb-4">AI Performance Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="AI Interactions"
            value={traceStats?.totalTraces || 0}
            change={traceStats?.traceGrowth}
            description="Total AI interactions this period"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${performanceMetrics?.avgResponseTime || 0}ms`}
            change={performanceMetrics?.responseTimeChange}
            description="Average AI response time"
          />
          <MetricCard
            title="Token Cost"
            value={`$${performanceMetrics?.totalCost || 0}`}
            change={performanceMetrics?.costChange}
            description="Total AI usage cost"
          />
          <MetricCard
            title="Success Rate"
            value={`${performanceMetrics?.successRate || 0}%`}
            change={performanceMetrics?.successRateChange}
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
            <TraceTimelineChart traces={traceStats?.traces} />
            <PerformanceDistributionChart metrics={performanceMetrics} />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TraceTimelineChart traces={traceStats?.traces} />
            <QualityMetricsChart qualityData={performanceMetrics?.qualityMetrics} />
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostAnalysisChart costData={performanceMetrics?.costBreakdown} />
            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Use caching for repeated requests</li>
                  <li>• Optimize prompt lengths</li>
                  <li>• Choose appropriate models for tasks</li>
                  <li>• Implement rate limiting</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QualityMetricsChart qualityData={performanceMetrics?.qualityMetrics} />
            <Card>
              <CardHeader>
                <CardTitle>Quality Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Code Suggestions Accepted</span>
                    <Badge>73%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Chat Helpfulness</span>
                    <Badge>89%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Edit Accuracy</span>
                    <Badge>91%</Badge>
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