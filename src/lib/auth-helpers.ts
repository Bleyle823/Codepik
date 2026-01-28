import { getSession } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

export async function getAuthenticatedUser(request?: NextRequest) {
  try {
    const session = await getSession();
    return session?.user || null;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

export async function requireAuth(request?: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function getUserId(user: any): string {
  return user?.sub || user?.id;
}