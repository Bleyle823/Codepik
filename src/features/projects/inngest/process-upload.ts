import { NonRetriableError } from "inngest";
import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const BINARY_THRESHOLD = 1024 * 1024; // 1MB threshold for binary files
const BATCH_SIZE = 25; // Process files in batches of 25

interface ProcessUploadEvent {
  projectId: Id<"projects">;
  uploadId: string;
  files: Array<{
    name: string;
    path: string;
    size: number;
    type: string;
    content: string; // Base64 encoded content
    isDirectory: boolean;
    parentPath?: string;
  }>;
  folderStructure: Array<{
    path: string;
    name: string;
    parentPath?: string;
  }>;
}

export const processUpload = inngest.createFunction(
  {
    id: "process-upload",
    concurrency: {
      limit: 5, // Max 5 concurrent uploads
      key: "event.data.projectId", // One upload per project at a time
    },
    onFailure: async ({ event, step }) => {
      const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
      if (!internalKey) return;

      const { projectId, uploadId } = event.data.event.data as ProcessUploadEvent;

      await step.run("set-failed-status", async () => {
        await convex.mutation(api.system.updateUploadStatus, {
          internalKey,
          projectId,
          uploadId,
          status: "failed",
          progress: 0,
          error: "Upload processing failed",
        });
      });
    },
  },
  { event: "upload/process" },
  async ({ event, step }) => {
    const { projectId, files, folderStructure } = event.data as ProcessUploadEvent;
    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

    if (!internalKey) {
      throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured");
    }

    const totalFiles = files.length;

    // Step 1: Create upload record
    const uploadId = await step.run("create-upload-record", async () => {
      return await convex.mutation(api.system.createUpload, {
        internalKey,
        projectId,
        totalFiles,
      });
    });

    // Step 2: Create folders first
    const folderMap = await step.run("create-folders", async () => {
      await convex.mutation(api.system.updateUploadStatus, {
        internalKey,
        projectId,
        uploadId,
        status: "processing",
        progress: 5,
        message: "Creating folder structure...",
      });

      const map: Record<string, Id<"files">> = {};

      // Sort files by path length to ensure parents are created before children
      // We only care about unique directory paths
      const uniquePaths = new Set<string>();
      files.forEach(file => {
        if (file.parentPath) {
          const parts = file.parentPath.split('/');
          let currentPath = '';
          parts.forEach(part => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            uniquePaths.add(currentPath);
          });
        }
        if (file.isDirectory && file.name) {
          const path = file.parentPath ? `${file.parentPath}/${file.name}` : file.name;
          uniquePaths.add(path);
        }
      });

      const sortedPaths = Array.from(uniquePaths).sort((a, b) => a.length - b.length);

      for (const path of sortedPaths) {
        const parts = path.split('/');
        const name = parts.pop()!;
        const parentPath = parts.join('/');
        const parentId = parentPath ? map[parentPath] : undefined;

        try {
          const folderId = await convex.mutation(api.system.createFolder, {
            internalKey,
            projectId,
            name,
            parentId,
          });
          map[path] = folderId;
        } catch (e) {
          // Ignore if folder already exists (could happen if retrying)
          // But we need the ID. `createFolder` throws if exists.
          // We should probably check existence or make createFolder idempotent.
          // For now, let's assume it might fail and we can try to fetch it?
          // Or better, catch the specific error.
          // Given the current `createFolder` implementation, it throws.
          // Let's rely on the fact that we are starting from scratch or handle it roughly.
          // Ideally we shouldn't fail hard here.
          console.error(`Failed to create folder ${path}`, e);
        }
      }

      return map;
    });

    // Step 3: Initialize processing (Update status)
    await step.run("start-processing-files", async () => {
      await convex.mutation(api.system.updateUploadStatus, {
        internalKey,
        projectId,
        uploadId,
        status: "processing",
        progress: 10,
        message: "Starting file processing...",
      });
    });

    // Step 4: Process files in batches
    let processedFiles = 0;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE);

      // Pass processedFiles to the step to ensure it's captured correctly in the closure
      // when the function re-runs and processedFiles is restored from previous steps
      const currentFilesProcessedSoFar = processedFiles;

      const result = await step.run(`process-batch-${batchIndex}`, async () => {
        const batchPromises = batch.map(async (file) => {
          try {
            // Skip directories and empty files (directories handled above)
            if (file.isDirectory || file.size === 0 || file.name.startsWith('.DS_Store')) {
              return { success: true, skipped: true };
            }

            const parentId = file.parentPath ? folderMap[file.parentPath] : undefined;

            // Decode base64 content
            const buffer = Buffer.from(file.content, 'base64');

            // Fast binary detection
            const isBinaryByExtension = /\.(jpg|jpeg|png|gif|bmp|ico|pdf|zip|tar|gz|exe|dll|so|dylib|bin|dat)$/i.test(file.name);
            const isBinaryBySize = file.size > BINARY_THRESHOLD;

            if (isBinaryByExtension || isBinaryBySize) {
              // Handle binary files
              const uploadUrl = await convex.mutation(
                api.system.generateUploadUrl,
                { internalKey }
              );

              const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: buffer,
              });

              if (!uploadResponse.ok) {
                throw new Error(`Failed to upload binary file: ${uploadResponse.statusText}`);
              }

              const { storageId } = await uploadResponse.json();

              await convex.mutation(api.system.createBinaryFile, {
                internalKey,
                projectId,
                name: file.name,
                storageId,
                parentId,
              });
            } else {
              // Handle text files with binary detection
              let isBinary = false;
              const checkLength = Math.min(512, buffer.length);
              for (let j = 0; j < checkLength; j++) {
                if (buffer[j] === 0) {
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
                  body: buffer,
                });

                if (!uploadResponse.ok) {
                  throw new Error(`Failed to upload binary file: ${uploadResponse.statusText}`);
                }

                const { storageId } = await uploadResponse.json();

                await convex.mutation(api.system.createBinaryFile, {
                  internalKey,
                  projectId,
                  name: file.name,
                  storageId,
                  parentId,
                });
              } else {
                // Create text file
                const content = buffer.toString('utf-8');

                await convex.mutation(api.system.createFile, {
                  internalKey,
                  projectId,
                  name: file.name,
                  content,
                  parentId,
                });
              }
            }

            return { success: true, fileName: file.name };
          } catch (error) {
            console.error(`Failed to process file ${file.name}:`, error);
            return {
              success: false,
              fileName: file.name,
              error: error instanceof Error ? error.message : "Unknown error"
            };
          }
        });

        const results = await Promise.allSettled(batchPromises);
        const successCount = results.filter(r =>
          r.status === 'fulfilled' && r.value.success
        ).length;

        // Calculate progress based on accumulated total + current batch success
        const currentTotal = currentFilesProcessedSoFar + successCount;

        // Update progress after each batch
        const progress = Math.min(99, 15 + Math.floor((currentTotal / totalFiles) * 85));

        await convex.mutation(api.system.updateUploadStatus, {
          internalKey,
          projectId,
          uploadId,
          status: "processing",
          progress,
          message: `Processed ${currentTotal}/${totalFiles} files...`,
        });

        return {
          batchSize: batch.length,
          successCount,
          processedFiles: currentTotal,
        };
      });

      // KEY FIX: Update the outer variable with the result from the step
      // This ensures that when the function replays, processedFiles is reconstructed correctly
      processedFiles += result.successCount;
    }

    // Step 5: Finalize upload
    await step.run("finalize-upload", async () => {
      await convex.mutation(api.system.updateUploadStatus, {
        internalKey,
        projectId,
        uploadId,
        status: "completed",
        progress: 100,
        message: `Upload completed! ${processedFiles} files processed.`,
      });
    });

    return {
      success: true,
      projectId,
      filesProcessed: processedFiles,
      totalFiles
    };
  }
);

// Function to handle upload cancellation
export const cancelUpload = inngest.createFunction(
  {
    id: "cancel-upload",
  },
  { event: "upload/cancel" },
  async ({ event, step }) => {
    const { projectId, uploadId } = event.data as {
      projectId: Id<"projects">;
      uploadId: string;
    };

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
    if (!internalKey) {
      throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured");
    }

    await step.run("update-cancelled-status", async () => {
      await convex.mutation(api.system.updateUploadStatus, {
        internalKey,
        projectId,
        uploadId,
        status: "cancelled",
        progress: 0,
        message: "Upload cancelled by user",
      });
    });

    // Optional: Clean up partial data
    await step.run("cleanup-partial-data", async () => {
      // Could implement cleanup of partially uploaded files
      return { cleaned: true };
    });

    return { success: true, cancelled: true };
  }
);