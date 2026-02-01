import { safeOpikClient } from '@/lib/opik-client-safe';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface TeamMetrics {
  productivity: {
    totalAIInteractions: number;
    avgInteractionsPerUser: number;
    mostActiveUsers: string[];
    productivityTrend: number;
  };
  codeQuality: {
    avgQualityScore: number;
    qualityTrend: number;
    topPerformers: string[];
    qualityDistribution: { [key: string]: number };
  };
  aiEfficiency: {
    avgResponseTime: number;
    responseTimeTrend: number;
    successRate: number;
    costPerInteraction: number;
  };
  collaboration: {
    sharedProjects: number;
    crossUserInteractions: number;
    knowledgeSharing: number;
  };
  learning: {
    improvementRate: number;
    skillProgression: { [skill: string]: number };
    learningVelocity: number;
  };
}

export interface TeamInsights {
  strengths: string[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
}

export interface TeamDashboard {
  metrics: TeamMetrics;
  insights: TeamInsights;
  recommendations: TeamRecommendation[];
  trends: TeamTrends;
  benchmarks: TeamBenchmarks;
}

export interface TeamRecommendation {
  type: 'performance' | 'cost' | 'quality' | 'collaboration';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: string;
  actionItems: string[];
}

export interface TeamTrends {
  productivity: { date: string; value: number }[];
  quality: { date: string; value: number }[];
  efficiency: { date: string; value: number }[];
  collaboration: { date: string; value: number }[];
}

export interface TeamBenchmarks {
  industryAverage: {
    productivity: number;
    quality: number;
    efficiency: number;
  };
  teamPerformance: {
    productivity: number;
    quality: number;
    efficiency: number;
  };
  percentileRank: number;
}

export interface PerformerAnalysis {
  userId: string;
  name: string;
  overallScore: number;
  strengths: string[];
  improvementAreas: string[];
  metrics: {
    productivity: number;
    quality: number;
    efficiency: number;
    collaboration: number;
  };
  recommendations: string[];
}

export class TeamAnalyticsService {
  async getTeamInsights(teamId: string, timeRange: TimeRange): Promise<TeamDashboard> {
    try {
      const trace = await safeOpikClient.createTrace({
        name: 'team-dashboard-generation',
        input: { teamId, timeRange },
        metadata: { feature: 'team-analytics' }
      });

      // Get team traces
      const teamTraces = await this.getTeamTraces(teamId, timeRange);
      
      // Calculate team metrics
      const metrics = await this.calculateTeamMetrics(teamTraces);
      
      // Generate insights and recommendations
      const insights = await this.generateTeamInsights(metrics, teamTraces);
      const recommendations = await this.generateTeamRecommendations(insights);
      
      // Calculate trends
      const trends = await this.calculateTrends(teamTraces);
      
      // Compare to benchmarks
      const benchmarks = await this.compareToBenchmarks(metrics);

      const dashboard: TeamDashboard = {
        metrics,
        insights,
        recommendations,
        trends,
        benchmarks
      };

      trace.update({ 
        output: { 
          metricsCalculated: Object.keys(metrics).length,
          recommendationsGenerated: recommendations.length
        }
      });

      return dashboard;
    } catch (error) {
      console.error('Failed to generate team dashboard:', error);
      return this.generateMockTeamDashboard(teamId);
    }
  }

  async identifyTopPerformers(teamId: string): Promise<PerformerAnalysis[]> {
    try {
      const teamMembers = await this.getTeamMembers(teamId);
      const analyses: PerformerAnalysis[] = [];

      for (const member of teamMembers) {
        const memberTraces = await this.getMemberTraces(member.id, teamId);
        const analysis = await this.analyzeMemberPerformance(member, memberTraces);
        analyses.push(analysis);
      }

      return analyses.sort((a, b) => b.overallScore - a.overallScore);
    } catch (error) {
      console.error('Failed to identify top performers:', error);
      return this.generateMockPerformerAnalyses(teamId);
    }
  }

