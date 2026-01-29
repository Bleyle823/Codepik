import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../../convex/_generated/api";
import { inngest } from "@/inngest/client";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const uploadId = url.searchParams.get("uploadId");

    if (!projectId || !uploadId) {
      return NextResponse.json(
        { error: "Project ID and Upload ID are required" },
        { status: 400 }
      );
    }

    // Get upload status from Convex
    const uploadStatus = await convex.query(api.system.getUploadStatus, {
      internalKey,
      projectId: projectId as any,
      uploadId,
    });

    if (!uploadStatus) {
      return NextResponse.json(
        { error: "Upload not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: uploadStatus.status,
      progress: uploadStatus.progress,
      message: uploadStatus.message,
      error: uploadStatus.error,
      completedAt: uploadStatus.completedAt,
      createdAt: uploadStatus.createdAt,
    });

  } catch (error) {
    console.error("Upload status error:", error);
    return NextResponse.json(
      { error: "Failed to get upload status" },
      { status: 500 }
    );
  }
}

// POST endpoint to cancel upload
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, uploadId, action } = await request.json();

    if (!projectId || !uploadId) {
      return NextResponse.json(
        { error: "Project ID and Upload ID are required" },
        { status: 400 }
      );
    }

    if (action === "cancel") {
      // Trigger upload cancellation via Inngest
      const event = await inngest.send({
        name: "upload/cancel",
        data: {
          projectId,
          uploadId,
          cancelledBy: userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Upload cancellation requested",
        eventId: event.ids[0],
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Upload action error:", error);
    return NextResponse.json(
      { error: "Failed to process upload action" },
      { status: 500 }
    );
  }
}