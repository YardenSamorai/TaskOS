"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Loader2, 
  Plus, 
  LayoutGrid, 
  List, 
  Table2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
  SortAsc,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Play,
  Check,
  RotateCcw,
  Eye,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TasksFilters } from "@/components/tasks/tasks-filters";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useTasks } from "@/lib/hooks/use-tasks";
import { updateTaskStatus, deleteTask } from "@/lib/actions/task";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority, Task, User } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: User }[];
  tags: { tag: { id: string; name: string; color: string } }[];
  steps: { id: string; completed: boolean }[];
}

type ViewMode = "cards" | "list" | "table";
type GroupBy = "none" | "status" | "priority";

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  low: { color: "text-slate-500", bg: "bg-slate-500/10", label: "Low" },
  medium: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Medium" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  urgent: { color: "text-red-500", bg: "bg-red-500/10", label: "Urgent" },
};

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  backlog: { color: "bg-slate-500", bg: "bg-slate-500/10", label: "Backlog", icon: RotateCcw },
  todo: { color: "bg-blue-500", bg: "bg-blue-500/10", label: "To Do", icon: Clock },
  in_progress: { color: "bg-orange-500", bg: "bg-orange-500/10", label: "In Progress", icon: Play },
  review: { color: "bg-purple-500", bg: "bg-purple-500/10", label: "Waiting for Review", icon: Eye },
  done: { color: "bg-emerald-500", bg: "bg-emerald-500/10", label: "Done", icon: Check },
};

const TasksPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filters = {
    status: searchParams.get("status")?.split(",") as TaskStatus[] | undefined,
    priority: searchParams.get("priority")?.split(",") as TaskPriority[] | undefined,
    search: searchParams.get("search") || undefined,
  };

  const { data: workspaceData, isLoading: workspaceLoading } = useWorkspace(workspaceId);
  const { data: allTasks = [], isLoading: tasksLoading, refetch } = useTasks(workspaceId);

  const workspace = workspaceData?.workspace;
  const members = workspaceData?.members || [];
  const isLoading = workspaceLoading || tasksLoading;

  // Apply filters
  const filteredTasks = useMemo(() => {
    let tasks = allTasks as TaskWithRelations[];
    if (filters.status?.length) {
      tasks = tasks.filter((t) => filters.status!.includes(t.status));
    }
    if (filters.priority?.length) {
      tasks = tasks.filter((t) => filters.priority!.includes(t.priority));
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      tasks = tasks.filter((t) => 
        t.title.toLowerCase().includes(search) || 
        t.description?.toLowerCase().includes(search)
      );
    }
    return tasks;
  }, [allTasks, filters.status, filters.priority, filters.search]);

  // Calculate stats
  const stats = useMemo(() => {
    const all = allTasks as TaskWithRelations[];
    return {
      total: all.length,
      completed: all.filter((t) => t.status === "done").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      overdue: all.filter((t) => 
        t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate)) && t.status !== "done"
      ).length,
    };
  }, [allTasks]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return { "All Tasks": filteredTasks };
    }
    
    const groups: Record<string, TaskWithRelations[]> = {};
    
    if (groupBy === "status") {
      Object.keys(statusConfig).forEach((status) => {
        groups[status] = filteredTasks.filter((t) => t.status === status);
      });
    } else if (groupBy === "priority") {
      Object.keys(priorityConfig).forEach((priority) => {
        groups[priority] = filteredTasks.filter((t) => t.priority === priority);
      });
    }
    
    return groups;
  }, [filteredTasks, groupBy]);

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success("Status updated");
      refetch();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    
    setDeleting(true);
    try {
      const result = await deleteTask(taskToDelete);
      if (result.success) {
        toast.success("Task deleted");
        refetch();
      } else {
        toast.error(result.error || "Failed to delete task");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} in this workspace
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          icon={CheckCircle2} 
          label="Total Tasks" 
          value={stats.total} 
          color="blue"
        />
        <StatsCard 
          icon={Check} 
          label="Completed" 
          value={stats.completed} 
          color="emerald"
          percentage={stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}
        />
        <StatsCard 
          icon={Play} 
          label="In Progress" 
          value={stats.inProgress} 
          color="orange"
        />
        <StatsCard 
          icon={AlertCircle} 
          label="Overdue" 
          value={stats.overdue} 
          color="red"
        />
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <TasksFilters />
        
        <div className="flex items-center gap-2">
          {/* Group By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SortAsc className="w-4 h-4" />
                <span className="hidden sm:inline">Group: </span>
                {groupBy === "none" ? "None" : groupBy === "status" ? "Status" : "Priority"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setGroupBy("none")}>None</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("status")}>By Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("priority")}>By Priority</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("table")}
            >
              <Table2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks Display */}
      {filteredTasks.length === 0 ? (
        <EmptyState onCreateClick={() => setCreateDialogOpen(true)} />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTasks).map(([group, tasks]) => {
            if (tasks.length === 0 && groupBy !== "none") return null;
            
            return (
              <div key={group} className="space-y-4">
                {groupBy !== "none" && (
                  <GroupHeader 
                    group={group} 
                    count={tasks.length} 
                    groupBy={groupBy}
                  />
                )}
                
                {viewMode === "cards" && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        locale={locale}
                        workspaceId={workspaceId}
                        onStatusChange={handleQuickStatusChange}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </div>
                )}
                
                {viewMode === "list" && (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        locale={locale}
                        workspaceId={workspaceId}
                        onStatusChange={handleQuickStatusChange}
                      />
                    ))}
                  </div>
                )}
                
                {viewMode === "table" && (
                  <TasksTableView
                    tasks={tasks}
                    locale={locale}
                    workspaceId={workspaceId}
                    onStatusChange={handleQuickStatusChange}
                    onDelete={handleDeleteClick}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        locale={locale}
        members={members}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task
              and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color,
  percentage 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: "blue" | "emerald" | "orange" | "red";
  percentage?: number;
}) => {
  const colorClasses = {
    blue: "text-blue-500 bg-blue-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    red: "text-red-500 bg-red-500/10",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          {percentage !== undefined && (
            <div className="ms-auto text-right">
              <p className={cn("text-sm font-medium", colorClasses[color].split(" ")[0])}>
                {percentage}%
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Group Header Component
const GroupHeader = ({ 
  group, 
  count, 
  groupBy 
}: { 
  group: string; 
  count: number; 
  groupBy: GroupBy;
}) => {
  const config = groupBy === "status" ? statusConfig[group] : priorityConfig[group];
  
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-3 h-3 rounded-full", groupBy === "status" ? config?.color : "bg-current")}>
        {groupBy === "priority" && <div className={cn("w-3 h-3 rounded-full", config?.bg)} />}
      </div>
      <h3 className="font-semibold">{config?.label || group}</h3>
      <Badge variant="secondary" className="rounded-full">
        {count}
      </Badge>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ 
  task, 
  locale, 
  workspaceId,
  onStatusChange,
  onDelete
}: { 
  task: TaskWithRelations;
  locale: string;
  workspaceId: string;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
}) => {
  const dueInfo = getDueDateInfo(task.dueDate, task.status);
  const completedSteps = task.steps.filter((s) => s.completed).length;
  const totalSteps = task.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const StatusIcon = statusConfig[task.status]?.icon || Clock;

  return (
    <Card className="group hover:shadow-lg hover:border-primary/20 transition-all duration-200">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", statusConfig[task.status]?.bg)}>
              <StatusIcon className={cn("w-4 h-4", statusConfig[task.status]?.color.replace("bg-", "text-"))} />
            </div>
            {task.tags?.slice(0, 2).map(({ tag }) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
          <QuickActions 
            task={task} 
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            locale={locale}
            workspaceId={workspaceId}
          />
        </div>

        {/* Title & Description */}
        <Link href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}>
          <h4 className="font-semibold hover:text-primary transition-colors line-clamp-2">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
        </Link>

        {/* Progress */}
        {totalSteps > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedSteps}/{totalSteps}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          {/* Assignees */}
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar key={assignee.id} className="w-7 h-7 border-2 border-background">
                <AvatarImage src={assignee.user.image || undefined} />
                <AvatarFallback className="text-[10px]">
                  {assignee.user.name?.[0] || assignee.user.email[0]}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignees.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                +{task.assignees.length - 3}
              </div>
            )}
            {task.assignees.length === 0 && (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
          </div>

          {/* Due Date */}
          {dueInfo && (
            <Badge variant="secondary" className={cn("text-[10px]", dueInfo.className)}>
              <Calendar className="w-3 h-3 me-1" />
              {dueInfo.label}
            </Badge>
          )}

          {/* Priority */}
          <Badge variant="secondary" className={cn("text-[10px]", priorityConfig[task.priority]?.bg, priorityConfig[task.priority]?.color)}>
            {task.priority}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Task List Item Component
const TaskListItem = ({ 
  task, 
  locale, 
  workspaceId,
  onStatusChange 
}: { 
  task: TaskWithRelations;
  locale: string;
  workspaceId: string;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) => {
  const dueInfo = getDueDateInfo(task.dueDate, task.status);
  const completedSteps = task.steps.filter((s) => s.completed).length;
  const totalSteps = task.steps.length;

  return (
    <Link href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}>
      <Card className="hover:shadow-md hover:border-primary/20 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Status Dot */}
            <div className={cn("w-3 h-3 rounded-full flex-shrink-0", statusConfig[task.status]?.color)} />

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{task.title}</h4>
                {task.tags?.slice(0, 2).map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-medium rounded-full"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              {totalSteps > 0 && (
                <p className="text-xs text-muted-foreground">
                  {completedSteps}/{totalSteps} steps completed
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Assignees */}
              <div className="hidden sm:flex -space-x-2">
                {task.assignees.slice(0, 2).map((assignee) => (
                  <Avatar key={assignee.id} className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={assignee.user.image || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {assignee.user.name?.[0] || assignee.user.email[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>

              {/* Due Date */}
              {dueInfo && (
                <Badge variant="secondary" className={cn("text-[10px]", dueInfo.className)}>
                  {dueInfo.label}
                </Badge>
              )}

              {/* Priority */}
              <Badge variant="secondary" className={cn("text-[10px]", priorityConfig[task.priority]?.bg, priorityConfig[task.priority]?.color)}>
                {task.priority}
              </Badge>

              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// Tasks Table View
const TasksTableView = ({ 
  tasks, 
  locale, 
  workspaceId,
  onStatusChange,
  onDelete
}: { 
  tasks: TaskWithRelations[];
  locale: string;
  workspaceId: string;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
}) => {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-medium text-sm">Task</th>
              <th className="text-left p-4 font-medium text-sm">Status</th>
              <th className="text-left p-4 font-medium text-sm">Priority</th>
              <th className="text-left p-4 font-medium text-sm">Assignees</th>
              <th className="text-left p-4 font-medium text-sm">Due Date</th>
              <th className="w-10 p-4"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const dueInfo = getDueDateInfo(task.dueDate, task.status);
              const completedSteps = task.steps.filter((s) => s.completed).length;
              const totalSteps = task.steps.length;

              return (
                <tr key={task.id} className="border-b hover:bg-muted/30 transition-colors group">
                  <td className="p-4">
                    <Link href={`/${locale}/app/${workspaceId}/tasks/${task.id}`} className="hover:text-primary">
                      <span className="font-medium">{task.title}</span>
                      {totalSteps > 0 && (
                        <span className="text-xs text-muted-foreground ms-2">
                          ({completedSteps}/{totalSteps})
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", statusConfig[task.status]?.color)} />
                      <span className="text-sm">{statusConfig[task.status]?.label}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className={cn(priorityConfig[task.priority]?.bg, priorityConfig[task.priority]?.color)}>
                      {task.priority}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex -space-x-2">
                      {task.assignees.slice(0, 3).map((assignee) => (
                        <Avatar key={assignee.id} className="w-7 h-7 border-2 border-background">
                          <AvatarImage src={assignee.user.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {assignee.user.name?.[0] || assignee.user.email[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {task.assignees.length === 0 && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {dueInfo ? (
                      <span className={cn("text-sm", dueInfo.className)}>{dueInfo.label}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <QuickActions 
                      task={task} 
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                      locale={locale}
                      workspaceId={workspaceId}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// Quick Actions Component
const QuickActions = ({ 
  task, 
  onStatusChange,
  onDelete,
  locale,
  workspaceId
}: { 
  task: TaskWithRelations;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  locale: string;
  workspaceId: string;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}>
            <Eye className="w-4 h-4 me-2" />
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Change Status
        </div>
        {Object.entries(statusConfig).map(([status, config]) => (
          <DropdownMenuItem 
            key={status}
            onClick={() => onStatusChange(task.id, status as TaskStatus)}
            disabled={task.status === status}
          >
            <div className={cn("w-2 h-2 rounded-full me-2", config.color)} />
            {config.label}
            {task.status === status && <Check className="w-4 h-4 ms-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="w-4 h-4 me-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Empty State Component
const EmptyState = ({ onCreateClick }: { onCreateClick: () => void }) => (
  <Card className="py-16">
    <CardContent className="flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Create your first task to start organizing your work
      </p>
      <Button onClick={onCreateClick} className="gap-2">
        <Plus className="w-4 h-4" />
        Create Task
      </Button>
    </CardContent>
  </Card>
);

// Helper function for due date info
const getDueDateInfo = (dueDate: string | null, status: string) => {
  if (!dueDate) return null;
  
  const date = parseISO(dueDate);
  const isDone = status === "done";
  
  if (isDone) {
    return { label: format(date, "MMM d"), className: "text-muted-foreground bg-muted" };
  }
  
  if (isPast(date) && !isToday(date)) {
    return { label: "Overdue", className: "text-red-500 bg-red-500/10" };
  }
  
  if (isToday(date)) {
    return { label: "Today", className: "text-orange-500 bg-orange-500/10" };
  }
  
  if (isTomorrow(date)) {
    return { label: "Tomorrow", className: "text-blue-500 bg-blue-500/10" };
  }
  
  const daysUntil = differenceInDays(date, new Date());
  if (daysUntil <= 7) {
    return { label: format(date, "EEE"), className: "text-muted-foreground bg-muted" };
  }
  
  return { label: format(date, "MMM d"), className: "text-muted-foreground bg-muted" };
};

export default TasksPage;
