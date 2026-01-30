import { opikClient, OPIK_PROJECT_NAME } from '@/lib/opik-client';

export interface ChatContext {
  conversationId: string;
  userId: string;
  projectId: string;
  message: string;
  messageId?: string;
}

export interface ConversationHistory {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export class ChatTracer {
  async traceConversation(context: ChatContext) {
    try {
      const trace = opikClient.trace({
        name: 'ai-chat-conversation',
        input: { 
          message: context.message, 
          conversationId: context.conversationId 
        },
        metadata: {
          feature: 'chat',
          userId: context.userId,
          projectId: context.projectId,
          messageId: context.messageId,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        trace,
        
        // Track conversation context preparation
        trackContextPreparation: (conversationHistory: ConversationHistory[]) => {
          const contextSpan = trace.span({
            name: 'context-preparation',
            input: { 
              conversationHistory,
              historyLength: conversationHistory.length
            }
          });
          return contextSpan;
        },
        
        // Track AI processing
        trackAIProcessing: (model: string, temperature?: number) => {
          const aiSpan = trace.span({
            name: 'ai-processing',
            input: { 
              model, 
              temperature: temperature || 0.3 
            }
          });
          return aiSpan;
        },
        
        // Track tool execution
        trackToolExecution: (availableTools: string[]) => {
          const toolSpan = trace.span({
            name: 'tool-execution',
            input: { 
              availableTools,
              toolCount: availableTools.length
            }
          });
          return toolSpan;
        },
        
        // Complete the trace with results
        complete: (output: any, error?: Error) => {
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
            trace.update({ output });
          }
        }
      };
    } catch (error) {
      console.error('Failed to create chat trace:', error);
      // Return a no-op tracer if Opik fails
      return this.createNoOpTracer();
    }
  }
  
  async recordConversationOutcome(
    traceId: string, 
    outcome: 'helpful' | 'not_helpful' | 'partially_helpful',
    userFeedback?: string
  ) {
    try {
      const feedbackValue = outcome === 'helpful' ? 1.0 : 
                           outcome === 'partially_helpful' ? 0.5 : 0.0;
      
      await opikClient.addTraceFeedback(traceId, [{
        name: 'conversation_quality',
        value: feedbackValue,
        reason: userFeedback || `User marked as ${outcome}`
      }]);
    } catch (error) {
      console.error('Failed to record conversation feedback:', error);
    }
  }
  
  private createNoOpTracer() {
    const noOp = () => ({ update: () => {}, end: () => {} });
    return {
      trace: { update: () => {}, metadata: {} },
      trackContextPreparation: noOp,
      trackAIProcessing: noOp,
      trackToolExecution: noOp,
      complete: () => {}
    };
  }
}