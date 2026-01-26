"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  ArrowRight,
  ListTodo,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { useTasks } from "@/lib/hooks/use-tasks";

interface DashboardTasksProps {
  workspaceId: string;
  locale: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-500",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
};

export const DashboardTasks = ({ workspaceId, locale }: DashboardTasksProps) => {
  const { data: allTasks = [], isLoading } = useTasks(workspaceId);

  // Filter active tasks
  const tasks = allTasks.filter((task: any) => 
    ["todo", "in_progress", "review"].includes(task.status)
  );

  // Get tasks due today or overdue
  const urgentTasks = tasks.filter((task: any) => {
    if (!task.dueDate) return false;
    const dueDate = parseISO(task.dueDate);
    return isToday(dueDate) || isPast(dueDate);
  });

  // Get recent in-progress tasks
  const inProgressTasks = tasks
    .filter((task: any) => task.status === "in_progress")
    .slice(0, 5);

  const formatDueDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isPast(date)) return `Overdue: ${format(date, "MMM d")}`;
    return format(date, "MMM d");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-40 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Urgent Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Urgent & Due Today
          </CardTitle>
          <Link href={`/${locale}/app/${workspaceId}/tasks`}>
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {urgentTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-50" />
              <p>No urgent tasks! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentTasks.slice(0, 5).map((task: any) => (
                <Link
                  key={task.id}
                  href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={priorityColors[task.priority]}
                        >
                          {task.priority}
                        </Badge>
                        {task.dueDate && (
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isPast(parseISO(task.dueDate)) && task.status !== "done"
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDueDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.assignees?.length > 0 && (
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee: any) => (
                          <Avatar key={assignee.id} className="w-7 h-7 border-2 border-background">
                            <AvatarImage src={assignee.user?.imageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {assignee.user?.name?.[0] || assignee.user?.email?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-blue-500" />
            In Progress
          </CardTitle>
          <Link href={`/${locale}/app/${workspaceId}/board`}>
            <Button variant="ghost" size="sm" className="gap-1">
              View Board
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {inProgressTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No tasks in progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inProgressTasks.map((task: any) => {
                const completedSteps = task.steps?.filter((s: any) => s.completed).length || 0;
                const totalSteps = task.steps?.length || 0;
                const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

                return (
                  <Link
                    key={task.id}
                    href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}
                    className="block"
                  >
                    <div className="p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium truncate flex-1">{task.title}</p>
                        {task.assignees?.length > 0 && (
                          <Avatar className="w-6 h-6 ms-2">
                            <AvatarImage src={task.assignees[0].user?.imageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {task.assignees[0].user?.name?.[0] ||
                                task.assignees[0].user?.email?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      {totalSteps > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>
                              {completedSteps}/{totalSteps} steps
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