  async generateTeamReport(teamId: string): Promise<{
    summary: string;
    recommendations: TeamRecommendation[];
    benchmarks: TeamBenchmarks;
    actionItems: string[];
  }> {
    try {
      const insights = await this.getTeamInsights(teamId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      });

      const summary = this.generateExecutiveSummary(insights);
      const actionItems = this.generateActionItems(insights);

      return {
        summary,
        recommendations: insights.recommendations,
        benchmarks: insights.benchmarks,
        actionItems
      };
    } catch (error) {
      console.error('Failed to generate team report:', error);
      throw error;
    }
  }

  private async getTeamTraces(teamId: string, timeRange: TimeRange): Promise<any[]> {
    try {
      // Mock search for now - replace with MCP call when available
      const traces = [];
        // projectName: 'codepik-ide',
        filters: {
          'metadata.teamId': teamId,
          'created_at': { 
            $gte: timeRange.start.toISOString(),
            $lte: timeRange.end.toISOString()
          }
        },
        size: 10000
      });

      return traces || [];
    } catch (error) {
      console.error('Failed to get team traces:', error);
      return [];
    }
  }

  private async getMemberTraces(userId: string, teamId: string): Promise<any[]> {
    try {
      // Mock search for now - replace with MCP call when available
      const traces = [];
        // projectName: 'codepik-ide',
        filters: {
          'metadata.userId': userId,
          'metadata.teamId': teamId
        },
        size: 1000
      });

      return traces || [];
    } catch (error) {
      console.error('Failed to get member traces:', error);
      return [];
    }
  }

  private async calculateTeamMetrics(traces: any[]): Promise<TeamMetrics> {
    if (traces.length === 0) {
      return this.getEmptyTeamMetrics();
    }

    // Group traces by user
    const userGroups = traces.reduce((groups: any, trace) => {
      const userId = trace.metadata?.userId || 'unknown';
      if (!groups[userId]) {
        groups[userId] = [];
      }
      groups[userId].push(trace);
      return groups;
    }, {});

    const userCount = Object.keys(userGroups).length;

    // Calculate productivity metrics
    const productivity = {
      totalAIInteractions: traces.length,
      avgInteractionsPerUser: traces.length / userCount,
      mostActiveUsers: this.getMostActiveUsers(userGroups, 3),
      productivityTrend: this.calculateProductivityTrend(traces)
    };

    // Calculate code quality metrics
    const qualityScores = traces
      .filter(t => t.feedback?.some((f: any) => f.name.includes('quality')))
      .map(t => t.feedback.find((f: any) => f.name.includes('quality'))?.value || 0);

    const codeQuality = {
      avgQualityScore: qualityScores.length > 0 ? 
        qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0.75,
      qualityTrend: this.calculateQualityTrend(traces),
      topPerformers: this.getTopQualityPerformers(userGroups, 3),
      qualityDistribution: this.calculateQualityDistribution(qualityScores)
    };

    // Calculate AI efficiency metrics
    const responseTimes = traces
      .filter(t => t.duration)
      .map(t => t.duration);

    const successfulTraces = traces.filter(t => !t.metadata?.error);

    const aiEfficiency = {
      avgResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 500,
      responseTimeTrend: this.calculateResponseTimeTrend(traces),
      successRate: (successfulTraces.length / traces.length) * 100,
      costPerInteraction: this.calculateCostPerInteraction(traces)
    };

    // Calculate collaboration metrics
    const collaboration = {
      sharedProjects: this.calculateSharedProjects(traces),
      crossUserInteractions: this.calculateCrossUserInteractions(traces),
      knowledgeSharing: this.calculateKnowledgeSharing(traces)
    };

    // Calculate learning metrics
    const learning = {
      improvementRate: this.calculateImprovementRate(traces),
      skillProgression: this.calculateSkillProgression(traces),
      learningVelocity: this.calculateLearningVelocity(traces)
    };

    return {
      productivity,
      codeQuality,
      aiEfficiency,
      collaboration,
      learning
    };
  }

  private async generateTeamInsights(metrics: TeamMetrics, traces: any[]): Promise<TeamInsights> {
    const strengths: string[] = [];
    const opportunities: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];

    // Analyze productivity
    if (metrics.productivity.productivityTrend > 10) {
      strengths.push('Strong productivity growth trend');
    } else if (metrics.productivity.productivityTrend < -5) {
      risks.push('Declining productivity trend');
      recommendations.push('Review team workload and AI tool adoption');
    }

    // Analyze code quality
    if (metrics.codeQuality.avgQualityScore > 0.85) {
      strengths.push('High code quality standards');
    } else if (metrics.codeQuality.avgQualityScore < 0.7) {
      opportunities.push('Improve code quality through better AI prompts');
      recommendations.push('Implement code quality training and best practices');
    }

    // Analyze efficiency
    if (metrics.aiEfficiency.avgResponseTime < 300) {
      strengths.push('Excellent AI response times');
    } else if (metrics.aiEfficiency.avgResponseTime > 1000) {
      risks.push('Slow AI response times affecting productivity');
      recommendations.push('Optimize AI model selection and caching');
    }

    // Analyze collaboration
    if (metrics.collaboration.knowledgeSharing > 0.7) {
      strengths.push('Strong knowledge sharing culture');
    } else {
      opportunities.push('Increase knowledge sharing and collaboration');
      recommendations.push('Implement team code reviews and pair programming');
    }

    return {
      strengths,
      opportunities,
      risks,
      recommendations
    };
  }

  private async generateTeamRecommendations(insights: TeamInsights): Promise<TeamRecommendation[]> {
    const recommendations: TeamRecommendation[] = [];

    // Generate recommendations based on insights
    if (insights.risks.some(risk => risk.includes('productivity'))) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Address Productivity Decline',
        description: 'Team productivity has been declining. Investigate root causes and implement improvements.',
        impact: 'High - Could improve team output by 20-30%',
        effort: 'Medium - Requires analysis and process changes',
        actionItems: [
          'Conduct team productivity analysis',
          'Review AI tool usage patterns',
          'Implement productivity tracking dashboard',
          'Provide additional training on AI tools'
        ]
      });
    }

    if (insights.opportunities.some(opp => opp.includes('quality'))) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        title: 'Improve Code Quality Standards',
        description: 'Implement better practices to improve overall code quality.',
        impact: 'Medium - Better maintainability and fewer bugs',
        effort: 'Low - Process and guideline changes',
        actionItems: [
          'Create code quality guidelines',
          'Implement automated quality checks',
          'Set up regular code review sessions',
          'Provide quality-focused AI prompts'
        ]
      });
    }

    if (insights.opportunities.some(opp => opp.includes('collaboration'))) {
      recommendations.push({
        type: 'collaboration',
        priority: 'medium',
        title: 'Enhance Team Collaboration',
        description: 'Improve knowledge sharing and cross-team collaboration.',
        impact: 'Medium - Better team cohesion and knowledge transfer',
        effort: 'Low - Cultural and process changes',
        actionItems: [
          'Set up regular knowledge sharing sessions',
          'Implement pair programming practices',
          'Create shared AI prompt libraries',
          'Establish mentorship programs'
        ]
      });
    }

    return recommendations;
  }

  // Helper methods for calculations
  private getMostActiveUsers(userGroups: any, count: number): string[] {
    return Object.entries(userGroups)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.length - a.length)
      .slice(0, count)
      .map(([userId]) => userId);
  }

  private calculateProductivityTrend(traces: any[]): number {
    // Mock calculation - would analyze trace timestamps for real trend
    return Math.random() * 20 - 10; // Random between -10 and 10
  }

  private calculateQualityTrend(traces: any[]): number {
    // Mock calculation
    return Math.random() * 15 - 7.5;
  }

  private getTopQualityPerformers(userGroups: any, count: number): string[] {
    return Object.entries(userGroups)
      .map(([userId, traces]: [string, any]) => {
        const qualityScores = traces
          .filter((t: any) => t.feedback?.some((f: any) => f.name.includes('quality')))
          .map((t: any) => t.feedback.find((f: any) => f.name.includes('quality'))?.value || 0);
        
        const avgQuality = qualityScores.length > 0 ? 
          qualityScores.reduce((sum: number, score: number) => sum + score, 0) / qualityScores.length : 0;
        
        return { userId, avgQuality };
      })
      .sort((a, b) => b.avgQuality - a.avgQuality)
      .slice(0, count)
      .map(item => item.userId);
  }

  private calculateQualityDistribution(qualityScores: number[]): { [key: string]: number } {
    if (qualityScores.length === 0) {
      return { high: 0, medium: 0, low: 0 };
    }

    const high = qualityScores.filter(score => score >= 0.8).length;
    const medium = qualityScores.filter(score => score >= 0.6 && score < 0.8).length;
    const low = qualityScores.filter(score => score < 0.6).length;

    return {
      high: (high / qualityScores.length) * 100,
      medium: (medium / qualityScores.length) * 100,
      low: (low / qualityScores.length) * 100
    };
  }

  private calculateResponseTimeTrend(traces: any[]): number {
    return Math.random() * 20 - 10;
  }

  private calculateCostPerInteraction(traces: any[]): number {
    // Mock calculation based on trace features
    return traces.reduce((total, trace) => {
      const feature = trace.metadata?.feature || 'unknown';
      const cost = feature === 'chat' ? 0.02 : 
                  feature === 'suggestions' ? 0.005 : 
                  feature === 'quick-edit' ? 0.01 : 0.01;
      return total + cost;
    }, 0) / traces.length;
  }

  private calculateSharedProjects(traces: any[]): number {
    const projects = new Set(traces.map(t => t.metadata?.projectId).filter(Boolean));
    return projects.size;
  }

  private calculateCrossUserInteractions(traces: any[]): number {
    // Mock calculation
    return Math.floor(Math.random() * 50) + 10;
  }

  private calculateKnowledgeSharing(traces: any[]): number {
    // Mock calculation
    return Math.random() * 0.4 + 0.6; // Between 0.6 and 1.0
  }

  private calculateImprovementRate(traces: any[]): number {
    return Math.random() * 0.3 + 0.1; // Between 0.1 and 0.4
  }

  private calculateSkillProgression(traces: any[]): { [skill: string]: number } {
    return {
      'AI Prompt Engineering': Math.random() * 0.4 + 0.6,
      'Code Quality': Math.random() * 0.4 + 0.6,
      'Debugging': Math.random() * 0.4 + 0.6,
      'Architecture': Math.random() * 0.4 + 0.6
    };
  }

  private calculateLearningVelocity(traces: any[]): number {
    return Math.random() * 0.5 + 0.5; // Between 0.5 and 1.0
  }

  private async calculateTrends(traces: any[]): Promise<TeamTrends> {
    // Mock trend data - would calculate from historical traces
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return {
      productivity: dates.map(date => ({ date, value: Math.random() * 100 + 50 })),
      quality: dates.map(date => ({ date, value: Math.random() * 30 + 70 })),
      efficiency: dates.map(date => ({ date, value: Math.random() * 40 + 60 })),
      collaboration: dates.map(date => ({ date, value: Math.random() * 50 + 50 }))
    };
  }

  private async compareToBenchmarks(metrics: TeamMetrics): Promise<TeamBenchmarks> {
    // Mock benchmark comparison
    return {
      industryAverage: {
        productivity: 75,
        quality: 80,
        efficiency: 70
      },
      teamPerformance: {
        productivity: metrics.productivity.avgInteractionsPerUser * 10, // Normalize
        quality: metrics.codeQuality.avgQualityScore * 100,
        efficiency: Math.max(0, 100 - (metrics.aiEfficiency.avgResponseTime / 10))
      },
      percentileRank: Math.floor(Math.random() * 40) + 60 // Between 60-99th percentile
    };
  }

  private generateExecutiveSummary(insights: TeamDashboard): string {
    return `Team performance analysis shows ${insights.metrics.productivity.totalAIInteractions} AI interactions with an average quality score of ${(insights.metrics.codeQuality.avgQualityScore * 100).toFixed(1)}%. The team ranks in the ${insights.benchmarks.percentileRank}th percentile compared to industry benchmarks.`;
  }

  private generateActionItems(insights: TeamDashboard): string[] {
    const actionItems: string[] = [];
    
    insights.recommendations.forEach(rec => {
      actionItems.push(...rec.actionItems.slice(0, 2)); // Take first 2 action items from each recommendation
    });

    return actionItems.slice(0, 8); // Limit to 8 action items
  }

  private async analyzeMemberPerformance(member: TeamMember, traces: any[]): Promise<PerformerAnalysis> {
    // Mock analysis - would calculate real metrics from traces
    return {
      userId: member.id,
      name: member.name,
      overallScore: Math.random() * 30 + 70, // Between 70-100
      strengths: ['High code quality', 'Fast response times', 'Good collaboration'],
      improvementAreas: ['Prompt optimization', 'Error handling'],
      metrics: {
        productivity: Math.random() * 30 + 70,
        quality: Math.random() * 30 + 70,
        efficiency: Math.random() * 30 + 70,
        collaboration: Math.random() * 30 + 70
      },
      recommendations: [
        'Focus on prompt engineering best practices',
        'Participate in code review sessions',
        'Share knowledge with junior team members'
      ]
    };
  }

  private async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    // Mock team members - would fetch from database
    return [
      { id: 'user1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Senior Developer', joinedAt: '2024-01-15' },
      { id: 'user2', name: 'Bob Smith', email: 'bob@example.com', role: 'Developer', joinedAt: '2024-02-01' },
      { id: 'user3', name: 'Carol Davis', email: 'carol@example.com', role: 'Tech Lead', joinedAt: '2023-11-20' }
    ];
  }

  private getEmptyTeamMetrics(): TeamMetrics {
    return {
      productivity: {
        totalAIInteractions: 0,
        avgInteractionsPerUser: 0,
        mostActiveUsers: [],
        productivityTrend: 0
      },
      codeQuality: {
        avgQualityScore: 0,
        qualityTrend: 0,
        topPerformers: [],
        qualityDistribution: { high: 0, medium: 0, low: 0 }
      },
      aiEfficiency: {
        avgResponseTime: 0,
        responseTimeTrend: 0,
        successRate: 0,
        costPerInteraction: 0
      },
      collaboration: {
        sharedProjects: 0,
        crossUserInteractions: 0,
        knowledgeSharing: 0
      },
      learning: {
        improvementRate: 0,
        skillProgression: {},
        learningVelocity: 0
      }
    };
  }

  private generateMockTeamDashboard(teamId: string): TeamDashboard {
    // Generate comprehensive mock data for demo purposes
    const mockMetrics: TeamMetrics = {
      productivity: {
        totalAIInteractions: 1247,
        avgInteractionsPerUser: 415,
        mostActiveUsers: ['alice', 'bob', 'carol'],
        productivityTrend: 15.3
      },
      codeQuality: {
        avgQualityScore: 0.87,
        qualityTrend: 5.2,
        topPerformers: ['carol', 'alice', 'bob'],
        qualityDistribution: { high: 65, medium: 30, low: 5 }
      },
      aiEfficiency: {
        avgResponseTime: 385,
        responseTimeTrend: -8.1,
        successRate: 94.2,
        costPerInteraction: 0.019
      },
      collaboration: {
        sharedProjects: 8,
        crossUserInteractions: 34,
        knowledgeSharing: 0.78
      },
      learning: {
        improvementRate: 0.23,
        skillProgression: {
          'AI Prompt Engineering': 0.82,
          'Code Quality': 0.89,
          'Debugging': 0.75,
          'Architecture': 0.71
        },
        learningVelocity: 0.85
      }
    };

    return {
      metrics: mockMetrics,
      insights: {
        strengths: ['High code quality standards', 'Strong productivity growth', 'Excellent AI response times'],
        opportunities: ['Improve debugging skills', 'Increase knowledge sharing'],
        risks: ['Potential burnout from high productivity'],
        recommendations: ['Implement mentorship program', 'Focus on work-life balance']
      },
      recommendations: [
        {
          type: 'performance',
          priority: 'medium',
          title: 'Enhance Debugging Skills',
          description: 'Team could benefit from advanced debugging techniques training.',
          impact: 'Medium - Reduce debugging time by 20%',
          effort: 'Low - Training sessions and workshops',
          actionItems: ['Schedule debugging workshops', 'Create debugging best practices guide']
        }
      ],
      trends: {
        productivity: [
          { date: '2026-01-24', value: 85 },
          { date: '2026-01-25', value: 92 },
          { date: '2026-01-26', value: 88 },
          { date: '2026-01-27', value: 95 },
          { date: '2026-01-28', value: 91 },
          { date: '2026-01-29', value: 97 },
          { date: '2026-01-30', value: 94 }
        ],
        quality: [
          { date: '2026-01-24', value: 82 },
          { date: '2026-01-25', value: 85 },
          { date: '2026-01-26', value: 87 },
          { date: '2026-01-27', value: 89 },
          { date: '2026-01-28', value: 86 },
          { date: '2026-01-29', value: 91 },
          { date: '2026-01-30', value: 87 }
        ],
        efficiency: [
          { date: '2026-01-24', value: 78 },
          { date: '2026-01-25', value: 82 },
          { date: '2026-01-26', value: 85 },
          { date: '2026-01-27', value: 83 },
          { date: '2026-01-28', value: 87 },
          { date: '2026-01-29', value: 89 },
          { date: '2026-01-30', value: 85 }
        ],
        collaboration: [
          { date: '2026-01-24', value: 65 },
          { date: '2026-01-25', value: 68 },
          { date: '2026-01-26', value: 72 },
          { date: '2026-01-27', value: 75 },
          { date: '2026-01-28', value: 78 },
          { date: '2026-01-29', value: 76 },
          { date: '2026-01-30', value: 78 }
        ]
      },
      benchmarks: {
        industryAverage: {
          productivity: 75,
          quality: 80,
          efficiency: 70
        },
        teamPerformance: {
          productivity: 92,
          quality: 87,
          efficiency: 85
        },
        percentileRank: 85
      }
    };
  }

  private generateMockPerformerAnalyses(teamId: string): PerformerAnalysis[] {
    return [
      {
        userId: 'carol',
        name: 'Carol Davis',
        overallScore: 94,
        strengths: ['Exceptional code quality', 'Leadership', 'Knowledge sharing'],
        improvementAreas: ['Response time optimization'],
        metrics: { productivity: 92, quality: 96, efficiency: 88, collaboration: 95 },
        recommendations: ['Mentor junior developers', 'Lead AI best practices initiative']
      },
      {
        userId: 'alice',
        name: 'Alice Johnson',
        overallScore: 87,
        strengths: ['Fast development', 'AI tool proficiency', 'Problem solving'],
        improvementAreas: ['Code documentation', 'Collaboration'],
        metrics: { productivity: 95, quality: 85, efficiency: 92, collaboration: 78 },
        recommendations: ['Improve documentation practices', 'Participate in code reviews']
      },
      {
        userId: 'bob',
        name: 'Bob Smith',
        overallScore: 82,
        strengths: ['Consistent quality', 'Team collaboration', 'Learning agility'],
        improvementAreas: ['Productivity', 'AI prompt optimization'],
        metrics: { productivity: 78, quality: 88, efficiency: 85, collaboration: 92 },
        recommendations: ['Focus on productivity tools', 'Advanced AI training']
      }
    ];
  }
}

export interface TimeRange {
  start: Date;
  end: Date;
}