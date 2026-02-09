"use client";

import { useState, lazy, Suspense } from "react";
import { Allotment } from "allotment";
import { FaGithub } from "react-icons/fa";
import { BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";

import { FileExplorer } from "./file-explorer";
import { Id } from "../../../../convex/_generated/dataModel";
import { PreviewView } from "./preview-view";
import { ExportPopover } from "./export-popover";

// Lazy load EditorView to avoid Opik import issues on server
const EditorView = lazy(() =>
  import("@/features/editor/components/editor-view").then(m => ({
    default: m.EditorView
  }))
);

// Lazy load all Opik components to avoid server-side import issues
const OpikStatusIndicator = lazy(() =>
  import("@/features/editor/components/opik-status-indicator").then(m => ({
    default: m.OpikStatusIndicator
  }))
);

const LazyAnalyticsDashboard = lazy(() =>
  import("@/features/analytics/components/lazy-analytics-dashboard").then(m => ({
    default: m.LazyAnalyticsDashboard
  }))
);

const LightweightAnalyticsSidebar = lazy(() =>
  import("@/features/analytics/components/lightweight-analytics-sidebar").then(m => ({
    default: m.LightweightAnalyticsSidebar
  }))
);

const OpikAnalyticsOverlay = lazy(() =>
  import("@/features/analytics/components/opik-analytics-overlay").then(m => ({
    default: m.OpikAnalyticsOverlay
  }))
);

const MIN_SIDEBAR_WIDTH = 200;
const MIN_EXPLORER_WIDTH = 200;

interface ProjectIdViewProps {
  projectId: Id<"projects">;
}

type Tab = "editor" | "preview" | "analytics";

export function ProjectIdView({ projectId }: ProjectIdViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("editor");
  const [isAnalyticsSidebarCollapsed, setIsAnalyticsSidebarCollapsed] = useState(false);
  const [isAnalyticsOverlayOpen, setIsAnalyticsOverlayOpen] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case "editor":
        return (
          <Allotment defaultSizes={[25, 50, 25]}>
            <Allotment.Pane minSize={MIN_EXPLORER_WIDTH}>
              <FileExplorer projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane minSize={300}>
              <Suspense fallback={<div className="h-full flex items-center justify-center">Loading editor...</div>}>
                <EditorView projectId={projectId} />
              </Suspense>
            </Allotment.Pane>
            {!isAnalyticsSidebarCollapsed && (
              <Allotment.Pane minSize={MIN_SIDEBAR_WIDTH}>
                <Suspense fallback={<div className="p-4">Loading analytics...</div>}>
                  <LightweightAnalyticsSidebar
                    isCollapsed={isAnalyticsSidebarCollapsed}
                    onToggleCollapse={() => setIsAnalyticsSidebarCollapsed(!isAnalyticsSidebarCollapsed)}
                  />
                </Suspense>
              </Allotment.Pane>
            )}
          </Allotment>
        );
      case "preview":
        return <PreviewView projectId={projectId} />;
      case "analytics":
        return (
          <div className="h-full overflow-auto bg-background">
            <Suspense fallback={<div className="p-8">Loading analytics dashboard...</div>}>
              <LazyAnalyticsDashboard projectId={projectId} />
            </Suspense>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("editor")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "editor"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "preview"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "analytics"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Analytics
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Analytics Button */}
          <button
            onClick={() => setIsAnalyticsOverlayOpen(true)}
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Open Analytics Overlay"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>

          {/* Opik Status Indicator */}
          <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />}>
            <OpikStatusIndicator />
          </Suspense>

          {/* Export */}
          <ExportPopover projectId={projectId} />

          {/* GitHub */}
          <button className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-accent">
            <FaGithub className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>

      {/* Analytics Overlay */}
      {isAnalyticsOverlayOpen && (
        <Suspense fallback={null}>
          <OpikAnalyticsOverlay
            isOpen={isAnalyticsOverlayOpen}
            onClose={() => setIsAnalyticsOverlayOpen(false)}
            projectId={projectId}
          />
        </Suspense>
      )}
    </div>
  );
}