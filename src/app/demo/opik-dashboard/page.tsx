import { OpikAnalyticsDashboard } from '@/features/analytics/components/opik-dashboard';

export default function OpikDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <OpikAnalyticsDashboard />
      </div>
    </div>
  );
}