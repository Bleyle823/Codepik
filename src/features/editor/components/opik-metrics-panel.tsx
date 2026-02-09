'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3,
  Zap,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Code,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { editorOpikIntegration } from '../services/editor-opik-integration';

interface OpikMetricsPanelProps {
  className?: string;
}

interface RealTimeMetrics {
  keystrokes: number;
  linesAdded: number;
  suggestionsAccepted: number;
  suggestionAcceptanceRate: number;
  productivityScore: number;
  efficiencyScore: number;
  sessionDuration: number;
}

function MetricCard({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  color = 'text-blue-600',
  description 
}: {
  title: string;
  value: string | number;
  trend?: number;
  icon: any;
  color?: string;
  description?: string;
}) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;
  const trendColor = trend && trend > 0 ? 'text-green-600' : 'text-red-600';
  
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-4 w-4 ${color}`} />
          {trend !== undefined && (
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span className="text-xs font-medium">
                {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs font-medium">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductivityChart({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Productivity Timeline</CardTitle>
        <CardDescription className="text-xs">
          Real-time coding activity and AI assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="activity" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.3}
            />
            <Area 
              type="monotone" 
              dataKey="aiAssistance" 
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function AIAssistanceBreakdown({ metrics }: { metrics: RealTimeMetrics }) {
  const aiUsageData = [
    { name: 'Suggestions', value: metrics.suggestionsAccepted, color: '#3b82f6' },
    { name: 'Quick Edits', value: Math.floor(metrics.keystrokes / 50), color: '#10b981' },
    { name: 'Manual Typing', value: metrics.keystrokes, color: '#6b7280' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">AI Assistance Breakdown</CardTitle>
        <CardDescription className="text-xs">
          How AI is helping your coding session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {aiUsageData.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{item.name}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            <Progress 
              value={(item.value / Math.max(...aiUsageData.map(d => d.value))) * 100} 
              className="h-2"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function OpikMetricsPanel({ className }: OpikMetricsPanelProps) {
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics>({
    keystrokes: 0,
    linesAdded: 0,
    suggestionsAccepted: 0,
    suggestionAcceptanceRate: 0,
    productivityScore: 0,
    efficiencyScore: 0,
    sessionDuration: 0
  });

  const [productivityData, setProductivityData] = useState<any[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      const currentMetrics = editorOpikIntegration.getCurrentMetrics();
      const insights = editorOpikIntegration.getProductivityInsights();
      
      if (insights) {
        setRealTimeMetrics({
          keystrokes: currentMetrics.keystrokes,
          linesAdded: currentMetrics.linesAdded,
          suggestionsAccepted: currentMetrics.suggestionsAccepted,
          suggestionAcceptanceRate: insights.suggestionAcceptanceRate,
          productivityScore: insights.productivityScore,
          efficiencyScore: insights.efficiencyScore,
          sessionDuration: insights.sessionDuration
        });

        // Update productivity timeline
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        setProductivityData(prev => {
          const newData = [...prev, {
            time: timeLabel,
            activity: insights.keystrokesPerMinute,
            aiAssistance: insights.suggestionAcceptanceRate
          }].slice(-20); // Keep last 20 data points
          return newData;
        });

        setIsTracking(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const startNewSession = async () => {
    await editorOpikIntegration.startSession({
      userId: 'current-user', // Would get from auth
      projectId: 'current-project', // Would get from context
      fileName: 'current-file.tsx' // Would get from active file
    });
    setIsTracking(true);
  };

  const endCurrentSession = async () => {
    await editorOpikIntegration.endSession();
    setIsTracking(false);
    setRealTimeMetrics({
      keystrokes: 0,
      linesAdded: 0,
      suggestionsAccepted: 0,
      suggestionAcceptanceRate: 0,
      productivityScore: 0,
      efficiencyScore: 0,
      sessionDuration: 0
    });
    setProductivityData([]);
  };

  return (
    <div className={`h-full flex flex-col bg-sidebar border-r ${className}`}>
      {/* Header */}
      <div className="h-8.75 flex items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Opik Analytics</span>
          {isTracking && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={isTracking ? endCurrentSession : startNewSession}
            title={isTracking ? "End Session" : "Start Session"}
          >
            <RefreshCw className="size-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="realtime" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-2 mt-2">
            <TabsTrigger value="realtime" className="text-xs">Live</TabsTrigger>
            <TabsTrigger value="session" className="text-xs">Session</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-2">
            <TabsContent value="realtime" className="space-y-3 mt-0">
              {/* Real-time Metrics Grid */}
              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  title="Keystrokes"
                  value={realTimeMetrics.keystrokes}
                  icon={Activity}
                  color="text-blue-600"
                />
                <MetricCard
                  title="Lines Added"
                  value={realTimeMetrics.linesAdded}
                  icon={Code}
                  color="text-green-600"
                />
                <MetricCard
                  title="AI Suggestions"
                  value={realTimeMetrics.suggestionsAccepted}
                  icon={Brain}
                  color="text-purple-600"
                />
                <MetricCard
                  title="Acceptance Rate"
                  value={`${realTimeMetrics.suggestionAcceptanceRate.toFixed(0)}%`}
                  icon={Target}
                  color="text-orange-600"
                />
              </div>

              {/* Productivity Scores */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Performance Scores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Productivity</span>
                      <span className="font-medium">{realTimeMetrics.productivityScore.toFixed(0)}/100</span>
                    </div>
                    <Progress value={realTimeMetrics.productivityScore} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>AI Efficiency</span>
                      <span className="font-medium">{realTimeMetrics.efficiencyScore.toFixed(0)}/100</span>
                    </div>
                    <Progress value={realTimeMetrics.efficiencyScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="session" className="space-y-3 mt-0">
              {/* Session Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Current Session</CardTitle>
                  <CardDescription className="text-xs">
                    {isTracking ? 
                      `Active for ${Math.floor(realTimeMetrics.sessionDuration)} minutes` :
                      'No active session'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isTracking ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Total Keystrokes</span>
                        <Badge variant="outline">{realTimeMetrics.keystrokes}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Lines of Code</span>
                        <Badge variant="outline">{realTimeMetrics.linesAdded}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Assistance</span>
                        <Badge variant="outline">{realTimeMetrics.suggestionsAccepted} suggestions</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Start a session to track your coding activity
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2 text-xs"
                        onClick={startNewSession}
                      >
                        Start Tracking
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Productivity Timeline */}
              {productivityData.length > 0 && (
                <ProductivityChart data={productivityData} />
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-3 mt-0">
              {/* AI Usage Analysis */}
              <AIAssistanceBreakdown metrics={realTimeMetrics} />

              {/* Recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    {realTimeMetrics.suggestionAcceptanceRate < 50 ? (
                      <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                        <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Low AI Acceptance Rate</p>
                          <p className="text-muted-foreground">
                            Consider adjusting AI suggestion settings
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Great AI Collaboration!</p>
                          <p className="text-muted-foreground">
                            You're effectively using AI assistance
                          </p>
                        </div>
                      </div>
                    )}

                    {realTimeMetrics.productivityScore > 80 && (
                      <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                        <Zap className="h-3 w-3 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium">High Productivity</p>
                          <p className="text-muted-foreground">
                            You're in the flow state!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" size="sm" className="text-xs justify-start">
                      <Target className="h-3 w-3 mr-2" />
                      Optimize AI Settings
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs justify-start">
                      <BarChart3 className="h-3 w-3 mr-2" />
                      View Full Analytics
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs justify-start">
                      <Brain className="h-3 w-3 mr-2" />
                      AI Performance Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}