"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Allotment } from "allotment";

import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";
import { useInteractiveWebContainer } from "@/features/preview/hooks/use-interactive-webcontainer";
import { useProject } from "@/features/projects/hooks/use-projects";

import { CodeEditor } from "./code-editor";
import { useEditor } from "../hooks/use-editor";
import { TopNavigation } from "./top-navigation";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { InteractiveTerminal } from "./interactive-terminal";
// Opik integration (client-side components only)
import { OpikStatus } from "./opik-status";
import { editorOpikIntegration } from "../services/editor-opik-integration";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  AlertTriangleIcon,
  TerminalSquareIcon,
  BarChart3Icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";

const DEBOUNCE_MS = 1500;

export const EditorView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showOpikAnalytics, setShowOpikAnalytics] = useState(false);

  const project = useProject(projectId);
  const {
    terminalOutput,
    currentDirectory,
    sendInput,
    isInteractive
  } = useInteractiveWebContainer({
    projectId,
    enabled: true,
    activeFileId: activeTabId,
    settings: project?.settings,
  });

  const isActiveFileBinary = activeFile && activeFile.storageId;
  const isActiveFileText = activeFile && !activeFile.storageId;

  // Initialize Opik session when editor loads
  useEffect(() => {
    const initOpikSession = async () => {
      if (activeFile && project) {
        await editorOpikIntegration.startSession({
          userId: 'current-user', // Would get from auth context
          projectId: projectId,
          fileName: activeFile.name,
          fileId: activeTabId
        });
      }
    };

    initOpikSession();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeTabId, activeFile, project, projectId]);

  // Track code changes with Opik
  const trackCodeChange = async (oldContent: string, newContent: string) => {
    if (activeFile) {
      await editorOpikIntegration.trackCodeChange(
        oldContent,
        newContent,
        activeFile.name
      );
    }
  };

  // Opik metrics loading temporarily disabled

  // Enhanced file update with server-side Opik tracing
  const handleFileUpdate = async (content: string) => {
    if (!activeFile) return;

    try {
      // Send to server-side API for Opik tracing
      await fetch('/api/opik/trace-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: activeFile._id,
          fileName: activeFile.name,
          content,
          editType: 'manual',
          userId: 'current-user' // Would get from auth
        })
      });

      // Update file in database
      await updateFile({ id: activeFile._id, content });
    } catch (error) {
      console.error('File update error:', error);
      // Fallback to regular update
      await updateFile({ id: activeFile._id, content });
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between">
          <TopNavigation projectId={projectId} />
          <div className="flex items-center gap-1 mr-2">
            {/* Opik Status Indicator */}
            <OpikStatus
              onToggleAnalytics={() => setShowOpikAnalytics((value) => !value)}
              showAnalytics={showOpikAnalytics}
            />

            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-none"
              title="Toggle terminal"
              onClick={() => setShowTerminal((value) => !value)}
            >
              <TerminalSquareIcon className="size-3" />
            </Button>
          </div>
        </div>
        {activeTabId && <FileBreadcrumbs projectId={projectId} />}
        <div className="flex-1 min-h-0 bg-background">
          {showOpikAnalytics ? (
            <Allotment>
              <Allotment.Pane minSize={300} maxSize={400} preferredSize={350}>
                <div className="h-full bg-sidebar border-r p-4">
                  <h3 className="text-sm font-medium mb-2">Opik Analytics</h3>
                  <p className="text-xs text-muted-foreground">Coming soon...</p>
                </div>
              </Allotment.Pane>
              <Allotment.Pane>
                {showTerminal ? (
                  <Allotment vertical>
                    <Allotment.Pane>
                      {!activeFile && (
                        <div className="size-full flex items-center justify-center">
                          <Image
                            src="/logo-alt.svg"
                            alt="Codepik"
                            width={50}
                            height={50}
                            className="opacity-25"
                          />
                        </div>
                      )}
                      {isActiveFileText && (
                        <CodeEditor
                          key={activeFile._id}
                          fileName={activeFile.name}
                          initialValue={activeFile.content}
                          fileId={activeFile._id}
                          onChange={(content: string) => {
                            if (timeoutRef.current) {
                              clearTimeout(timeoutRef.current);
                            }

                            timeoutRef.current = setTimeout(() => {
                              handleFileUpdate(content);
                            }, DEBOUNCE_MS);
                          }}
                        />
                      )}
                      {isActiveFileBinary && (
                        <div className="size-full flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2.5 max-w-md text-center">
                            <AlertTriangleIcon className="size-10 text-yellow-500" />
                            <p className="text-sm">
                              The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.
                            </p>
                          </div>
                        </div>
                      )}
                    </Allotment.Pane>
                    <Allotment.Pane minSize={100} maxSize={500} preferredSize={200}>
                      <InteractiveTerminal
                        output={terminalOutput}
                        currentDirectory={currentDirectory}
                        onInput={sendInput}
                        isInteractive={isInteractive}
                      />
                    </Allotment.Pane>
                  </Allotment>
                ) : (
                  <>
                    {!activeFile && (
                      <div className="size-full flex items-center justify-center">
                        <Image
                          src="/logo-alt.svg"
                          alt="Codepik"
                          width={50}
                          height={50}
                          className="opacity-25"
                        />
                      </div>
                    )}
                    {isActiveFileText && (
                      <CodeEditor
                        key={activeFile._id}
                        fileName={activeFile.name}
                        initialValue={activeFile.content}
                        fileId={activeFile._id}
                        onChange={(content: string) => {
                          if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                          }

                          timeoutRef.current = setTimeout(() => {
                            handleFileUpdate(content);
                          }, DEBOUNCE_MS);
                        }}
                      />
                    )}
                    {isActiveFileBinary && (
                      <div className="size-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2.5 max-w-md text-center">
                          <AlertTriangleIcon className="size-10 text-yellow-500" />
                          <p className="text-sm">
                            The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Allotment.Pane>
            </Allotment>
          ) : showTerminal ? (
            <Allotment vertical>
              <Allotment.Pane>
                {!activeFile && (
                  <div className="size-full flex items-center justify-center">
                    <Image
                      src="/logo-alt.svg"
                      alt="Codepik"
                      width={50}
                      height={50}
                      className="opacity-25"
                    />
                  </div>
                )}
                {isActiveFileText && (
                  <CodeEditor
                    key={activeFile._id}
                    fileName={activeFile.name}
                    initialValue={activeFile.content}
                    fileId={activeFile._id}
                    onChange={(content: string) => {
                      if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                      }

                      timeoutRef.current = setTimeout(() => {
                        handleFileUpdate(content);
                      }, DEBOUNCE_MS);
                    }}
                  />
                )}
                {isActiveFileBinary && (
                  <div className="size-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2.5 max-w-md text-center">
                      <AlertTriangleIcon className="size-10 text-yellow-500" />
                      <p className="text-sm">
                        The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.
                      </p>
                    </div>
                  </div>
                )}
              </Allotment.Pane>
              <Allotment.Pane minSize={100} maxSize={500} preferredSize={200}>
                <InteractiveTerminal
                  output={terminalOutput}
                  currentDirectory={currentDirectory}
                  onInput={sendInput}
                  isInteractive={isInteractive}
                />
              </Allotment.Pane>
            </Allotment>
          ) : (
            <>
              {!activeFile && (
                <div className="size-full flex items-center justify-center">
                  <Image
                    src="/logo-alt.svg"
                    alt="Codepik"
                    width={50}
                    height={50}
                    className="opacity-25"
                  />
                </div>
              )}
              {isActiveFileText && (
                <CodeEditor
                  key={activeFile._id}
                  fileName={activeFile.name}
                  initialValue={activeFile.content}
                  fileId={activeFile._id}
                  onChange={(content: string) => {
                    if (timeoutRef.current) {
                      clearTimeout(timeoutRef.current);
                    }

                    timeoutRef.current = setTimeout(() => {
                      handleFileUpdate(content);
                    }, DEBOUNCE_MS);
                  }}
                />
              )}
              {isActiveFileBinary && (
                <div className="size-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2.5 max-w-md text-center">
                    <AlertTriangleIcon className="size-10 text-yellow-500" />
                    <p className="text-sm">
                      The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};