import { opikClient } from '@/lib/opik-client';

export interface OpikPrompt {
  id: string;
  name: string;
  description: string;
  tags: string[];
  template?: string;
}

export interface PromptVersion {
  id: string;
  template: string;
  version: number;
  performanceScore?: number;
  createdAt: string;
}

export class OpikPromptManager {
  private prompts = new Map<string, OpikPrompt>();
  private initialized = false;

  async initializePrompts() {
    if (this.initialized) return;
    
    try {
      // Chat system prompt
      const chatPrompt = await this.createOrGetPrompt({
        name: 'codepik-chat-system',
        description: 'Main system prompt for AI chat assistant',
        tags: ['chat', 'system', 'v1.0'],
        template: `You are an AI coding assistant integrated into Codepik, a modern IDE. 
Help users with coding tasks, debugging, and development questions.
Always provide clear, concise, and actionable responses.
When suggesting code, ensure it follows best practices and is well-documented.`
      });
      this.prompts.set('chat-system', chatPrompt);

      // Code suggestion prompt
      const suggestionPrompt = await this.createOrGetPrompt({
        name: 'code-suggestion',
        description: 'Prompt for inline code suggestions',
        tags: ['suggestions', 'autocomplete', 'v1.0'],
        template: `You are a code suggestion assistant.

<context>
<file_name>{fileName}</file_name>
<previous_lines>
{previousLines}
</previous_lines>
<current_line number="{lineNumber}">{currentLine}</current_line>
<before_cursor>{textBeforeCursor}</before_cursor>
<after_cursor>{textAfterCursor}</after_cursor>
<next_lines>
{nextLines}
</next_lines>
<full_code>
{code}
</full_code>
</context>

<instructions>
Follow these steps IN ORDER:

1. First, look at next_lines. If next_lines contains ANY code, check if it continues from where the cursor is. If it does, return empty string immediately - the code is already written.

2. Check if before_cursor ends with a complete statement (;, }, )). If yes, return empty string.

3. Only if steps 1 and 2 don't apply: suggest what should be typed at the cursor position, using context from full_code.

Your suggestion is inserted immediately after the cursor, so never suggest code that's already in the file.
</instructions>`
      });
      this.prompts.set('suggestion', suggestionPrompt);

      // Quick edit prompt
      const quickEditPrompt = await this.createOrGetPrompt({
        name: 'quick-edit',
        description: 'Prompt for quick code edits',
        tags: ['editing', 'refactoring', 'v1.0'],
        template: `You are a code editing assistant. Edit the selected code based on the user's instruction.

<context>
<selected_code>
{selectedCode}
</selected_code>
<full_code_context>
{fullCode}
</full_code_context>
</context>

{documentation}

<instruction>
{instruction}
</instruction>

<instructions>
Return ONLY the edited version of the selected code.
Maintain the same indentation level as the original.
Do not include any explanations or comments unless requested.
If the instruction is unclear or cannot be applied, return the original code unchanged.
</instructions>`
      });
      this.prompts.set('quick-edit', quickEditPrompt);

      this.initialized = true;
      console.log('Opik prompt management initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Opik prompts:', error);
      // Continue without Opik integration if it fails
    }
  }

  async getOptimizedPrompt(type: string, context: any = {}): Promise<string> {
    await this.initializePrompts();
    
    try {
      const prompt = this.prompts.get(type);
      if (!prompt) {
        console.warn(`Prompt ${type} not found, using fallback`);
        return this.getFallbackPrompt(type);
      }

      // Get the best performing version
      const version = await this.getBestPromptVersion(prompt.id);
      
      if (version && version.template) {
        return this.interpolateTemplate(version.template, context);
      }
      
      // Fallback to stored template
      if (prompt.template) {
        return this.interpolateTemplate(prompt.template, context);
      }
      
      return this.getFallbackPrompt(type);
    } catch (error) {
      console.error('Failed to get optimized prompt:', error);
      return this.getFallbackPrompt(type);
    }
  }

  async recordPromptPerformance(
    promptType: string, 
    version: string, 
    performance: {
      responseTime: number;
      userSatisfaction: number;
      taskSuccess: boolean;
      errorRate: number;
    }
  ) {
    try {
      const prompt = this.prompts.get(promptType);
      if (!prompt) return;

      // Calculate performance score (0-1)
      const performanceScore = this.calculatePerformanceScore(performance);
      
      // This would typically update the prompt version's performance metrics
      // For now, we'll log it for future implementation
      console.log(`Prompt performance recorded for ${promptType}:`, {
        version,
        score: performanceScore,
        performance
      });
    } catch (error) {
      console.error('Failed to record prompt performance:', error);
    }
  }

  private async createOrGetPrompt(config: {
    name: string;
    description: string;
    tags: string[];
    template: string;
  }): Promise<OpikPrompt> {
    try {
      // Try to create the prompt (will fail if it already exists)
      const prompt = await opikClient.createPrompt({
        name: config.name,
        description: config.description,
        tags: config.tags
      });
      
      return {
        id: prompt.id,
        name: config.name,
        description: config.description,
        tags: config.tags,
        template: config.template
      };
    } catch (error) {
      // Prompt likely already exists, return a mock object
      console.log(`Prompt ${config.name} may already exist:`, error);
      return {
        id: `mock-${config.name}`,
        name: config.name,
        description: config.description,
        tags: config.tags,
        template: config.template
      };
    }
  }

  private async getBestPromptVersion(promptId: string): Promise<PromptVersion | null> {
    try {
      // This would typically fetch the best performing version from Opik
      // For now, return null to use the default template
      return null;
    } catch (error) {
      console.error('Failed to get best prompt version:', error);
      return null;
    }
  }

  private interpolateTemplate(template: string, context: any): string {
    let result = template;
    
    // Replace placeholders with context values
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
    }
    
    return result;
  }

  private calculatePerformanceScore(performance: {
    responseTime: number;
    userSatisfaction: number;
    taskSuccess: boolean;
    errorRate: number;
  }): number {
    // Normalize response time (lower is better, cap at 5 seconds)
    const responseTimeScore = Math.max(0, 1 - (performance.responseTime / 5000));
    
    // User satisfaction (0-1)
    const satisfactionScore = performance.userSatisfaction;
    
    // Task success (0 or 1)
    const successScore = performance.taskSuccess ? 1 : 0;
    
    // Error rate (lower is better, invert)
    const errorScore = Math.max(0, 1 - performance.errorRate);
    
    // Weighted average
    return (
      responseTimeScore * 0.2 +
      satisfactionScore * 0.4 +
      successScore * 0.3 +
      errorScore * 0.1
    );
  }

  private getFallbackPrompt(type: string): string {
    const fallbacks = {
      'chat-system': 'You are a helpful AI coding assistant.',
      'suggestion': 'Provide a code suggestion based on the context.',
      'quick-edit': 'Edit the code according to the instruction.'
    };
    
    return fallbacks[type as keyof typeof fallbacks] || 'You are a helpful AI assistant.';
  }
}