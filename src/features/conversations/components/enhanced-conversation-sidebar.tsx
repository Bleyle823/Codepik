import ky from "ky";
import { toast } from "sonner";
import { useState } from "react";
import { 
  CopyIcon, 
  HistoryIcon, 
  LoaderIcon, 
  PlusIcon,
  Settings,
  Code,
  Zap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useConversation,
  useConversations,
  useCreateConversation,
  useMessages,
} from "../hooks/use-conversations";

import { Id } from "../../../../convex/_generated/dataModel";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import { PastConversationsDialog } from "./past-conversations-dialog";

interface EnhancedConversationSidebarProps {
  projectId: Id<"projects">;
}

interface AIEditingState {
  isEditing: boolean;
  filesBeingEdited: Array<{
    id: string;
    name: string;
    currentOperation: string;
    progress?: number;
  }>;
  currentOperation?: string;
  canCancel: boolean;
}

export const EnhancedConversationSidebar = ({
  projectId,
}: EnhancedConversationSidebarProps) => {
  const [input, setInput] = useState("");
  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<Id<"conversations"> | null>(null);
  const [
    pastConversationsOpen,
    setPastConversationsOpen
  ] = useState(false);

  // AI Edit Settings
  const [autoApplyEdits, setAutoApplyEdits] = useState(true);
  const [showEditPreview, setShowEditPreview] = useState(true);
  const [aiEditingState, setAIEditingState] = useState<AIEditingState>({
    isEditing: false,
    filesBeingEdited: [],
    canCancel: false
  });

  const createConversation = useCreateConversation();
  const conversations = useConversations(projectId);

  const activeConversationId =
    selectedConversationId ?? conversations?.[0]?._id ?? null;

  const activeConversation = useConversation(activeConversationId);
  const conversationMessages = useMessages(activeConversationId);

  // Check if any message is currently processing
  const isProcessing = conversationMessages?.some(
    (msg) => msg.status === "processing"
  );

  const handleCancel = async () => {
    try {
      await ky.post("/api/messages/cancel", {
        json: { projectId },
      });
      
      // Reset AI editing state
      setAIEditingState({
        isEditing: false,
        filesBeingEdited: [],
        canCancel: false
      });
    } catch {
      toast.error("Unable to cancel request");
    }
  };

  const handleCreateConversation = async () => {
    try {
      const newConversationId = await createConversation({
        projectId,
        title: DEFAULT_CONVERSATION_TITLE,
      });
      setSelectedConversationId(newConversationId);
      return newConversationId;
    } catch {
      toast.error("Unable to create new conversation");
      return null;
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    // If processing and no new message, this is just a stop function
    if (isProcessing && !message.text) {
      await handleCancel()
      setInput("");
      return;
    }

    let conversationId = activeConversationId;

    if (!conversationId) {
      conversationId = await handleCreateConversation();
      if (!conversationId) {
        return;
      }
    }

    // Set AI editing state when starting a request that might modify files
    const isCodeRequest = message.text.toLowerCase().includes('file') || 
                         message.text.toLowerCase().includes('code') ||
                         message.text.toLowerCase().includes('create') ||
                         message.text.toLowerCase().includes('update') ||
                         message.text.toLowerCase().includes('fix') ||
                         message.text.toLowerCase().includes('add');

    if (isCodeRequest) {
      setAIEditingState({
        isEditing: true,
        filesBeingEdited: [],
        currentOperation: "Analyzing your request...",
        canCancel: true
      });
    }

    // Trigger Inngest function via API
    try {
      await ky.post("/api/messages", {
        json: {
          conversationId,
          message: message.text,
        },
      });
    } catch {
      toast.error("Message failed to send");
      setAIEditingState({
        isEditing: false,
        filesBeingEdited: [],
        canCancel: false
      });
    }

    setInput("");
  }

  // Mock function to simulate AI editing progress
  // In real implementation, this would be updated by the real-time sync system
  const mockAIEditingProgress = () => {
    setAIEditingState({
      isEditing: true,
      filesBeingEdited: [
        {
          id: "file1",
          name: "components/Button.tsx",
          currentOperation: "Adding prop validation",
          progress: 75
        },
        {
          id: "file2", 
          name: "styles/button.css",
          currentOperation: "Updating styles",
          progress: 45
        }
      ],
      currentOperation: "Refactoring component structure",
      canCancel: true
    });
  };

  return (
    <TooltipProvider>
      <PastConversationsDialog
        projectId={projectId}
        open={pastConversationsOpen}
        onOpenChange={setPastConversationsOpen}
        onSelect={setSelectedConversationId}
      />
      <div className="flex flex-col h-full bg-sidebar">
        {/* Header with AI Edit Status */}
        <div className="h-8.75 flex items-center justify-between border-b">
          <div className="text-sm truncate pl-3 flex items-center gap-2">
            {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
            {aiEditingState.isEditing && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                <Code className="h-3 w-3 mr-1" />
                AI Editing
              </Badge>
            )}
          </div>
          <div className="flex items-center px-1 gap-1">
            <Button
              size="icon-xs"
              variant="highlight"
              onClick={() => setPastConversationsOpen(true)}
            >
              <HistoryIcon className="size-3.5" />
            </Button>
            <Button
              size="icon-xs"
              variant="highlight"
              onClick={handleCreateConversation}
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* AI Editing Status Panel */}
        {aiEditingState.isEditing && (
          <div className="border-b bg-blue-50 dark:bg-blue-950/20">
            <Card className="m-2 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <LoaderIcon className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm font-medium">
                      AI is editing your code
                    </span>
                  </div>
                  {aiEditingState.canCancel && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleCancel}
                      className="h-6 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                
                {aiEditingState.currentOperation && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {aiEditingState.currentOperation}
                  </p>
                )}

                {aiEditingState.filesBeingEdited.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">
                      Files being modified ({aiEditingState.filesBeingEdited.length})
                    </p>
                    {aiEditingState.filesBeingEdited.slice(0, 3).map((file) => (
                      <div key={file.id} className="flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{file.name}</span>
                          <span className="text-muted-foreground truncate block">
                            {file.currentOperation}
                          </span>
                        </div>
                        {file.progress !== undefined && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {file.progress}%
                          </Badge>
                        )}
                      </div>
                    ))}
                    {aiEditingState.filesBeingEdited.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{aiEditingState.filesBeingEdited.length - 3} more files...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conversation Messages */}
        <Conversation className="flex-1">
          <ConversationContent>
            {conversationMessages?.map((message, messageIndex) => (
              <Message
                key={message._id}
                from={message.role}
              >
                <MessageContent>
                  {message.status === "processing" ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <LoaderIcon className="size-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : message.status === "cancelled" ? (
                    <span className="text-muted-foreground italic">
                      Request cancelled
                    </span>
                  ) : (
                    <MessageResponse>{message.content}</MessageResponse>
                  )}
                </MessageContent>
                {message.role === "assistant" &&
                  message.status === "completed" &&
                  messageIndex === (conversationMessages?.length ?? 0) - 1 && (
                    <MessageActions>
                      <MessageAction
                        onClick={() => {
                          navigator.clipboard.writeText(message.content)
                        }}
                        label="Copy"
                      >
                        <CopyIcon className="size-3" />
                      </MessageAction>
                    </MessageActions>
                  )
                }
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Enhanced Prompt Input with AI Edit Controls */}
        <div className="p-3 border-t">
          {/* AI Edit Settings */}
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI Code Editing</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={mockAIEditingProgress}
                className="text-xs h-6"
              >
                <Settings className="h-3 w-3 mr-1" />
                Test
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="auto-apply" 
                  checked={autoApplyEdits}
                  onCheckedChange={setAutoApplyEdits}
                />
                <label htmlFor="auto-apply" className="text-xs">
                  Auto-apply changes
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">AI changes will be applied automatically without confirmation</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="show-preview" 
                  checked={showEditPreview}
                  onCheckedChange={setShowEditPreview}
                />
                <label htmlFor="show-preview" className="text-xs">
                  Show previews
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Zap className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Show visual indicators when AI is editing code</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-6 flex-1"
                onClick={() => setInput("Create a new React component")}
              >
                <Code className="h-3 w-3 mr-1" />
                Create Component
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-6 flex-1"
                onClick={() => setInput("Fix any bugs in the current file")}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Fix Bugs
              </Button>
            </div>
          </div>

          {/* Main Prompt Input */}
          <PromptInput 
            onSubmit={handleSubmit}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={
                  autoApplyEdits 
                    ? "Ask me to create, edit, or fix your code..." 
                    : "Ask Polaris anything..."
                }
                onChange={(e) => setInput(e.target.value)}
                value={input}
                disabled={isProcessing}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                disabled={isProcessing ? false : !input}
                status={isProcessing ? "streaming" : undefined}
              />
            </PromptInputFooter>
          </PromptInput>

          {/* Status Indicator */}
          {autoApplyEdits && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-green-500" />
              <span>AI will automatically edit your code</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};