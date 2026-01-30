import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    ownerId: v.string(), // User ID from authentication
    updatedAt: v.number(),
    importStatus: v.optional(v.union(v.literal("importing"), v.literal("completed"), v.literal("failed"))),
    settings: v.optional(v.object({
      installCommand: v.optional(v.string()),
      devCommand: v.optional(v.string()),
    })),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_status", ["ownerId", "importStatus"]),

  files: defineTable({
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    type: v.union(v.literal("file"), v.literal("directory")),
    content: v.optional(v.string()),
    path: v.string(),
    storageId: v.optional(v.id("_storage")), // For binary files
    updatedAt: v.optional(v.number()),
    // AI Edit Metadata for real-time synchronization
    lastEditMetadata: v.optional(v.object({
      type: v.union(v.literal("ai-edit"), v.literal("ai-create"), v.literal("ai-refactor"), v.literal("ai-fix")),
      summary: v.string(),
      changedLines: v.optional(v.array(v.number())),
      timestamp: v.number(),
      editId: v.string(),
    })),
  })
    .index("by_project", ["projectId"])
    .index("by_parent", ["parentId"])
    .index("by_project_parent", ["projectId", "parentId"])
    .index("by_updated_at", ["updatedAt"]),

  conversations: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    status: v.optional(v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("cancelled"))),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_project_status", ["projectId", "status"]),
});