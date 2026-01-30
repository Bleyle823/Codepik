import { opikClient } from '@/lib/opik-client';

export interface QuickEditContext {
  selectedCode: string;
  fullCode: string;
  instruction: string;
  fileName?: string;
  language?: string;
  userId: string;
}

export interface EditResult {
  editedCode: string;
  processingTime?: number;
  hasDocumentation?: boolean;
  urlsProcessed?: number;
}

export class QuickEditTracer {
  async traceQuickEdit(context: QuickEditContext) {
    try {
      const trace = opikClient.trace({
        name: 'quick-edit',
        input: {
          selectedCodeLength: context.selectedCode.length,
          instruction: context.instruction,
          fileName: context.fileName,
          hasFullContext: !!context.fullCode
        },
        metadata: {
          feature: 'quick-edit',
          language: context.language,
          fileName: context.fileName,
          userId: context.userId,
          selectedCodeLength: context.selectedCode.length,
          fullCodeLength: context.fullCode?.length || 0,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        trace,
        
        // Track documentation processing
        trackDocumentationProcessing: (urls: string[]) => {
          const docSpan = trace.span({
            name: 'documentation-processing',
            input: { 
              urls,
              urlCount: urls.length
            }
          });
          return docSpan;
        },
        
        // Track code analysis
        trackCodeAnalysis: (analysisType: string) => {
          const analysisSpan = trace.span({
            name: 'code-analysis',
            input: { 
              analysisType,
              codeLength: context.selectedCode.length
            }
          });
          return analysisSpan;
        },
        
        // Track AI processing
        trackAIProcessing: (model: string, prompt: string) => {
          const aiSpan = trace.span({
            name: 'ai-processing',
            input: { 
              model,
              promptLength: prompt.length,
              hasDocumentation: prompt.includes('<documentation>')
            }
          });
          return aiSpan;
        },
        
        // Complete the trace with results
        complete: (result: EditResult, error?: Error) => {
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
            const changeRatio = this.calculateChangeRatio(
              context.selectedCode, 
              result.editedCode
            );
            
            trace.update({ 
              output: {
                editedCodeLength: result.editedCode.length,
                changeRatio,
                processingTime: result.processingTime,
                hasDocumentation: result.hasDocumentation,
                urlsProcessed: result.urlsProcessed,
                significantChange: changeRatio > 0.1
              }
            });
          }
          return trace.id;
        }
      };
    } catch (error) {
      console.error('Failed to create quick edit trace:', error);
      return this.createNoOpTracer();
    }
  }
  
  async recordEditOutcome(
    traceId: string, 
    outcome: 'accepted' | 'rejected' | 'modified',
    qualityMetrics?: {
      syntaxCorrect: boolean;
      followsInstruction: boolean;
      maintainsStyle: boolean;
      userSatisfaction: number; // 0-1
    }
  ) {
    try {
      const feedbackValue = outcome === 'accepted' ? 1.0 : 
                           outcome === 'modified' ? 0.6 : 0.0;
      
      const feedback = [{
        name: 'edit_quality',
        value: feedbackValue,
        reason: `User ${outcome} the edit`
      }];
      
      if (qualityMetrics) {
        feedback.push(
          {
            name: 'syntax_correctness',
            value: qualityMetrics.syntaxCorrect ? 1.0 : 0.0,
            reason: `Syntax is ${qualityMetrics.syntaxCorrect ? 'correct' : 'incorrect'}`
          },
          {
            name: 'instruction_adherence',
            value: qualityMetrics.followsInstruction ? 1.0 : 0.0,
            reason: `Edit ${qualityMetrics.followsInstruction ? 'follows' : 'does not follow'} instruction`
          },
          {
            name: 'style_consistency',
            value: qualityMetrics.maintainsStyle ? 1.0 : 0.0,
            reason: `Style is ${qualityMetrics.maintainsStyle ? 'consistent' : 'inconsistent'}`
          },
          {
            name: 'user_satisfaction',
            value: qualityMetrics.userSatisfaction,
            reason: `User satisfaction: ${Math.round(qualityMetrics.userSatisfaction * 100)}%`
          }
        );
      }
      
      await opikClient.addTraceFeedback(traceId, feedback);
    } catch (error) {
      console.error('Failed to record edit feedback:', error);
    }
  }
  
  private calculateChangeRatio(original: string, edited: string): number {
    if (original.length === 0) return edited.length > 0 ? 1.0 : 0.0;
    
    // Simple character-level difference ratio
    let changes = 0;
    const maxLength = Math.max(original.length, edited.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (original[i] !== edited[i]) {
        changes++;
      }
    }
    
    return changes / maxLength;
  }
  
  private createNoOpTracer() {
    const noOp = () => ({ update: () => {}, end: () => {} });
    return {
      trace: { id: 'noop', update: () => {}, metadata: {} },
      trackDocumentationProcessing: noOp,
      trackCodeAnalysis: noOp,
      trackAIProcessing: noOp,
      complete: () => 'noop'
    };
  }
}