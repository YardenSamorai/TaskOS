"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  isToday,
  isTomorrow,
  isThisWeek,
  isPast,
  parseISO,
  format,
} from "date-fns";
import {
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Task, User } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: User }[];
  steps: { id: string; completed: boolean }[];
}

interface FocusViewProps {
  tasks: TaskWithRelations[];
  locale: string;
  workspaceId: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-500",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
};

export const FocusView = ({ tasks, locale, workspaceId }: FocusViewProps) => {
  const t = useTranslations("focus");

  const { todayTasks, overdueTasks, upcomingTasks, inProgressTasks } = useMemo(() => {
    const today: TaskWithRelations[] = [];
    const overdue: TaskWithRelations[] = [];
    const upcoming: TaskWithRelations[] = [];
    const inProgress: TaskWithRelations[] = [];

    tasks.forEach((task) => {
      if (task.status === "done") return;

      if (task.status === "in_progress") {
        inProgress.push(task);
      }

      if (task.dueDate) {
        const dueDate = parseISO(task.dueDate);
        if (isToday(dueDate)) {
          today.push(task);
        } else if (isPast(dueDate)) {
          overdue.push(task);
        } else if (isTomorrow(dueDate) || isThisWeek(dueDate)) {
          upcoming.push(task);
        }
      }
    });

    return {
      todayTasks: today,
      overdueTasks: overdue,
      upcomingTasks: upcoming.slice(0, 5),
      inProgressTasks: inProgress.slice(0, 5),
    };
  }, [tasks]);

  const hasNoTasks =
    todayTasks.length === 0 &&
    overdueTasks.length === 0 &&
    inProgressTasks.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            Stay focused on what matters most
          </p>
        </div>
      </div>

      {/* All done state */}
      {hasNoTasks && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
              {t("allDone")}
            </h3>
            <p className="text-emerald-600 dark:text-emerald-400">
              You&apos;re all caught up. Great work!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5" />
              Overdue ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  locale={locale}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              {t("today")} ({todayTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  locale={locale}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In Progress */}
      {inProgressTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-orange-500" />
              In Progress ({inProgressTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inProgressTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  locale={locale}
                  workspaceId={workspaceId}
                  showProgress
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps / Upcoming */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              {t("nextSteps")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  locale={locale}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface TaskItemProps {
  task: TaskWithRelations;
  locale: string;
  workspaceId: string;
  showProgress?: boolean;
}

const TaskItem = ({ task, locale, workspaceId, showProgress }: TaskItemProps) => {
  const completedSteps = task.steps.filter((s) => s.completed).length;
  const totalSteps = task.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <Link href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
              {task.title}
            </h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={cn("text-xs", priorityColors[task.priority])}
            >
              {task.priority}
            </Badge>
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(task.dueDate), "MMM d")}
              </span>
            )}
            {showProgress && totalSteps > 0 && (
              <span className="text-xs text-muted-foreground">
                {completedSteps}/{totalSteps} steps
              </span>
            )}
          </div>
          {showProgress && totalSteps > 0 && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {task.assignees.length > 0 && (
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 2).map((assignee) => (
              <Avatar
                key={assignee.id}
                className="w-7 h-7 border-2 border-background"
              >
                <AvatarImage src={assignee.user.image || undefined} />
                <AvatarFallback className="text-xs">
                  {assignee.user.name?.[0] || assignee.user.email[0]}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}

        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
};
