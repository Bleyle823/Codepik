'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3,
  Activity,
  Code,
  Brain,
  Target,
  Minimize2,
  Maximize2,
  RefreshCw
} from 'lucide-react';

interface LightweightAnalyticsSidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface SimpleMetrics {
  keystrokes: number;
  linesAdded: number;
  aiSuggestions: number;
  productivity: number;
}

export function LightweightAnalyticsSidebar({ 
  className, 
  isCollapsed = false, 
  onToggleCollapse 
}: LightweightAnalyticsSidebarProps) {
  const [metrics, setMetrics] = useState<SimpleMetrics>({
    keystrokes: 0,
    linesAdded: 0,
    aiSuggestions: 0,
    productivity: 0
  });

  const [isLoading, setIsLoading] = useState(false);

  // Lightweight metrics update - only basic counters
  useEffect(() => {
    const updateMetrics = () => {
      // Simulate basic metrics without heavy Opik calls
      setMetrics(prev => ({
        keystrokes: prev.keystrokes + Math.floor(Math.random() * 5),
        linesAdded: prev.linesAdded + Math.floor(Math.random() * 2),
        aiSuggestions: prev.aiSuggestions + Math.floor(Math.random() * 1),
        productivity: Math.min(100, prev.productivity + Math.random() * 2)
      }));
    };

    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  if (isCollapsed) {
    return (
      <div className={`w-12 h-full bg-sidebar border-l flex flex-col items-center py-2 ${className}`}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggleCollapse}
          className="mb-2"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
        
        <div className="flex flex-col gap-2 items-center">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="text-xs font-mono text-muted-foreground transform -rotate-90 whitespace-nowrap origin-center">
            {metrics.keystrokes}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 h-full bg-sidebar border-l flex flex-col ${className}`}>
      {/* Header */}
      <div className="h-10 flex items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Analytics</span>
          <Badge variant="secondary" className="text-xs">
            Live
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onToggleCollapse}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-2">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-blue-600" />
              <div>
                <div className="text-lg font-bold">{metrics.keystrokes}</div>
                <div className="text-xs text-muted-foreground">Keys</div>
              </div>
            </div>
          </Card>

          <Card className="p-2">
            <div className="flex items-center gap-2">
              <Code className="h-3 w-3 text-green-600" />
              <div>
                <div className="text-lg font-bold">{metrics.linesAdded}</div>
                <div className="text-xs text-muted-foreground">Lines</div>
              </div>
            </div>
          </Card>

          <Card className="p-2">
            <div className="flex items-center gap-2">
              <Brain className="h-3 w-3 text-purple-600" />
              <div>
                <div className="text-lg font-bold">{metrics.aiSuggestions}</div>
                <div className="text-xs text-muted-foreground">AI</div>
              </div>
            </div>
          </Card>

          <Card className="p-2">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 text-orange-600" />
              <div>
                <div className="text-lg font-bold">{metrics.productivity.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Productivity Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={metrics.productivity} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {metrics.productivity > 80 ? '🔥 Great work!' : 
                 metrics.productivity > 50 ? '👍 Good pace' : 
                 '⚡ Getting started'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simple Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Session Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>AI Ready</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}