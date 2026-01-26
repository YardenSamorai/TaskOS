"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardActivity } from "@/components/dashboard/dashboard-activity";
import { DashboardTasks } from "@/components/dashboard/dashboard-tasks";
import { useWorkspace } from "@/lib/hooks/use-workspaces";

const DashboardPage = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data, isLoading } = useWorkspace(workspaceId);
  const workspace = data?.workspace;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{workspace.name}</h1>
        <p className="text-muted-foreground mt-1">
          {workspace.description || "Welcome to your workspace dashboard"}
        </p>
      </div>

      {/* Stats */}
      <DashboardStats workspaceId={workspaceId} />

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardTasks workspaceId={workspaceId} locale={locale} />
        </div>

        {/* Activity */}
        <div>
          <DashboardActivity workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
