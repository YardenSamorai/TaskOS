"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createWorkspace } from "@/lib/actions/workspace";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";
import type { UserPlan } from "@/lib/db/schema";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
}

export const CreateWorkspaceDialog = ({
  open,
  onOpenChange,
  locale,
}: CreateWorkspaceDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<UserPlan>("free");
  const router = useRouter();
  const t = useTranslations("workspaces");
  const tc = useTranslations("common");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createWorkspace(formData) as { 
        success: boolean; 
        workspace?: { id: string }; 
        error?: string; 
        code?: string; 
        plan?: UserPlan 
      };

      if (result.success && result.workspace) {
        toast.success("Workspace created successfully!");
        onOpenChange(false);
        router.push(`/${locale}/app/${result.workspace.id}/dashboard`);
      } else if (result.code === "WORKSPACE_LIMIT") {
        // Show upgrade dialog instead of toast
        setCurrentPlan(result.plan || "free");
        setShowUpgrade(true);
      } else {
        toast.error(result.error || "Failed to create workspace");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("namePlaceholder")}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("description")}</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder={t("descriptionPlaceholder")}
                  rows={3}
                  disabled={loading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {tc("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={currentPlan}
        limitType="workspaces"
      />
    </>
  );
};
