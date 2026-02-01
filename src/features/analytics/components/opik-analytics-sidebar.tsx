'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Target,
  Brain,
  Code,
  MessageSquare,
  Settings,
  RefreshCw,
  Minimize2,
  Maximize2
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
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { dashboardService } from '../services/opik-dashboard-service';
import { editorOpikIntegration } from '../../editor/services/editor-opik-integration';
import { performanceOptimizer } from '../../../lib/opik-performance-optimizer';

interface OpikAnalyticsSidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface QuickMetrics {
  keystrokes: number;
  linesAdded: number;
  aiSuggestions: number;
  acceptanceRate: number;
  productivity: number;
  sessionDuration: number;
}

interface MiniChart {
  time: string;
  activity: number;
  ai: number;
}

export function OpikAnalyticsSidebar({ 
  className, 
  isCollapsed = false, 
  onToggleCollapse 
}: OpikAnalyticsSidebarProps) {
  const [quickMetrics, setQuickMetrics] = useState<QuickMetrics>({
    keystrokes: 0,
    linesAdded: 0,
    aiSuggestions: 0,
    acceptanceRate: 0,
    productivity: 0,
    sessionDuration: 0
  });

  const [miniChartData, setMiniChartData] = useState<MiniChart[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Update metrics every 10 seconds
  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = editorOpikIntegration.getCurrentMetrics();
      const insights = editorOpikIntegration.getProductivityInsights();
      
      if (insights) {
        setQuickMetrics({
          keystrokes: currentMetrics.keystrokes,
          linesAdded: currentMetrics.linesAdded,
          aiSuggestions: currentMetrics.suggestionsAccepted,
          acceptanceRate: insights.suggestionAcceptanceRate,
          productivity: insights.productivityScore,
          sessionDuration: insights.sessionDuration
        });

        // Update mini chart data
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        setMiniChartData(prev => {
          const newData = [...prev, {
            time: timeLabel,
            activity: insights.keystrokesPerMinute || 0,
            ai: insights.suggestionAcceptanceRate || 0
          }].slice(-12); // Keep last 12 data points
          return newData;
        });

        setLastUpdate(Date.now());
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      await dashboardService.getDashboardMetrics();
      await performanceOptimizer.forceFlush();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className={`w-12 h-full bg-sidebar border-l flex flex-col items-center py-2 ${className}`}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggleCollapse}
          className="mb-2"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
        
        <div className="flex flex-col gap-2 items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="text-xs font-mono text-muted-foreground transform -rotate-90 whitespace-nowrap origin-center">
            {quickMetrics.keystrokes}
          </div>
          <div className="text-xs font-mono text-muted-foreground transform -rotate-90 whitespace-nowrap origin-center">
            {quickMetrics.productivity.toFixed(0)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 h-full bg-sidebar border-l flex flex-col ${className}`}>
      {/* Header */}
      <div className="h-10 flex items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Analytics</span>
          <Badge variant="secondary" className="text-xs animate-pulse">
            Live
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onToggleCollapse}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="live" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-2 mt-2">
            <TabsTrigger value="live" className="text-xs">Live</TabsTrigger>
            <TabsTrigger value="session" className="text-xs">Session</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-2">
            <TabsContent value="live" className="space-y-3 mt-0">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-blue-600" />
                    <div>
                      <div className="text-lg font-bold">{quickMetrics.keystrokes}</div>
                      <div className="text-xs text-muted-foreground">Keystrokes</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center gap-2">
                    <Code className="h-3 w-3 text-green-600" />
                    <div>
                      <div className="text-lg font-bold">{quickMetrics.linesAdded}</div>
                      <div className="text-xs text-muted-foreground">Lines</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3 text-purple-600" />
                    <div>
                      <div className="text-lg font-bold">{quickMetrics.aiSuggestions}</div>
                      <div className="text-xs text-muted-foreground">AI Helps</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-orange-600" />
                    <div>
                      <div className="text-lg font-bold">{quickMetrics.acceptanceRate.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Accept</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Productivity Score */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Productivity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Score</span>
                      <span className="font-medium">{quickMetrics.productivity.toFixed(0)}/100</span>
                    </div>
                    <Progress value={quickMetrics.productivity} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {quickMetrics.productivity > 80 ? '🔥 On fire!' : 
                       quickMetrics.productivity > 60 ? '👍 Good pace' : 
                       quickMetrics.productivity > 30 ? '⚡ Getting started' : '💤 Take your time'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Session Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span>{Math.floor(quickMetrics.sessionDuration)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Update</span>
                      <span>{new Date(lastUpdate).toLocaleTimeString('en-US', { 
                        hour12: false, 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="session" className="space-y-3 mt-0">
              {/* Mini Activity Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Activity Timeline</CardTitle>
                  <CardDescription className="text-xs">
                    Last 2 hours of coding activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={miniChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ fontSize: '12px' }}
                        labelStyle={{ fontSize: '10px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="activity" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        name="Activity"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="ai" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.3}
                        name="AI Usage"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Session Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Session Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Peak Activity</span>
                      <Badge variant="outline">
                        {Math.max(...miniChartData.map(d => d.activity)).toFixed(0)} kpm
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>AI Efficiency</span>
                      <Badge variant="outline">
                        {quickMetrics.acceptanceRate.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Consistency</span>
                      <Badge variant="outline">
                        {miniChartData.length > 0 ? 'Active' : 'Starting'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-3 mt-0">
              {/* Trend Indicators */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Productivity</div>
                      <div className="text-sm font-medium">
                        {quickMetrics.productivity > 50 ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Rising</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-orange-600">
                            <TrendingDown className="h-3 w-3" />
                            <span>Building</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">AI Usage</div>
                      <div className="text-sm font-medium">
                        {quickMetrics.acceptanceRate > 50 ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>High</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-blue-600">
                            <TrendingUp className="h-3 w-3" />
                            <span>Growing</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    {quickMetrics.productivity > 80 ? (
                      <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <Zap className="h-3 w-3 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Excellent Flow!</p>
                          <p className="text-muted-foreground">Keep up the great work</p>
                        </div>
                      </div>
                    ) : quickMetrics.acceptanceRate < 30 ? (
                      <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                        <Brain className="h-3 w-3 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Try AI Suggestions</p>
                          <p className="text-muted-foreground">AI can help speed up coding</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-950/20 rounded">
                        <Activity className="h-3 w-3 text-gray-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Steady Progress</p>
                          <p className="text-muted-foreground">You're doing great!</p>
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
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full text-xs justify-start">
                      <BarChart3 className="h-3 w-3 mr-2" />
                      View Full Dashboard
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs justify-start">
                      <Settings className="h-3 w-3 mr-2" />
                      Adjust Settings
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