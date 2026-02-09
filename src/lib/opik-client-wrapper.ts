'use client';

// Client-side only wrapper for Opik functionality
// This ensures Opik is only imported on the client side

let opikClient: any = null;
let isInitialized = false;

// Lazy initialization to avoid SSR issues
const initializeOpik = async () => {
  if (typeof window === 'undefined') {
    // Server-side: return mock functions
    return {
      createProject: async () => ({ id: 'mock', name: 'mock' }),
      trace: () => ({ id: 'mock', update: () => {}, end: () => {} }),
      span: () => ({ id: 'mock', update: () => {}, end: () => {} }),
      logFeedbackScore: async () => true,
    };
  }

  if (!isInitialized) {
    try {
      // Dynamic import to avoid SSR issues
      const { Opik } = await import('opik');
      
      const config = {
        apiKey: process.env.NEXT_PUBLIC_OPIK_API_KEY,
        workspace: process.env.NEXT_PUBLIC_OPIK_WORKSPACE || 'codepik-workspace',
        baseUrl: process.env.NEXT_PUBLIC_OPIK_BASE_URL
      };

      opikClient = new Opik({
        apiKey: config.apiKey,
        workspace: config.workspace,
        ...(config.baseUrl && { baseUrl: config.baseUrl })
      });

      isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize Opik client:', error);
      // Return mock client for development
      opikClient = {
        createProject: async () => ({ id: 'mock', name: 'mock' }),
        trace: () => ({ id: 'mock', update: () => {}, end: () => {} }),
        span: () => ({ id: 'mock', update: () => {}, end: () => {} }),
        logFeedbackScore: async () => true,
      };
    }
  }

  return opikClient;
};

// Safe client-side only functions
export const safeOpikClient = {
  async getClient() {
    return await initializeOpik();
  },

  async createProject(params: any) {
    const client = await initializeOpik();
    try {
      return await client.createProject(params);
    } catch (error) {
      console.warn('Opik createProject failed:', error);
      return { id: 'fallback', name: params.name || 'fallback' };
    }
  },

  async createTrace(params: any) {
    const client = await initializeOpik();
    try {
      return client.trace(params);
    } catch (error) {
      console.warn('Opik trace failed:', error);
      return { id: 'fallback', update: () => {}, end: () => {} };
    }
  },

  async createSpan(params: any) {
    const client = await initializeOpik();
    try {
      return client.span(params);
    } catch (error) {
      console.warn('Opik span failed:', error);
      return { id: 'fallback', update: () => {}, end: () => {} };
    }
  },

  async addFeedback(params: any) {
    const client = await initializeOpik();
    try {
      return await client.logFeedbackScore(params);
    } catch (error) {
      console.warn('Opik feedback failed:', error);
      return false;
    }
  }
};

// Client-side only health check
export const checkOpikHealth = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false; // Server-side always returns false
  }

  try {
    const client = await initializeOpik();
    // Try a simple operation to check health
    return !!client;
  } catch (error) {
    console.warn('Opik health check failed:', error);
    return false;
  }
};

// Utility functions that work on both client and server
export const getCurrentUserId = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('opik_user_id') || 'anonymous';
  }
  return null;
};

export const getCurrentSessionId = (): string => {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('opik_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('opik_session_id', sessionId);
    }
    return sessionId;
  }
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getCurrentProjectId = (): string | null => {
  return null; // Will be populated from context
};

// Types (safe to export)
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
  created_at?: string;
  updated_at?: string;
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
}