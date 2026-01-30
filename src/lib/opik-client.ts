import { Opik } from 'opik';

// Initialize Opik client
export const opikClient = new Opik({
  apiKey: process.env.OPIK_API_KEY,
  workspace: process.env.OPIK_WORKSPACE || 'codepik-workspace'
});

// Project configuration
export const OPIK_PROJECT_NAME = process.env.OPIK_PROJECT_NAME || 'codepik-ide';

// Initialize project
export async function initializeOpikProject() {
  try {
    const project = await opikClient.createProject({
      name: OPIK_PROJECT_NAME,
      description: 'AI-powered coding IDE with optimization focus'
    });
    
    console.log('Opik project initialized:', project.name);
    return project;
  } catch (error) {
    // Project might already exist, that's okay
    console.log('Opik project already exists or error:', error);
    return null;
  }
}

// Helper function to get current user ID from context
export function getCurrentUserId(): string | null {
  // This will be populated from the auth context in API routes
  return null;
}

// Helper function to get current project ID from context
export function getCurrentProjectId(): string | null {
  // This will be populated from the request context
  return null;
}