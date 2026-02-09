import { z } from "zod";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOpenAI } from "@ai-sdk/openai";

import { firecrawl } from "@/lib/firecrawl";
import { QuickEditTracer } from "@/features/editor/services/opik-quick-edit-tracer";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const quickEditSchema = z.object({
  editedCode: z
    .string()
    .describe(
      "The edited version of the selected code based on the instruction"
    ),
});

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

const QUICK_EDIT_PROMPT = `You are a code editing assistant. Edit the selected code based on the user's instruction.

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
</instructions>`;

export async function POST(request: Request) {
  const startTime = Date.now();
  let tracer: any = null;

  try {
    const { userId } = await auth();
    const { selectedCode, fullCode, instruction, fileName } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 400 }
      );
    }

    if (!selectedCode) {
      return NextResponse.json(
        { error: "Selected code is required" },
        { status: 400 }
      );
    }

    if (!instruction) {
      return NextResponse.json(
        { error: "Instruction is required" },
        { status: 400 }
      );
    }

    // Initialize Opik tracing
    const quickEditTracer = new QuickEditTracer();
    const editContext = {
      selectedCode,
      fullCode: fullCode || '',
      instruction,
      fileName: fileName || 'untitled',
      language: fileName?.split('.').pop() || 'unknown',
      userId
    };

    tracer = await quickEditTracer.traceQuickEdit(editContext);

    const urls: string[] = instruction.match(URL_REGEX) || [];
    let documentationContext = "";

    if (urls.length > 0) {
      // Track documentation processing
      const docSpan = tracer.trackDocumentationProcessing(urls);

      const scrapedResults = await Promise.all(
        urls.map(async (url) => {
          try {
            const result = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });

            if (result.markdown) {
              return `<doc url="${url}">\n${result.markdown}\n</doc>`;
            }

            return null;
          } catch {
            return null;
          }
        })
      );

      const validResults = scrapedResults.filter(Boolean);

      if (validResults.length > 0) {
        documentationContext = `<documentation>\n${validResults.join("\n\n")}\n</documentation>`;
      }

      docSpan.update({
        output: {
          urlsProcessed: urls.length,
          validResults: validResults.length,
          documentationGenerated: documentationContext.length > 0
        }
      });
    }

    // Track code analysis
    const analysisSpan = tracer.trackCodeAnalysis('quick-edit');
    analysisSpan.update({
      output: {
        hasFullContext: !!fullCode,
        hasDocumentation: documentationContext.length > 0
      }
    });

    const prompt = QUICK_EDIT_PROMPT
      .replace("{selectedCode}", selectedCode)
      .replace("{fullCode}", fullCode || "")
      .replace("{instruction}", instruction)
      .replace("{documentation}", documentationContext);

    // Track AI processing
    const aiSpan = tracer.trackAIProcessing("gpt-4o-mini", prompt);

    console.log("Quick Edit Request: Starting generation with OpenRouter");
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("Quick Edit Error: OPENROUTER_API_KEY is missing");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { output } = await generateText({
      model: openrouter("google/gemini-2.0-flash-001"),
      output: Output.object({ schema: quickEditSchema }),
      prompt,
    });

    aiSpan.update({
      output: {
        editGenerated: true,
        editLength: output.editedCode.length
      }
    });

    const processingTime = Date.now() - startTime;
    const traceId = tracer.complete({
      editedCode: output.editedCode,
      processingTime,
      hasDocumentation: documentationContext.length > 0,
      urlsProcessed: urls.length
    });

    return NextResponse.json({
      editedCode: output.editedCode,
      traceId // Include trace ID for frontend feedback
    });
  } catch (error) {
    console.error("Edit error:", error);

    if (tracer) {
      tracer.complete(null, error as Error);
    }

    return NextResponse.json(
      { error: "Failed to generate edit" },
      { status: 500 }
    );
  }
};
