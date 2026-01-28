import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withMiddlewareAuthRequired(
  async function middleware(request: NextRequest) {
    // Add any custom middleware logic here
    return NextResponse.next();
  },
  {
    // Only protect specific routes, not all routes
    matcher: [
      '/projects/:path*',
      '/api/messages/:path*',
      '/api/projects/:path*',
      '/api/github/:path*',
      '/api/quick-edit',
      '/api/suggestion'
    ]
  }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};