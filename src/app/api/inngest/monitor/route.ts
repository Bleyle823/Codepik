import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { inngest } from "@/inngest/client";

// Enhanced monitoring endpoint for Inngest functions
export async function GET() {
  try {
    const { userId } = await auth();

    // Basic auth check (you might want to restrict this to admins)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Environment health check
    const envHealth = {
      hasEventKey: !!process.env.INNGEST_EVENT_KEY,
      hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
      hasInternalKey: !!process.env.POLARIS_CONVEX_INTERNAL_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasFirecrawlKey: !!process.env.FIRECRAWL_API_KEY,
    };

    // Function status (you could expand this with actual metrics)
    const functionStatus = {
      processMessage: {
        status: "active",
        description: "AI message processing",
        lastExecution: null, // Could track this
        successRate: null,   // Could calculate this
      },
      importGithubRepo: {
        status: "active", 
        description: "GitHub repository imports",
        lastExecution: null,
        successRate: null,
      },
      exportToGithub: {
        status: "active",
        description: "GitHub repository exports", 
        lastExecution: null,
        successRate: null,
      },
    };

    // System metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    };

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: envHealth,
      functions: functionStatus,
      system: systemMetrics,
      inngest: {
        clientId: "codepik",
        configured: envHealth.hasEventKey && envHealth.hasSigningKey,
      },
    });

  } catch (error) {
    console.error("Monitor endpoint error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST endpoint to trigger health checks
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    switch (action) {
      case "health-check":
        // Trigger a health check function
        const event = await inngest.send({
          name: "system/health-check",
          data: {
            triggeredBy: userId,
            timestamp: new Date().toISOString(),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Health check triggered",
          eventId: event.ids[0],
        });

      case "test-demo":
        // Trigger a demo function for testing
        const demoEvent = await inngest.send({
          name: "demo/generate",
          data: {
            prompt: "Test prompt for monitoring",
            userId,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Demo function triggered",
          eventId: demoEvent.ids[0],
        });

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Monitor action error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}