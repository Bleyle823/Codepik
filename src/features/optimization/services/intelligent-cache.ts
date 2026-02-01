import { safeOpikClient } from '@/lib/opik-client-safe';
import { createHash } from 'crypto';

export interface AIRequest {
  type: 'suggestion' | 'quick-edit' | 'chat';
  userId: string;
  content: string;
  context?: any;
  model?: string;
  summary?: string;
}

export interface AIResponse {
  content: string;
  qualityScore: number;
  processingTime: number;
  tokenCount?: number;
  metadata?: any;
}

export interface CacheEntry {
  response: AIResponse;
  timestamp: number;
  quality: number;
  usage: number;
  lastAccessed: number;
  expiresAt: number;
}

export interface CachedResponse {
  content: string;
  cached: boolean;
  age: number;
  qualityScore: number;
}

export class IntelligentCacheSystem {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 1000;
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  private qualityThreshold = 0.7;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Load cache configuration and historical data
      await this.loadCacheConfiguration();

      // Start cleanup interval
      setInterval(() => this.cleanupExpiredEntries(), 60 * 60 * 1000); // Every hour

      this.initialized = true;
      console.log('Intelligent cache system initialized');
    } catch (error) {
      console.error('Failed to initialize cache system:', error);
      this.initialized = true; // Continue without advanced features
    }
  }

  async getCachedResponse(request: AIRequest): Promise<CachedResponse | null> {
    await this.initialize();

    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);

      if (!cached || this.isExpired(cached)) {
        return null;
      }

      // Update access statistics
      cached.usage++;
      cached.lastAccessed = Date.now();

      // Track cache hit
      const trace = await safeOpikClient.createTrace({
        name: 'cache-hit',
        input: {
          requestType: request.type,
          cacheKey: cacheKey.substring(0, 16) + '...' // Truncated for privacy
        },
        output: {
          cached: true,
          age: Date.now() - cached.timestamp,
          quality: cached.quality,
          usage: cached.usage
        },
        metadata: {
          feature: 'caching',
          userId: request.userId,
          requestType: request.type
        }
      });

      return {
        content: cached.response.content,
        cached: true,
        age: Date.now() - cached.timestamp,
        qualityScore: cached.quality
      };
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  async setCachedResponse(request: AIRequest, response: AIResponse): Promise<void> {
    await this.initialize();

    try {
      const cacheKey = this.generateCacheKey(request);

      // Analyze if this response should be cached
      const shouldCache = await this.shouldCacheResponse(request, response);

      if (!shouldCache) {
        return;
      }

      // Calculate expiration time based on quality and type
      const ttl = this.calculateTTL(request, response);

      const cacheEntry: CacheEntry = {
        response,
        timestamp: Date.now(),
        quality: response.qualityScore,
        usage: 1,
        lastAccessed: Date.now(),
        expiresAt: Date.now() + ttl
      };

      // Ensure cache doesn't exceed size limit
      if (this.cache.size >= this.maxCacheSize) {
        this.evictLeastValuable();
      }

      this.cache.set(cacheKey, cacheEntry);

      // Track cache store
      await safeOpikClient.createTrace({
        name: 'cache-store',
        input: {
          requestType: request.type,
          quality: response.qualityScore,
          ttl: ttl / 1000 / 60 // TTL in minutes
        },
        output: {
          cached: true,
          cacheSize: this.cache.size
        },
        metadata: {
          feature: 'caching',
          userId: request.userId,
          requestType: request.type
        }
      });

    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    try {
      let invalidatedCount = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (key.includes(userId)) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }

      console.log(`Invalidated ${invalidatedCount} cache entries for user ${userId}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  async getCacheStatistics(): Promise<{
    size: number;
    hitRate: number;
    averageAge: number;
    qualityDistribution: { [key: string]: number };
    typeDistribution: { [key: string]: number };
  }> {
    const stats = {
      size: this.cache.size,
      hitRate: 0,
      averageAge: 0,
      qualityDistribution: { high: 0, medium: 0, low: 0 },
      typeDistribution: { suggestion: 0, 'quick-edit': 0, chat: 0 }
    };

    if (this.cache.size === 0) return stats;

    let totalAge = 0;
    let totalUsage = 0;
    let totalHits = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = Date.now() - entry.timestamp;
      totalAge += age;
      totalUsage += entry.usage;
      totalHits += entry.usage - 1; // Subtract initial store

      // Quality distribution
      if (entry.quality >= 0.8) stats.qualityDistribution.high++;
      else if (entry.quality >= 0.6) stats.qualityDistribution.medium++;
      else stats.qualityDistribution.low++;

      // Type distribution (extract from key)
      if (key.includes('suggestion')) stats.typeDistribution.suggestion++;
      else if (key.includes('quick-edit')) stats.typeDistribution['quick-edit']++;
      else if (key.includes('chat')) stats.typeDistribution.chat++;
    }

    stats.averageAge = totalAge / this.cache.size;
    stats.hitRate = totalUsage > 0 ? totalHits / totalUsage : 0;

    return stats;
  }

  private generateCacheKey(request: AIRequest): string {
    // Create a hash of the request content and context
    const keyData = {
      type: request.type,
      content: request.content,
      context: this.normalizeContext(request.context),
      model: request.model || 'default'
    };

    const keyString = JSON.stringify(keyData);
    const hash = createHash('sha256').update(keyString).digest('hex');

    return `${request.type}-${request.userId}-${hash}`;
  }

  private normalizeContext(context: any): any {
    if (!context) return null;

    // Remove volatile data that shouldn't affect caching
    const normalized = { ...context };

    // Remove timestamps, IDs, and other volatile fields
    delete normalized.timestamp;
    delete normalized.sessionId;
    delete normalized.requestId;

    // Normalize file paths (remove user-specific parts)
    if (normalized.fileName) {
      normalized.fileName = normalized.fileName.split('/').pop();
    }

    return normalized;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private async shouldCacheResponse(request: AIRequest, response: AIResponse): Promise<boolean> {
    try {
      // Don't cache low-quality responses
      if (response.qualityScore < this.qualityThreshold) {
        return false;
      }

      // Don't cache very short responses (likely errors or empty responses)
      if (response.content.length < 10) {
        return false;
      }

      // Don't cache user-specific content for chat
      if (request.type === 'chat' && this.containsPersonalInfo(response.content)) {
        return false;
      }

      // Use Opik analytics to determine caching strategy
      const similarRequests = await this.findSimilarRequests(request);

      // Cache if response quality is high and similar requests exist
      return response.qualityScore > 0.8 && similarRequests.length > 2;
    } catch (error) {
      console.error('Error determining cache eligibility:', error);
      return response.qualityScore > 0.8; // Fallback to simple quality check
    }
  }

  private async findSimilarRequests(request: AIRequest): Promise<any[]> {
    try {
      // Mock search for now - replace with MCP call when available
      const traces: any[] = [];

      /* 
      // Placeholder for future implementation:
      await safeOpikClient.searchTraces({
        projectName: 'codepik-ide',
        query: `request_similarity:high`,
        filters: {
          'metadata.request_type': request.type,
          'feedback.overall_quality': { $gte: 0.8 }
        },
        size: 10
      });
      */

      return traces || [];
    } catch (error) {
      console.error('Error finding similar requests:', error);
      return [];
    }
  }

  private calculateTTL(request: AIRequest, response: AIResponse): number {
    let ttl = this.defaultTTL;

    // Adjust TTL based on quality
    if (response.qualityScore > 0.9) {
      ttl *= 2; // High quality responses last longer
    } else if (response.qualityScore < 0.7) {
      ttl *= 0.5; // Low quality responses expire faster
    }

    // Adjust TTL based on request type
    switch (request.type) {
      case 'suggestion':
        ttl *= 0.5; // Suggestions are more context-dependent
        break;
      case 'quick-edit':
        ttl *= 1.5; // Edits are more reusable
        break;
      case 'chat':
        ttl *= 0.3; // Chat responses are often context-specific
        break;
    }

    return Math.max(ttl, 60 * 60 * 1000); // Minimum 1 hour
  }

  private containsPersonalInfo(content: string): boolean {
    // Simple check for personal information patterns
    const personalPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone number
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card
      /\bAPI[_\s]?KEY\b/i, // API keys
      /\bTOKEN\b/i // Tokens
    ];

    return personalPatterns.some(pattern => pattern.test(content));
  }

  private evictLeastValuable(): void {
    let leastValuableKey: string | null = null;
    let leastValue = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Calculate value score based on quality, usage, and recency
      const ageScore = Math.max(0, 1 - (Date.now() - entry.lastAccessed) / (7 * 24 * 60 * 60 * 1000));
      const usageScore = Math.min(1, entry.usage / 10);
      const qualityScore = entry.quality;

      const valueScore = (qualityScore * 0.4) + (usageScore * 0.4) + (ageScore * 0.2);

      if (valueScore < leastValue) {
        leastValue = valueScore;
        leastValuableKey = key;
      }
    }

    if (leastValuableKey) {
      this.cache.delete(leastValuableKey);
    }
  }

  private cleanupExpiredEntries(): void {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  private async loadCacheConfiguration(): Promise<void> {
    try {
      // This would typically load configuration from environment or database
      this.maxCacheSize = parseInt(process.env.OPIK_CACHE_MAX_SIZE || '1000');
      this.defaultTTL = parseInt(process.env.OPIK_CACHE_DEFAULT_TTL || '86400000');
      this.qualityThreshold = parseFloat(process.env.OPIK_CACHE_QUALITY_THRESHOLD || '0.7');
    } catch (error) {
      console.error('Failed to load cache configuration:', error);
    }
  }
}