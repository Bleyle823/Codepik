'use client';

import { OpikTrace, OpikSpan, safeOpikClient } from './opik-client-safe';
import { errorHandler } from './opik-error-handler';

export interface PerformanceMetrics {
  tracesPerSecond: number;
  avgTraceSize: number;
  batchEfficiency: number;
  networkLatency: number;
  memoryUsage: number;
  queueDepth: number;
}

export interface OptimizationSettings {
  batchSize: number;
  flushInterval: number;
  compressionEnabled: boolean;
  priorityQueueEnabled: boolean;
  adaptiveBatching: boolean;
  maxQueueSize: number;
  networkOptimization: boolean;
}

export interface TraceQueueItem {
  type: 'trace' | 'span';
  data: any;
  priority: number;
  timestamp: number;
  size: number;
  retryCount: number;
}

export class OpikPerformanceOptimizer {
  private static instance: OpikPerformanceOptimizer;
  private settings: OptimizationSettings;
  private performanceMetrics: PerformanceMetrics;
  private traceQueue: TraceQueueItem[] = [];
  private highPriorityQueue: TraceQueueItem[] = [];
  private processingQueue: boolean = false;
  private metricsInterval: NodeJS.Timeout | null = null;
  private adaptiveTimer: NodeJS.Timeout | null = null;
  private networkLatencyHistory: number[] = [];
  private lastFlushTime = Date.now();
  private totalBytesProcessed = 0;
  private totalTracesProcessed = 0;

  static getInstance(): OpikPerformanceOptimizer {
    if (!OpikPerformanceOptimizer.instance) {
      OpikPerformanceOptimizer.instance = new OpikPerformanceOptimizer();
    }
    return OpikPerformanceOptimizer.instance;
  }

  constructor() {
    this.settings = {
      batchSize: 10,
      flushInterval: 5000,
      compressionEnabled: true,
      priorityQueueEnabled: true,
      adaptiveBatching: true,
      maxQueueSize: 1000,
      networkOptimization: true
    };

    this.performanceMetrics = {
      tracesPerSecond: 0,
      avgTraceSize: 0,
      batchEfficiency: 0,
      networkLatency: 0,
      memoryUsage: 0,
      queueDepth: 0
    };

    this.initializeOptimization();
  }

  private initializeOptimization(): void {
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    // Start adaptive batching if enabled
    if (this.settings.adaptiveBatching) {
      this.startAdaptiveBatching();
    }

    // Start intelligent queue processing
    this.startQueueProcessing();
  }

