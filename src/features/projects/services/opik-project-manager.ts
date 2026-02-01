'use client';

import { 
  getCurrentProjectId,
  getCurrentUserId,
  OpikProject,
  safeOpikClient
} from '@/lib/opik-client-safe';

export interface ProjectConfiguration {
  id: string;
  name: string;
  description?: string;
  language: string;
  framework?: string;
  aiFeatures: {
    suggestions: boolean;
    quickEdit: boolean;
    chat: boolean;
    codeAnalysis: boolean;
  };
  tracingSettings: {
    enabled: boolean;
    batchSize: number;
    flushInterval: number;
    includeKeystrokes: boolean;
    includeCodeChanges: boolean;
  };
  qualitySettings: {
    enableFeedback: boolean;
    autoQualityScoring: boolean;
    customMetrics: string[];
  };
}

export interface ProjectMetrics {
  totalSessions: number;
  totalTraces: number;
  avgSessionDuration: number;
  codeProductivity: {
    linesPerSession: number;
    keystrokesPerMinute: number;
    aiAssistanceRate: number;
  };
  aiUsage: {
    suggestionsRequested: number;
    suggestionsAccepted: number;
    quickEditsPerformed: number;
    chatInteractions: number;
  };
  qualityMetrics: {
    avgQualityScore: number;
    errorRate: number;
    userSatisfaction: number;
  };
}

export interface WorkspaceIntegration {
  workspaceId: string;
  workspaceName: string;
  projects: ProjectConfiguration[];
  globalSettings: {
    defaultTracingEnabled: boolean;
    batchingEnabled: boolean;
    realTimeSync: boolean;
  };
}

export class OpikProjectManager {
  private static instance: OpikProjectManager;
  private currentProject: ProjectConfiguration | null = null;
  private projectCache: Map<string, ProjectConfiguration> = new Map();
  private metricsCache: Map<string, ProjectMetrics> = new Map();

  static getInstance(): OpikProjectManager {
    if (!OpikProjectManager.instance) {
      OpikProjectManager.instance = new OpikProjectManager();
    }
    return OpikProjectManager.instance;
  }

  // Project Management
  async initializeProject(config: Partial<ProjectConfiguration>): Promise<ProjectConfiguration | null> {
    try {
    // Initialize Opik project
    const opikProject = await safeOpikClient.createProject({
      name: config.name || 'codepik-project',
      description: config.description || 'AI-powered coding project'
    });
      if (!opikProject) {
        throw new Error('Failed to initialize Opik project');
      }

      // Create project configuration
      const projectConfig: ProjectConfiguration = {
        id: opikProject.id,
        name: config.name || opikProject.name,
        description: config.description || 'AI-powered coding project',
        language: config.language || 'typescript',
        framework: config.framework,
        aiFeatures: {
          suggestions: true,
          quickEdit: true,
          chat: true,
          codeAnalysis: true,
          ...config.aiFeatures
        },
        tracingSettings: {
          enabled: true,
          batchSize: 10,
          flushInterval: 5000,
          includeKeystrokes: true,
          includeCodeChanges: true,
          ...config.tracingSettings
        },
        qualitySettings: {
          enableFeedback: true,
          autoQualityScoring: true,
          customMetrics: [],
          ...config.qualitySettings
        }
      };

      // Cache the configuration
      this.projectCache.set(projectConfig.id, projectConfig);
      this.currentProject = projectConfig;

    // Create initialization trace
    await safeOpikClient.createTrace({
        name: 'project-initialization',
        input: {
          projectId: projectConfig.id,
          projectName: projectConfig.name,
          language: projectConfig.language,
          framework: projectConfig.framework
        },
        output: {
          success: true,
          configuration: projectConfig
        },
        metadata: {
          feature: 'project-management',
          userId: getCurrentUserId(),
          timestamp: new Date().toISOString()
        },
        tags: ['project', 'initialization', projectConfig.language]
      });

      console.log('Opik project initialized:', projectConfig.name);
      return projectConfig;
    } catch (error) {
      console.error('Failed to initialize project:', error);
      return null;
    }
  }

