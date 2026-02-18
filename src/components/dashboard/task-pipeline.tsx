"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, User, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  workspaceId: string;
  metadata?: string | null;
  assignees?: { user: { id: string; name: string | null; image: string | null } }[];
}

interface TaskPipelineProps {
  tasks: Task[];
  currentUserId?: string;
  onCreateTask: () => void;
}

const STAGES = [
  { key: "backlog", label: "Backlog", color: "bg-slate-400 dark:bg-slate-500" },
  { key: "todo", label: "To Do", color: "bg-blue-400 dark:bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-400 dark:bg-amber-500" },
  { key: "review", label: "Review", color: "bg-violet-400 dark:bg-violet-500" },
  { key: "done", label: "Done", color: "bg-emerald-400 dark:bg-emerald-500" },
] as const;

const priorityConfig: Record<string, { label: string; className: string; order: number }> = {
  urgent: { label: "Urgent", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30", order: 0 },
  high: { label: "High", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", order: 1 },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", order: 2 },
  low: { label: "Low", className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30", order: 3 },
};

const hasIntegrationBadge = (metadata: string | null | undefined, provider: string) => {
  if (!metadata) return false;
  try {
    const m = JSON.parse(metadata);
    return !!m[provider];
  } catch {
    return false;
  }
};

export const TaskPipeline = ({ tasks, currentUserId, onCreateTask }: TaskPipelineProps) => {
  const params = useParams();
  const locale = params.locale as string;
  const workspaceId = params.workspaceId as string;

  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"my" | "all">("my");

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => {
      counts[s.key] = tasks.filter((t) => t.status === s.key).length;
    });
    return counts;
  }, [tasks]);

  const totalTasks = tasks.length;

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (viewMode === "my" && currentUserId) {
      result = result.filter(
        (t) => t.assignees?.some((a) => a.user.id === currentUserId)
      );
    }

    if (activeStage) {
      result = result.filter((t) => t.status === activeStage);
    } else {
      result = result.filter((t) => t.status !== "done");
    }

    return result.sort((a, b) => {
      const pa = priorityConfig[a.priority]?.order ?? 9;
      const pb = priorityConfig[b.priority]?.order ?? 9;
      return pa - pb;
    });
  }, [tasks, activeStage, viewMode, currentUserId]);

  const today = startOfDay(new Date());

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Pipeline</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
              <button
                onClick={() => setViewMode("my")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  viewMode === "my"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="w-3 h-3" />
                My
              </button>
              <button
                onClick={() => setViewMode("all")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  viewMode === "all"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-3 h-3" />
                All
              </button>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-7" onClick={onCreateTask}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Task</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col gap-4 flex-1">
        {/* Pipeline bar */}
        <div className="flex items-center gap-0.5 h-8 rounded-lg overflow-hidden bg-muted/30">
          {STAGES.map((stage) => {
            const count = stageCounts[stage.key] || 0;
            const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 20;
            const isActive = activeStage === stage.key;

            return (
              <button
                key={stage.key}
                onClick={() => setActiveStage(isActive ? null : stage.key)}
                title={`${stage.label}: ${count}`}
                className={cn(
                  "relative h-full transition-all group",
                  isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-background rounded" : ""
                )}
                style={{ width: `${Math.max(pct, 5)}%` }}
              >
                <div className={cn("h-full w-full", stage.color, isActive ? "opacity-100" : "opacity-60 group-hover:opacity-80")} />
                <span className={cn(
                  "absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm",
                  count === 0 && "opacity-50"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stage labels */}
        <div className="flex items-center gap-0.5">
          {STAGES.map((stage) => (
            <button
              key={stage.key}
              onClick={() => setActiveStage(activeStage === stage.key ? null : stage.key)}
              className={cn(
                "text-[10px] sm:text-xs text-center transition-colors truncate flex-1",
                activeStage === stage.key
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {stage.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="flex-1 space-y-1.5 min-h-0 overflow-y-auto max-h-[400px] pr-1">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {viewMode === "my"
                ? "No tasks assigned to you"
                : activeStage
                  ? `No tasks in ${STAGES.find((s) => s.key === activeStage)?.label}`
                  : "No active tasks"}
            </div>
          ) : (
            filteredTasks.slice(0, 15).map((task) => {
              const priority = priorityConfig[task.priority];
              const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), today) && task.status !== "done";
              const stageInfo = STAGES.find((s) => s.key === task.status);

              return (
                <Link
                  key={task.id}
                  href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", stageInfo?.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {priority && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", priority.className)}>
                          {priority.label}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <span className={cn(
                          "text-[10px]",
                          isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                        )}>
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
                      {hasIntegrationBadge(task.metadata, "github") && (
                        <span className="text-[10px] text-muted-foreground">GH</span>
                      )}
                      {hasIntegrationBadge(task.metadata, "jira") && (
                        <span className="text-[10px] text-muted-foreground">JR</span>
                      )}
                      {hasIntegrationBadge(task.metadata, "azure") && (
                        <span className="text-[10px] text-muted-foreground">AZ</span>
                      )}
                    </div>
                  </div>
                  {task.assignees && task.assignees.length > 0 && (
                    <div className="flex -space-x-1.5 shrink-0">
                      {task.assignees.slice(0, 2).map((a, i) => (
                        <Avatar key={i} className="w-5 h-5 border border-background">
                          <AvatarImage src={a.user.image || undefined} />
                          <AvatarFallback className="text-[9px] bg-muted">
                            {a.user.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {task.assignees.length > 2 && (
                        <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center">
                          <span className="text-[8px] text-muted-foreground">+{task.assignees.length - 2}</span>
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })
          )}
          {filteredTasks.length > 15 && (
            <Link
              href={`/${locale}/app/${workspaceId}/tasks${activeStage ? `?status=${activeStage}` : ""}`}
              className="block text-center py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              View all {filteredTasks.length} tasks
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
