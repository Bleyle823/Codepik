"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalSquareIcon } from "lucide-react";

import "@xterm/xterm/css/xterm.css";

interface InteractiveTerminalProps {
  output: string;
  currentDirectory: string;
  onInput?: (input: string) => void;
  isInteractive?: boolean;
}

export const InteractiveTerminal = ({ 
  output, 
  currentDirectory, 
  onInput, 
  isInteractive = false 
}: InteractiveTerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastLengthRef = useRef(0);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      convertEol: true,
      disableStdin: false, // Enable stdin for keyboard interaction
      fontSize: 12,
      fontFamily: "monospace",
      theme: { background: "#1f2228" },
      cursorBlink: true,
      cursorStyle: "block",
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Add keyboard handler
    terminal.onKey(({ key, domEvent }) => {
      if (isInteractive && onInput) {
        // Handle special keys
        if (domEvent.key === 'Enter') {
          onInput('\r');
        } else if (domEvent.key === 'Backspace') {
          onInput('\b');
        } else if (domEvent.key === 'Tab') {
          onInput('\t');
          domEvent.preventDefault();
        } else if (domEvent.ctrlKey) {
          // Handle Ctrl combinations
          if (domEvent.key === 'c') {
            onInput('\x03'); // Ctrl+C
          } else if (domEvent.key === 'l') {
            // Ctrl+L for clear (but don't prevent default to allow our clear functionality)
            terminal.clear();
            lastLengthRef.current = 0;
            domEvent.preventDefault();
            return;
          }
        } else if (key.length === 1) {
          // Regular character
          onInput(key);
        }
      } else {
        // Non-interactive mode - just handle clear shortcuts
        if (domEvent.key === 'Backspace' || (domEvent.ctrlKey && domEvent.key === 'l')) {
          terminal.clear();
          lastLengthRef.current = 0;
          domEvent.preventDefault();
        }
      }
    });

    // Focus terminal for input
    terminal.focus();

    // Write existing output on mount
    if (output) {
      terminal.write(output);
      lastLengthRef.current = output.length;
    }

    requestAnimationFrame(() => fitAddon.fit());

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [isInteractive, onInput]);

  // Write output
  useEffect(() => {
    if (!terminalRef.current) return;

    if (output.length < lastLengthRef.current) {
      terminalRef.current.clear();
      lastLengthRef.current = 0;
    }

    const newData = output.slice(lastLengthRef.current);
    if (newData) {
      terminalRef.current.write(newData);
      lastLengthRef.current = output.length;
    }
  }, [output]);

  // Focus terminal when it becomes interactive
  useEffect(() => {
    if (isInteractive && terminalRef.current) {
      terminalRef.current.focus();
    }
  }, [isInteractive]);

  return (
    <div className="h-full flex flex-col bg-background border-t">
      <div className="h-7 flex items-center px-3 text-xs gap-1.5 text-muted-foreground border-b border-border/50 shrink-0">
        <TerminalSquareIcon className="size-3" />
        <span>Terminal</span>
        {isInteractive && (
          <span className="ml-auto text-green-500">● Interactive</span>
        )}
        <span className="text-blue-400">{currentDirectory}</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 p-3 [&_.xterm]:h-full! [&_.xterm-viewport]:h-full! [&_.xterm-screen]:h-full! bg-sidebar"
      />
    </div>
  );
};