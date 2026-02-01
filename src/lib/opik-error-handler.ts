'use client';

import { safeOpikClient } from './opik-client-safe';

export interface OpikError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

export interface ErrorRecoveryStrategy {
  name: string;
  execute: () => Promise<boolean>;
  maxRetries: number;
  backoffMs: number;
}

export interface FallbackData {
  [key: string]: any;
}

export class OpikErrorHandler {
  private static instance: OpikErrorHandler;
  private errorLog: OpikError[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private fallbackData: Map<string, FallbackData> = new Map();
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
    threshold: number;
    resetTimeout: number;
  }> = new Map();

  static getInstance(): OpikErrorHandler {
    if (!OpikErrorHandler.instance) {
      OpikErrorHandler.instance = new OpikErrorHandler();
    }
    return OpikErrorHandler.instance;
  }

  constructor() {
    this.initializeRecoveryStrategies();
    this.initializeFallbackData();
    this.initializeCircuitBreakers();
  }

  // Error logging and tracking
  async logError(error: Error | OpikError, context?: Record<string, any>): Promise<void> {
    try {
      const opikError: OpikError = this.normalizeError(error, context);
      
      // Add to error log
      this.errorLog.push(opikError);
      
      // Keep only last 100 errors
      if (this.errorLog.length > 100) {
        this.errorLog = this.errorLog.slice(-100);
      }

      // Try to trace the error (non-blocking)
      this.traceError(opikError).catch(err => {
        console.warn('Failed to trace error:', err);
      });

      // Update circuit breaker
      this.updateCircuitBreaker(opikError.code);

      // Log to console based on severity
      this.logToConsole(opikError);

    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  private normalizeError(error: Error | OpikError, context?: Record<string, any>): OpikError {
    if ('code' in error && 'severity' in error) {
      return { ...error, context: { ...error.context, ...context } };
    }

    // Convert regular Error to OpikError
    const severity = this.determineSeverity(error.message, context);
    const code = this.generateErrorCode(error.message);
    
    return {
      code,
      message: error.message,
      details: error.stack,
      timestamp: Date.now(),
      context,
      severity,
      recoverable: this.isRecoverable(code, severity)
    };
  }

  private determineSeverity(message: string, context?: Record<string, any>): OpikError['severity'] {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
      return 'medium';
    }
    
    if (lowerMessage.includes('auth') || lowerMessage.includes('permission')) {
      return 'high';
    }
    
    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) {
      return 'critical';
    }
    
    if (context?.feature === 'tracing' || context?.feature === 'dashboard') {
      return 'medium';
    }
    
    return 'low';
  }

  private generateErrorCode(message: string): string {
    const hash = message.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return `OPIK_${Math.abs(hash).toString(16).toUpperCase().substring(0, 6)}`;
  }

  private isRecoverable(code: string, severity: OpikError['severity']): boolean {
    if (severity === 'critical') return false;
    
    const recoverablePatterns = [
      'network', 'timeout', 'connection', 'rate', 'quota'
    ];
    
    return recoverablePatterns.some(pattern => 
      code.toLowerCase().includes(pattern)
    );
  }

  private async traceError(error: OpikError): Promise<void> {
    try {
      await safeOpikClient.createTrace({
        name: 'error-occurrence',
        input: {
          errorCode: error.code,
          errorMessage: error.message,
          context: error.context
        },
        output: {
          severity: error.severity,
          recoverable: error.recoverable,
          timestamp: error.timestamp
        },
        metadata: {
          feature: 'error-handling',
          errorCode: error.code,
          severity: error.severity,
          recoverable: error.recoverable
        },
        tags: ['error', error.severity, error.recoverable ? 'recoverable' : 'non-recoverable']
      });
    } catch (traceError) {
      // Silently fail - don't create infinite error loops
    }
  }

  private logToConsole(error: OpikError): void {
    const logMethod = {
      low: 'log',
      medium: 'warn',
      high: 'error',
      critical: 'error'
    }[error.severity] as keyof Console;

    console[logMethod](`[Opik ${error.severity.toUpperCase()}] ${error.code}: ${error.message}`, {
      details: error.details,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    });
  }

  // Circuit breaker pattern
  private initializeCircuitBreakers(): void {
    const services = ['tracing', 'dashboard', 'suggestions', 'quick-edit', 'chat'];
    
    services.forEach(service => {
      this.circuitBreakers.set(service, {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        threshold: 5,
        resetTimeout: 60000 // 1 minute
      });
    });
  }

