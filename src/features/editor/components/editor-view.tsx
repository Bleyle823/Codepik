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
import { Id } from "../../../../convex/_generated/dataModel";
import { AlertTriangleIcon, TerminalSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEBOUNCE_MS = 1500;

export const EditorView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  
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

  // Cleanup pending debounced updates on unmount or file change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeTabId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <TopNavigation projectId={projectId} />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 rounded-none mr-2"
          title="Toggle terminal"
          onClick={() => setShowTerminal((value) => !value)}
        >
          <TerminalSquareIcon className="size-3" />
        </Button>
      </div>
      {activeTabId && <FileBreadcrumbs projectId={projectId} />}
      <div className="flex-1 min-h-0 bg-background">
        {showTerminal ? (
          <Allotment vertical>
            <Allotment.Pane>
              {!activeFile && (
                <div className="size-full flex items-center justify-center">
                  <Image
                    src="/logo-alt.svg"
                    alt="Polaris"
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
                  fileId={activeFile._id} // Pass fileId for real-time sync
                  onChange={(content: string) => {
                    if (timeoutRef.current) {
                      clearTimeout(timeoutRef.current);
                    }

                    timeoutRef.current = setTimeout(() => {
                      updateFile({ id: activeFile._id, content });
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
                  alt="Polaris"
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
                fileId={activeFile._id} // Pass fileId for real-time sync
                onChange={(content: string) => {
                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                  }

                  timeoutRef.current = setTimeout(() => {
                    updateFile({ id: activeFile._id, content });
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
  );
};
