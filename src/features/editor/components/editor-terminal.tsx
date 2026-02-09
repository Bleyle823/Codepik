"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalSquareIcon } from "lucide-react";

import "@xterm/xterm/css/xterm.css";

interface EditorTerminalProps {
  output: string;
}

export const EditorTerminal = ({ output }: EditorTerminalProps) => {
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
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Add keyboard handler for clearing terminal
    terminal.onKey(({ key, domEvent }) => {
      // Clear terminal on Backspace key
      if (domEvent.key === 'Backspace') {
        terminal.clear();
        lastLengthRef.current = 0;
        domEvent.preventDefault();
      }
      // Clear terminal on Ctrl+L (common terminal clear shortcut)
      else if (domEvent.ctrlKey && domEvent.key === 'l') {
        terminal.clear();
        lastLengthRef.current = 0;
        domEvent.preventDefault();
      }
    });

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
  }, []);

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

  return (
    <div className="h-full flex flex-col bg-background border-t">
      <div className="h-7 flex items-center px-3 text-xs gap-1.5 text-muted-foreground border-b border-border/50 shrink-0">
        <TerminalSquareIcon className="size-3" />
        Terminal
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 p-3 [&_.xterm]:h-full! [&_.xterm-viewport]:h-full! [&_.xterm-screen]:h-full! bg-sidebar"
      />
    </div>
  );
};