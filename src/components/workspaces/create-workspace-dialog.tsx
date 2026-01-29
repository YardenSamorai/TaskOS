"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("createTitle")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("createDescription")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 px-4 sm:px-0">
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
            <ResponsiveDialogFooter>
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
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      
      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={currentPlan}
        limitType="workspaces"
      />
    </>
  );
};
