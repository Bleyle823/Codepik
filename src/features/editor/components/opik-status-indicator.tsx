'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Zap,
  Clock,
  TrendingUp,
  Settings
} from 'lucide-react';
import { checkOpikHealth, getCurrentSessionId } from '@/lib/opik-client-safe';
import { editorOpikIntegration } from '../services/editor-opik-integration';
import { dashboardService } from '../../analytics/services/opik-dashboard-service';

interface OpikStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  lastCheck: number;
  error?: string;
}

interface SessionStatus {
  active: boolean;
  sessionId?: string;
  duration?: number;
  metrics?: {
    keystrokes: number;
    suggestions: number;
    productivity: number;
  };
}

export function OpikStatusIndicator({ className, showDetails = true }: OpikStatusIndicatorProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    lastCheck: 0
  });
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    active: false
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const isConnected = await checkOpikHealth();
      setConnectionStatus({
        connected: isConnected,
        lastCheck: Date.now(),
        error: isConnected ? undefined : 'Unable to connect to Opik workspace'
      });
    } catch (error) {
      setConnectionStatus({
        connected: false,
        lastCheck: Date.now(),
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const updateSessionStatus = () => {
    const metrics = editorOpikIntegration.getCurrentMetrics();
    const insights = editorOpikIntegration.getProductivityInsights();
    
    setSessionStatus({
      active: !!insights,
      sessionId: getCurrentSessionId(),
      duration: insights?.sessionDuration || 0,
      metrics: insights ? {
        keystrokes: metrics.keystrokes,
        suggestions: metrics.suggestionsAccepted,
        productivity: insights.productivityScore
      } : undefined
    });
  };

  useEffect(() => {
    // Initial connection check
    checkConnection();
    
    // Set up periodic checks
    const connectionInterval = setInterval(checkConnection, 60000); // Every minute
    const sessionInterval = setInterval(updateSessionStatus, 5000); // Every 5 seconds
    
    // Initial session status
    updateSessionStatus();
    
    return () => {
      clearInterval(connectionInterval);
      clearInterval(sessionInterval);
    };
  }, []);

  const getStatusIcon = () => {
    if (isChecking) {
      return <Activity className="h-3 w-3 animate-spin" />;
    }
    
    if (!connectionStatus.connected) {
      return <XCircle className="h-3 w-3 text-red-500" />;
    }
    
    if (!sessionStatus.active) {
      return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    }
    
    return <CheckCircle className="h-3 w-3 text-green-500" />;
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    if (!connectionStatus.connected) return 'Disconnected';
    if (!sessionStatus.active) return 'Inactive';
    return 'Active';
  };

  const getStatusColor = () => {
    if (isChecking) return 'secondary';
    if (!connectionStatus.connected) return 'destructive';
    if (!sessionStatus.active) return 'secondary';
    return 'default';
  };

  const startSession = async () => {
    try {
      await editorOpikIntegration.startSession({
        userId: 'current-user', // Would get from auth context
        projectId: 'current-project', // Would get from project context
        fileName: 'current-file.tsx' // Would get from active editor
      });
      updateSessionStatus();
    } catch (error) {
      console.error('Failed to start Opik session:', error);
    }
  };

  const endSession = async () => {
    try {
      await editorOpikIntegration.endSession();
      updateSessionStatus();
    } catch (error) {
      console.error('Failed to end Opik session:', error);
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {getStatusIcon()}
        <span className="text-xs text-muted-foreground">Opik</span>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`h-6 px-2 gap-1 ${className}`}>
          {getStatusIcon()}
          <span className="text-xs">Opik</span>
          <Badge variant={getStatusColor()} className="text-xs px-1">
            {getStatusText()}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Opik Status</CardTitle>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={checkConnection}
                disabled={isChecking}
              >
                <Activity className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription className="text-xs">
              AI tracing and analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Connection</span>
                <div className="flex items-center gap-1">
                  {connectionStatus.connected ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className={connectionStatus.connected ? 'text-green-600' : 'text-red-600'}>
                    {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              {connectionStatus.error && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                  {connectionStatus.error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Last checked: {new Date(connectionStatus.lastCheck).toLocaleTimeString()}
              </p>
            </div>

            {/* Session Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Session</span>
                <div className="flex items-center gap-1">
                  {sessionStatus.active ? (
                    <Activity className="h-3 w-3 text-blue-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-gray-500" />
                  )}
                  <span className={sessionStatus.active ? 'text-blue-600' : 'text-gray-600'}>
                    {sessionStatus.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {sessionStatus.active && sessionStatus.metrics ? (
                <div className="space-y-2">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span>{Math.floor((sessionStatus.duration || 0) / 60)}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Keystrokes</span>
                      <span>{sessionStatus.metrics.keystrokes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI Suggestions</span>
                      <span>{sessionStatus.metrics.suggestions}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Productivity</span>
                      <span>{sessionStatus.metrics.productivity.toFixed(0)}/100</span>
                    </div>
                    <Progress value={sessionStatus.metrics.productivity} className="h-1" />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No active session. Start coding to begin tracking.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {sessionStatus.active ? (
                <Button onClick={endSession} variant="outline" size="sm" className="flex-1 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  End Session
                </Button>
              ) : (
                <Button onClick={startSession} variant="default" size="sm" className="flex-1 text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Start Session
                </Button>
              )}
              
              <Button variant="outline" size="sm" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                Dashboard
              </Button>
            </div>

            {/* Quick Stats */}
            {connectionStatus.connected && (
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground mb-1">Quick Stats</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span>Traces: Active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings className="h-3 w-3 text-blue-500" />
                    <span>Sync: Real-time</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}