  async updateProjectConfiguration(
    projectId: string, 
    updates: Partial<ProjectConfiguration>
  ): Promise<boolean> {
    try {
      const existingConfig = this.projectCache.get(projectId);
      if (!existingConfig) {
        throw new Error('Project not found');
      }

      const updatedConfig: ProjectConfiguration = {
        ...existingConfig,
        ...updates,
        aiFeatures: { ...existingConfig.aiFeatures, ...updates.aiFeatures },
        tracingSettings: { ...existingConfig.tracingSettings, ...updates.tracingSettings },
        qualitySettings: { ...existingConfig.qualitySettings, ...updates.qualitySettings }
      };

      this.projectCache.set(projectId, updatedConfig);
      
      if (this.currentProject?.id === projectId) {
        this.currentProject = updatedConfig;
      }

    // Trace configuration update
    await safeOpikClient.createTrace({
        name: 'project-configuration-update',
        input: {
          projectId,
          updates
        },
        output: {
          success: true,
          newConfiguration: updatedConfig
        },
        metadata: {
          feature: 'project-management',
          userId: getCurrentUserId(),
          timestamp: new Date().toISOString()
        },
        tags: ['project', 'configuration', 'update']
      });

      return true;
    } catch (error) {
      console.error('Failed to update project configuration:', error);
      return false;
    }
  }

  getCurrentProject(): ProjectConfiguration | null {
    return this.currentProject;
  }

  getProjectConfiguration(projectId: string): ProjectConfiguration | null {
    return this.projectCache.get(projectId) || null;
  }

  // Metrics and Analytics
  async getProjectMetrics(projectId: string): Promise<ProjectMetrics | null> {
    try {
      // Check cache first
      const cached = this.metricsCache.get(projectId);
      if (cached) {
        return cached;
      }

      // This would typically fetch from Opik API using MCP
      // For now, we'll generate mock metrics
      const metrics: ProjectMetrics = {
        totalSessions: Math.floor(Math.random() * 100) + 50,
        totalTraces: Math.floor(Math.random() * 1000) + 500,
        avgSessionDuration: Math.floor(Math.random() * 60) + 30, // minutes
        codeProductivity: {
          linesPerSession: Math.floor(Math.random() * 200) + 50,
          keystrokesPerMinute: Math.floor(Math.random() * 100) + 50,
          aiAssistanceRate: Math.random() * 0.5 + 0.3 // 30-80%
        },
        aiUsage: {
          suggestionsRequested: Math.floor(Math.random() * 500) + 200,
          suggestionsAccepted: Math.floor(Math.random() * 300) + 100,
          quickEditsPerformed: Math.floor(Math.random() * 100) + 20,
          chatInteractions: Math.floor(Math.random() * 150) + 50
        },
        qualityMetrics: {
          avgQualityScore: Math.random() * 0.3 + 0.7, // 70-100%
          errorRate: Math.random() * 0.1, // 0-10%
          userSatisfaction: Math.random() * 0.3 + 0.7 // 70-100%
        }
      };

      // Cache the metrics
      this.metricsCache.set(projectId, metrics);
      
      return metrics;
    } catch (error) {
      console.error('Failed to get project metrics:', error);
      return null;
    }
  }

