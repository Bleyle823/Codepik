'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Square, 
  BarChart3, 
  Zap, 
  Code, 
  MessageSquare,
  Settings,
  CheckCircle,
  AlertCircle,
  Activity,
  TrendingUp
} from 'lucide-react';

// Import all our Opik services
import { editorOpikIntegration } from '../editor/services/editor-opik-integration';
import { aiTracer, chatTracer, suggestionTracer, quickEditTracer } from '../ai/services/opik-ai-tracer';
import { dashboardService } from '../analytics/services/opik-dashboard-service';
import { projectManager } from '../projects/services/opik-project-manager';
import { errorHandler } from '../../lib/opik-error-handler';
import { performanceOptimizer } from '../../lib/opik-performance-optimizer';
import { checkOpikHealth } from '../../lib/opik-client-safe';

interface DemoState {
  isRunning: boolean;
  currentStep: number;
  completedSteps: string[];
  errors: string[];
  metrics: any;
  traces: any[];
}

interface DemoStep {
  id: string;
  name: string;
  description: string;
  action: () => Promise<void>;
  duration: number;
}

export function OpikIntegrationDemo() {
  const [demoState, setDemoState] = useState<DemoState>({
    isRunning: false,
    currentStep: 0,
    completedSteps: [],
    errors: [],
    metrics: {},
    traces: []
  });

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});

  // Demo steps that showcase the entire Opik integration
  const demoSteps: DemoStep[] = [
    {
      id: 'health-check',
      name: 'Health Check',
      description: 'Verify Opik connection and service health',
      action: async () => {
        const isHealthy = await checkOpikHealth();
        if (!isHealthy) {
          throw new Error('Opik health check failed');
        }
        setConnectionStatus('connected');
      },
      duration: 2000
    },
    {
      id: 'project-init',
      name: 'Project Initialization',
      description: 'Initialize Opik project with configuration',
      action: async () => {
        const project = await projectManager.initializeProject({
          name: 'Opik Demo Project',
          description: 'End-to-end demonstration of Opik integration',
          language: 'typescript',
          framework: 'next.js'
        });
        if (!project) {
          throw new Error('Failed to initialize project');
        }
      },
      duration: 3000
    },
    {
      id: 'editor-session',
      name: 'Editor Session',
      description: 'Start editor session and simulate coding activity',
      action: async () => {
        const sessionId = await editorOpikIntegration.startSession({
          userId: 'demo-user',
          projectId: 'demo-project',
          fileName: 'demo-file.tsx'
        });
        
        if (!sessionId) {
          throw new Error('Failed to start editor session');
        }

        // Simulate typing activity
        for (let i = 0; i < 50; i++) {
          editorOpikIntegration.trackKeystroke(String.fromCharCode(65 + (i % 26)), i);
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Simulate code changes
        await editorOpikIntegration.trackCodeChange(
          'const hello = "world";',
          'const hello = "world";\nconst goodbye = "farewell";',
          'demo-file.tsx'
        );
      },
      duration: 4000
    },
    {
      id: 'ai-suggestions',
      name: 'AI Suggestions',
      description: 'Simulate AI suggestion requests and responses',
      action: async () => {
        const traceId = await suggestionTracer.startSuggestionTrace({
          userId: 'demo-user',
          sessionId: 'demo-session',
          fileName: 'demo-file.tsx',
          language: 'typescript',
          model: 'gpt-4',
          codeContext: 'const hello = "world";\nconst |',
          cursorPosition: 25,
          triggerType: 'auto'
        });

        if (traceId) {
          // Simulate suggestion generation
          await suggestionTracer.addSuggestionGenerated(traceId, {
            suggestions: ['goodbye = "farewell";', 'name = "demo";', 'value = 42;'],
            confidence: [0.9, 0.7, 0.5],
            processingTime: 250
          });

          // Simulate user accepting first suggestion
          await suggestionTracer.addSuggestionAccepted(traceId, 0, 'goodbye = "farewell";');
          
          await suggestionTracer.endTrace(traceId, {
            success: true,
            output: { accepted: true, suggestion: 'goodbye = "farewell";' },
            qualityScore: 0.9
          });
        }
      },
      duration: 3000
    },
    {
      id: 'quick-edit',
      name: 'Quick Edit',
      description: 'Demonstrate AI-powered quick edit functionality',
      action: async () => {
        const traceId = await quickEditTracer.startQuickEditTrace({
          userId: 'demo-user',
          sessionId: 'demo-session',
          fileName: 'demo-file.tsx',
          language: 'typescript',
          model: 'gpt-4',
          editInstruction: 'Add error handling to this function',
          codeSelection: 'function processData(data) {\n  return data.map(item => item.value);\n}',
          editType: 'refactor'
        });

        if (traceId) {
          // Simulate edit generation
          await quickEditTracer.addEditGenerated(traceId, {
            originalCode: 'function processData(data) {\n  return data.map(item => item.value);\n}',
            editedCode: 'function processData(data) {\n  try {\n    if (!data || !Array.isArray(data)) {\n      throw new Error("Invalid data");\n    }\n    return data.map(item => {\n      if (!item || typeof item.value === "undefined") {\n        throw new Error("Invalid item");\n      }\n      return item.value;\n    });\n  } catch (error) {\n    console.error("Error processing data:", error);\n    return [];\n  }\n}',
            explanation: 'Added comprehensive error handling with input validation and try-catch block',
            confidence: 0.85,
            processingTime: 1200
          });

          // Simulate user applying the edit
          await quickEditTracer.addEditApplied(traceId, {
            success: true,
            appliedCode: 'function processData(data) {\n  try {\n    if (!data || !Array.isArray(data)) {\n      throw new Error("Invalid data");\n    }\n    return data.map(item => {\n      if (!item || typeof item.value === "undefined") {\n        throw new Error("Invalid item");\n      }\n      return item.value;\n    });\n  } catch (error) {\n    console.error("Error processing data:", error);\n    return [];\n  }\n}',
            applicationTime: 150
          });
        }
      },
      duration: 4000
    },
    {
      id: 'chat-interaction',
      name: 'Chat Interaction',
      description: 'Simulate AI chat conversation',
      action: async () => {
        const traceId = await chatTracer.startChatTrace({
          userId: 'demo-user',
          sessionId: 'demo-session',
          conversationId: 'demo-conversation',
          model: 'gpt-4',
          messages: [
            { role: 'user', content: 'How can I optimize this React component?' }
          ]
        });

        if (traceId) {
          // Add user message
          await chatTracer.addChatMessage(traceId, {
            role: 'user',
            content: 'How can I optimize this React component?',
            tokenCount: 8
          });

          // Add assistant response
          await chatTracer.addChatMessage(traceId, {
            role: 'assistant',
            content: 'Here are several ways to optimize your React component:\n\n1. Use React.memo() for preventing unnecessary re-renders\n2. Implement useMemo() for expensive calculations\n3. Use useCallback() for event handlers\n4. Consider code splitting with lazy loading\n5. Optimize bundle size with tree shaking',
            tokenCount: 45
          });

          await chatTracer.endTrace(traceId, {
            success: true,
            output: { messageCount: 2, helpful: true },
            tokenUsage: { promptTokens: 8, completionTokens: 45, totalTokens: 53 },
            qualityScore: 0.88
          });
        }
      },
      duration: 3000
    },
    {
      id: 'error-simulation',
      name: 'Error Handling',
      description: 'Demonstrate error handling and recovery',
      action: async () => {
        // Simulate various types of errors
        await errorHandler.logError(new Error('Network timeout during trace submission'), {
          feature: 'tracing',
          operation: 'submit-trace',
          severity: 'medium'
        });

        await errorHandler.logError(new Error('Rate limit exceeded'), {
          feature: 'suggestions',
          operation: 'request-suggestion',
          severity: 'low'
        });

        // Demonstrate recovery
        const mockError = {
          code: 'NETWORK_ERROR',
          message: 'Connection timeout',
          severity: 'medium' as const,
          recoverable: true,
          timestamp: Date.now(),
          details: 'Mock network error for demo'
        };

        await errorHandler.attemptRecovery(mockError);
      },
      duration: 2000
    },
    {
      id: 'performance-metrics',
      name: 'Performance Metrics',
      description: 'Collect and display performance metrics',
      action: async () => {
        // Force flush any pending traces
        await performanceOptimizer.forceFlush();
        
        // Get current metrics
        const metrics = performanceOptimizer.getPerformanceMetrics();
        const queueStatus = performanceOptimizer.getQueueStatus();
        
        setPerformanceMetrics({
          ...metrics,
          queueStatus,
          recommendations: performanceOptimizer.getOptimizationRecommendations()
        });
      },
      duration: 2000
    },
    {
      id: 'dashboard-sync',
      name: 'Dashboard Sync',
      description: 'Sync data with dashboard and display analytics',
      action: async () => {
        // Get dashboard metrics
        const dashboardMetrics = await dashboardService.getDashboardMetrics();
        const traceAnalytics = await dashboardService.getTraceAnalytics('1h');
        const realTimeStats = await dashboardService.getRealTimeStats();
        
        setDemoState(prev => ({
          ...prev,
          metrics: {
            dashboard: dashboardMetrics,
            analytics: traceAnalytics,
            realTime: realTimeStats
          }
        }));
      },
      duration: 3000
    },
    {
      id: 'session-end',
      name: 'Session Cleanup',
      description: 'End editor session and generate final report',
      action: async () => {
        // End editor session
        await editorOpikIntegration.endSession();
        
        // Generate project report
        const project = projectManager.getCurrentProject();
        if (project) {
          const report = await projectManager.generateProjectReport(project.id);
          if (report) {
            console.log('Demo completed successfully:', report);
          }
        }
      },
      duration: 2000
    }
  ];

  // Run the demo
  const runDemo = async () => {
    setDemoState(prev => ({ ...prev, isRunning: true, currentStep: 0, completedSteps: [], errors: [] }));

    for (let i = 0; i < demoSteps.length; i++) {
      const step = demoSteps[i];
      
      setDemoState(prev => ({ ...prev, currentStep: i }));

      try {
        console.log(`Running demo step: ${step.name}`);
        await step.action();
        
        setDemoState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, step.id]
        }));

        // Wait for step duration
        await new Promise(resolve => setTimeout(resolve, step.duration));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Demo step failed: ${step.name}`, error);
        
        setDemoState(prev => ({
          ...prev,
          errors: [...prev.errors, `${step.name}: ${errorMessage}`]
        }));
      }
    }

    setDemoState(prev => ({ ...prev, isRunning: false, currentStep: -1 }));
  };

  const stopDemo = () => {
    setDemoState(prev => ({ ...prev, isRunning: false }));
  };

  // Initial health check
  useEffect(() => {
    checkOpikHealth().then(isHealthy => {
      setConnectionStatus(isHealthy ? 'connected' : 'disconnected');
    });
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opik Integration Demo</h1>
          <p className="text-muted-foreground mt-1">
            End-to-end demonstration of Opik TypeScript SDK integration
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
            {connectionStatus === 'connected' ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {connectionStatus}
          </Badge>
          
          <Button
            onClick={demoState.isRunning ? stopDemo : runDemo}
            disabled={connectionStatus !== 'connected'}
            className="gap-2"
          >
            {demoState.isRunning ? (
              <>
                <Square className="h-4 w-4" />
                Stop Demo
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Demo
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demo Progress</CardTitle>
              <CardDescription>
                {demoState.isRunning 
                  ? `Running step ${demoState.currentStep + 1} of ${demoSteps.length}`
                  : `${demoState.completedSteps.length} of ${demoSteps.length} steps completed`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress 
                  value={(demoState.completedSteps.length / demoSteps.length) * 100} 
                  className="h-2"
                />
                
                <div className="grid gap-3">
                  {demoSteps.map((step, index) => {
                    const isCompleted = demoState.completedSteps.includes(step.id);
                    const isCurrent = demoState.currentStep === index && demoState.isRunning;
                    const hasError = demoState.errors.some(error => error.startsWith(step.name));
                    
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isCurrent ? 'bg-blue-50 border-blue-200' : 
                          isCompleted ? 'bg-green-50 border-green-200' :
                          hasError ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {isCurrent ? (
                            <Activity className="h-4 w-4 text-blue-600 animate-spin" />
                          ) : isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : hasError ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium text-sm">{step.name}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {step.duration / 1000}s
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dashboard Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {demoState.metrics.dashboard ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Traces</span>
                      <span>{demoState.metrics.dashboard.totalTraces}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span>{demoState.metrics.dashboard.successRate?.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Response</span>
                      <span>{demoState.metrics.dashboard.avgResponseTime}ms</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Real-time Stats</CardTitle>
              </CardHeader>
              <CardContent>
                {demoState.metrics.realTime ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active Users</span>
                      <span>{demoState.metrics.realTime.activeUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sessions</span>
                      <span>{demoState.metrics.realTime.currentSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Traces/Min</span>
                      <span>{demoState.metrics.realTime.tracesPerMinute}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Editor Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Keystrokes</span>
                    <span>50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI Suggestions</span>
                    <span>3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quick Edits</span>
                    <span>1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Real-time performance optimization data</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(performanceMetrics).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Traces/Second</span>
                      <span>{performanceMetrics.tracesPerSecond?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Network Latency</span>
                      <span>{performanceMetrics.networkLatency?.toFixed(0) || 0}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Queue Depth</span>
                      <span>{performanceMetrics.queueDepth || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Batch Efficiency</span>
                      <span>{performanceMetrics.batchEfficiency?.toFixed(1) || 0}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Recommendations</div>
                    {performanceMetrics.recommendations?.length > 0 ? (
                      <ul className="text-xs space-y-1">
                        {performanceMetrics.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-1">
                            <TrendingUp className="h-3 w-3 mt-0.5 text-blue-500" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-muted-foreground">No recommendations</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Run the demo to see performance metrics
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
              <CardDescription>Errors encountered during demo execution</CardDescription>
            </CardHeader>
            <CardContent>
              {demoState.errors.length > 0 ? (
                <div className="space-y-2">
                  {demoState.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No errors encountered
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}