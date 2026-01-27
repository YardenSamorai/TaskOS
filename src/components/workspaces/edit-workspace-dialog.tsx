"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateWorkspace } from "@/lib/actions/workspace";

interface EditWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: {
    id: string;
    name: string;
    description: string | null;
  };
  onSuccess?: () => void;
}

export const EditWorkspaceDialog = ({
  open,
  onOpenChange,
  workspace,
  onSuccess,
}: EditWorkspaceDialogProps) => {
  const t = useTranslations("workspaces");
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("workspaceId", workspace.id);
      formData.append("name", name.trim());
      formData.append("description", description.trim());

      const result = await updateWorkspace(formData);
      
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Workspace updated successfully!");
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      toast.error("Failed to update workspace");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Workspace
          </DialogTitle>
          <DialogDescription>
            Update your workspace name and description
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Workspace"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your workspace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
