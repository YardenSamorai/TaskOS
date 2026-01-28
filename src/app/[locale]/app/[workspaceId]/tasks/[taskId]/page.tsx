import { notFound } from "next/navigation";
import { getTask } from "@/lib/actions/task";
import { getWorkspace } from "@/lib/actions/workspace";
import { getCurrentUser } from "@/lib/auth/permissions";
import { TaskHeader } from "@/components/tasks/task-header";
import { TaskDetails } from "@/components/tasks/task-details";
import { ProcessMode } from "@/components/tasks/process-mode";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskActivity } from "@/components/tasks/task-activity";

interface TaskPageProps {
  params: Promise<{ locale: string; workspaceId: string; taskId: string }>;
}

const TaskPage = async ({ params }: TaskPageProps) => {
  const { locale, workspaceId, taskId } = await params;
  const [{ task }, { workspace }, currentUser] = await Promise.all([
    getTask(taskId),
    getWorkspace(workspaceId),
    getCurrentUser(),
  ]);

  if (!task || !workspace) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <TaskHeader task={task} locale={locale} workspaceId={workspaceId} />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <TaskDetails task={task} members={workspace.members || []} workspaceId={workspaceId} />

          {/* Process Mode */}
          <ProcessMode task={task} locale={locale} workspaceId={workspaceId} />

          {/* Attachments */}
          <TaskAttachments task={task} />

          {/* Comments */}
          <TaskComments task={task} currentUserId={currentUser.id} />
        </div>

        {/* Sidebar */}
        <div>
          <TaskActivity task={task} />
        </div>
      </div>
    </div>
  );
};

export default TaskPage;
