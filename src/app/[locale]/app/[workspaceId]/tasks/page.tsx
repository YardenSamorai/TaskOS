"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TasksTable } from "@/components/tasks/tasks-table";
import { TasksFilters } from "@/components/tasks/tasks-filters";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useTasks } from "@/lib/hooks/use-tasks";
import type { TaskStatus, TaskPriority } from "@/lib/db/schema";

const TasksPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  // Build filters from search params
  const filters = {
    status: searchParams.get("status")?.split(",") as TaskStatus[] | undefined,
    priority: searchParams.get("priority")?.split(",") as TaskPriority[] | undefined,
    search: searchParams.get("search") || undefined,
  };

  const { data: workspaceData, isLoading: workspaceLoading } = useWorkspace(workspaceId);
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks(workspaceId);

  const workspace = workspaceData?.workspace;
  const isLoading = workspaceLoading || tasksLoading;

  // Apply client-side filters for instant feedback
  let tasks = allTasks;
  if (filters.status?.length) {
    tasks = tasks.filter((t: any) => filters.status!.includes(t.status));
  }
  if (filters.priority?.length) {
    tasks = tasks.filter((t: any) => filters.priority!.includes(t.priority));
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    tasks = tasks.filter((t: any) => 
      t.title.toLowerCase().includes(search) || 
      t.description?.toLowerCase().includes(search)
    );
  }

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and filter all tasks in your workspace
          </p>
        </div>
      </div>

      <TasksFilters />

      <TasksTable 
        tasks={tasks} 
        locale={locale} 
        workspaceId={workspaceId}
        members={workspace.members || []}
      />
    </div>
  );
};

export default TasksPage;