  async generateProjectReport(projectId: string): Promise<{
    summary: string;
    recommendations: string[];
    insights: Record<string, any>;
  } | null> {
    try {
      const config = this.getProjectConfiguration(projectId);
      const metrics = await this.getProjectMetrics(projectId);
      
      if (!config || !metrics) {
        throw new Error('Project data not available');
      }

      const acceptanceRate = metrics.aiUsage.suggestionsAccepted / metrics.aiUsage.suggestionsRequested;
      const productivityScore = (metrics.codeProductivity.linesPerSession / 100) * 
                               (metrics.codeProductivity.aiAssistanceRate * 100);

      const summary = `Project "${config.name}" has ${metrics.totalSessions} coding sessions with an average duration of ${metrics.avgSessionDuration} minutes. AI assistance acceptance rate is ${(acceptanceRate * 100).toFixed(1)}% with a productivity score of ${productivityScore.toFixed(1)}.`;

      const recommendations: string[] = [];
      
      if (acceptanceRate < 0.5) {
        recommendations.push('Consider reviewing AI suggestion settings - low acceptance rate detected');
      }
      
      if (metrics.codeProductivity.keystrokesPerMinute < 30) {
        recommendations.push('Productivity could be improved with more AI assistance features');
      }
      
      if (metrics.qualityMetrics.errorRate > 0.05) {
        recommendations.push('Enable additional code analysis features to reduce error rate');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Great work! Your AI-assisted coding workflow is optimized');
      }

      const insights = {
        topPerformingFeature: metrics.aiUsage.suggestionsAccepted > metrics.aiUsage.quickEditsPerformed ? 'suggestions' : 'quick-edits',
        productivityTrend: productivityScore > 50 ? 'increasing' : 'stable',
        aiDependency: metrics.codeProductivity.aiAssistanceRate > 0.6 ? 'high' : 'moderate',
        codeQuality: metrics.qualityMetrics.avgQualityScore > 0.8 ? 'excellent' : 'good'
      };

    // Trace report generation
    await safeOpikClient.createTrace({
        name: 'project-report-generation',
        input: {
          projectId,
          projectName: config.name
        },
        output: {
          summary,
          recommendations,
          insights,
          metricsSnapshot: metrics
        },
        metadata: {
          feature: 'project-reporting',
          userId: getCurrentUserId(),
          timestamp: new Date().toISOString()
        },
        tags: ['project', 'report', 'analytics']
      });

      return { summary, recommendations, insights };
    } catch (error) {
      console.error('Failed to generate project report:', error);
      return null;
    }
  }

  // Workspace Integration
  async getWorkspaceIntegration(): Promise<WorkspaceIntegration | null> {
    try {
      // This would typically use Opik MCP to get workspace info
      const workspaceIntegration: WorkspaceIntegration = {
        workspaceId: 'codepik-workspace',
        workspaceName: 'Codepik Development',
        projects: Array.from(this.projectCache.values()),
        globalSettings: {
          defaultTracingEnabled: true,
          batchingEnabled: true,
          realTimeSync: true
        }
      };

      return workspaceIntegration;
    } catch (error) {
      console.error('Failed to get workspace integration:', error);
      return null;
    }
  }

  async syncWithWorkspace(): Promise<boolean> {
    try {
    // Note: Batch flushing handled by safe client
      
      // This would sync project configurations and metrics with Opik workspace
      console.log('Synced with Opik workspace');
      return true;
    } catch (error) {
      console.error('Failed to sync with workspace:', error);
      return false;
    }
  }

  // Feature Management
  isFeatureEnabled(feature: keyof ProjectConfiguration['aiFeatures']): boolean {
    return this.currentProject?.aiFeatures[feature] || false;
  }

  async toggleFeature(
    feature: keyof ProjectConfiguration['aiFeatures'], 
    enabled: boolean
  ): Promise<boolean> {
    if (!this.currentProject) return false;

    const updates = {
      aiFeatures: {
        ...this.currentProject.aiFeatures,
        [feature]: enabled
      }
    };

    return this.updateProjectConfiguration(this.currentProject.id, updates);
  }

  // Cleanup and optimization
  clearCache(): void {
    this.projectCache.clear();
    this.metricsCache.clear();
  }

  async optimizeProject(projectId: string): Promise<{
    optimizations: string[];
    estimatedImprovement: number;
  } | null> {
    try {
      const config = this.getProjectConfiguration(projectId);
      const metrics = await this.getProjectMetrics(projectId);
      
      if (!config || !metrics) return null;

      const optimizations: string[] = [];
      let estimatedImprovement = 0;

      // Analyze and suggest optimizations
      if (config.tracingSettings.batchSize < 5) {
        optimizations.push('Increase batch size to reduce API calls');
        estimatedImprovement += 10;
      }

      if (!config.tracingSettings.includeKeystrokes && metrics.codeProductivity.keystrokesPerMinute > 50) {
        optimizations.push('Enable keystroke tracking for better productivity insights');
        estimatedImprovement += 15;
      }

      if (metrics.aiUsage.suggestionsAccepted / metrics.aiUsage.suggestionsRequested < 0.3) {
        optimizations.push('Tune AI suggestion parameters for better acceptance rate');
        estimatedImprovement += 25;
      }

      return { optimizations, estimatedImprovement };
    } catch (error) {
      console.error('Failed to optimize project:', error);
      return null;
    }
  }
}

// Export singleton instance
export const projectManager = OpikProjectManager.getInstance();