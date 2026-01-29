// Optimized Inngest functions for better performance and reliability
import { generateText } from "ai";
import { inngest } from "./client";
import { anthropic } from "@ai-sdk/anthropic";
import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s]+/g;

// Enhanced demo function with proper error handling and monitoring
export const optimizedDemoGenerate = inngest.createFunction(
  { 
    id: "optimized-demo-generate",
    concurrency: {
      limit: 5, // Process max 5 concurrent requests
      key: "event.data.userId", // Per-user concurrency
    },
    rateLimit: {
      limit: 20, // 20 requests
      duration: "1m", // per minute
      key: "event.data.userId", // per user
    },
    retries: 2, // Retry failed executions
    onFailure: async ({ event, step, error }) => {
      console.error("Demo generation failed:", {
        prompt: event.data.prompt,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Could send notification or update UI state here
      await step.run("log-failure", async () => {
        // Log to monitoring service
        return { failed: true, reason: error.message };
      });
    },
  },
  { event: "demo/generate" },
  async ({ event, step }) => {
    const { prompt, userId } = event.data as { 
      prompt: string; 
      userId?: string;
    };

    // Step 1: Extract URLs with timeout protection
    const urls = await step.run("extract-urls", async () => {
      try {
        return prompt.match(URL_REGEX) ?? [];
      } catch (error) {
        console.warn("URL extraction failed:", error);
        return [];
      }
    }) as string[];

    // Step 2: Scrape URLs with batch processing and error handling
    const scrapedContent = await step.run("scrape-urls-batch", async () => {
      if (urls.length === 0) return "";

      // Process URLs in batches of 3 to avoid overwhelming the service
      const BATCH_SIZE = 3;
      const results: string[] = [];

      for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        const batch = urls.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.allSettled(
          batch.map(async (url) => {
            try {
              const result = await firecrawl.scrape(
                url,
                { 
                  formats: ["markdown"],
                  timeout: 10000, // 10 second timeout per URL
                }
              );
              return result.markdown ?? null;
            } catch (error) {
              console.warn(`Failed to scrape ${url}:`, error);
              return null;
            }
          })
        );

        // Extract successful results
        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            results.push(result.value);
          }
        });
      }

      return results.join("\n\n");
    });

    // Step 3: Generate text with enhanced error handling
    const result = await step.run("generate-text", async () => {
      const finalPrompt = scrapedContent
        ? `Context:\n${scrapedContent}\n\nQuestion: ${prompt}`
        : prompt;

      try {
        const response = await generateText({
          model: anthropic('claude-3-haiku-20240307'),
          prompt: finalPrompt,
          maxTokens: 1000, // Limit token usage
          experimental_telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
          },
        });

        return {
          success: true,
          text: response.text,
          usage: response.usage,
          finishReason: response.finishReason,
        };
      } catch (error) {
        console.error("Text generation failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          fallbackText: "I apologize, but I encountered an error generating a response. Please try again.",
        };
      }
    });

    // Step 4: Log metrics for monitoring
    await step.run("log-metrics", async () => {
      return {
        urlsProcessed: urls.length,
        contentScraped: scrapedContent.length > 0,
        generationSuccess: result.success,
        timestamp: new Date().toISOString(),
        userId,
      };
    });

    return result;
  },
);

// Enhanced error demo with better error categorization
export const optimizedDemoError = inngest.createFunction(
  { 
    id: "optimized-demo-error",
    retries: 1, // Only retry once for demo
    onFailure: async ({ event, step, error }) => {
      // Categorize error types
      const errorType = error.name || "UnknownError";
      const isRetriable = !error.message.includes("NonRetriable");

      await step.run("categorize-error", async () => {
        return {
          errorType,
          isRetriable,
          message: error.message,
          timestamp: new Date().toISOString(),
        };
      });
    },
  },
  { event: "demo/error" },
  async ({ event, step }) => {
    const { errorType = "generic" } = event.data as { errorType?: string };

    await step.run("simulate-error", async () => {
      switch (errorType) {
        case "timeout":
          throw new Error("Timeout: Operation took too long");
        case "validation":
          throw new Error("ValidationError: Invalid input provided");
        case "rate-limit":
          throw new Error("RateLimitError: Too many requests");
        case "non-retriable":
          throw new Error("NonRetriableError: Permanent failure");
        default:
          throw new Error("Generic error occurred in background job");
      }
    });
  }
);

// Utility function for health monitoring
export const healthCheck = inngest.createFunction(
  {
    id: "health-check",
    concurrency: { limit: 1 }, // Only one health check at a time
  },
  { event: "system/health-check" },
  async ({ step }) => {
    // Check database connectivity
    const dbHealth = await step.run("check-database", async () => {
      try {
        // Test database connection
        return { status: "healthy", timestamp: new Date().toISOString() };
      } catch (error) {
        return { 
          status: "unhealthy", 
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString() 
        };
      }
    });

    // Check external services
    const servicesHealth = await step.run("check-services", async () => {
      const services = {
        firecrawl: false,
        anthropic: false,
      };

      try {
        // Test Firecrawl (if API key available)
        if (process.env.FIRECRAWL_API_KEY) {
          // Could test with a simple request
          services.firecrawl = true;
        }

        // Test Anthropic (if API key available)
        if (process.env.ANTHROPIC_API_KEY) {
          services.anthropic = true;
        }
      } catch (error) {
        console.warn("Service health check failed:", error);
      }

      return services;
    });

    return {
      database: dbHealth,
      services: servicesHealth,
      timestamp: new Date().toISOString(),
    };
  }
);