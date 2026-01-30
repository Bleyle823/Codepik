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
    const { projectId, uploadId, files, folderStructure } = event.data as ProcessUploadEvent;

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
    if (!internalKey) {
      throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured");
    }

    // Step 1: Update status to processing
    await step.run("update-status-processing", async () => {
      await convex.mutation(api.system.updateUploadStatus, {
        internalKey,
        projectId,
        uploadId,
        status: "processing",
        progress: 5,
        message: "Creating folder structure...",
      });
    });

    // Step 2: Create folder structure
    const folderMap = await step.run("create-folders", async () => {
      const map: Record<string, Id<"files">> = {};

      // Sort folders by depth (parents first)
      const sortedFolders = folderStructure.sort((a, b) => {
        return a.path.split('/').length - b.path.split('/').length;
      });

      for (const folder of sortedFolders) {
        const parentId = folder.parentPath ? map[folder.parentPath] : undefined;

        const folderId = await convex.mutation(api.system.createFolder, {
          internalKey,
          projectId,
          name: folder.name,
          parentId,
        });

        map[folder.path] = folderId;
      }

      return map;
    });

    // Step 3: Update progress after folder creation
    await step.run("update-progress-folders", async () => {
      await convex.mutation(api.system.updateUploadStatus, {
        internalKey,
        projectId,
        uploadId,
        status: "processing",
        progress: 15,
        message: "Processing files...",
      });
    });

    // Step 4: Process files in batches
    const totalFiles = files.length;
    let processedFiles = 0;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE);

      await step.run(`process-batch-${batchIndex}`, async () => {
        const batchPromises = batch.map(async (file) => {
          try {
            // Skip directories and empty files
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

        processedFiles += successCount;

        // Update progress after each batch
        const progress = Math.min(90, 15 + Math.floor((processedFiles / totalFiles) * 75));
        await convex.mutation(api.system.updateUploadStatus, {
          internalKey,
          projectId,
          uploadId,
          status: "processing",
          progress,
          message: `Processed ${processedFiles}/${totalFiles} files...`,
        });

        return {
          batchSize: batch.length,
          successCount,
          processedFiles,
        };
      });
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