"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FocusView } from "@/components/focus/focus-view";
import { SmartSummary } from "@/components/focus/smart-summary";
import { useTasks, useWorkspaceStats, useRecentActivity } from "@/lib/hooks/use-tasks";

const FocusPage = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data: tasks = [], isLoading: tasksLoading } = useTasks(workspaceId);
  const { data: stats, isLoading: statsLoading } = useWorkspaceStats(workspaceId);
  const { data: activity = [], isLoading: activityLoading } = useRecentActivity(workspaceId, 5);

  const isLoading = tasksLoading || statsLoading || activityLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Smart Summary */}
      <SmartSummary stats={stats ?? null} activity={activity} />

      {/* Focus View */}
      <FocusView tasks={tasks} locale={locale} workspaceId={workspaceId} />
    </div>
  );
};

export default FocusPage;
