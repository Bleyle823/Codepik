'use client';

// Ultra-safe client-only Opik wrapper that completely avoids server-side execution

// Types (safe to export everywhere)
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
  created_at?: string;
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

// Client-side only functions that return promises
export const safeOpikClient = {
  async createProject(params: any): Promise<OpikProject> {
    if (typeof window === 'undefined') {
      // Server-side: return mock or direct call if we wanted, but let's keep it consistent
      return { id: 'mock-project', name: params.name || 'mock' };
    }

    try {
      const { createProjectAction } = await import('./opik-actions');
      return await createProjectAction(params) as OpikProject;
    } catch (error) {
      console.warn('Opik createProject failed:', error);
      return { id: 'fallback-project', name: params.name || 'fallback' };
    }
  },

  async createTrace(params: any): Promise<any> {
    // If we are on server, we might want to do nothing or mock, consistent with previous behavior?
    // Previous behavior: "Server-side: return mock".
    if (typeof window === 'undefined') {
      return { id: 'mock-trace', update: () => { }, end: () => { } };
    }

    try {
      const { createTraceAction } = await import('./opik-actions');
      const trace = await createTraceAction(params);

      // Return a pseudo-object that looks like the SDK trace but uses IDs
      return {
        id: trace.id,
        update: () => { }, // Not supported via action yet unless we implement updateAction
        end: () => { }     // Not supported via action yet unless we implement endAction
      };
    } catch (error) {
      console.warn('Opik trace failed:', error);
      return { id: 'fallback-trace', update: () => { }, end: () => { } };
    }
  },

  async createSpan(params: any): Promise<any> {
    if (typeof window === 'undefined') {
      return { id: 'mock-span', update: () => { }, end: () => { } };
    }

    try {
      const { createSpanAction } = await import('./opik-actions');
      const span = await createSpanAction(params);

      return {
        id: span.id,
        update: () => { },
        end: () => { }
      };
    } catch (error) {
      console.warn('Opik span failed:', error);
      return { id: 'fallback-span', update: () => { }, end: () => { } };
    }
  },

  async addFeedback(params: any): Promise<boolean> {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      const { addFeedbackAction } = await import('./opik-actions');
      return await addFeedbackAction(params);
    } catch (error) {
      console.warn('Opik feedback failed:', error);
      return false;
    }
  }
};

// Utility functions that work safely on both client and server
export const getCurrentUserId = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('opik_user_id') || 'anonymous';
  }
  return 'server-user'; // Safe fallback for server
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
  return `server_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getCurrentProjectId = (): string | null => {
  return null; // Will be populated from context
};

export const checkOpikHealth = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return false; // Server-side always returns false in this context
  }

  try {
    const { checkOpikHealthAction } = await import('./opik-actions');
    return await checkOpikHealthAction();
  } catch (error) {
    console.warn('Opik health check failed:', error);
    return false;
  }
};