  private updateCircuitBreaker(errorCode: string): void {
    const service = this.extractServiceFromError(errorCode);
    const breaker = this.circuitBreakers.get(service);
    
    if (breaker) {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failures >= breaker.threshold) {
        breaker.isOpen = true;
        console.warn(`Circuit breaker opened for ${service} due to ${breaker.failures} failures`);
      }
    }
  }

  private extractServiceFromError(errorCode: string): string {
    const lowerCode = errorCode.toLowerCase();
    
    if (lowerCode.includes('trace') || lowerCode.includes('span')) return 'tracing';
    if (lowerCode.includes('dashboard') || lowerCode.includes('analytics')) return 'dashboard';
    if (lowerCode.includes('suggestion')) return 'suggestions';
    if (lowerCode.includes('edit')) return 'quick-edit';
    if (lowerCode.includes('chat')) return 'chat';
    
    return 'general';
  }

  isServiceAvailable(service: string): boolean {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return true;
    
    if (!breaker.isOpen) return true;
    
    // Check if we should reset the circuit breaker
    if (Date.now() - breaker.lastFailure > breaker.resetTimeout) {
      breaker.isOpen = false;
      breaker.failures = 0;
      console.log(`Circuit breaker reset for ${service}`);
      return true;
    }
    
    return false;
  }

  // Recovery strategies
  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies.set('connection', {
      name: 'Reconnect to Opik',
      execute: async () => {
        try {
          const { checkOpikHealth } = await import('./opik-client');
          return await checkOpikHealth();
        } catch {
          return false;
        }
      },
      maxRetries: 3,
      backoffMs: 1000
    });

    this.recoveryStrategies.set('rate-limit', {
      name: 'Wait and retry',
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return true;
      },
      maxRetries: 2,
      backoffMs: 5000
    });

    this.recoveryStrategies.set('auth', {
      name: 'Refresh authentication',
      execute: async () => {
        // This would refresh API keys or tokens
        console.log('Attempting to refresh Opik authentication');
        return false; // Manual intervention required
      },
      maxRetries: 1,
      backoffMs: 0
    });
  }

  async attemptRecovery(error: OpikError): Promise<boolean> {
    if (!error.recoverable) return false;
    
    const strategy = this.findRecoveryStrategy(error);
    if (!strategy) return false;

    let attempts = 0;
    while (attempts < strategy.maxRetries) {
      try {
        console.log(`Attempting recovery: ${strategy.name} (attempt ${attempts + 1})`);
        
        if (attempts > 0) {
          await new Promise(resolve => 
            setTimeout(resolve, strategy.backoffMs * Math.pow(2, attempts - 1))
          );
        }

        const success = await strategy.execute();
        if (success) {
          console.log(`Recovery successful: ${strategy.name}`);
          return true;
        }
      } catch (recoveryError) {
        console.warn(`Recovery attempt failed:`, recoveryError);
      }
      
      attempts++;
    }

    console.error(`Recovery failed after ${attempts} attempts: ${strategy.name}`);
    return false;
  }

  private findRecoveryStrategy(error: OpikError): ErrorRecoveryStrategy | null {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection')) {
      return this.recoveryStrategies.get('connection') || null;
    }
    
    if (message.includes('rate') || message.includes('quota')) {
      return this.recoveryStrategies.get('rate-limit') || null;
    }
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return this.recoveryStrategies.get('auth') || null;
    }
    
    return null;
  }

  // Fallback data management
  private initializeFallbackData(): void {
    this.fallbackData.set('dashboard-metrics', {
      totalTraces: 0,
      traceGrowth: 0,
      avgResponseTime: 0,
      responseTimeChange: 0,
      totalCost: 0,
      costChange: 0,
      successRate: 100,
      successRateChange: 0,
      qualityMetrics: {
        avgQuality: 0.8,
        qualityTrend: 0
      },
      costBreakdown: []
    });

    this.fallbackData.set('trace-analytics', {
      traces: [],
      timelineData: [],
      performanceData: []
    });

    this.fallbackData.set('project-metrics', {
      totalSessions: 0,
      totalTraces: 0,
      avgSessionDuration: 0,
      codeProductivity: {
        linesPerSession: 0,
        keystrokesPerMinute: 0,
        aiAssistanceRate: 0
      },
      aiUsage: {
        suggestionsRequested: 0,
        suggestionsAccepted: 0,
        quickEditsPerformed: 0,
        chatInteractions: 0
      },
      qualityMetrics: {
        avgQualityScore: 0.8,
        errorRate: 0,
        userSatisfaction: 0.8
      }
    });
  }

  getFallbackData<T = any>(key: string): T | null {
    return this.fallbackData.get(key) as T || null;
  }

  setFallbackData(key: string, data: FallbackData): void {
    this.fallbackData.set(key, data);
  }

  // Wrapper for safe execution
  async safeExecute<T>(
    operation: () => Promise<T>,
    fallbackKey?: string,
    context?: Record<string, any>
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      await this.logError(error instanceof Error ? error : new Error(String(error)), context);
      
      if (fallbackKey) {
        const fallback = this.getFallbackData<T>(fallbackKey);
        if (fallback) {
          console.log(`Using fallback data for ${fallbackKey}`);
          return fallback;
        }
      }
      
      return null;
    }
  }

  // Error statistics and reporting
  getErrorStatistics(): {
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    recentErrors: OpikError[];
    topErrorCodes: Array<{ code: string; count: number }>;
  } {
    const errorsBySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorCounts = this.errorLog.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrorCodes = Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: this.errorLog.length,
      errorsBySeverity,
      recentErrors: this.errorLog.slice(-10),
      topErrorCodes
    };
  }

  clearErrorLog(): void {
    this.errorLog = [];
    console.log('Error log cleared');
  }

  // Health check
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const stats = this.getErrorStatistics();
    const recentErrors = this.errorLog.filter(e => 
      Date.now() - e.timestamp < 300000 // Last 5 minutes
    );
    
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length;
    const highErrors = recentErrors.filter(e => e.severity === 'high').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (criticalErrors > 0) {
      status = 'unhealthy';
    } else if (highErrors > 2 || recentErrors.length > 10) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        totalErrors: stats.totalErrors,
        recentErrors: recentErrors.length,
        criticalErrors,
        highErrors,
        circuitBreakers: Object.fromEntries(
          Array.from(this.circuitBreakers.entries()).map(([service, breaker]) => [
            service,
            { isOpen: breaker.isOpen, failures: breaker.failures }
          ])
        )
      }
    };
  }
}

// Export singleton instance
export const errorHandler = OpikErrorHandler.getInstance();

// Utility function for wrapping async operations
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  fallbackKey?: string,
  context?: Record<string, any>
): Promise<T | null> {
  return errorHandler.safeExecute(operation, fallbackKey, context);
}