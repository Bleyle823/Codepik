'use server';

import { Opik } from 'opik';

const config = {
  apiKey: process.env.NEXT_PUBLIC_OPIK_API_KEY,
  workspace: process.env.NEXT_PUBLIC_OPIK_WORKSPACE || 'codepik-workspace',
  baseUrl: process.env.NEXT_PUBLIC_OPIK_BASE_URL
};

function getClient() {
  if (!config.apiKey) {
    return null;
  }
  return new Opik(config);
}

export async function createTraceAction(params: any) {
  try {
    const client = getClient();
    if (!client) {
      return { id: 'mock-trace-' + Date.now(), name: params.name || 'mock' };
    }
    const trace = client.trace(params);
    // Serialize the trace object effectively or just return ID and necessary data
    // The Opik SDK trace object might contain methods, which can't be passed to client.
    // We probably only need the ID to create spans linked to it.
    return { 
      id: trace.id, 
      name: trace.name,
      // We can't return the full object with methods.
    };
  } catch (error) {
    console.error('Opik createTrace failed:', error);
    return { id: 'fallback-trace-' + Date.now(), name: params.name || 'fallback' };
  }
}

export async function createSpanAction(params: any) {
  try {
    const client = getClient();
    if (!client) {
      return { id: 'mock-span-' + Date.now(), name: params.name || 'mock' };
    }
    const span = client.span(params);
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
    await client.logFeedbackScore(params);
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
    return await client.createProject(params);
  } catch (error) {
    console.error('Opik createProject failed:', error);
    return { id: 'fallback-project-' + Date.now(), name: params.name || 'fallback' };
  }
}

export async function checkOpikHealthAction() {
  try {
    // Just check if we can instantiate the client and have an API key
    if (!config.apiKey) return false;
    // Optionally make a lightweight call if the SDK supports it, or just assume config is key
    return true;
  } catch (error) {
    return false;
  }
}
