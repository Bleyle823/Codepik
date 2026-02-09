'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Bot, 
  FileEdit, 
  Code, 
  Wrench, 
  Bug,
  X,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AIEditingState {
  isEditing: boolean;
  currentOperation?: string;
  progress?: number;
  editType?: 'ai-edit' | 'ai-create' | 'ai-refactor' | 'ai-fix';
  filesBeingEdited?: Array<{
    id: string;
    name: string;
    currentOperation: string;
    progress?: number;
  }>;
  estimatedTimeRemaining?: number;
  canCancel?: boolean;
}

interface AIEditingOverlayProps {
  editingState: AIEditingState;
  onCancel?: () => void;
  className?: string;
}

const editTypeIcons = {
  'ai-edit': FileEdit,
  'ai-create': Code,
  'ai-refactor': Wrench,
  'ai-fix': Bug
};

const editTypeColors = {
  'ai-edit': 'bg-blue-500',
  'ai-create': 'bg-green-500',
  'ai-refactor': 'bg-purple-500',
  'ai-fix': 'bg-orange-500'
};

const editTypeLabels = {
  'ai-edit': 'Editing',
  'ai-create': 'Creating',
  'ai-refactor': 'Refactoring',
  'ai-fix': 'Fixing'
};

export function AIEditingOverlay({ 
  editingState, 
  onCancel, 
  className = '' 
}: AIEditingOverlayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!editingState.isEditing) {
      setTimeElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [editingState.isEditing]);

  if (!editingState.isEditing) return null;

  const Icon = editingState.editType ? editTypeIcons[editingState.editType] : Bot;
  const colorClass = editingState.editType ? editTypeColors[editingState.editType] : 'bg-blue-500';
  const label = editingState.editType ? editTypeLabels[editingState.editType] : 'Processing';

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 right-4 z-50 ${className}`}
      >
        <Card className="w-80 shadow-lg border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${colorClass} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">AI is {label.toLowerCase()} your code</h4>
                  <p className="text-xs text-muted-foreground">
                    {editingState.currentOperation || 'Processing your request...'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-6 w-6 p-0"
                >
                  <motion.div
                    animate={{ rotate: showDetails ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ↓
                  </motion.div>
                </Button>
                
                {editingState.canCancel && onCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    className="h-6 w-6 p-0 hover:bg-red-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {editingState.progress !== undefined && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{Math.round(editingState.progress)}%</span>
                </div>
                <Progress value={editingState.progress} className="h-2" />
              </div>
            )}

            {/* Time Information */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>Elapsed: {formatTime(timeElapsed)}</span>
              {editingState.estimatedTimeRemaining && (
                <span>~{formatTime(editingState.estimatedTimeRemaining)} remaining</span>
              )}
            </div>

            {/* Animated Processing Indicator */}
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="h-3 w-3 animate-spin" />
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 bg-blue-500 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                Working...
              </span>
            </div>

            {/* Detailed File Information */}
            <AnimatePresence>
              {showDetails && editingState.filesBeingEdited && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t pt-3 mt-3"
                >
                  <h5 className="text-xs font-medium mb-2">
                    Files being modified ({editingState.filesBeingEdited.length})
                  </h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {editingState.filesBeingEdited.map((file) => (
                      <div key={file.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {file.currentOperation}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.progress !== undefined && (
                            <div className="w-12">
                              <Progress value={file.progress} className="h-1" />
                            </div>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {file.progress !== undefined ? `${Math.round(file.progress)}%` : '...'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            {editingState.canCancel && (
              <div className="flex justify-end mt-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="text-xs"
                >
                  Cancel AI Edit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Success notification component
export function AIEditSuccessNotification({ 
  editSummary, 
  editType = 'ai-edit',
  onDismiss 
}: {
  editSummary: string;
  editType?: 'ai-edit' | 'ai-create' | 'ai-refactor' | 'ai-fix';
  onDismiss?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  const colorClass = editTypeColors[editType];
  const label = editTypeLabels[editType];

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-4 right-4 z-50"
    >
      <Card className={`w-80 shadow-lg border-l-4 border-l-green-500`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-green-500 text-white">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">AI {label} Complete</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {editSummary}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setVisible(false);
                onDismiss?.();
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}