import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple health check for Inngest
    const envCheck = {
      hasEventKey: !!process.env.INNGEST_EVENT_KEY,
      hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
      hasInternalKey: !!process.env.POLARIS_CONVEX_INTERNAL_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    };

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: envCheck,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}