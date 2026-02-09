
import {
  getCurrentUserId,
  getCurrentSessionId,
  OpikTrace,
  OpikSpan,
  safeOpikClient
} from '@/lib/opik-client-safe';

export interface AIOperationContext {
  operationType: 'chat' | 'suggestion' | 'quick-edit' | 'code-analysis' | 'completion';
  userId?: string;
  sessionId?: string;
  projectId?: string;
  fileId?: string;
  fileName?: string;
  language?: string;
  model?: string;
  prompt?: string;
  context?: any;
}

export interface AIOperationResult {
  success: boolean;
  output?: any;
  error?: string;
  duration?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  qualityScore?: number;
}

export interface TraceMetadata {
  traceId: string;
  spanId?: string;
  startTime: number;
  context: AIOperationContext;
}

export class OpikAITracer {
  private activeTraces: Map<string, TraceMetadata> = new Map();
  private operationMetrics: Map<string, any> = new Map();

  // Start tracing an AI operation
  async startTrace(context: AIOperationContext): Promise<string | null> {
    try {
      const traceId = `ai_${context.operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Safe for both client and server
      let userId = context.userId || 'anonymous';
      let sessionId = context.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Only call client-side functions if we're in the browser
      if (typeof window !== 'undefined') {
        try {
          userId = getCurrentUserId() || userId;
          sessionId = getCurrentSessionId() || sessionId;
        } catch (e) {
          // Ignore errors from client-side functions
        }
      }


      const trace = await safeOpikClient.createTrace({
        name: `ai-${context.operationType}`,
        input: {
          operationType: context.operationType,
          prompt: context.prompt,
          context: context.context,
          model: context.model,
          language: context.language,
          fileName: context.fileName
        },
        metadata: {
          feature: 'ai-operation',
          operationType: context.operationType,
          userId,
          sessionId,
          projectId: context.projectId,
          fileId: context.fileId,
          fileName: context.fileName,
          language: context.language,
          model: context.model,
          startTime: new Date().toISOString()
        },
        tags: ['ai', context.operationType, context.language || 'unknown'],
        userId,
        sessionId
      });

      if (trace) {
        this.activeTraces.set(traceId, {
          traceId: trace.id,
          startTime: Date.now(),
          context
        });

        // Initialize operation metrics
        this.operationMetrics.set(traceId, {
          startTime: Date.now(),
          operationType: context.operationType,
          model: context.model
        });

        return traceId;
      }

      return null;
    } catch (error) {
      console.error('Failed to start AI trace:', error);
      return null;
    }
  }

  // End tracing with results
  async endTrace(traceId: string, result: AIOperationResult): Promise<void> {
    try {
      const traceMetadata = this.activeTraces.get(traceId);
      if (!traceMetadata) {
        console.warn('No active trace found for ID:', traceId);
        return;
      }

      const duration = Date.now() - traceMetadata.startTime;
      const opikTraceId = traceMetadata.traceId;

      // Create completion span
      await safeOpikClient.createSpan({
        traceId: opikTraceId,
        name: `${traceMetadata.context.operationType}-completion`,
        type: 'llm',
        input: {
          model: traceMetadata.context.model,
          prompt: traceMetadata.context.prompt
        },
        output: {
          success: result.success,
          output: result.output,
          error: result.error,
          qualityScore: result.qualityScore
        },
        metadata: {
          duration,
          tokenUsage: result.tokenUsage,
          cost: result.cost,
          model: traceMetadata.context.model,
          operationType: traceMetadata.context.operationType,
          endTime: new Date().toISOString()
        },
        tags: ['completion', result.success ? 'success' : 'error']
      });

      // Update operation metrics
      const metrics = this.operationMetrics.get(traceId);
      if (metrics) {
        metrics.endTime = Date.now();
        metrics.duration = duration;
        metrics.success = result.success;
        metrics.tokenUsage = result.tokenUsage;
        metrics.cost = result.cost;
        metrics.qualityScore = result.qualityScore;
      }

      // Clean up
      this.activeTraces.delete(traceId);

      console.log(`AI operation trace completed: ${traceMetadata.context.operationType} (${duration}ms)`);
    } catch (error) {
      console.error('Failed to end AI trace:', error);
    }
  }

  // Add span for intermediate steps
  async addSpan(traceId: string, spanData: {
    name: string;
    type: 'llm' | 'tool' | 'general';
    input?: any;
    output?: any;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<string | null> {
    try {
      const traceMetadata = this.activeTraces.get(traceId);
      if (!traceMetadata) {
        console.warn('No active trace found for span:', traceId);
        return null;
      }

      const span = await safeOpikClient.createSpan({
        traceId: traceMetadata.traceId,
        name: spanData.name,
        type: spanData.type,
        input: spanData.input,
        output: spanData.output,
        metadata: {
          ...spanData.metadata,
          timestamp: new Date().toISOString(),
          operationType: traceMetadata.context.operationType
        },
        tags: spanData.tags || []
      });

      return span?.id || null;
    } catch (error) {
      console.error('Failed to add span:', error);
      return null;
    }
  }

  // Add feedback to a completed trace
  async addFeedback(traceId: string, feedback: {
    name: string;
    value: number;
    reason?: string;
  }): Promise<boolean> {
    try {
      const traceMetadata = this.activeTraces.get(traceId);
      const opikTraceId = traceMetadata?.traceId || traceId;

      return await safeOpikClient.addFeedback({
        traceId: opikTraceId,
        name: feedback.name,
        value: feedback.value,
        reason: feedback.reason,
        userId: typeof window !== 'undefined' ? getCurrentUserId() : undefined
      });
    } catch (error) {
      console.error('Failed to add feedback:', error);
      return false;
    }
  }

  // Get current operation metrics
  getOperationMetrics(traceId: string) {
    return this.operationMetrics.get(traceId);
  }

  // Get all active traces
  getActiveTraces(): string[] {
    return Array.from(this.activeTraces.keys());
  }

  // Cancel a trace (for errors or interruptions)
  cancelTrace(traceId: string, reason: string = 'Cancelled'): void {
    const traceMetadata = this.activeTraces.get(traceId);
    if (traceMetadata) {
      this.endTrace(traceId, {
        success: false,
        error: reason,
        duration: Date.now() - traceMetadata.startTime
      });
    }
  }

  // Batch operations for high-frequency events
  async batchAddSpan(traceId: string, spanData: Parameters<typeof this.addSpan>[1]): Promise<void> {
    const traceMetadata = this.activeTraces.get(traceId);
    if (!traceMetadata) return;

    await safeOpikClient.createSpan({
      traceId: traceMetadata.traceId,
      name: spanData.name,
      type: spanData.type,
      input: spanData.input,
      output: spanData.output,
      metadata: {
        ...spanData.metadata,
        timestamp: new Date().toISOString(),
        operationType: traceMetadata.context.operationType
      },
      tags: spanData.tags || []
    });
  }
}

// Specialized tracers for different AI operations
export class ChatTracer extends OpikAITracer {
  async startChatTrace(context: {
    userId?: string;
    sessionId?: string;
    conversationId?: string;
    model: string;
    messages: any[];
    systemPrompt?: string;
  }) {
    return this.startTrace({
      operationType: 'chat',
      userId: context.userId,
      sessionId: context.sessionId,
      model: context.model,
      prompt: JSON.stringify(context.messages),
      context: {
        conversationId: context.conversationId,
        messageCount: context.messages.length,
        systemPrompt: context.systemPrompt
      }
    });
  }

  async addChatMessage(traceId: string, message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
    tokenCount?: number;
  }) {
    return this.addSpan(traceId, {
      name: `chat-message-${message.role}`,
      type: 'llm',
      input: { role: message.role, content: message.content },
      output: { tokenCount: message.tokenCount },
      metadata: {
        messageRole: message.role,
        timestamp: message.timestamp || Date.now(),
        contentLength: message.content.length
      },
      tags: ['chat', 'message', message.role]
    });
  }
}

export class SuggestionTracer extends OpikAITracer {
  async startSuggestionTrace(context: {
    userId?: string;
    sessionId?: string;
    fileId?: string;
    fileName?: string;
    language?: string;
    model: string;
    codeContext: string;
    cursorPosition: number;
    triggerType: 'manual' | 'auto' | 'completion';
  }) {
    return this.startTrace({
      operationType: 'suggestion',
      userId: context.userId,
      sessionId: context.sessionId,
      fileId: context.fileId,
      fileName: context.fileName,
      language: context.language,
      model: context.model,
      prompt: context.codeContext,
      context: {
        cursorPosition: context.cursorPosition,
        triggerType: context.triggerType,
        contextLength: context.codeContext.length
      }
    });
  }

  async addSuggestionGenerated(traceId: string, suggestions: {
    suggestions: string[];
    confidence: number[];
    processingTime: number;
  }) {
    return this.addSpan(traceId, {
      name: 'suggestion-generation',
      type: 'llm',
      input: { requestedCount: suggestions.suggestions.length },
      output: {
        suggestions: suggestions.suggestions,
        confidence: suggestions.confidence,
        averageConfidence: suggestions.confidence.reduce((a, b) => a + b, 0) / suggestions.confidence.length
      },
      metadata: {
        processingTime: suggestions.processingTime,
        suggestionCount: suggestions.suggestions.length,
        maxConfidence: Math.max(...suggestions.confidence),
        minConfidence: Math.min(...suggestions.confidence)
      },
      tags: ['suggestion', 'generation', 'llm-output']
    });
  }

  async addSuggestionAccepted(traceId: string, acceptedIndex: number, suggestion: string) {
    return this.addSpan(traceId, {
      name: 'suggestion-accepted',
      type: 'general',
      input: { acceptedIndex, suggestion },
      output: { userAction: 'accepted' },
      metadata: {
        acceptedIndex,
        suggestionLength: suggestion.length,
        timestamp: Date.now()
      },
      tags: ['suggestion', 'accepted', 'user-action']
    });
  }

  async addSuggestionRejected(traceId: string, rejectedIndices: number[], reason?: string) {
    return this.addSpan(traceId, {
      name: 'suggestion-rejected',
      type: 'general',
      input: { rejectedIndices, reason },
      output: { userAction: 'rejected' },
      metadata: {
        rejectedCount: rejectedIndices.length,
        rejectionReason: reason,
        timestamp: Date.now()
      },
      tags: ['suggestion', 'rejected', 'user-action']
    });
  }
}

export class QuickEditTracer extends OpikAITracer {
  async startQuickEditTrace(context: {
    userId?: string;
    sessionId?: string;
    fileId?: string;
    fileName?: string;
    language?: string;
    model: string;
    editInstruction: string;
    codeSelection: string;
    editType: 'refactor' | 'fix' | 'optimize' | 'explain' | 'generate';
  }) {
    return this.startTrace({
      operationType: 'quick-edit',
      userId: context.userId,
      sessionId: context.sessionId,
      fileId: context.fileId,
      fileName: context.fileName,
      language: context.language,
      model: context.model,
      prompt: context.editInstruction,
      context: {
        codeSelection: context.codeSelection,
        editType: context.editType,
        selectionLength: context.codeSelection.length,
        instructionLength: context.editInstruction.length
      }
    });
  }

  async addEditGenerated(traceId: string, edit: {
    originalCode: string;
    editedCode: string;
    explanation?: string;
    confidence: number;
    processingTime: number;
  }) {
    return this.addSpan(traceId, {
      name: 'edit-generation',
      type: 'llm',
      input: {
        originalCode: edit.originalCode,
        originalLength: edit.originalCode.length
      },
      output: {
        editedCode: edit.editedCode,
        explanation: edit.explanation,
        confidence: edit.confidence,
        editedLength: edit.editedCode.length
      },
      metadata: {
        processingTime: edit.processingTime,
        lengthDelta: edit.editedCode.length - edit.originalCode.length,
        hasExplanation: !!edit.explanation,
        confidence: edit.confidence
      },
      tags: ['quick-edit', 'generation', 'code-transformation']
    });
  }

  async addEditApplied(traceId: string, applied: {
    success: boolean;
    appliedCode: string;
    userModifications?: string;
    applicationTime: number;
  }) {
    return this.addSpan(traceId, {
      name: 'edit-application',
      type: 'general',
      input: { appliedCode: applied.appliedCode },
      output: {
        success: applied.success,
        userModifications: applied.userModifications,
        finalCode: applied.appliedCode
      },
      metadata: {
        applicationTime: applied.applicationTime,
        hasUserModifications: !!applied.userModifications,
        success: applied.success
      },
      tags: ['quick-edit', 'application', applied.success ? 'success' : 'failure']
    });
  }
}

// Global instances
export const aiTracer = new OpikAITracer();
export const chatTracer = new ChatTracer();
export const suggestionTracer = new SuggestionTracer();
export const quickEditTracer = new QuickEditTracer();