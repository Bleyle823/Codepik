import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";

import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { inngest } from "@/inngest/client";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 1000; // Maximum number of files
const UPLOAD_TIMEOUT = 30000; // 30 second timeout for initial upload

export async function POST(request: Request) {
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
    const formData = await request.formData();
    const projectName = formData.get("projectName") as string;
    const files = formData.getAll("files") as File[];

    if (!projectName) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${MAX_FILES} files allowed.` },
        { status: 400 }
      );
    }

    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Total file size too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed.` },
        { status: 400 }
      );
    }

    // Create project
    const projectId = await convex.mutation(api.system.createProject, {
      internalKey,
      name: projectName,
      ownerId: userId,
    });

    // Generate unique upload ID for tracking
    const uploadId = nanoid();

    // Prepare file data for Inngest processing
    const fileData: Array<{
      name: string;
      path: string;
      size: number;
      type: string;
      content: string; // Base64 encoded
      isDirectory: boolean;
      parentPath?: string;
    }> = [];

    const folderStructure: Array<{
      path: string;
      name: string;
      parentPath?: string;
    }> = [];

    // Collect folder structure
    const folderPaths = new Set<string>();
    
    for (const file of files) {
      const relativePath = file.webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      // Add all parent directories
      for (let i = 1; i < pathParts.length; i++) {
        const folderPath = pathParts.slice(0, i).join('/');
        folderPaths.add(folderPath);
      }
    }

    // Build folder structure array
    for (const folderPath of folderPaths) {
      const pathParts = folderPath.split('/');
      const folderName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join('/');
      
      folderStructure.push({
        path: folderPath,
        name: folderName,
        parentPath: parentPath || undefined,
      });
    }

    // Process files and convert to base64 (for small files only initially)
    for (const file of files) {
      const relativePath = file.webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join('/');

      // Skip empty files and certain file types
      if (file.size === 0 || fileName.startsWith('.DS_Store')) {
        continue;
      }

      try {
        // Convert file to base64 for Inngest processing
        const arrayBuffer = await file.arrayBuffer();
        const base64Content = Buffer.from(arrayBuffer).toString('base64');

        fileData.push({
          name: fileName,
          path: relativePath,
          size: file.size,
          type: file.type,
          content: base64Content,
          isDirectory: false,
          parentPath: parentPath || undefined,
        });
      } catch (error) {
        console.error(`Failed to process file ${fileName}:`, error);
      }
    }

    // Initialize upload status
    await convex.mutation(api.system.updateUploadStatus, {
      internalKey,
      projectId,
      uploadId,
      status: "queued",
      progress: 0,
      message: "Upload queued for processing...",
    });

    // Trigger Inngest background processing
    const event = await inngest.send({
      name: "upload/process",
      data: {
        projectId,
        uploadId,
        files: fileData,
        folderStructure,
      },
    });

    return NextResponse.json({ 
      success: true, 
      projectId,
      uploadId,
      filesQueued: fileData.length,
      message: "Upload queued for background processing"
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload project" },
      { status: 500 }
    );
  }
}