  // Queue Management
  addToQueue(
    type: 'trace' | 'span',
    data: any,
    priority: number = 1
  ): boolean {
    try {
      const item: TraceQueueItem = {
        type,
        data,
        priority,
        timestamp: Date.now(),
        size: this.estimateDataSize(data),
        retryCount: 0
      };

      // Check queue size limits
      const totalQueueSize = this.traceQueue.length + this.highPriorityQueue.length;
      if (totalQueueSize >= this.settings.maxQueueSize) {
        // Remove oldest low-priority items
        this.evictLowPriorityItems();
      }

      // Add to appropriate queue based on priority
      if (this.settings.priorityQueueEnabled && priority > 5) {
        this.highPriorityQueue.push(item);
        this.highPriorityQueue.sort((a, b) => b.priority - a.priority);
      } else {
        this.traceQueue.push(item);
      }

      // Update metrics
      this.performanceMetrics.queueDepth = totalQueueSize + 1;

      // Trigger immediate processing for high-priority items
      if (priority > 8 && !this.processingQueue) {
        this.processQueue();
      }

      return true;
    } catch (error) {
      errorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        feature: 'performance-optimization',
        operation: 'add-to-queue'
      });
      return false;
    }
  }

  private evictLowPriorityItems(): void {
    // Remove 10% of low-priority items to make space
    const itemsToRemove = Math.floor(this.traceQueue.length * 0.1);
    
    // Sort by priority (ascending) and timestamp (oldest first)
    this.traceQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.timestamp - b.timestamp;
    });

    // Remove the lowest priority, oldest items
    this.traceQueue.splice(0, itemsToRemove);
    
    console.log(`Evicted ${itemsToRemove} low-priority items from queue`);
  }

  private estimateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1000; // Default estimate
    }
  }

  // Intelligent Batching
  private startAdaptiveBatching(): void {
    this.adaptiveTimer = setInterval(() => {
      this.adjustBatchSettings();
    }, 10000); // Adjust every 10 seconds
  }

  private adjustBatchSettings(): void {
    const metrics = this.performanceMetrics;
    
    // Adjust batch size based on network latency
    if (metrics.networkLatency > 1000) {
      // High latency - increase batch size to reduce requests
      this.settings.batchSize = Math.min(50, this.settings.batchSize * 1.5);
      this.settings.flushInterval = Math.min(15000, this.settings.flushInterval * 1.2);
    } else if (metrics.networkLatency < 200) {
      // Low latency - can use smaller batches for better real-time performance
      this.settings.batchSize = Math.max(5, this.settings.batchSize * 0.8);
      this.settings.flushInterval = Math.max(2000, this.settings.flushInterval * 0.9);
    }

    // Adjust based on queue depth
    if (metrics.queueDepth > 100) {
      // Queue is backing up - increase processing speed
      this.settings.batchSize = Math.min(100, this.settings.batchSize * 2);
      this.settings.flushInterval = Math.max(1000, this.settings.flushInterval * 0.5);
    }

    // Adjust based on traces per second
    if (metrics.tracesPerSecond > 10) {
      // High volume - optimize for throughput
      this.settings.batchSize = Math.min(100, Math.max(20, metrics.tracesPerSecond * 2));
    }

    console.log('Adaptive batching adjusted:', {
      batchSize: this.settings.batchSize,
      flushInterval: this.settings.flushInterval,
      queueDepth: metrics.queueDepth,
      tracesPerSecond: metrics.tracesPerSecond
    });
  }

  // Queue Processing
  private startQueueProcessing(): void {
    // Process queue at regular intervals
    setInterval(() => {
      if (!this.processingQueue && this.shouldProcessQueue()) {
        this.processQueue();
      }
    }, this.settings.flushInterval);
  }

  private shouldProcessQueue(): boolean {
    const totalItems = this.traceQueue.length + this.highPriorityQueue.length;
    
    // Process if we have enough items for a batch
    if (totalItems >= this.settings.batchSize) {
      return true;
    }

    // Process if we have high-priority items waiting
    if (this.highPriorityQueue.length > 0) {
      return true;
    }

    // Process if items have been waiting too long
    const oldestItem = this.traceQueue[0];
    if (oldestItem && Date.now() - oldestItem.timestamp > this.settings.flushInterval) {
      return true;
    }

    return false;
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    const startTime = Date.now();

    try {
      // Get items to process
      const itemsToProcess = this.getItemsForProcessing();
      
      if (itemsToProcess.length === 0) {
        return;
      }

      // Group items by type
      const traces = itemsToProcess.filter(item => item.type === 'trace');
      const spans = itemsToProcess.filter(item => item.type === 'span');

      // Process in optimized batches
      const results = await Promise.allSettled([
        this.processBatch('traces', traces),
        this.processBatch('spans', spans)
      ]);

      // Handle failed items
      const failedItems = this.handleProcessingResults(results, itemsToProcess);
      
      // Re-queue failed items with retry logic
      this.requeueFailedItems(failedItems);

      // Update performance metrics
      this.updateProcessingMetrics(itemsToProcess.length, Date.now() - startTime);

    } catch (error) {
      await errorHandler.logError(error instanceof Error ? error : new Error(String(error)), {
        feature: 'performance-optimization',
        operation: 'process-queue'
      });
    } finally {
      this.processingQueue = false;
    }
  }

  private getItemsForProcessing(): TraceQueueItem[] {
    const items: TraceQueueItem[] = [];
    
    // Always prioritize high-priority queue
    while (this.highPriorityQueue.length > 0 && items.length < this.settings.batchSize) {
      const item = this.highPriorityQueue.shift();
      if (item) items.push(item);
    }

    // Fill remaining batch with regular queue items
    while (this.traceQueue.length > 0 && items.length < this.settings.batchSize) {
      const item = this.traceQueue.shift();
      if (item) items.push(item);
    }

    return items;
  }

  private async processBatch(type: string, items: TraceQueueItem[]): Promise<void> {
    if (items.length === 0) return;

    const startTime = Date.now();

    try {
      // Compress data if enabled
      const processedData = this.settings.compressionEnabled 
        ? this.compressData(items.map(item => item.data))
        : items.map(item => item.data);

      // Send to Opik using safe client
      if (type === 'traces') {
        for (const data of processedData) {
          await safeOpikClient.createTrace(data);
        }
      } else {
        for (const data of processedData) {
          await safeOpikClient.createSpan(data);
        }
      }

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.networkLatencyHistory.push(processingTime);
      if (this.networkLatencyHistory.length > 10) {
        this.networkLatencyHistory = this.networkLatencyHistory.slice(-10);
      }

      this.totalTracesProcessed += items.length;
      this.totalBytesProcessed += items.reduce((sum, item) => sum + item.size, 0);

    } catch (error) {
      // Let the caller handle the error
      throw error;
    }
  }

  private compressData(data: any[]): any[] {
    // Simple compression: remove redundant metadata
    return data.map(item => {
      if (item.metadata) {
        // Keep only essential metadata
        const essentialMetadata = {
          timestamp: item.metadata.timestamp,
          userId: item.metadata.userId,
          feature: item.metadata.feature
        };
        return { ...item, metadata: essentialMetadata };
      }
      return item;
    });
  }

  private handleProcessingResults(
    results: PromiseSettledResult<void>[],
    items: TraceQueueItem[]
  ): TraceQueueItem[] {
    const failedItems: TraceQueueItem[] = [];

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        // Mark items as failed for retry
        const batchSize = Math.ceil(items.length / results.length);
        const startIndex = index * batchSize;
        const endIndex = Math.min(startIndex + batchSize, items.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          if (items[i]) {
            failedItems.push(items[i]);
          }
        }
      }
    });

    return failedItems;
  }

  private requeueFailedItems(failedItems: TraceQueueItem[]): void {
    failedItems.forEach(item => {
      item.retryCount++;
      
      // Exponential backoff for retries
      const delay = Math.min(30000, 1000 * Math.pow(2, item.retryCount));
      
      if (item.retryCount < 3) {
        setTimeout(() => {
          if (item.priority > 5) {
            this.highPriorityQueue.push(item);
          } else {
            this.traceQueue.push(item);
          }
        }, delay);
      } else {
        // Give up after 3 retries
        console.warn('Dropping item after 3 failed retries:', item.type);
      }
    });
  }

  // Performance Monitoring
  private startPerformanceMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 5000); // Update every 5 seconds
  }

  private updatePerformanceMetrics(): void {
    const now = Date.now();
    const timeDelta = (now - this.lastFlushTime) / 1000; // seconds
    
    this.performanceMetrics = {
      tracesPerSecond: timeDelta > 0 ? this.totalTracesProcessed / timeDelta : 0,
      avgTraceSize: this.totalTracesProcessed > 0 ? 
        this.totalBytesProcessed / this.totalTracesProcessed : 0,
      batchEfficiency: this.calculateBatchEfficiency(),
      networkLatency: this.calculateAverageLatency(),
      memoryUsage: this.estimateMemoryUsage(),
      queueDepth: this.traceQueue.length + this.highPriorityQueue.length
    };

    // Reset counters periodically
    if (timeDelta > 60) { // Reset every minute
      this.totalTracesProcessed = 0;
      this.totalBytesProcessed = 0;
      this.lastFlushTime = now;
    }
  }

  private updateProcessingMetrics(itemCount: number, processingTime: number): void {
    this.totalTracesProcessed += itemCount;
    this.networkLatencyHistory.push(processingTime);
    
    if (this.networkLatencyHistory.length > 20) {
      this.networkLatencyHistory = this.networkLatencyHistory.slice(-20);
    }
  }

  private calculateBatchEfficiency(): number {
    if (this.totalTracesProcessed === 0) return 0;
    
    // Efficiency = (items processed in batches) / (total items processed)
    // Higher is better (closer to 1.0)
    const avgBatchSize = this.settings.batchSize;
    const efficiency = Math.min(1.0, avgBatchSize / Math.max(1, this.settings.batchSize));
    
    return efficiency * 100; // Return as percentage
  }

  private calculateAverageLatency(): number {
    if (this.networkLatencyHistory.length === 0) return 0;
    
    const sum = this.networkLatencyHistory.reduce((a, b) => a + b, 0);
    return sum / this.networkLatencyHistory.length;
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage in KB
    const queueSize = this.traceQueue.length + this.highPriorityQueue.length;
    const avgItemSize = this.performanceMetrics.avgTraceSize || 1000;
    
    return (queueSize * avgItemSize) / 1024; // Convert to KB
  }

  // Public API
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  getOptimizationSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    console.log('Performance optimization settings updated:', this.settings);
  }

  async forceFlush(): Promise<void> {
    if (!this.processingQueue) {
      await this.processQueue();
    }
  }

  getQueueStatus(): {
    regular: number;
    highPriority: number;
    processing: boolean;
    oldestItemAge: number;
  } {
    const oldestItem = this.traceQueue[0];
    const oldestAge = oldestItem ? Date.now() - oldestItem.timestamp : 0;

    return {
      regular: this.traceQueue.length,
      highPriority: this.highPriorityQueue.length,
      processing: this.processingQueue,
      oldestItemAge: oldestAge
    };
  }

  // Optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.performanceMetrics;

    if (metrics.queueDepth > 50) {
      recommendations.push('Queue depth is high - consider increasing batch size or reducing flush interval');
    }

    if (metrics.networkLatency > 2000) {
      recommendations.push('High network latency detected - enable compression and increase batch size');
    }

    if (metrics.batchEfficiency < 50) {
      recommendations.push('Low batch efficiency - adjust batch size or flush interval');
    }

    if (metrics.memoryUsage > 10000) { // 10MB
      recommendations.push('High memory usage - consider reducing max queue size');
    }

    if (metrics.tracesPerSecond > 20) {
      recommendations.push('High trace volume - enable adaptive batching for better performance');
    }

    return recommendations;
  }

  // Cleanup
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.adaptiveTimer) {
      clearInterval(this.adaptiveTimer);
      this.adaptiveTimer = null;
    }

    // Final flush
    this.forceFlush().catch(error => {
      console.error('Error during final flush:', error);
    });
  }
}

// Export singleton instance
export const performanceOptimizer = OpikPerformanceOptimizer.getInstance();