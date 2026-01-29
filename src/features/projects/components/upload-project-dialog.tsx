import ky, { HTTPError } from "ky";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useState, useRef } from "react";
import { UploadIcon, FolderIcon, FileIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";

import { Id } from "../../../../convex/_generated/dataModel";

const formSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
});

interface UploadProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadProjectDialog = ({
  open,
  onOpenChange,
}: UploadProjectDialogProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const form = useForm({
    defaultValues: {
      projectName: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (selectedFiles.length === 0) {
        toast.error("Please select files to upload");
        return;
      }

      try {
        // Create abort controller for cancellation
        const controller = new AbortController();
        setAbortController(controller);
        
        setUploadProgress(5);
        setUploadStatus("Preparing files...");
        
        const formData = new FormData();
        formData.append("projectName", value.projectName);
        
        setUploadProgress(15);
        setUploadStatus("Uploading files...");
        
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        setUploadProgress(25);
        setUploadStatus("Processing upload...");

        // Create a timeout to simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev < 85) {
              return prev + Math.random() * 10;
            }
            return prev;
          });
        }, 200);

        const { projectId, filesProcessed } = await ky
          .post("/api/projects/upload", {
            body: formData,
            timeout: 300000, // 5 minute timeout for large uploads
            signal: controller.signal, // Add abort signal
          })
          .json<{ 
            success: boolean; 
            projectId: Id<"projects">;
            filesProcessed: number;
          }>();

        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploadStatus("Upload complete!");
        setAbortController(null);
        
        toast.success(`Project uploaded successfully! ${filesProcessed} files processed.`);
        
        // Small delay to show completion
        setTimeout(() => {
          onOpenChange(false);
          form.reset();
          setSelectedFiles([]);
          setUploadProgress(0);
          setUploadStatus("");
          router.push(`/projects/${projectId}`);
        }, 500);

      } catch (error) {
        setUploadProgress(0);
        setUploadStatus("");
        setAbortController(null);
        
        // Check if the error was due to cancellation
        if (error instanceof Error && error.name === 'AbortError') {
          toast.info("Upload cancelled");
          return;
        }
        
        if (error instanceof HTTPError) {
          try {
            const body = await error.response.json<{ error: string }>();
            toast.error(body.error || "Upload failed");
          } catch (jsonError) {
            toast.error(`Upload failed: ${error.response.status} ${error.response.statusText}`);
          }
        } else {
          toast.error("Unable to upload project. Please try again.");
        }
      }
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    
    if (files.length > 0 && !form.state.values.projectName) {
      // Auto-suggest project name from first file's directory
      const firstFile = files[0];
      const path = firstFile.webkitRelativePath || firstFile.name;
      const rootFolder = path.split('/')[0];
      if (rootFolder && rootFolder !== firstFile.name) {
        form.setFieldValue("projectName", rootFolder);
      }
    }
  };

  const handleFolderSelect = () => {
    folderInputRef.current?.click();
  };

  const handleFilesSelect = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  const cancelUpload = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setUploadProgress(0);
      setUploadStatus("");
      toast.info("Upload cancelled");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Project</DialogTitle>
          <DialogDescription>
            Upload a project from your local computer. You can select individual files or an entire folder.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="space-y-4">
            <form.Field name="projectName">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Project Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Enter project name"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <div>
              <FieldLabel>Select Files</FieldLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFolderSelect}
                  className="h-20 flex flex-col gap-2"
                >
                  <FolderIcon className="size-6" />
                  <span className="text-sm">Select Folder</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFilesSelect}
                  className="h-20 flex flex-col gap-2"
                >
                  <FileIcon className="size-6" />
                  <span className="text-sm">Select Files</span>
                </Button>
              </div>
              
              <input
                ref={folderInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: "" } as any)}
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{selectedFiles.length} files selected</span>
                  <span>{formatFileSize(totalSize)}</span>
                </div>
                
                <div className="max-h-32 overflow-y-auto border rounded p-2 text-sm">
                  {selectedFiles.slice(0, 10).map((file, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="truncate">{file.webkitRelativePath || file.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                  {selectedFiles.length > 10 && (
                    <div className="text-muted-foreground">
                      ... and {selectedFiles.length - 10} more files
                    </div>
                  )}
                </div>
              </div>
            )}

            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{uploadStatus || "Uploading..."}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
                {uploadProgress < 100 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Processing {selectedFiles.length} files... This may take a moment for large projects.
                    </p>
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelUpload}
                        className="text-xs"
                      >
                        Cancel Upload
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={uploadProgress > 0 ? cancelUpload : () => onOpenChange(false)}
              disabled={false}
            >
              {uploadProgress > 0 ? "Cancel Upload" : "Cancel"}
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button 
                  type="submit"
                  disabled={!canSubmit || isSubmitting || selectedFiles.length === 0 || uploadProgress > 0}
                >
                  {uploadProgress > 0 ? "Uploading..." : "Upload Project"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};