import { generateText, Output } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { SuggestionTracer } from "@/features/editor/services/opik-suggestion-tracer";
import { IntelligentCacheSystem } from "@/features/optimization/services/intelligent-cache";

const suggestionSchema = z.object({
  suggestion: z
    .string()
    .describe(
      "The code to insert at cursor, or empty string if no completion needed"
    ),
});

const SUGGESTION_PROMPT = `You are a code suggestion assistant.

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
</instructions>`;

export async function POST(request: Request) {
  const startTime = Date.now();
  let tracer: any = null;
  
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      );
    }

    const {
      fileName,
      code,
      currentLine,
      previousLines,
      textBeforeCursor,
      textAfterCursor,
      nextLines,
      lineNumber,
    } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    // Initialize Opik tracing
    const suggestionTracer = new SuggestionTracer();
    const codeContext = {
      fileType: fileName?.split('.').pop() || 'unknown',
      language: fileName?.split('.').pop() || 'unknown',
      position: { line: lineNumber, column: textBeforeCursor?.length || 0 },
      surroundingCode: code,
      fileName: fileName || 'untitled',
      fileSize: code.length,
      textBeforeCursor: textBeforeCursor || '',
      textAfterCursor: textAfterCursor || '',
      currentLine: currentLine || '',
      previousLines,
      nextLines
    };

    tracer = await suggestionTracer.traceSuggestion(codeContext, userId);

    // Initialize intelligent caching
    const cacheSystem = new IntelligentCacheSystem();
    const cacheRequest = {
      type: 'suggestion' as const,
      userId,
      content: `${textBeforeCursor}|${currentLine}|${textAfterCursor}`,
      context: codeContext,
      model: 'gpt-4o-mini'
    };

    // Check cache first
    const cachedResponse = await cacheSystem.getCachedResponse(cacheRequest);
    if (cachedResponse) {
      // Track cache hit
      tracer.trackInteraction(cachedResponse.content.length);
      const traceId = tracer.complete({
        suggestion: cachedResponse.content,
        processingTime: 0, // Cached response
        confidence: cachedResponse.qualityScore
      });

      return NextResponse.json({ 
        suggestion: cachedResponse.content,
        traceId,
        cached: true,
        cacheAge: cachedResponse.age
      });
    }

    const prompt = SUGGESTION_PROMPT
      .replace("{fileName}", fileName)
      .replace("{code}", code)
      .replace("{currentLine}", currentLine)
      .replace("{previousLines}", previousLines || "")
      .replace("{textBeforeCursor}", textBeforeCursor)
      .replace("{textAfterCursor}", textAfterCursor)
      .replace("{nextLines}", nextLines || "")
      .replace("{lineNumber}", lineNumber.toString());

    // Track generation
    const generationSpan = tracer.trackGeneration("gpt-4o-mini", prompt);
    
    const { output } = await generateText({
      model: openai("gpt-4o-mini"),
      output: Output.object({ schema: suggestionSchema }),
      prompt,
    });

    generationSpan.update({ 
      output: { 
        suggestionGenerated: true,
        suggestionLength: output.suggestion.length 
      }
    });

    // Track user interaction
    tracer.trackInteraction(output.suggestion.length);

    const processingTime = Date.now() - startTime;
    const confidence = output.suggestion.length > 0 ? 0.8 : 0.1;
    
    const traceId = tracer.complete({
      suggestion: output.suggestion,
      processingTime,
      confidence
    });

    // Cache the response if it's good quality
    if (output.suggestion.length > 0 && confidence > 0.7) {
      await cacheSystem.setCachedResponse(cacheRequest, {
        content: output.suggestion,
        qualityScore: confidence,
        processingTime,
        tokenCount: output.suggestion.length // Approximate
      });
    }

    return NextResponse.json({ 
      suggestion: output.suggestion,
      traceId, // Include trace ID for frontend feedback
      cached: false
    });
  } catch (error) {
    console.error("Suggestion error: ", error);
    
    if (tracer) {
      tracer.complete(null, error as Error);
    }
    
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 },
    );
  }
}
