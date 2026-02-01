import { OpikStatusIndicator } from '@/features/editor/components/opik-status-indicator';
import { OpikMetricsPanel } from '@/features/editor/components/opik-metrics-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OpikStatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Opik Status & Metrics</h1>
            <p className="text-muted-foreground">
              Monitor your Opik integration status and real-time coding metrics
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Indicator Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Status Indicator</CardTitle>
                <CardDescription>
                  Click to see connection status and controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OpikStatusIndicator showDetails={true} />
              </CardContent>
            </Card>

            {/* Metrics Panel */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Live Metrics Panel</CardTitle>
                  <CardDescription>
                    Real-time coding productivity and AI assistance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <OpikMetricsPanel />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}