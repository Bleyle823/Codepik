'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Zap, Target, Clock, Activity } from 'lucide-react';

interface OpikStatusProps {
  onToggleAnalytics: () => void;
  showAnalytics: boolean;
}

export function OpikStatus({ onToggleAnalytics, showAnalytics }: OpikStatusProps) {
  const [metrics, setMetrics] = useState({
    suggestionsToday: 0,
    acceptanceRate: 0,
    avgResponseTime: 0,
    qualityScore: 0,
    isConnected: false
  });

  useEffect(() => {
    // Simulate loading metrics from server
    const loadMetrics = async () => {
      try {
        // In real implementation, this would fetch from /api/opik/metrics
        setMetrics({
          suggestionsToday: 47,
          acceptanceRate: 73,
          avgResponseTime: 285,
          qualityScore: 87,
          isConnected: true
        });
      } catch (error) {
        console.error('Failed to load Opik metrics:', error);
        setMetrics(prev => ({ ...prev, isConnected: false }));
      }
    };

    loadMetrics();
    
    // Update metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-1">
        {metrics.isConnected ? (
          <Activity className="size-3 text-green-600" />
        ) : (
          <Activity className="size-3 text-gray-400" />
        )}
        <span className="text-xs font-medium text-blue-600">Opik</span>
      </div>
      
      {metrics.isConnected && (
        <div className="flex items-center gap-3 text-xs">
          <Badge variant="secondary" className="text-xs">
            {metrics.suggestionsToday}
          </Badge>
          <span className="text-green-600 font-medium">
            {metrics.acceptanceRate}%
          </span>
          <span className="text-blue-600 font-medium">
            {metrics.avgResponseTime}ms
          </span>
        </div>
      )}
      
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        onClick={onToggleAnalytics}
        title={showAnalytics ? "Hide Analytics" : "Show Analytics"}
      >
        <BarChart3 className="size-3" />
      </Button>
    </div>
  );
}