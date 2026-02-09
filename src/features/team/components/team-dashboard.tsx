'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  Target,
  Clock,
  CheckCircle,
  DollarSign
} from 'lucide-react';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import type { TeamDashboard, TeamMetrics, PerformerAnalysis } from '@/features/team/services/team-analytics';

interface TeamDashboardProps {
  teamId: string;
  className?: string;
}

interface TeamStats {
  totalInteractions: number;
  avgQuality: number;
  successRate: number;
  avgResponseTime: number;
  teamSize: number;
  productivityTrend: number;
  qualityTrend: number;
  topPerformer: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: number;
}

function TeamMetricCard({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  description,
  trendLabel 
}: {
  title: string;
  value: string | number;
  trend?: number;
  icon: any;
  description?: string;
  trendLabel?: string;
}) {
  const trendColor = trend && trend > 0 ? 'text-green-600' : 'text-red-600';
  const trendIcon = trend && trend > 0 ? '↗' : '↘';
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <p className={`text-xs ${trendColor} flex items-center gap-1 mt-1`}>
            <span>{trendIcon}</span>
            {Math.abs(trend).toFixed(1)}% {trendLabel || 'from last period'}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProductivityChart({ data }: { data: { date: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Productivity Trend</CardTitle>
        <CardDescription>Daily productivity metrics over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8884d8" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TeamPerformanceRadar({ metrics }: { metrics: TeamMetrics }) {
  const radarData = [
    { subject: 'Productivity', A: metrics.productivity.productivityTrend + 50, fullMark: 100 },
    { subject: 'Quality', A: metrics.codeQuality.avgQualityScore * 100, fullMark: 100 },
    { subject: 'Efficiency', A: Math.max(0, 100 - (metrics.aiEfficiency.avgResponseTime / 10)), fullMark: 100 },
    { subject: 'Collaboration', A: metrics.collaboration.knowledgeSharing * 100, fullMark: 100 },
    { subject: 'Learning', A: metrics.learning.learningVelocity * 100, fullMark: 100 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance Overview</CardTitle>
        <CardDescription>Multi-dimensional performance analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="Performance"
              dataKey="A"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TopPerformersCard({ performers }: { performers: PerformerAnalysis[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Top Performers
        </CardTitle>
        <CardDescription>Team members with highest overall scores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performers.slice(0, 3).map((performer, index) => (
            <div key={performer.userId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{performer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {performer.strengths[0]}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{performer.overallScore.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsCard({ dashboard }: { dashboard: TeamDashboard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Team Insights
        </CardTitle>
        <CardDescription>Key strengths, opportunities, and risks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dashboard.insights.strengths.length > 0 && (
            <div>
              <h4 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Strengths
              </h4>
              <ul className="text-sm space-y-1">
                {dashboard.insights.strengths.slice(0, 2).map((strength, index) => (
                  <li key={index} className="text-green-600">• {strength}</li>
                ))}
              </ul>
            </div>
          )}

          {dashboard.insights.opportunities.length > 0 && (
            <div>
              <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Opportunities
              </h4>
              <ul className="text-sm space-y-1">
                {dashboard.insights.opportunities.slice(0, 2).map((opportunity, index) => (
                  <li key={index} className="text-blue-600">• {opportunity}</li>
                ))}
              </ul>
            </div>
          )}

          {dashboard.insights.risks.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Risks
              </h4>
              <ul className="text-sm space-y-1">
                {dashboard.insights.risks.slice(0, 2).map((risk, index) => (
                  <li key={index} className="text-red-600">• {risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsCard({ dashboard }: { dashboard: TeamDashboard }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
        <CardDescription>Actionable insights for team improvement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dashboard.recommendations.slice(0, 2).map((rec, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{rec.title}</h4>
                <Badge variant={rec.priority === 'high' ? 'destructive' : 
                              rec.priority === 'medium' ? 'default' : 'secondary'}>
                  {rec.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
              <div className="text-xs space-y-1">
                <p><strong>Impact:</strong> {rec.impact}</p>
                <p><strong>Effort:</strong> {rec.effort}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamDashboardComponent({ teamId, className }: TeamDashboardProps) {
  const [quickStats, setQuickStats] = useState<TeamStats | null>(null);
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [topPerformers, setTopPerformers] = useState<PerformerAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load quick stats first
      const statsResponse = await fetch(`/api/team/analytics?teamId=${teamId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setQuickStats(statsData.stats);
      }

      // Load detailed dashboard data
      const dashboardResponse = await fetch('/api/team/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          includePerformers: true,
          includeReport: false
        })
      });

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        setDashboard(dashboardData.dashboard);
        setTopPerformers(dashboardData.topPerformers || []);
      } else {
        throw new Error('Failed to load team dashboard');
      }

    } catch (err) {
      setError('Failed to load team data');
      console.error('Team dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading team dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard || !quickStats) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">{error || 'Failed to load team data'}</p>
          <Button onClick={loadTeamData} variant="outline" size="sm" className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`team-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Analytics</h1>
          <p className="text-muted-foreground">
            Performance insights and optimization recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={quickStats.riskLevel === 'high' ? 'destructive' : 
                         quickStats.riskLevel === 'medium' ? 'default' : 'secondary'}>
            {quickStats.riskLevel} risk
          </Badge>
          <Button onClick={loadTeamData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TeamMetricCard
          title="AI Interactions"
          value={quickStats.totalInteractions}
          trend={quickStats.productivityTrend}
          icon={Users}
          description="Total team AI usage"
        />
        <TeamMetricCard
          title="Quality Score"
          value={`${quickStats.avgQuality}%`}
          trend={quickStats.qualityTrend}
          icon={Award}
          description="Average code quality"
        />
        <TeamMetricCard
          title="Success Rate"
          value={`${quickStats.successRate}%`}
          icon={CheckCircle}
          description="AI task success rate"
        />
        <TeamMetricCard
          title="Response Time"
          value={`${quickStats.avgResponseTime}ms`}
          icon={Clock}
          description="Average AI response time"
        />
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductivityChart data={dashboard.trends.productivity} />
            <TeamPerformanceRadar metrics={dashboard.metrics} />
            <TopPerformersCard performers={topPerformers} />
            <InsightsCard dashboard={dashboard} />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quality Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboard.trends.quality}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboard.trends.efficiency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance Benchmarks</CardTitle>
                <CardDescription>How your team compares to industry standards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {dashboard.benchmarks.teamPerformance.productivity}
                    </p>
                    <p className="text-sm text-muted-foreground">Team Productivity</p>
                    <p className="text-xs">vs {dashboard.benchmarks.industryAverage.productivity} industry avg</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {dashboard.benchmarks.teamPerformance.quality}
                    </p>
                    <p className="text-sm text-muted-foreground">Team Quality</p>
                    <p className="text-xs">vs {dashboard.benchmarks.industryAverage.quality} industry avg</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {dashboard.benchmarks.teamPerformance.efficiency}
                    </p>
                    <p className="text-sm text-muted-foreground">Team Efficiency</p>
                    <p className="text-xs">vs {dashboard.benchmarks.industryAverage.efficiency} industry avg</p>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {dashboard.benchmarks.percentileRank}th Percentile
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your team ranks higher than {dashboard.benchmarks.percentileRank}% of similar teams
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InsightsCard dashboard={dashboard} />
            <TopPerformersCard performers={topPerformers} />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((performer) => (
                  <div key={performer.userId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{performer.name}</h4>
                      <Badge variant="outline">{performer.overallScore.toFixed(0)} score</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="text-center">
                        <Progress value={performer.metrics.productivity} className="mb-1" />
                        <p className="text-xs">Productivity</p>
                      </div>
                      <div className="text-center">
                        <Progress value={performer.metrics.quality} className="mb-1" />
                        <p className="text-xs">Quality</p>
                      </div>
                      <div className="text-center">
                        <Progress value={performer.metrics.efficiency} className="mb-1" />
                        <p className="text-xs">Efficiency</p>
                      </div>
                      <div className="text-center">
                        <Progress value={performer.metrics.collaboration} className="mb-1" />
                        <p className="text-xs">Collaboration</p>
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p><strong>Strengths:</strong> {performer.strengths.join(', ')}</p>
                      <p><strong>Growth areas:</strong> {performer.improvementAreas.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationsCard dashboard={dashboard} />
          
          <Card>
            <CardHeader>
              <CardTitle>Action Plan</CardTitle>
              <CardDescription>Prioritized steps to improve team performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard.recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : 
                                    rec.priority === 'medium' ? 'default' : 'secondary'}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <p><strong>Expected Impact:</strong> {rec.impact}</p>
                      </div>
                      <div>
                        <p><strong>Implementation Effort:</strong> {rec.effort}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium text-sm mb-2">Action Items:</p>
                      <ul className="text-sm space-y-1">
                        {rec.actionItems.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}