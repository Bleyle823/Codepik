import { useEffect, useState, useCallback, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

export interface AIEditMetadata {
  type: 'ai-edit' | 'ai-create' | 'ai-refactor' | 'ai-fix';
  summary: string;
  changedLines?: number[];
  timestamp: number;
  editId: string;
}

export interface FileWithMetadata {
  _id: Id<"files">;
  name: string;
  content?: string;
  updatedAt?: number;
  lastEditMetadata?: AIEditMetadata;
}

export interface RealTimeSyncState {
  isAIEditing: boolean;
  lastAIEdit?: AIEditMetadata;
  pendingChanges: boolean;
}

export function useRealTimeFileSync(fileId: Id<"files"> | null) {
  const file = useQuery(api.files.getFile, 
    fileId ? { id: fileId } : "skip"
  ) as FileWithMetadata | null | undefined;
  
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [syncState, setSyncState] = useState<RealTimeSyncState>({
    isAIEditing: false,
    pendingChanges: false
  });
  
  const lastKnownContentRef = useRef<string>('');
  const lastProcessedEditIdRef = useRef<string>('');
  const userEditingRef = useRef<boolean>(false);
  
  // Track when user is editing to prevent conflicts
  const markUserEditing = useCallback(() => {
    userEditingRef.current = true;
    setTimeout(() => {
      userEditingRef.current = false;
    }, 1000); // Clear after 1 second of inactivity
  }, []);

  // Apply remote changes to editor
  const applyRemoteChanges = useCallback((
    view: EditorView, 
    newContent: string, 
    editMetadata?: AIEditMetadata
  ) => {
    const currentContent = view.state.doc.toString();
    
    if (currentContent === newContent) {
      return; // No changes needed
    }

    // Don't apply if user is currently editing
    if (userEditingRef.current) {
      setSyncState(prev => ({ ...prev, pendingChanges: true }));
      return;
    }

    try {
      // Calculate minimal diff and apply changes
      const transaction = view.state.update({
        changes: { from: 0, to: view.state.doc.length, insert: newContent },
        annotations: [
          EditorView.updateListener.of(() => {
            // Mark this as an AI edit to prevent feedback loops
            if (editMetadata) {
              setSyncState({
                isAIEditing: true,
                lastAIEdit: editMetadata,
                pendingChanges: false
              });
              
              // Clear AI editing state after animation
              setTimeout(() => {
                setSyncState(prev => ({ ...prev, isAIEditing: false }));
              }, 2000);
            }
          })
        ]
      });
      
      view.dispatch(transaction);
      lastKnownContentRef.current = newContent;
      
    } catch (error) {
      console.error('Failed to apply remote changes:', error);
    }
  }, []);

  // Handle file changes from Convex
  useEffect(() => {
    if (!file || !editorView || !file.content) return;

    const newContent = file.content;
    const editMetadata = file.lastEditMetadata;
    
    // Skip if we've already processed this edit
    if (editMetadata?.editId && editMetadata.editId === lastProcessedEditIdRef.current) {
      return;
    }
    
    // Skip if content hasn't changed
    if (newContent === lastKnownContentRef.current) {
      return;
    }

    // Apply the changes
    applyRemoteChanges(editorView, newContent, editMetadata);
    
    // Track processed edit
    if (editMetadata?.editId) {
      lastProcessedEditIdRef.current = editMetadata.editId;
    }
    
  }, [file?.content, file?.lastEditMetadata, editorView, applyRemoteChanges]);

  // Initialize content when editor view is set
  useEffect(() => {
    if (editorView && file?.content && lastKnownContentRef.current === '') {
      lastKnownContentRef.current = file.content;
    }
  }, [editorView, file?.content]);

  // Apply pending changes when user stops editing
  useEffect(() => {
    if (!syncState.pendingChanges || !file?.content || !editorView) return;
    
    const checkAndApply = () => {
      if (!userEditingRef.current) {
        applyRemoteChanges(editorView, file.content!, file.lastEditMetadata);
      } else {
        // Check again in a bit
        setTimeout(checkAndApply, 500);
      }
    };
    
    checkAndApply();
  }, [syncState.pendingChanges, file?.content, editorView, applyRemoteChanges]);

  return {
    editorView,
    setEditorView,
    syncState,
    markUserEditing,
    file,
    // Utility functions for components
    isAIEditing: syncState.isAIEditing,
    lastAIEdit: syncState.lastAIEdit,
    hasPendingChanges: syncState.pendingChanges
  };
}