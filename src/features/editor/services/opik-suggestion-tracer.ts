import { safeOpikClient } from '@/lib/opik-client-safe';

export interface CodeContext {
  fileType: string;
  language: string;
  position: {
    line: number;
    column: number;
  };
  surroundingCode: string;
  fileName: string;
  fileSize: number;
  textBeforeCursor: string;
  textAfterCursor: string;
  currentLine: string;
  previousLines?: string;
  nextLines?: string;
}

export interface SuggestionResult {
  suggestion: string;
  confidence?: number;
  processingTime?: number;
}

export class SuggestionTracer {
  async traceSuggestion(context: CodeContext, userId: string) {
    try {
      const trace = opikClient.trace({
        name: 'code-suggestion',
        input: {
          fileType: context.fileType,
          cursorPosition: context.position,
          codeContext: {
            fileName: context.fileName,
            currentLine: context.currentLine,
            textBeforeCursor: context.textBeforeCursor,
            textAfterCursor: context.textAfterCursor
          }
        },
        metadata: {
          feature: 'suggestions',
          language: context.language,
          fileSize: context.fileSize,
          fileName: context.fileName,
          userId,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        trace,
        
        // Track suggestion generation
        trackGeneration: (model: string, prompt: string) => {
          const generationSpan = trace.span({
            name: 'suggestion-generation',
            input: { 
              model,
              promptLength: prompt.length,
              contextSize: context.surroundingCode.length
            }
          });
          return generationSpan;
        },
        
        // Track user interaction with suggestion
        trackInteraction: (suggestionLength: number) => {
          const interactionSpan = trace.span({
            name: 'user-interaction',
            input: { 
              suggestionLength,
              hasContent: suggestionLength > 0
            }
          });
          return interactionSpan;
        },
        
        // Complete the trace with results
        complete: (result: SuggestionResult, error?: Error) => {
          if (error) {
            trace.update({ 
              output: { error: error.message },
              metadata: { 
                ...trace.metadata, 
                error: true,
                errorType: error.constructor.name
              }
            });
          } else {
            trace.update({ 
              output: {
                suggestion: result.suggestion,
                suggestionLength: result.suggestion.length,
                confidence: result.confidence,
                processingTime: result.processingTime,
                hasSuggestion: result.suggestion.length > 0
              }
            });
          }
          return trace.id;
        }
      };
    } catch (error) {
      console.error('Failed to create suggestion trace:', error);
      return this.createNoOpTracer();
    }
  }
  
  async recordSuggestionOutcome(
    traceId: string, 
    outcome: 'accepted' | 'rejected' | 'modified',
    modificationDetails?: {
      originalLength: number;
      finalLength: number;
      charactersChanged: number;
    }
  ) {
    try {
      const feedbackValue = outcome === 'accepted' ? 1.0 : 
                           outcome === 'modified' ? 0.7 : 0.0;
      
      const feedback = [{
        name: 'suggestion_quality',
        value: feedbackValue,
        reason: `User ${outcome} the suggestion`
      }];
      
      if (modificationDetails) {
        feedback.push({
          name: 'modification_ratio',
          value: 1 - (modificationDetails.charactersChanged / modificationDetails.originalLength),
          reason: `User modified ${modificationDetails.charactersChanged} characters out of ${modificationDetails.originalLength}`
        });
      }
      
      await opikClient.addTraceFeedback(traceId, feedback);
    } catch (error) {
      console.error('Failed to record suggestion feedback:', error);
    }
  }
  
  async recordSuggestionTiming(traceId: string, timings: {
    generationTime: number;
    displayTime: number;
    userDecisionTime: number;
  }) {
    try {
      await opikClient.addTraceFeedback(traceId, [
        {
          name: 'generation_speed',
          value: Math.max(0, 1 - (timings.generationTime / 2000)), // Normalize to 0-1, 2s = 0
          reason: `Generation took ${timings.generationTime}ms`
        },
        {
          name: 'user_decision_speed',
          value: Math.max(0, 1 - (timings.userDecisionTime / 10000)), // Normalize to 0-1, 10s = 0
          reason: `User decided in ${timings.userDecisionTime}ms`
        }
      ]);
    } catch (error) {
      console.error('Failed to record suggestion timing:', error);
    }
  }
  
  private createNoOpTracer() {
    const noOp = () => ({ update: () => {}, end: () => {} });
    return {
      trace: { id: 'noop', update: () => {}, metadata: {} },
      trackGeneration: noOp,
      trackInteraction: noOp,
      complete: () => 'noop'
    };
  }
}