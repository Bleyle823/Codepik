import { Opik } from 'opik';

// Types for better TypeScript support
export interface OpikConfig {
  apiKey?: string;
  workspace?: string;
  projectName?: string;
  baseUrl?: string;
}

export interface OpikProject {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface OpikTrace {
  id: string;
  name: string;
  input?: any;
  output?: any;
  metadata?: Record<string, any>;
  tags?: string[];
  start_time?: string;
  end_time?: string;
  duration?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  feedback_scores?: Array<{
    name: string;
    value: number;
    reason?: string;
  }>;
}

export interface OpikSpan {
  id: string;
  trace_id: string;
  parent_span_id?: string;
  name: string;
  type: 'llm' | 'tool' | 'general';
  input?: any;
  output?: any;
  metadata?: Record<string, any>;
  tags?: string[];
  start_time?: string;
  end_time?: string;
  duration?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// Configuration
const config: OpikConfig = {
  apiKey: process.env.OPIK_API_KEY,
  workspace: process.env.OPIK_WORKSPACE || 'codepik-workspace',
  projectName: process.env.OPIK_PROJECT_NAME || 'codepik-ide',
  baseUrl: process.env.OPIK_BASE_URL
};

// Initialize Opik client with enhanced configuration
export const opikClient = new Opik({
  apiKey: config.apiKey,
  workspace: config.workspace,
  ...(config.baseUrl && { baseUrl: config.baseUrl })
});

// Project management
let currentProject: OpikProject | null = null;

export async function initializeOpikProject(): Promise<OpikProject | null> {
  try {
    if (currentProject) {
      return currentProject;
    }

    // Try to create project (will return existing if already exists)
    const project = await opikClient.createProject({
      name: config.projectName!,
      description: 'AI-powered coding IDE with comprehensive tracing and optimization'
    });
    
    currentProject = project as OpikProject;
    console.log('Opik project initialized:', project.name);
    return currentProject;
  } catch (error) {
    console.error('Failed to initialize Opik project:', error);
    return null;
  }
}

// Enhanced tracing functions
export async function createTrace(params: {
  name: string;
  input?: any;
  output?: any;
  metadata?: Record<string, any>;
  tags?: string[];
  userId?: string;
  sessionId?: string;
}): Promise<OpikTrace | null> {
  try {
    const project = await initializeOpikProject();
    if (!project) {
      throw new Error('No project available');
    }

    const trace = opikClient.trace({
      name: params.name,
      input: params.input,
      output: params.output,
      metadata: {
        ...params.metadata,
        project_id: project.id,
        user_id: params.userId,
        session_id: params.sessionId,
        timestamp: new Date().toISOString()
      },
      tags: params.tags
    });

    return trace as OpikTrace;
  } catch (error) {
    console.error('Failed to create trace:', error);
    return null;
  }
}

export async function createSpan(params: {
  traceId: string;
  parentSpanId?: string;
  name: string;
  type: 'llm' | 'tool' | 'general';
  input?: any;
  output?: any;
  metadata?: Record<string, any>;
  tags?: string[];
}): Promise<OpikSpan | null> {
  try {
    const span = opikClient.span({
      trace_id: params.traceId,
      parent_span_id: params.parentSpanId,
      name: params.name,
      type: params.type,
      input: params.input,
      output: params.output,
      metadata: {
        ...params.metadata,
        timestamp: new Date().toISOString()
      },
      tags: params.tags
    });

    return span as OpikSpan;
  } catch (error) {
    console.error('Failed to create span:', error);
    return null;
  }
}

// Feedback and scoring
export async function addTraceFeedback(params: {
  traceId: string;
  name: string;
  value: number;
  reason?: string;
  userId?: string;
}): Promise<boolean> {
  try {
    await opikClient.logFeedbackScore({
      trace_id: params.traceId,
      name: params.name,
      value: params.value,
      reason: params.reason,
      source: 'user',
      user_id: params.userId
    });
    return true;
  } catch (error) {
    console.error('Failed to add trace feedback:', error);
    return false;
  }
}

// Batch operations for performance
export class OpikBatchTracer {
  private traces: any[] = [];
  private spans: any[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(batchSize = 10, flushInterval = 5000) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.startAutoFlush();
  }

  addTrace(params: Parameters<typeof createTrace>[0]) {
    this.traces.push(params);
    this.checkBatch();
  }

  addSpan(params: Parameters<typeof createSpan>[0]) {
    this.spans.push(params);
    this.checkBatch();
  }

  private checkBatch() {
    if (this.traces.length >= this.batchSize || this.spans.length >= this.batchSize) {
      this.flush();
    }
  }

  private startAutoFlush() {
    this.flushTimer = setInterval(() => {
      if (this.traces.length > 0 || this.spans.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async flush() {
    const tracesToProcess = [...this.traces];
    const spansToProcess = [...this.spans];
    
    this.traces = [];
    this.spans = [];

    try {
      // Process traces
      const tracePromises = tracesToProcess.map(trace => createTrace(trace));
      await Promise.allSettled(tracePromises);

      // Process spans
      const spanPromises = spansToProcess.map(span => createSpan(span));
      await Promise.allSettled(spanPromises);

      console.log(`Flushed ${tracesToProcess.length} traces and ${spansToProcess.length} spans`);
    } catch (error) {
      console.error('Batch flush error:', error);
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(); // Final flush
  }
}

// Global batch tracer instance
export const batchTracer = new OpikBatchTracer();

// Utility functions
export function getCurrentUserId(): string | null {
  // This will be populated from the auth context
  if (typeof window !== 'undefined') {
    // Client-side: try to get from localStorage or auth context
    return localStorage.getItem('opik_user_id') || 'anonymous';
  }
  return null;
}

export function getCurrentProjectId(): string | null {
  return currentProject?.id || null;
}

export function getCurrentSessionId(): string {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('opik_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('opik_session_id', sessionId);
    }
    return sessionId;
  }
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check
export async function checkOpikHealth(): Promise<boolean> {
  try {
    await initializeOpikProject();
    return true;
  } catch (error) {
    console.error('Opik health check failed:', error);
    return false;
  }
}

// Configuration helpers
export function getOpikConfig(): OpikConfig {
  return { ...config };
}

export function updateOpikConfig(newConfig: Partial<OpikConfig>) {
  Object.assign(config, newConfig);
}

// Export types for external use
export type { OpikConfig, OpikProject, OpikTrace, OpikSpan };