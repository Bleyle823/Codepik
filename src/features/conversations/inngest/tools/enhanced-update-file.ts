import { z } from "zod";
import { createTool } from "@inngest/agent-kit";

import { convex } from "@/lib/convex-client";

import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface EnhancedUpdateFileToolOptions {
  internalKey: string;
}

export interface EditMetadata {
  type: 'ai-edit' | 'ai-create' | 'ai-refactor' | 'ai-fix';
  summary: string;
  changedLines?: number[];
  timestamp: number;
  editId: string;
}

const paramsSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
  content: z.string(),
  editSummary: z.string().min(1, "Edit summary is required"),
  editType: z.enum(['ai-edit', 'ai-create', 'ai-refactor', 'ai-fix']).optional(),
  changedLines: z.array(z.number()).optional(),
});

export const createEnhancedUpdateFileTool = ({
  internalKey,
}: EnhancedUpdateFileToolOptions) => {
  return createTool({
    name: "updateFileWithMetadata",
    description: "Update the content of an existing file with detailed edit information for real-time synchronization",
    parameters: z.object({
      fileId: z.string().describe("The ID of the file to update"),
      content: z.string().describe("The new content for the file"),
      editSummary: z.string().describe("Brief description of what was changed (e.g., 'Added error handling to login function')"),
      editType: z.enum(['ai-edit', 'ai-create', 'ai-refactor', 'ai-fix']).optional().describe("Type of edit being performed"),
      changedLines: z.array(z.number()).optional().describe("Array of line numbers that were modified (for highlighting)")
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileId, content, editSummary, editType = 'ai-edit', changedLines } = parsed.data;

      // Validate file exists before running the step
      const file = await convex.query(api.system.getFileById, {
        internalKey,
        fileId: fileId as Id<"files">,
      });

      if (!file) {
        return `Error: File with ID "${fileId}" not found. Use listFiles to get valid file IDs.`;
      }

      if (file.type === "folder") {
        return `Error: "${fileId}" is a folder, not a file. You can only update file contents.`;
      }

      try {
        return await toolStep?.run("update-file-with-metadata", async () => {
          // Create edit metadata
          const editMetadata: EditMetadata = {
            type: editType,
            summary: editSummary,
            changedLines,
            timestamp: Date.now(),
            editId: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };

          // Update file with metadata
          await convex.mutation(api.system.updateFileWithMetadata, {
            internalKey,
            fileId: fileId as Id<"files">,
            content,
            editMetadata
          });

          // Return success message with edit details
          const changedLinesText = changedLines && changedLines.length > 0 
            ? ` (modified lines: ${changedLines.join(', ')})`
            : '';
          
          return `File "${file.name}" updated successfully: ${editSummary}${changedLinesText}`;
        });
      } catch (error) {
        return `Error updating file: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }
  });
};

// Utility function to calculate changed lines (can be used by AI to determine what changed)
export function calculateChangedLines(oldContent: string, newContent: string): number[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const changedLines: number[] = [];
  
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';
    
    if (oldLine !== newLine) {
      changedLines.push(i + 1); // 1-based line numbers
    }
  }
  
  return changedLines;
}