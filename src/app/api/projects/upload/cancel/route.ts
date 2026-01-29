import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await request.json();

    // Here you could add logic to cancel any ongoing server-side operations
    // For example, if you were using background jobs or long-running processes
    
    console.log(`Upload cancellation requested for project: ${projectId} by user: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: "Upload cancellation processed" 
    });

  } catch (error) {
    console.error("Cancel upload error:", error);
    return NextResponse.json(
      { error: "Failed to cancel upload" },
      { status: 500 }
    );
  }
}