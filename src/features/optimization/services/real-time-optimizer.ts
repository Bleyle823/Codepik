import { safeOpikClient } from '@/lib/opik-client-safe';

export interface OptimizationRule {
  name: string;
  type: 'context' | 'token' | 'response-time' | 'quality';
  priority: number;
  applies: (requestType: string, context: any) => boolean;
  apply: (context: any) => any;
  confidence: number;
}

export interface OptimizationContext {
  requestType: 'suggestion' | 'quick-edit' | 'chat';
  userId: string;
  codeContext?: any;
  conversationHistory?: any[];
  userPreferences?: any;
  performanceTargets?: {
    maxResponseTime?: number;
    maxTokens?: number;
    minQuality?: number;
  };
}

export class RealTimeOptimizer {
  private optimizationRules: OptimizationRule[] = [];
  private initialized = false;
  private ruleCache = new Map<string, OptimizationRule[]>();

  async initializeOptimization() {
    if (this.initialized) return;

    try {
      // Load historical traces for rule generation
      const traces = await this.loadRecentTraces();
      this.optimizationRules = await this.generateOptimizationRules(traces);
      this.initialized = true;
      
      console.log(`Initialized ${this.optimizationRules.length} optimization rules`);
    } catch (error) {
      console.error('Failed to initialize optimization:', error);
      // Use default rules if Opik is not available
      this.optimizationRules = this.getDefaultOptimizationRules();
      this.initialized = true;
    }
  }

  async optimizeRequest(context: OptimizationContext): Promise<any> {
    await this.initializeOptimization();

    try {
      const trace = await safeOpikClient.createTrace({
        name: 'request-optimization',
        input: { 
          requestType: context.requestType,
          hasCodeContext: !!context.codeContext,
          hasHistory: !!context.conversationHistory?.length
        },
        metadata: { 
          feature: 'optimization',
          userId: context.userId,
          requestType: context.requestType
        }
      });

      // Get applicable rules for this request type
      const applicableRules = await this.getApplicableRules(context);
      
      let optimizedContext = { ...context };
      const appliedRules: string[] = [];

      // Apply rules in priority order
      for (const rule of applicableRules) {
        try {
          const previousContext = { ...optimizedContext };
          optimizedContext = rule.apply(optimizedContext);
          
          // Track if rule made significant changes
          if (this.hasSignificantChanges(previousContext, optimizedContext)) {
            appliedRules.push(rule.name);
          }
        } catch (ruleError) {
          console.error(`Rule ${rule.name} failed:`, ruleError);
        }
      }

      trace.update({
        output: {
          rulesApplied: appliedRules,
          optimizationsCount: appliedRules.length,
          hasOptimizations: appliedRules.length > 0
        }
      });

      return optimizedContext;
    } catch (error) {
      console.error('Request optimization failed:', error);
      return context; // Return original context if optimization fails
    }
  }

  async recordOptimizationImpact(
    optimizationId: string,
    impact: {
      responseTimeImprovement: number;
      qualityImprovement: number;
      costReduction: number;
      userSatisfaction: number;
    }
  ) {
    try {
      // Record the impact for future rule refinement
      console.log(`Optimization impact recorded:`, { optimizationId, impact });
      
      // This would typically update rule effectiveness scores in Opik
      // For now, we'll store it locally for rule adjustment
    } catch (error) {
      console.error('Failed to record optimization impact:', error);
    }
  }

  private async loadRecentTraces(): Promise<any[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7); // Last 7 days

