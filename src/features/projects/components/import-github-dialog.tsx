import ky, { HTTPError } from "ky";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useClerk } from "@clerk/nextjs";
import { useState, useEffect } from "react";

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
import { useProject } from "../hooks/use-projects";

import { Id } from "../../../../convex/_generated/dataModel";

const formSchema = z.object({
  url: z.url("Please enter a valid URL"),
});

interface ImportGithubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportGithubDialog = ({
  open,
  onOpenChange,
}: ImportGithubDialogProps) => {
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [importingProjectId, setImportingProjectId] = useState<Id<"projects"> | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  
  const importingProject = useProject(importingProjectId);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Only reset if import is not in progress
      if (importingProject?.importStatus !== "importing") {
        setImportingProjectId(null);
        setImportProgress(0);
        setAbortController(null);
      }
    }
  }, [open, importingProject?.importStatus]);

  const form = useForm({
    defaultValues: {
      url: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        // Create abort controller for cancellation
        const controller = new AbortController();
        setAbortController(controller);

        const { projectId } = await ky
          .post("/api/github/import", {
            json: { url: value.url },
            signal: controller.signal, // Add abort signal
          })
          .json<{ 
            success: boolean; 
            projectId: Id<"projects">,
            eventId: string;
          }>()

        setAbortController(null);
        setImportingProjectId(projectId);
        setImportProgress(25);
        toast.success("Starting import...");
      } catch (error) {
        setAbortController(null);
        
        // Check if the error was due to cancellation
        if (error instanceof Error && error.name === 'AbortError') {
          toast.info("Import cancelled");
          return;
        }
        if (error instanceof HTTPError) {
          try {
            const body = await error.response.json<{ error: string }>();
            if (body.error?.includes("Pro plan required")) {
              toast.error("Upgrade to import repositories", {
                action: {
                  label: "Upgrade",
                  onClick: () => openUserProfile(),
                },
              });
              onOpenChange(false);
              return;
            }

            if (body.error?.includes("GitHub not connected")) {
              toast.error("GitHub account not connected. Private repositories require authentication.", {
                action: {
                  label: "Connect",
                  onClick: () => openUserProfile(),
                },
              });
              onOpenChange(false);
              return;
            }

            toast.error(body.error || "Unable to import repository");
          } catch (jsonError) {
            // Handle cases where response is not valid JSON
            toast.error(`Import failed: ${error.response.status} ${error.response.statusText}`);
          }
        } else {
          toast.error("Unable to import repository. Please check the URL and try again");
        }
      }
    },
  });

  // Monitor import progress
  useEffect(() => {
    if (!importingProject || !importingProjectId) return;

    if (importingProject.importStatus === "importing") {
      // Simulate progress for better UX
      const interval = setInterval(() => {
        setImportProgress(prev => {
          if (prev < 85) {
            return prev + Math.random() * 10;
          }
          return prev;
        });
      }, 500);

      return () => clearInterval(interval);
    } else if (importingProject.importStatus === "completed") {
      setImportProgress(100);
      toast.success("Repository imported successfully!");
      
      // Small delay to show completion
      setTimeout(() => {
        onOpenChange(false);
        form.reset();
        setImportingProjectId(null);
        setImportProgress(0);
        router.push(`/projects/${importingProjectId}`);
      }, 1000);
    } else if (importingProject.importStatus === "failed") {
      setImportProgress(0);
      setImportingProjectId(null);
      toast.error("Import failed. Please try again.");
    }
  }, [importingProject, importingProjectId, onOpenChange, form, router]);

  const cancelImport = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setImportingProjectId(null);
      setImportProgress(0);
      toast.info("Import cancelled");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
          <DialogDescription>
            Enter a GitHub repository URL to import. Public repositories work without authentication.
            For private repositories, connect your GitHub account in your profile settings.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="url">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Repository URL
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="https://github.com/owner/repo"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          {importProgress > 0 && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>
                  {importingProject?.importStatus === "importing" 
                    ? "Importing repository..." 
                    : importingProject?.importStatus === "completed"
                    ? "Import completed!"
                    : "Processing..."
                  }
                </span>
                <span>{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} />
              {importProgress < 100 && (
                <p className="text-xs text-muted-foreground">
                  Cloning repository and processing files... This may take a moment for large repositories.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={abortController || importProgress > 0 ? cancelImport : () => onOpenChange(false)}
              disabled={importProgress > 0 && importProgress < 100 && !abortController}
            >
              {abortController || importProgress > 0 ? "Cancel Import" : "Cancel"}
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button 
                  type="submit"
                  disabled={!canSubmit || isSubmitting || importProgress > 0}
                >
                  {isSubmitting || importProgress > 0 ? "Importing..." : "Import"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
