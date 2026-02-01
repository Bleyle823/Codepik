import { 
  getCurrentUserId, 
  getCurrentSessionId,
  OpikTrace,
  OpikSpan,
  safeOpikClient
} from '@/lib/opik-client-safe';
import { suggestionTracer, quickEditTracer } from '../../ai/services/opik-ai-tracer';

export interface EditorSession {
  sessionId: string;
  userId: string;
  projectId: string;
  startTime: number;
  fileId?: string;
  fileName?: string;
}

export interface EditorMetrics {
  keystrokes: number;
  linesAdded: number;
  linesDeleted: number;
  charactersTyped: number;
  suggestionsRequested: number;
  suggestionsAccepted: number;
  quickEditsPerformed: number;
  timeSpentCoding: number; // in milliseconds
}

export class EditorOpikIntegration {
  private currentSession: EditorSession | null = null;
  private sessionMetrics: EditorMetrics = this.getEmptyMetrics();
  private suggestionTracer = suggestionTracer;
  private quickEditTracer = quickEditTracer;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;
  private currentTrace: OpikTrace | null = null;
  private keystrokeBuffer: Array<{ key: string; timestamp: number; lineNumber?: number }> = [];
  private lastKeystrokeFlush = Date.now();

  async startSession(sessionData: Omit<EditorSession, 'sessionId' | 'startTime'>) {
    try {
      const sessionId = getCurrentSessionId();
      const userId = getCurrentUserId() || sessionData.userId;
      
      this.currentSession = {
        ...sessionData,
        userId,
        sessionId,
        startTime: Date.now()
      };

      this.sessionMetrics = this.getEmptyMetrics();

      // Create main session trace
      this.currentTrace = await safeOpikClient.createTrace({
        name: 'editor-session',
        input: {
          sessionId,
          fileName: sessionData.fileName,
          fileId: sessionData.fileId,
          projectId: sessionData.projectId
        },
        metadata: {
          feature: 'editor-session',
          userId,
          projectId: sessionData.projectId,
          sessionStart: new Date().toISOString(),
          fileType: this.getFileType(sessionData.fileName),
          editorVersion: '1.0.0'
        },
        tags: ['editor', 'session', 'coding'],
        userId,
        sessionId
      });

      // Start periodic metrics reporting
      this.startMetricsReporting();

      console.log('Opik editor session started:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('Failed to start Opik editor session:', error);
      return null;
    }
  }

  async endSession() {
    if (!this.currentSession || !this.currentTrace) return;

    try {
      const sessionDuration = Date.now() - this.currentSession.startTime;
      
      // Flush any pending keystrokes
      await this.flushKeystrokeBuffer();
      
      // Final metrics report
      await this.reportSessionMetrics(true);

      // Update main trace with final output
      if (this.currentTrace) {
        await safeOpikClient.createSpan({
          traceId: this.currentTrace.id,
          name: 'session-summary',
          type: 'general',
          input: {
            sessionId: this.currentSession.sessionId,
            duration: sessionDuration
          },
          output: {
            metrics: this.sessionMetrics,
            productivity: this.calculateProductivityScore(),
            efficiency: this.calculateEfficiencyScore(),
            insights: this.generateSessionInsights()
          },
          metadata: {
            feature: 'editor-session-summary',
            userId: this.currentSession.userId,
            projectId: this.currentSession.projectId,
            sessionEnd: new Date().toISOString(),
            totalDuration: sessionDuration
          },
          tags: ['session-end', 'summary', 'metrics']
        });
      }

      // Stop metrics reporting
      if (this.metricsUpdateInterval) {
        clearInterval(this.metricsUpdateInterval);
        this.metricsUpdateInterval = null;
      }

      // Note: Batch flushing handled by safe client

      console.log('Opik editor session ended:', this.currentSession.sessionId);
      this.currentSession = null;
      this.currentTrace = null;
      this.sessionMetrics = this.getEmptyMetrics();
      this.keystrokeBuffer = [];
    } catch (error) {
      console.error('Failed to end Opik editor session:', error);
    }
  }

  // Track user typing activity with enhanced tracing
  trackKeystroke(key: string, lineNumber?: number) {
    if (!this.currentSession || !this.currentTrace) return;

    this.sessionMetrics.keystrokes++;
    this.sessionMetrics.charactersTyped++;

    // Track specific actions
    if (key === 'Enter') {
      this.sessionMetrics.linesAdded++;
    } else if (key === 'Backspace' || key === 'Delete') {
      // This is a simple approximation
      this.sessionMetrics.charactersTyped--;
    }

    // Buffer keystrokes for batch processing
    this.keystrokeBuffer.push({
      key,
      timestamp: Date.now(),
      lineNumber
    });

    // Flush buffer every 10 keystrokes or 5 seconds
    if (this.keystrokeBuffer.length >= 10 || 
        Date.now() - this.lastKeystrokeFlush > 5000) {
      this.flushKeystrokeBuffer();
    }
  }

  private async flushKeystrokeBuffer() {
    if (this.keystrokeBuffer.length === 0 || !this.currentTrace) return;

    try {
      const keystrokes = [...this.keystrokeBuffer];
      this.keystrokeBuffer = [];
      this.lastKeystrokeFlush = Date.now();

      // Create keystroke span - using safe client
      await safeOpikClient.createSpan({
        traceId: this.currentTrace.id,
        name: 'keystroke-batch',
        type: 'general',
        input: {
          keystrokeCount: keystrokes.length,
          timeRange: {
            start: keystrokes[0]?.timestamp,
            end: keystrokes[keystrokes.length - 1]?.timestamp
          }
        },
        output: {
          keystrokes: keystrokes.map(k => ({
            key: k.key,
            timestamp: k.timestamp,
            lineNumber: k.lineNumber
          })),
          patterns: this.analyzeKeystrokePatterns(keystrokes)
        },
        metadata: {
          feature: 'keystroke-tracking',
          userId: this.currentSession?.userId,
          sessionId: this.currentSession?.sessionId,
          batchSize: keystrokes.length
        },
        tags: ['keystrokes', 'typing', 'activity']
      });
    } catch (error) {
      console.error('Failed to flush keystroke buffer:', error);
    }
  }

  private analyzeKeystrokePatterns(keystrokes: Array<{ key: string; timestamp: number; lineNumber?: number }>) {
    if (keystrokes.length < 2) return {};

    const intervals = [];
    for (let i = 1; i < keystrokes.length; i++) {
      intervals.push(keystrokes[i].timestamp - keystrokes[i - 1].timestamp);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const wpm = intervals.length > 0 ? Math.round(60000 / (avgInterval * 5)) : 0; // Approximate WPM

    return {
      averageInterval: avgInterval,
      wordsPerMinute: wpm,
      burstTyping: intervals.filter(i => i < 100).length / intervals.length,
      pauseCount: intervals.filter(i => i > 2000).length,
      specialKeys: keystrokes.filter(k => ['Enter', 'Backspace', 'Delete', 'Tab'].includes(k.key)).length
    };
  }

  // Track code changes with enhanced analysis
  async trackCodeChange(oldContent: string, newContent: string, fileName?: string) {
    if (!this.currentSession || !this.currentTrace) return;

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    // Enhanced diff calculation
    const linesAdded = Math.max(0, newLines.length - oldLines.length);
    const linesRemoved = Math.max(0, oldLines.length - newLines.length);
    const charactersAdded = Math.max(0, newContent.length - oldContent.length);
    const charactersRemoved = Math.max(0, oldContent.length - newContent.length);

    this.sessionMetrics.linesAdded += linesAdded;
    this.sessionMetrics.linesDeleted += linesRemoved;

    // Create detailed code change span - using safe client
    await safeOpikClient.createSpan({
      traceId: this.currentTrace.id,
      name: 'code-change',
      type: 'general',
      input: {
        fileName: fileName || this.currentSession.fileName,
        oldContentLength: oldContent.length,
        newContentLength: newContent.length,
        oldLineCount: oldLines.length,
        newLineCount: newLines.length
      },
      output: {
        changes: {
          linesAdded,
          linesRemoved,
          charactersAdded,
          charactersRemoved,
          netChange: newContent.length - oldContent.length
        },
        analysis: this.analyzeCodeChange(oldContent, newContent),
        complexity: this.calculateChangeComplexity(oldContent, newContent)
      },
      metadata: {
        feature: 'code-change',
        userId: this.currentSession.userId,
        sessionId: this.currentSession.sessionId,
        fileType: this.getFileType(fileName),
        timestamp: new Date().toISOString()
      },
      tags: ['code-change', 'editing', 'diff']
    });
  }

  private analyzeCodeChange(oldContent: string, newContent: string) {
    // Simple analysis - in production, you might want more sophisticated diff algorithms
    const oldWords = oldContent.split(/\s+/).filter(w => w.length > 0);
    const newWords = newContent.split(/\s+/).filter(w => w.length > 0);
    
    return {
      wordCount: {
        old: oldWords.length,
        new: newWords.length,
        change: newWords.length - oldWords.length
      },
      hasImports: newContent.includes('import ') && !oldContent.includes('import '),
      hasExports: newContent.includes('export ') && !oldContent.includes('export '),
      hasFunctions: (newContent.match(/function\s+\w+/g) || []).length - (oldContent.match(/function\s+\w+/g) || []).length,
      hasClasses: (newContent.match(/class\s+\w+/g) || []).length - (oldContent.match(/class\s+\w+/g) || []).length,
      hasComments: (newContent.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length - (oldContent.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length
    };
  }

  private calculateChangeComplexity(oldContent: string, newContent: string): number {
    // Simple complexity score based on various factors
    const sizeDiff = Math.abs(newContent.length - oldContent.length);
    const lineDiff = Math.abs(newContent.split('\n').length - oldContent.split('\n').length);
    const wordDiff = Math.abs(newContent.split(/\s+/).length - oldContent.split(/\s+/).length);
    
    // Normalize to 0-100 scale
    return Math.min(100, (sizeDiff / 100) + (lineDiff * 2) + (wordDiff / 10));
  }

  private getFileType(fileName?: string): string {
    if (!fileName) return 'unknown';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript-react',
      'js': 'javascript',
      'jsx': 'javascript-react',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml'
    };
    return typeMap[ext || ''] || ext || 'unknown';
  }

  // Track suggestion interactions
  async trackSuggestionRequest(context: {
    fileId?: string;
    fileName?: string;
    language?: string;
    model: string;
    codeContext: string;
    cursorPosition: number;
    triggerType: 'manual' | 'auto' | 'completion';
  }) {
    if (!this.currentSession) return null;

    this.sessionMetrics.suggestionsRequested++;

    try {
      const traceId = await this.suggestionTracer.startSuggestionTrace({
        userId: this.currentSession.userId,
        sessionId: this.currentSession.sessionId,
        fileId: context.fileId || this.currentSession.fileId,
        fileName: context.fileName || this.currentSession.fileName,
        language: context.language,
        model: context.model,
        codeContext: context.codeContext,
        cursorPosition: context.cursorPosition,
        triggerType: context.triggerType
      });
      return traceId;
    } catch (error) {
      console.error('Failed to track suggestion request:', error);
      return null;
    }
  }

  async trackSuggestionGenerated(traceId: string, suggestions: {
    suggestions: string[];
    confidence: number[];
    processingTime: number;
  }) {
    if (!this.currentSession || !traceId) return;

    try {
      await this.suggestionTracer.addSuggestionGenerated(traceId, suggestions);
    } catch (error) {
      console.error('Failed to track suggestion generation:', error);
    }
  }

  async trackSuggestionAccepted(traceId: string, acceptedIndex: number, suggestion: string) {
    if (!this.currentSession) return;
    
    this.sessionMetrics.suggestionsAccepted++;

    if (traceId) {
      try {
        await this.suggestionTracer.addSuggestionAccepted(traceId, acceptedIndex, suggestion);
        await this.suggestionTracer.endTrace(traceId, {
          success: true,
          output: { accepted: true, suggestion },
          qualityScore: 0.9 // High score for accepted suggestions
        });
      } catch (error) {
        console.error('Failed to track suggestion acceptance:', error);
      }
    }
  }

  async trackSuggestionRejected(traceId: string, rejectedIndices: number[], reason?: string) {
    if (!this.currentSession) return;

    if (traceId) {
      try {
        await this.suggestionTracer.addSuggestionRejected(traceId, rejectedIndices, reason);
        await this.suggestionTracer.endTrace(traceId, {
          success: false,
          output: { rejected: true, reason },
          qualityScore: 0.3 // Lower score for rejected suggestions
        });
      } catch (error) {
        console.error('Failed to track suggestion rejection:', error);
      }
    }
  }

  // Track quick edit operations
  async trackQuickEdit(context: {
    fileId?: string;
    fileName?: string;
    language?: string;
    model: string;
    editInstruction: string;
    codeSelection: string;
    editType: 'refactor' | 'fix' | 'optimize' | 'explain' | 'generate';
  }) {
    if (!this.currentSession) return null;

    this.sessionMetrics.quickEditsPerformed++;

    try {
      const traceId = await this.quickEditTracer.startQuickEditTrace({
        userId: this.currentSession.userId,
        sessionId: this.currentSession.sessionId,
        fileId: context.fileId || this.currentSession.fileId,
        fileName: context.fileName || this.currentSession.fileName,
        language: context.language,
        model: context.model,
        editInstruction: context.editInstruction,
        codeSelection: context.codeSelection,
        editType: context.editType
      });
      return traceId;
    } catch (error) {
      console.error('Failed to track quick edit:', error);
      return null;
    }
  }

  async trackQuickEditGenerated(traceId: string, edit: {
    originalCode: string;
    editedCode: string;
    explanation?: string;
    confidence: number;
    processingTime: number;
  }) {
    if (!this.currentSession || !traceId) return;

    try {
      await this.quickEditTracer.addEditGenerated(traceId, edit);
    } catch (error) {
      console.error('Failed to track quick edit generation:', error);
    }
  }

  async trackQuickEditApplied(traceId: string, applied: {
    success: boolean;
    appliedCode: string;
    userModifications?: string;
    applicationTime: number;
  }) {
    if (!this.currentSession || !traceId) return;

    try {
      await this.quickEditTracer.addEditApplied(traceId, applied);
      await this.quickEditTracer.endTrace(traceId, {
        success: applied.success,
        output: { applied: applied.success, code: applied.appliedCode },
        qualityScore: applied.success ? 0.8 : 0.4
      });
    } catch (error) {
      console.error('Failed to track quick edit application:', error);
    }
  }

  // Get current session metrics
  getCurrentMetrics(): EditorMetrics & { sessionDuration?: number } {
    const metrics = { ...this.sessionMetrics };
    
    if (this.currentSession) {
      return {
        ...metrics,
        sessionDuration: Date.now() - this.currentSession.startTime
      };
    }
    
    return metrics;
  }

  // Get productivity insights
  getProductivityInsights() {
    if (!this.currentSession) return null;

    const sessionDuration = Date.now() - this.currentSession.startTime;
    const minutesActive = sessionDuration / (1000 * 60);

    return {
      sessionDuration: minutesActive,
      keystrokesPerMinute: minutesActive > 0 ? this.sessionMetrics.keystrokes / minutesActive : 0,
      linesPerMinute: minutesActive > 0 ? this.sessionMetrics.linesAdded / minutesActive : 0,
      suggestionAcceptanceRate: this.sessionMetrics.suggestionsRequested > 0 
        ? (this.sessionMetrics.suggestionsAccepted / this.sessionMetrics.suggestionsRequested) * 100 
        : 0,
      productivityScore: this.calculateProductivityScore(),
      efficiencyScore: this.calculateEfficiencyScore()
    };
  }

  private startMetricsReporting() {
    // Report metrics every 30 seconds
    this.metricsUpdateInterval = setInterval(() => {
      this.reportSessionMetrics(false);
    }, 30000);
  }

  private async reportSessionMetrics(isFinal: boolean = false) {
    if (!this.currentSession || !this.currentTrace) return;

    try {
      const sessionDuration = Date.now() - this.currentSession.startTime;
      const insights = this.getProductivityInsights();

      await safeOpikClient.createSpan({
        traceId: this.currentTrace.id,
        name: isFinal ? 'session-final-metrics' : 'session-metrics',
        type: 'general',
        input: {
          sessionId: this.currentSession.sessionId,
          timestamp: new Date().toISOString(),
          reportType: isFinal ? 'final' : 'periodic'
        },
        output: {
          metrics: this.sessionMetrics,
          insights,
          sessionDuration,
          performance: {
            productivity: this.calculateProductivityScore(),
            efficiency: this.calculateEfficiencyScore(),
            activity: this.calculateActivityScore()
          }
        },
        metadata: {
          feature: 'editor-metrics',
          userId: this.currentSession.userId,
          projectId: this.currentSession.projectId,
          isFinal,
          metricsVersion: '2.0'
        },
        tags: ['metrics', 'performance', isFinal ? 'final' : 'periodic']
      });
    } catch (error) {
      console.error('Failed to report session metrics:', error);
    }
  }

  private calculateActivityScore(): number {
    if (!this.currentSession) return 0;
    
    const sessionDuration = Date.now() - this.currentSession.startTime;
    const minutes = sessionDuration / (1000 * 60);
    
    if (minutes === 0) return 0;
    
    const keystrokesPerMinute = this.sessionMetrics.keystrokes / minutes;
    const linesPerMinute = this.sessionMetrics.linesAdded / minutes;
    
    // Activity score based on typing speed and code production
    const typingScore = Math.min(50, keystrokesPerMinute / 2); // Max 50 for typing
    const codingScore = Math.min(50, linesPerMinute * 10); // Max 50 for coding
    
    return Math.min(100, typingScore + codingScore);
  }

  private generateSessionInsights() {
    if (!this.currentSession) return {};

    const sessionDuration = Date.now() - this.currentSession.startTime;
    const minutes = sessionDuration / (1000 * 60);
    
    return {
      sessionLength: minutes,
      typingSpeed: minutes > 0 ? this.sessionMetrics.keystrokes / minutes : 0,
      codeProductivity: minutes > 0 ? this.sessionMetrics.linesAdded / minutes : 0,
      aiUtilization: this.sessionMetrics.suggestionsRequested > 0 ? 
        (this.sessionMetrics.suggestionsAccepted / this.sessionMetrics.suggestionsRequested) * 100 : 0,
      focusTime: this.calculateFocusTime(),
      recommendations: this.generateRecommendations()
    };
  }

  private calculateFocusTime(): number {
    // Estimate focus time based on consistent activity
    // This is a simplified calculation
    const sessionDuration = Date.now() - (this.currentSession?.startTime || Date.now());
    const minutes = sessionDuration / (1000 * 60);
    
    // Assume focused if typing consistently
    const avgKeystrokesPerMinute = minutes > 0 ? this.sessionMetrics.keystrokes / minutes : 0;
    
    if (avgKeystrokesPerMinute > 20) {
      return Math.min(minutes, minutes * 0.8); // Assume 80% focus time for active sessions
    } else {
      return Math.min(minutes, minutes * 0.4); // Lower focus time for less active sessions
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const insights = this.getProductivityInsights();
    
    if (!insights) return recommendations;

    if (insights.suggestionAcceptanceRate < 30) {
      recommendations.push('Consider reviewing AI suggestions more carefully - they might help boost productivity');
    }
    
    if (insights.keystrokesPerMinute < 20) {
      recommendations.push('Take breaks if needed - consistent typing speed helps maintain focus');
    }
    
    if (insights.productivityScore > 80) {
      recommendations.push('Great work! You\'re in a productive flow state');
    }
    
    if (insights.sessionDuration > 60) {
      recommendations.push('Consider taking a break - long sessions can reduce effectiveness');
    }

    return recommendations;
  }

  private calculateProductivityScore(): number {
    // Simple productivity score based on activity
    const baseScore = Math.min(100, (this.sessionMetrics.keystrokes / 10) + (this.sessionMetrics.linesAdded * 2));
    
    // Boost for AI assistance usage
    const aiBoost = (this.sessionMetrics.suggestionsAccepted * 5) + (this.sessionMetrics.quickEditsPerformed * 3);
    
    return Math.min(100, baseScore + aiBoost);
  }

  private calculateEfficiencyScore(): number {
    if (this.sessionMetrics.suggestionsRequested === 0) return 50; // Neutral score
    
    const acceptanceRate = (this.sessionMetrics.suggestionsAccepted / this.sessionMetrics.suggestionsRequested) * 100;
    
    // Higher acceptance rate = higher efficiency
    return Math.min(100, acceptanceRate + 20); // Base score of 20
  }

  private getEmptyMetrics(): EditorMetrics {
    return {
      keystrokes: 0,
      linesAdded: 0,
      linesDeleted: 0,
      charactersTyped: 0,
      suggestionsRequested: 0,
      suggestionsAccepted: 0,
      quickEditsPerformed: 0,
      timeSpentCoding: 0
    };
  }
}

// Global instance for editor integration
export const editorOpikIntegration = new EditorOpikIntegration();