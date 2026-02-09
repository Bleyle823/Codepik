'use server';

import { Opik } from 'opik';
import { randomUUID } from 'crypto';

const config = {
  apiKey: process.env.OPIK_API_KEY || process.env.NEXT_PUBLIC_OPIK_API_KEY,
  workspace: process.env.OPIK_WORKSPACE || process.env.NEXT_PUBLIC_OPIK_WORKSPACE || 'codepik-workspace',
  baseUrl: process.env.OPIK_URL || process.env.NEXT_PUBLIC_OPIK_BASE_URL || 'https://www.comet.com/opik/api'
};

function getClient() {
  if (!config.apiKey) {
    return null;
  }
  return new Opik(config);
}

export async function createTraceAction(params: any) {
  try {
    if (!config.apiKey) {
      return { id: randomUUID(), name: params.name || 'mock' };
    }

    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://www.comet.com/opik/api';
    const response = await fetch(`${baseUrl}/v1/private/traces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': config.apiKey,
        'Comet-Workspace': config.workspace,
      },
      body: JSON.stringify({
        id: params.id || randomUUID(),
        name: params.name,
        input: params.input,
        output: params.output,
        metadata: params.metadata,
        tags: params.tags,
        start_time: new Date().toISOString(),
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unable to read error body');
      console.warn(`Opik trace creation failed: ${response.status}`, errorBody);
      return { id: randomUUID(), name: params.name || 'fallback' };
    }

    const trace = await response.json();
    return {
      id: trace.id,
      name: trace.name,
    };
  } catch (error) {
    console.error('Opik createTrace failed:', error);
    return { id: 'fallback-trace-' + Date.now(), name: params.name || 'fallback' };
  }
}

export async function createSpanAction(params: any) {
  try {
    if (!config.apiKey) {
      return { id: randomUUID(), name: params.name || 'mock' };
    }

    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://www.comet.com/opik/api';
    const response = await fetch(`${baseUrl}/v1/private/spans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': config.apiKey,
        'Comet-Workspace': config.workspace,
      },
      body: JSON.stringify({
        id: params.id || randomUUID(),
        trace_id: params.traceId,
        parent_span_id: params.parentSpanId,
        name: params.name,
        type: params.type,
        input: params.input,
        output: params.output,
        metadata: params.metadata,
        tags: params.tags,
        start_time: new Date().toISOString(),
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unable to read error body');
      console.warn(`Opik span creation failed: ${response.status}`, errorBody);
      return { id: randomUUID(), name: params.name || 'fallback' };
    }

    const span = await response.json();
    return {
      id: span.id,
      name: span.name,
      trace_id: span.trace_id,
      parent_span_id: span.parent_span_id
    };
  } catch (error) {
    console.error('Opik createSpan failed:', error);
    return { id: 'fallback-span-' + Date.now(), name: params.name || 'fallback' };
  }
}

export async function addFeedbackAction(params: any) {
  try {
    const client = getClient();
    if (!client) {
      return true;
    }
    await (client as any).logFeedbackScore(params);
    return true;
  } catch (error) {
    console.error('Opik addFeedback failed:', error);
    return false;
  }
}

export async function createProjectAction(params: any) {
  try {
    const client = getClient();
    if (!client) {
      return { id: 'mock-project-' + Date.now(), name: params.name || 'mock' };
    }
    return await (client as any).createProject(params);
  } catch (error) {
    console.error('Opik createProject failed:', error);
    return { id: 'fallback-project-' + Date.now(), name: params.name || 'fallback' };
  }
}

// Helper to make authenticated requests to Opik API
async function opikApiRequest(path: string, options: RequestInit = {}) {
  if (!config.apiKey) return null;

  const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://www.comet.com/opik/api';
  const url = `${baseUrl}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'authorization': config.apiKey,
        'Comet-Workspace': config.workspace,
        ...options.headers,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.warn(`Opik API request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Opik API request error for ${path}:`, error);
    return null;
  }
}

export async function getTraceStatisticsAction() {
  try {
    // Fetch real traces from Opik to calculate stats
    // Note: This assumes Opik API structure for searching traces
    const response = await opikApiRequest('/v1/private/traces?size=1000');

    if (!response || !response.content) {
      return null; // Fallback to mock if API fails
    }

    const traces = response.content;

    // Calculate stats from real traces
    const totalCount = response.totalElements || traces.length;
    const durations = traces.map((t: any) => t.duration || 0).filter((d: number) => d > 0);
    const avgDuration = durations.length > 0
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
      : 0;

    // Count successful traces (assuming no error tags/status)
    const successCount = traces.filter((t: any) => !t.error_info).length;
    const successRate = traces.length > 0 ? (successCount / traces.length) * 100 : 100;

    return {
      totalCount,
      growthRate: 5.2, // Hard to calculate without historical data store
      avgDuration,
      durationChange: 0,
      totalCost: traces.reduce((acc: number, t: any) => acc + (t.usage?.total_tokens || 0) * 0.000002, 0), // Estimate cost
      costChange: 0,
      successRate,
      successRateChange: 0,
      avgQuality: 0.9, // Placeholder until feedback integration
      qualityTrend: 0,
      costBreakdown: [
        { name: 'LLM Calls', value: 80, color: '#3b82f6' },
        { name: 'Tool Usage', value: 20, color: '#10b981' }
      ]
    };
  } catch (error) {
    console.error('Opik getTraceStatistics failed:', error);
    return null;
  }
}

export async function checkOpikHealthAction() {
  try {
    console.log('[OpikHealth] Checking health. Config available:', {
      hasApiKey: !!config.apiKey,
      workspace: config.workspace,
      url: config.baseUrl
    });

    if (!config.apiKey) {
      console.warn('[OpikHealth] No API key found in server config.');
      return false;
    }

    // Try a real API call to verify key
    const result = await opikApiRequest('/v1/private/projects');

    if (!result) {
      console.warn('[OpikHealth] API request returned null/false.');
    }

    return !!result;
  } catch (error) {
    console.error('[OpikHealth] Health check error:', error);
    return false;
  }
}
