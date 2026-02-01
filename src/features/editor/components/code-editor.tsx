import { useEffect, useMemo, useRef } from "react"
import { EditorView, keymap } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentWithTab } from "@codemirror/commands";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";

import { minimap } from "../extensions/minimap";
import { customTheme } from "../extensions/theme";
import { getLanguageExtension } from "../extensions/language-extension";
import { customSetup } from "../extensions/custom-setup";
import { suggestion } from "../extensions/suggestion";
import { quickEdit } from "../extensions/quick-edit";
import { selectionTooltip } from "../extensions/selection-tooltip";
import { aiEditIndicators, useAIEditHighlighter } from "../extensions/ai-edit-indicators";
import { useRealTimeFileSync } from "../hooks/use-real-time-file-sync";
import { AIEditingOverlay, AIEditSuccessNotification } from "./ai-editing-overlay";
// Opik integration moved to server-side API
import { Id } from "../../../../convex/_generated/dataModel";

interface Props {
  fileName: string;
  initialValue?: string;
  onChange: (value: string) => void;
  fileId?: Id<"files">; // Add fileId for real-time sync
}

export const CodeEditor = ({ 
  fileName, 
  initialValue = "",
  onChange,
  fileId
}: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Real-time sync for AI edits
  const { 
    setEditorView, 
    syncState, 
    markUserEditing, 
    isAIEditing, 
    lastAIEdit 
  } = useRealTimeFileSync(fileId || null);

  const languageExtension = useMemo(() => {
    return getLanguageExtension(fileName)
  }, [fileName])

  // AI edit highlighter
  const { highlightEdit } = useAIEditHighlighter(viewRef.current);

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      doc: initialValue,
      parent: editorRef.current,
      extensions: [
        oneDark,
        customTheme,
        customSetup,
        languageExtension,
        suggestion(fileName),
        quickEdit(fileName),
        selectionTooltip(),
        aiEditIndicators(), // Add AI edit indicators
        keymap.of([indentWithTab]),
        minimap(),
        indentationMarkers(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // Mark user editing for conflict prevention
            markUserEditing();
            
            // Track changes with server-side Opik API
            const oldContent = update.startState.doc.toString();
            const newContent = update.state.doc.toString();
            
            // Send analytics to server (non-blocking)
            fetch('/api/opik/track-keystroke', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                oldContent: oldContent.length,
                newContent: newContent.length,
                linesChanged: Math.abs(newContent.split('\n').length - oldContent.split('\n').length),
                timestamp: Date.now()
              })
            }).catch(() => {}); // Ignore errors for analytics
            
            onChange(newContent);
          }
        })
      ],
    });

    viewRef.current = view;
    setEditorView(view); // Register with real-time sync

    return () => {
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValue is only used for initial document
  }, [languageExtension, setEditorView, markUserEditing, onChange]);

  // Highlight AI edits when they occur
  useEffect(() => {
    if (lastAIEdit && viewRef.current) {
      highlightEdit(
        lastAIEdit.changedLines,
        lastAIEdit.type,
        lastAIEdit.summary
      );
    }
  }, [lastAIEdit, highlightEdit]);

  return (
    <div className="relative size-full">
      <div ref={editorRef} className="size-full pl-4 bg-background" />
      
      {/* AI Editing Overlay */}
      {isAIEditing && (
        <AIEditingOverlay
          editingState={{
            isEditing: true,
            currentOperation: lastAIEdit?.summary || 'Processing...',
            editType: lastAIEdit?.type,
            canCancel: false // For now, don't allow canceling
          }}
        />
      )}
      
      {/* Success notification when AI edit completes */}
      {lastAIEdit && !isAIEditing && (
        <AIEditSuccessNotification
          editSummary={lastAIEdit.summary}
          editType={lastAIEdit.type}
        />
      )}
    </div>
  );
};
