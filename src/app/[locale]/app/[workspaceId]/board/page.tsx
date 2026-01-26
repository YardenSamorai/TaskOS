"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { KanbanBoard } from "@/components/board/kanban-board";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useTasks } from "@/lib/hooks/use-tasks";

const BoardPage = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data: workspaceData, isLoading: workspaceLoading } = useWorkspace(workspaceId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(workspaceId);

  const workspace = workspaceData?.workspace;
  const isLoading = workspaceLoading || tasksLoading;

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
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Board</h1>
          <p className="text-muted-foreground">Drag and drop tasks between columns</p>
        </div>
      </div>
      <KanbanBoard 
        initialTasks={tasks} 
        workspaceId={workspaceId} 
        locale={locale}
        members={workspace.members || []}
      />
    </div>
  );
};

export default BoardPage;
