"use client";

import { useState } from "react";
import { Allotment } from "allotment";
import { FaGithub } from "react-icons/fa";
import { BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { EditorView } from "@/features/editor/components/editor-view";

import { FileExplorer } from "./file-explorer";
import { Id } from "../../../../convex/_generated/dataModel";
import { PreviewView } from "./preview-view";
import { ExportPopover } from "./export-popover";
import { OpikStatusIndicator } from "@/features/editor/components/opik-status-indicator";
import { LazyAnalyticsDashboard } from "@/features/analytics/components/lazy-analytics-dashboard";
import { LightweightAnalyticsSidebar } from "@/features/analytics/components/lightweight-analytics-sidebar";
import { OpikAnalyticsOverlay } from "@/features/analytics/components/opik-analytics-overlay";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 350;
const DEFAULT_MAIN_SIZE = 1000;

const Tab = ({
  label,
  isActive,
  onClick
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 h-full px-3 cursor-pointer text-muted-foreground border-r hover:bg-accent/30",
        isActive && "bg-background text-foreground"
      )}
    >
      <span className="text-sm">{label}</span>
    </div>
  );
};

export const ProjectIdView = ({ 
  projectId
}: { 
  projectId: Id<"projects">
}) => {
  const [activeView, setActiveView] = useState<"editor" | "preview" | "analytics">("editor");
  const [isAnalyticsSidebarCollapsed, setIsAnalyticsSidebarCollapsed] = useState(false);
  const [isAnalyticsOverlayOpen, setIsAnalyticsOverlayOpen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <nav className="h-8.75 flex items-center bg-sidebar border-b">
        <Tab
          label="Code"
          isActive={activeView === "editor"}
          onClick={() => setActiveView("editor")}
        />
        <Tab
          label="Preview"
          isActive={activeView === "preview"}
          onClick={() => setActiveView("preview")}
        />
        <Tab
          label="Analytics"
          isActive={activeView === "analytics"}
          onClick={() => setActiveView("analytics")}
        />
        <div className="flex-1 flex justify-end items-center h-full gap-2 pr-2">
          <OpikStatusIndicator />
          <button
            onClick={() => setIsAnalyticsOverlayOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 rounded border text-blue-700 dark:text-blue-300 transition-colors"
            title="Open Analytics Dashboard"
          >
            <BarChart3 className="h-3 w-3" />
            <span>Analytics</span>
          </button>
          <ExportPopover projectId={projectId} />
        </div>
      </nav>
      <div className="flex-1 relative">
        <div className={cn(
          "absolute inset-0",
          activeView === "editor" ? "visible" : "invisible"
        )}>
          <Allotment defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE, 300]}>
            <Allotment.Pane
              snap
              minSize={MIN_SIDEBAR_WIDTH}
              maxSize={MAX_SIDEBAR_WIDTH}
              preferredSize={DEFAULT_SIDEBAR_WIDTH}
            >
              <FileExplorer projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane>
              <EditorView projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane
              snap
              minSize={isAnalyticsSidebarCollapsed ? 50 : 280}
              maxSize={isAnalyticsSidebarCollapsed ? 50 : 500}
              preferredSize={isAnalyticsSidebarCollapsed ? 50 : 320}
            >
              <LightweightAnalyticsSidebar 
                isCollapsed={isAnalyticsSidebarCollapsed}
                onToggleCollapse={() => setIsAnalyticsSidebarCollapsed(!isAnalyticsSidebarCollapsed)}
              />
            </Allotment.Pane>
          </Allotment>
        </div>
        <div className={cn(
          "absolute inset-0",
          activeView === "preview" ? "visible" : "invisible"
        )}>
          <PreviewView projectId={projectId} />
        </div>
        <div className={cn(
          "absolute inset-0",
          activeView === "analytics" ? "visible" : "invisible"
        )}>
          <div className="h-full overflow-auto bg-background">
            <LazyAnalyticsDashboard />
          </div>
        </div>
      </div>
      
      {/* Analytics Overlay */}
      <OpikAnalyticsOverlay 
        isOpen={isAnalyticsOverlayOpen}
        onClose={() => setIsAnalyticsOverlayOpen(false)}
      />
    </div>
  );
};
