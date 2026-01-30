import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Test endpoint to verify AI functionality
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test Anthropic API connection
    const response = await generateText({
      model: anthropic("claude-3-5-haiku-20241022"),
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
      // Check for specific Anthropic errors
      if (error.message.includes("credit balance")) {
        return NextResponse.json({
          success: false,
          error: "ANTHROPIC_CREDITS_LOW",
          message: "Your Anthropic API credits are too low. Please add credits at console.anthropic.com",
          details: error.message,
        }, { status: 402 }); // Payment Required
      }

      if (error.message.includes("API key")) {
        return NextResponse.json({
          success: false,
          error: "ANTHROPIC_API_KEY_INVALID",
          message: "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY in .env.local",
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