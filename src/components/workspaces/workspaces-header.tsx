"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";

interface WorkspacesHeaderProps {
  locale: string;
}

export const WorkspacesHeader = ({ locale }: WorkspacesHeaderProps) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations("workspaces");

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("select")}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("create")}
        </Button>
      </div>
      <CreateWorkspaceDialog open={open} onOpenChange={setOpen} locale={locale} />
    </>
  );
};
