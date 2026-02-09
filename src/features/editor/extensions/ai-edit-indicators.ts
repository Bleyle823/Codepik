import { Extension } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

// State effects for AI edit management
export const addAIEditEffect = StateEffect.define<{
  from: number;
  to: number;
  editId: string;
  type: 'ai-edit' | 'ai-create' | 'ai-refactor' | 'ai-fix';
  summary: string;
}>();

export const clearAIEditEffect = StateEffect.define<{ editId: string }>();
export const clearAllAIEditsEffect = StateEffect.define();

// AI edit decoration types
const aiEditDecoration = Decoration.mark({
  class: "cm-ai-edit",
  attributes: { 
    "data-ai-edit": "true",
    "title": "AI Edit"
  }
});

const aiCreateDecoration = Decoration.mark({
  class: "cm-ai-create",
  attributes: { 
    "data-ai-edit": "true",
    "title": "AI Created"
  }
});

const aiRefactorDecoration = Decoration.mark({
  class: "cm-ai-refactor",
  attributes: { 
    "data-ai-edit": "true",
    "title": "AI Refactored"
  }
});

const aiFixDecoration = Decoration.mark({
  class: "cm-ai-fix",
  attributes: { 
    "data-ai-edit": "true",
    "title": "AI Fixed"
  }
});

// Get decoration based on edit type
function getDecorationForType(type: string) {
  switch (type) {
    case 'ai-create': return aiCreateDecoration;
    case 'ai-refactor': return aiRefactorDecoration;
    case 'ai-fix': return aiFixDecoration;
    default: return aiEditDecoration;
  }
}

// State field to track AI edits
const aiEditState = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Map existing decorations through document changes
    decorations = decorations.map(tr.changes);
    
    for (let effect of tr.effects) {
      if (effect.is(addAIEditEffect)) {
        const { from, to, type } = effect.value;
        const decoration = getDecorationForType(type);
        decorations = decorations.update({
          add: [decoration.range(from, to)]
        });
      } else if (effect.is(clearAIEditEffect)) {
        // Remove specific edit (would need more complex tracking for this)
        // For now, we'll clear all when requested
        decorations = Decoration.none;
      } else if (effect.is(clearAllAIEditsEffect)) {
        decorations = Decoration.none;
      }
    }
    
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

// Theme for AI edit indicators
const aiEditTheme = EditorView.theme({
  ".cm-ai-edit": {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderLeft: "3px solid #3b82f6",
    paddingLeft: "2px",
    animation: "ai-edit-pulse 2s ease-in-out",
    borderRadius: "2px"
  },
  ".cm-ai-create": {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderLeft: "3px solid #22c55e",
    paddingLeft: "2px",
    animation: "ai-create-pulse 2s ease-in-out",
    borderRadius: "2px"
  },
  ".cm-ai-refactor": {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderLeft: "3px solid #a855f7",
    paddingLeft: "2px",
    animation: "ai-refactor-pulse 2s ease-in-out",
    borderRadius: "2px"
  },
  ".cm-ai-fix": {
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    borderLeft: "3px solid #f97316",
    paddingLeft: "2px",
    animation: "ai-fix-pulse 2s ease-in-out",
    borderRadius: "2px"
  },
  "@keyframes ai-edit-pulse": {
    "0%": { backgroundColor: "rgba(59, 130, 246, 0.4)" },
    "50%": { backgroundColor: "rgba(59, 130, 246, 0.2)" },
    "100%": { backgroundColor: "rgba(59, 130, 246, 0.15)" }
  },
  "@keyframes ai-create-pulse": {
    "0%": { backgroundColor: "rgba(34, 197, 94, 0.4)" },
    "50%": { backgroundColor: "rgba(34, 197, 94, 0.2)" },
    "100%": { backgroundColor: "rgba(34, 197, 94, 0.15)" }
  },
  "@keyframes ai-refactor-pulse": {
    "0%": { backgroundColor: "rgba(168, 85, 247, 0.4)" },
    "50%": { backgroundColor: "rgba(168, 85, 247, 0.2)" },
    "100%": { backgroundColor: "rgba(168, 85, 247, 0.15)" }
  },
  "@keyframes ai-fix-pulse": {
    "0%": { backgroundColor: "rgba(249, 115, 22, 0.4)" },
    "50%": { backgroundColor: "rgba(249, 115, 22, 0.2)" },
    "100%": { backgroundColor: "rgba(249, 115, 22, 0.15)" }
  }
});

// Plugin to handle AI edit highlighting based on line numbers
const aiEditPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet = Decoration.none;
  
  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }
  
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }
  
  buildDecorations(view: EditorView): DecorationSet {
    // This will be updated by the real-time sync hook
    return this.decorations;
  }
}, {
  decorations: v => v.decorations
});

// Utility functions for managing AI edits
export function highlightAIEdit(
  view: EditorView, 
  changedLines: number[], 
  editType: 'ai-edit' | 'ai-create' | 'ai-refactor' | 'ai-fix' = 'ai-edit',
  summary: string = 'AI Edit'
) {
  if (!changedLines || changedLines.length === 0) {
    // Highlight entire document if no specific lines
    const doc = view.state.doc;
    view.dispatch({
      effects: addAIEditEffect.of({
        from: 0,
        to: doc.length,
        editId: `edit_${Date.now()}`,
        type: editType,
        summary
      })
    });
    return;
  }
  
  // Highlight specific lines
  const doc = view.state.doc;
  const effects = changedLines.map(lineNum => {
    const line = doc.line(Math.min(lineNum, doc.lines));
    return addAIEditEffect.of({
      from: line.from,
      to: line.to,
      editId: `edit_${Date.now()}_${lineNum}`,
      type: editType,
      summary
    });
  });
  
  view.dispatch({ effects });
  
  // Auto-clear highlights after 3 seconds
  setTimeout(() => {
    view.dispatch({ effects: clearAllAIEditsEffect.of() });
  }, 3000);
}

export function clearAIEdits(view: EditorView) {
  view.dispatch({
    effects: clearAllAIEditsEffect.of()
  });
}

// Main extension
export function aiEditIndicators(): Extension {
  return [
    aiEditState,
    aiEditTheme,
    aiEditPlugin
  ];
}

// Helper hook for React components
export function useAIEditHighlighter(editorView: EditorView | null) {
  const highlightEdit = (
    changedLines?: number[], 
    editType: 'ai-edit' | 'ai-create' | 'ai-refactor' | 'ai-fix' = 'ai-edit',
    summary: string = 'AI Edit'
  ) => {
    if (!editorView) return;
    highlightAIEdit(editorView, changedLines || [], editType, summary);
  };
  
  const clearHighlights = () => {
    if (!editorView) return;
    clearAIEdits(editorView);
  };
  
  return {
    highlightEdit,
    clearHighlights
  };
}