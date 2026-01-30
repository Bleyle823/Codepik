import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Test endpoint to verify AI functionality
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test OpenAI API connection
    const response = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: "Say 'AI is working!' in exactly 3 words.",
      maxTokens: 10,
    });

    return NextResponse.json({
      success: true,
      message: "AI functionality test successful",
      response: response.text,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("AI test error:", error);
    
    if (error instanceof Error) {
      // Check for specific OpenAI errors
      if (error.message.includes("quota") || error.message.includes("billing")) {
        return NextResponse.json({
          success: false,
          error: "OPENAI_QUOTA_EXCEEDED",
          message: "Your OpenAI API quota has been exceeded. Please check your billing at platform.openai.com",
          details: error.message,
        }, { status: 402 }); // Payment Required
      }

      if (error.message.includes("API key") || error.message.includes("authentication")) {
        return NextResponse.json({
          success: false,
          error: "OPENAI_API_KEY_INVALID",
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local",
          details: error.message,
        }, { status: 401 });
      }
    }

    return NextResponse.json({
      success: false,
      error: "AI_TEST_FAILED",
      message: "AI functionality test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}