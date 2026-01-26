"use client";

import { Loader2 } from "lucide-react";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { WorkspaceCard } from "./workspace-card";
import { WorkspacesEmpty } from "./workspaces-empty";

interface WorkspacesListProps {
  locale: string;
}

export const WorkspacesList = ({ locale }: WorkspacesListProps) => {
  const { data: workspaces = [], isLoading } = useWorkspaces();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return <WorkspacesEmpty locale={locale} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((workspace: any) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          locale={locale}
        />
      ))}
    </div>
  );
};
