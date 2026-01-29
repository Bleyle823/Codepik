import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 1000; // Maximum number of files
const CHUNK_SIZE = 100; // Process files in chunks of 100
const BINARY_THRESHOLD = 1024 * 1024; // 1MB threshold for binary files

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

    // Process files
    const folderMap = new Map<string, string>();
    const processedFiles: Array<{
      name: string;
      path: string;
      content?: string;
      isDirectory: boolean;
      parentPath?: string;
    }> = [];

    // First, collect all unique folder paths
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

    // Sort folders by depth (parents first)
    const sortedFolders = Array.from(folderPaths).sort((a, b) => {
      return a.split('/').length - b.split('/').length;
    });

    // Create folders
    for (const folderPath of sortedFolders) {
      const pathParts = folderPath.split('/');
      const folderName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join('/');
      const parentId = parentPath ? folderMap.get(parentPath) : undefined;

      const folderId = await convex.mutation(api.system.createFolder, {
        internalKey,
        projectId,
        name: folderName,
        parentId,
      });

      folderMap.set(folderPath, folderId);
    }

    // Process files in parallel chunks for better performance
    const processFileChunk = async (fileChunk: File[]) => {
      const promises = fileChunk.map(async (file) => {
        const relativePath = file.webkitRelativePath || file.name;
        const pathParts = relativePath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join('/');
        const parentId = parentPath ? folderMap.get(parentPath) : undefined;

        // Skip empty files and certain file types
        if (file.size === 0 || fileName.startsWith('.DS_Store')) {
          return null;
        }

        try {
          // Fast binary detection based on file extension and size
          const isBinaryByExtension = /\.(jpg|jpeg|png|gif|bmp|ico|pdf|zip|tar|gz|exe|dll|so|dylib|bin|dat)$/i.test(fileName);
          const isBinaryBySize = file.size > BINARY_THRESHOLD;
          
          if (isBinaryByExtension || isBinaryBySize) {
            // Handle binary files
            const arrayBuffer = await file.arrayBuffer();
            
            // Generate upload URL only when needed
            const uploadUrl = await convex.mutation(
              api.system.generateUploadUrl,
              { internalKey }
            );

            const uploadResponse = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": "application/octet-stream" },
              body: arrayBuffer,
            });

            const { storageId } = await uploadResponse.json();

            await convex.mutation(api.system.createBinaryFile, {
              internalKey,
              projectId,
              name: fileName,
              storageId,
              parentId,
            });
          } else {
            // Handle text files with optimized binary detection
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Quick binary check on first 512 bytes
            let isBinary = false;
            const checkLength = Math.min(512, uint8Array.length);
            for (let i = 0; i < checkLength; i++) {
              if (uint8Array[i] === 0) {
                isBinary = true;
                break;
              }
            }

            if (isBinary) {
              // Treat as binary file
              const uploadUrl = await convex.mutation(
                api.system.generateUploadUrl,
                { internalKey }
              );

              const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: arrayBuffer,
              });

              const { storageId } = await uploadResponse.json();

              await convex.mutation(api.system.createBinaryFile, {
                internalKey,
                projectId,
                name: fileName,
                storageId,
                parentId,
              });
            } else {
              // Create text file
              const content = new TextDecoder().decode(uint8Array);
              
              await convex.mutation(api.system.createFile, {
                internalKey,
                projectId,
                name: fileName,
                content,
                parentId,
              });
            }
          }
          return fileName;
        } catch (error) {
          console.error(`Failed to process file ${fileName}:`, error);
          return null;
        }
      });

      return Promise.allSettled(promises);
    };

    // Process files in chunks to avoid overwhelming the server
    let processedCount = 0;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunk = files.slice(i, i + CHUNK_SIZE);
      await processFileChunk(chunk);
      processedCount += chunk.length;
    }

    return NextResponse.json({ 
      success: true, 
      projectId,
      filesProcessed: processedCount
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload project" },
      { status: 500 }
    );
  }
}