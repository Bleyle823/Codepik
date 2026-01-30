import { useCallback, useEffect, useRef, useState } from "react";
import { WebContainer } from "@webcontainer/api";

import { 
  buildFileTree,
  getFilePath
} from "@/features/preview/utils/file-tree";
import { useFiles, useFile } from "@/features/projects/hooks/use-files";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// Singleton WebContainer instance
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const getWebContainer = async (): Promise<WebContainer> => {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" });
  }

  webcontainerInstance = await bootPromise;
  return webcontainerInstance;
};

const teardownWebContainer = () => {
  if (webcontainerInstance) {
    webcontainerInstance.teardown();
    webcontainerInstance = null;
  }
  bootPromise = null;
};

interface UseInteractiveWebContainerProps {
  projectId: Id<"projects">;
  enabled: boolean;
  activeFileId?: Id<"files"> | null;
  settings?: {
    installCommand?: string;
    devCommand?: string;
  };
};

export const useInteractiveWebContainer = ({
  projectId,
  enabled,
  activeFileId,
  settings,
}: UseInteractiveWebContainerProps) => {
  const [status, setStatus] = useState<
    "idle" | "booting" | "installing" | "running" | "error"
  >("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [currentDirectory, setCurrentDirectory] = useState("/");
  const [shellProcess, setShellProcess] = useState<any>(null);

  const containerRef = useRef<WebContainer | null>(null);
  const hasStartedRef = useRef(false);
  const inputBufferRef = useRef("");

  // Fetch files from Convex (auto-updates on changes)
  const files = useFiles(projectId);
  const activeFile = useFile(activeFileId);

  // Get directory of active file
  const getActiveDirectory = useCallback(() => {
    if (!activeFile || !files) return "/";
    
    // Create files map for getFilePath utility
    const filesMap = new Map(files.map((f) => [f._id, f]));
    
    // Get full file path as string
    const fullPath = getFilePath(activeFile, filesMap);
    
    // Extract directory by removing filename
    const pathParts = fullPath.split("/");
    pathParts.pop(); // Remove filename
    const directory = pathParts.join("/") || "/";
    return directory === "" ? "/" : directory;
  }, [activeFile, files]);

  // Update current directory when active file changes
  useEffect(() => {
    const newDirectory = getActiveDirectory();
    if (newDirectory !== currentDirectory) {
      setCurrentDirectory(newDirectory);
    }
  }, [getActiveDirectory, currentDirectory]);

  // Execute command in WebContainer
  const executeCommand = useCallback(async (command: string) => {
    const container = containerRef.current;
    if (!container || status !== "running") return;

    try {
      const appendOutput = (data: string) => {
        setTerminalOutput((prev) => prev + data);
      };

      // Change to current directory first
      appendOutput(`$ cd ${currentDirectory} && ${command}\n`);
      
      const [bin, ...args] = command.split(" ");
      const process = await container.spawn(bin, args, {
        cwd: currentDirectory,
      });

      process.output.pipeTo(
        new WritableStream({
          write(data) {
            appendOutput(data);
          },
        })
      );

      const exitCode = await process.exit;
      if (exitCode !== 0) {
        appendOutput(`\nProcess exited with code ${exitCode}\n`);
      }
      
      // Add prompt for next command
      appendOutput(`\n${currentDirectory}$ `);
    } catch (error) {
      setTerminalOutput((prev) => prev + `Error: ${error instanceof Error ? error.message : "Unknown error"}\n${currentDirectory}$ `);
    }
  }, [currentDirectory, status]);

  // Start interactive shell
  const startInteractiveShell = useCallback(async () => {
    const container = containerRef.current;
    if (!container || shellProcess) return;

    try {
      const appendOutput = (data: string) => {
        setTerminalOutput((prev) => prev + data);
      };

      // Start a shell process
      appendOutput(`${currentDirectory}$ `);
      
      // Create a simple shell simulation
      const shell = {
        write: (input: string) => {
          if (input === '\r' || input === '\n') {
            const command = inputBufferRef.current.trim();
            if (command) {
              executeCommand(command);
              inputBufferRef.current = "";
            } else {
              appendOutput(`\n${currentDirectory}$ `);
            }
          } else if (input === '\b' || input === '\x7f') {
            // Backspace
            if (inputBufferRef.current.length > 0) {
              inputBufferRef.current = inputBufferRef.current.slice(0, -1);
              appendOutput('\b \b'); // Move back, write space, move back again
            }
          } else if (input >= ' ') {
            // Printable character
            inputBufferRef.current += input;
            appendOutput(input);
          }
        },
      };

      setShellProcess(shell);
    } catch (error) {
      console.error("Failed to start interactive shell:", error);
    }
  }, [currentDirectory, shellProcess, executeCommand]);

  // Initial boot and mount
  useEffect(() => {
    if (!enabled || !files || files.length === 0 || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const start = async () => {
      try {
        setStatus("booting");
        setError(null);
        setTerminalOutput("");

        const appendOutput = (data: string) => {
          setTerminalOutput((prev) => prev + data);
        };

        const container = await getWebContainer();
        containerRef.current = container;

        const fileTree = buildFileTree(files);
        await container.mount(fileTree);

        container.on("server-ready", (_port, url) => {
          setPreviewUrl(url);
          setStatus("running");
          // Start interactive shell when container is ready
          setTimeout(() => startInteractiveShell(), 1000);
        });

        setStatus("installing");

        // Parse install command (default: npm install)
        const installCmd = settings?.installCommand || "npm install";
        const [installBin, ...installArgs] = installCmd.split(" ");
        appendOutput(`$ ${installCmd}\n`)
        const installProcess = await container.spawn(installBin, installArgs);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendOutput(data);
            },
          })
        );
        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          throw new Error(
            `${installCmd} failed with code ${installExitCode}`
          );
        }

        // Parse dev command (default: npm run dev)
        const devCmd = settings?.devCommand || "npm run dev";
        const [devBin, ...devArgs] = devCmd.split(" ");
        appendOutput(`\n$ ${devCmd}\n`);
        const devProcess = await container.spawn(devBin, devArgs);
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendOutput(data);
            },
          })
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unknown error");
        setStatus("error");
      }
    };

    start();
  }, [
    enabled,
    files,
    restartKey,
    settings?.devCommand,
    settings?.installCommand,
    startInteractiveShell,
  ]);

  // Sync file changes (hot-reload)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !files || status !== "running") return;

    const filesMap = new Map(files.map((f) => [f._id, f]));

    for (const file of files) {
      if (file.type !== "file" || file.storageId || !file.content) continue;

      const filePath = getFilePath(file, filesMap);
      container.fs.writeFile(filePath, file.content);
    }
  }, [files, status]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      hasStartedRef.current = false;
      setStatus("idle");
      setPreviewUrl(null);
      setError(null);
      setShellProcess(null);
      inputBufferRef.current = "";
    }
  }, [enabled]);

  // Restart the entire WebContainer process
  const restart = useCallback(() => {
    teardownWebContainer();
    containerRef.current = null;
    hasStartedRef.current = false;
    setStatus("idle");
    setPreviewUrl(null);
    setError(null);
    setShellProcess(null);
    inputBufferRef.current = "";
    setRestartKey((k) => k + 1);
  }, []);

  // Send input to shell
  const sendInput = useCallback((input: string) => {
    if (shellProcess) {
      shellProcess.write(input);
    }
  }, [shellProcess]);

  return {
    status,
    previewUrl,
    error,
    restart,
    terminalOutput,
    currentDirectory,
    executeCommand,
    sendInput,
    isInteractive: !!shellProcess,
  };
};