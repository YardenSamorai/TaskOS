"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";

interface WorkspacesEmptyProps {
  locale: string;
}

export const WorkspacesEmpty = ({ locale }: WorkspacesEmptyProps) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations("workspaces");

  return (
    <>
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
          <FolderKanban className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t("noWorkspaces")}</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {t("noWorkspacesDescription")}
        </p>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("create")}
        </Button>
      </div>
      <CreateWorkspaceDialog open={open} onOpenChange={setOpen} locale={locale} />
    </>
  );
};
