import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state";

import { fetcher } from "./fetcher";
import { suggestionTracer } from "@/features/ai/services/opik-ai-tracer";

// StateEffect: A way to send "messages" to update state.
// We define one effect type for setting the suggestion text.
const setSuggestionEffect = StateEffect.define<string | null>();

// StateField: Holds our suggestion state in the editor.
// - create(): Returns the initial value when the editor loads
// - update(): Called on every transaction (keystroke, etc.) to potentially update the value
const suggestionState = StateField.define<string | null>({
  create() {
    return null;
  },
  update(value, transaction) {
    // Check each effect in this transaction
    // If we find our setSuggestionEffect, return its new value
    // Otherwise, keep the current value unchanged
    for (const effect of transaction.effects) {
      if (effect.is(setSuggestionEffect)) {
        return effect.value;
      }
    }
    return value;
  },
});

// WidgetType: Creates custom DOM elements to display in the editor.
// toDOM() is called by CodeMirror to create the actual HTML element.
class SuggestionWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    span.style.opacity = "0.4"; // Ghost text appearance
    span.style.pointerEvents = "none"; // Don't interfere with clicks
    return span;
  }
}

let debounceTimer: number | null = null;
let isWaitingForSuggestion = false;
const DEBOUNCE_DELAY = 300;
let currentAbortController: AbortController | null = null;

const generatePayload = (view: EditorView, fileName: string) => {
  const code = view.state.doc.toString();
  if (!code || code.trim().length === 0) return null;

  const cursorPosition = view.state.selection.main.head;
  const currentLine = view.state.doc.lineAt(cursorPosition);
  const cursorInLine = cursorPosition - currentLine.from;

  const previousLines: string[] = [];
  const previousLinesToFetch = Math.min(5, currentLine.number - 1);
  for (let i = previousLinesToFetch; i >= 1; i--) {
    previousLines.push(view.state.doc.line(currentLine.number - i).text);
  }

  const nextLines: string[] = [];
  const totalLines = view.state.doc.lines;
  const linesToFetch = Math.min(5, totalLines - currentLine.number);
  for (let i = 1; i <= linesToFetch; i++) {
    nextLines.push(view.state.doc.line(currentLine.number + i).text);
  }

  return {
    fileName,
    code,
    currentLine: currentLine.text,
    previousLines: previousLines.join("\n"),
    textBeforeCursor: currentLine.text.slice(0, cursorInLine),
    textAfterCursor: currentLine.text.slice(cursorInLine),
    nextLines: nextLines.join("\n"),
    lineNumber: currentLine.number,
  }
}


const createDebouncePlugin = (fileName: string) => {
  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        this.triggerSuggestion(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.triggerSuggestion(update.view);
        }
      }

      triggerSuggestion(view: EditorView) {
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
        }

        if (currentAbortController !== null) {
          // Cancel previous trace if it exists? 
          // For now, just abort fetch
          currentAbortController.abort();
        }

        isWaitingForSuggestion = true;

        debounceTimer = window.setTimeout(async () => {
          const payload = generatePayload(view, fileName);
          if (!payload) {
            isWaitingForSuggestion = false;
            view.dispatch({ effects: setSuggestionEffect.of(null) });
            return;
          }
          currentAbortController = new AbortController();

          const startTime = Date.now();
          const traceId = await suggestionTracer.startSuggestionTrace({
            model: "unknown", // Fetcher doesn't expose this yet
            codeContext: payload.code,
            cursorPosition: view.state.selection.main.head,
            triggerType: 'auto',
            fileName
          });

          try {
            const suggestion = await fetcher(
              payload,
              currentAbortController.signal
            );

            if (traceId && suggestion) {
              await suggestionTracer.addSuggestionGenerated(traceId, {
                suggestions: [suggestion],
                confidence: [1.0], // Mock confidence
                processingTime: Date.now() - startTime
              });

              // We don't end the trace here, we wait for acceptance or rejection (new trigger)
              // But for simplicity in this stateless plugin, we might just log generation here
              // and log acceptance as a separate event or try to correlate.
              // For MVP, let's just trace generation success.
              await suggestionTracer.endTrace(traceId, {
                success: true,
                output: suggestion
              });
            }

            isWaitingForSuggestion = false;
            view.dispatch({
              effects: setSuggestionEffect.of(suggestion),
            });
          } catch (error) {
            if (traceId) {
              await suggestionTracer.endTrace(traceId, {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown'
              });
            }
            // ... existing error handling ...
          }
        }, DEBOUNCE_DELAY);
      }

      destroy() {
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
        }

        if (currentAbortController !== null) {
          currentAbortController.abort();
        }
      }
    }
  )
}

const renderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.getDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.startState.field(suggestionState) !== update.state.field(suggestionState)
      ) {
        this.decorations = this.getDecorations(update.view);
      }
    }

    getDecorations(view: EditorView) {
      const suggestion = view.state.field(suggestionState);
      if (!suggestion) {
        return Decoration.none;
      }

      const cursor = view.state.selection.main.head;
      return Decoration.set([
        Decoration.widget({
          widget: new SuggestionWidget(suggestion),
          side: 1,
        }).range(cursor),
      ]);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);


const acceptSuggestionKeymap = keymap.of([
  {
    key: "Tab",
    run: (view) => {
      const suggestion = view.state.field(suggestionState);
      if (!suggestion) {
        return false; // No suggestion? Let Tab do its normal thing (indent)
      }

      const cursor = view.state.selection.main.head;

      // Trace acceptance
      // Note: Ideally we link this to the generation trace, but we don't store traceId in state yet.
      // For now, create a standalone 'acceptance' event or just fire a metric.
      suggestionTracer.addSuggestionAccepted("global-suggestion-trace", 0, suggestion).catch(console.error);

      view.dispatch({
        changes: { from: cursor, insert: suggestion }, // Insert the suggestion text
        selection: { anchor: cursor + suggestion.length }, // Move cursor to end
        effects: setSuggestionEffect.of(null), // Clear the suggestion
      });
      return true; // We handled Tab, don't indent
    },
  },
]);

export const suggestion = (fileName: string) => [
  suggestionState, // Our state storage
  createDebouncePlugin(fileName), // Triggers suggestions on typing
  renderPlugin, // Renders the ghost text
  acceptSuggestionKeymap, // Tab to accept
];