      // Mock search for now - replace with MCP call when available
      const traces = [];
        // projectName: 'codepik-ide',
        filters: { 
          status: 'completed',
          'created_at': { 
            $gte: startDate.toISOString(),
            $lte: endDate.toISOString()
          }
        },
        sortBy: 'created_at',
        sortOrder: 'desc',
        size: 1000
      });

      return traces || [];
    } catch (error) {
      console.error('Failed to load traces for optimization:', error);
      return [];
    }
  }

  private async generateOptimizationRules(traces: any[]): Promise<OptimizationRule[]> {
    const rules: OptimizationRule[] = [];

    if (traces.length === 0) {
      return this.getDefaultOptimizationRules();
    }

    // Analyze successful patterns
    const successfulTraces = traces.filter(t => 
      t.feedback?.some((f: any) => 
        (f.name.includes('quality') || f.name.includes('satisfaction')) && f.value > 0.8
      )
    );

    if (successfulTraces.length > 10) {
      // Generate context optimization rules
      rules.push(...this.generateContextOptimizationRules(successfulTraces));
      
      // Generate token optimization rules
      rules.push(...this.generateTokenOptimizationRules(successfulTraces));
      
      // Generate response time optimization rules
      rules.push(...this.generateResponseTimeOptimizationRules(successfulTraces));
      
      // Generate quality optimization rules
      rules.push(...this.generateQualityOptimizationRules(successfulTraces));
    }

    // Add default rules as fallback
    rules.push(...this.getDefaultOptimizationRules());

    return rules.sort((a, b) => b.priority - a.priority);
  }

  private generateContextOptimizationRules(traces: any[]): OptimizationRule[] {
    const rules: OptimizationRule[] = [];

    // Analyze context patterns in successful traces
    const suggestionTraces = traces.filter(t => t.metadata?.feature === 'suggestions');
    
    if (suggestionTraces.length > 5) {
      // Rule: Optimize context size for suggestions
      rules.push({
        name: 'optimize-suggestion-context',
        type: 'context',
        priority: 8,
        confidence: 0.8,
        applies: (requestType, context) => requestType === 'suggestion' && context.codeContext,
        apply: (context) => {
          // Limit context to most relevant lines
          if (context.codeContext && context.codeContext.surroundingCode) {
            const lines = context.codeContext.surroundingCode.split('\n');
            if (lines.length > 50) {
              // Keep only 25 lines before and after cursor
              const cursorLine = context.codeContext.position?.line || Math.floor(lines.length / 2);
              const start = Math.max(0, cursorLine - 25);
              const end = Math.min(lines.length, cursorLine + 25);
              
              context.codeContext.surroundingCode = lines.slice(start, end).join('\n');
            }
          }
          return context;
        }
      });
    }

    return rules;
  }

  private generateTokenOptimizationRules(traces: any[]): OptimizationRule[] {
    const rules: OptimizationRule[] = [];

    // Rule: Compress verbose prompts
    rules.push({
      name: 'compress-verbose-prompts',
      type: 'token',
      priority: 6,
      confidence: 0.7,
      applies: (requestType, context) => true,
      apply: (context) => {
        // Remove redundant whitespace and optimize prompt structure
        if (context.prompt) {
          context.prompt = context.prompt
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
        }
        return context;
      }
    });

    return rules;
  }

  private generateResponseTimeOptimizationRules(traces: any[]): OptimizationRule[] {
    const rules: OptimizationRule[] = [];

    // Analyze response time patterns
    const fastTraces = traces.filter(t => (t.duration || 0) < 500);
    
    if (fastTraces.length > traces.length * 0.3) {
      // Rule: Use faster model for simple requests
      rules.push({
        name: 'use-fast-model-for-simple-requests',
        type: 'response-time',
        priority: 7,
        confidence: 0.75,
        applies: (requestType, context) => {
          return requestType === 'suggestion' && 
                 (!context.codeContext?.surroundingCode || 
                  context.codeContext.surroundingCode.length < 1000);
        },
        apply: (context) => {
          context.modelPreference = 'fast';
          return context;
        }
      });
    }

    return rules;
  }

  private generateQualityOptimizationRules(traces: any[]): OptimizationRule[] {
    const rules: OptimizationRule[] = [];

    // Rule: Add context for better quality
    rules.push({
      name: 'enhance-context-for-quality',
      type: 'quality',
      priority: 9,
      confidence: 0.85,
      applies: (requestType, context) => {
        return requestType === 'quick-edit' && 
               context.codeContext && 
               !context.codeContext.fullCode;
      },
      apply: (context) => {
        // Suggest including more context for better edits
        context.needsMoreContext = true;
        return context;
      }
    });

    return rules;
  }

  private getDefaultOptimizationRules(): OptimizationRule[] {
    return [
      {
        name: 'cache-repeated-requests',
        type: 'response-time',
        priority: 5,
        confidence: 0.9,
        applies: (requestType, context) => true,
        apply: (context) => {
          context.enableCaching = true;
          return context;
        }
      },
      {
        name: 'limit-conversation-history',
        type: 'token',
        priority: 4,
        confidence: 0.8,
        applies: (requestType, context) => {
          return requestType === 'chat' && 
                 context.conversationHistory && 
                 context.conversationHistory.length > 20;
        },
        apply: (context) => {
          // Keep only last 15 messages
          if (context.conversationHistory) {
            context.conversationHistory = context.conversationHistory.slice(-15);
          }
          return context;
        }
      },
      {
        name: 'optimize-file-size-context',
        type: 'context',
        priority: 6,
        confidence: 0.75,
        applies: (requestType, context) => {
          return context.codeContext && 
                 context.codeContext.fileSize > 10000;
        },
        apply: (context) => {
          // For large files, focus on immediate context
          context.focusOnLocalContext = true;
          return context;
        }
      }
    ];
  }

  private async getApplicableRules(context: OptimizationContext): Promise<OptimizationRule[]> {
    const cacheKey = `${context.requestType}-${context.userId}`;
    
    // Check cache first
    if (this.ruleCache.has(cacheKey)) {
      const cachedRules = this.ruleCache.get(cacheKey)!;
      return cachedRules.filter(rule => rule.applies(context.requestType, context));
    }

    // Filter applicable rules
    const applicableRules = this.optimizationRules.filter(rule => 
      rule.applies(context.requestType, context)
    );

    // Cache for future use
    this.ruleCache.set(cacheKey, applicableRules);

    return applicableRules;
  }

  private hasSignificantChanges(before: any, after: any): boolean {
    // Simple check for significant changes
    const beforeStr = JSON.stringify(before);
    const afterStr = JSON.stringify(after);
    
    return beforeStr !== afterStr;
  }
}