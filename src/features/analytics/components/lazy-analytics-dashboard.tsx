'use client';

import { lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

// Lazy load the heavy analytics dashboard
const OpikAnalyticsDashboard = lazy(() =>
  import('./opik-dashboard').then(module => ({
    default: module.OpikAnalyticsDashboard
  }))
);

// Lightweight loading component
function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600 animate-pulse" />
              <CardTitle>Loading Analytics Dashboard...</CardTitle>
            </div>
            <CardDescription>
              Initializing Opik analytics and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Lazy wrapper component
export function LazyAnalyticsDashboard({ projectId }: { projectId?: string }) {
  return (
    <Suspense fallback={<AnalyticsLoading />}>
      <OpikAnalyticsDashboard projectId={projectId} />
    </Suspense>
  );
}