"use client";

import { useMemo } from "react";
import { AlertTriangle, Bot, Eye, CheckCircle2 } from "lucide-react";
import { isToday, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignees?: { user: { id: string; name: string | null; image: string | null } }[];
  updatedAt?: string;
  updatedBy?: string | null;
  metadata?: string | null;
}

interface ExecutionPulseProps {
  tasks: Task[];
  currentUserId?: string;
}

interface PulseIndicator {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const ExecutionPulse = ({ tasks, currentUserId }: ExecutionPulseProps) => {
  const indicators = useMemo<PulseIndicator[]>(() => {
    const today = startOfDay(new Date());

    const needsAttention = tasks.filter((t) => {
      const overdue =
        t.dueDate &&
        isBefore(new Date(t.dueDate), today) &&
        t.status !== "done";
      const highUnassigned =
        (t.priority === "high" || t.priority === "urgent") &&
        (!t.assignees || t.assignees.length === 0) &&
        t.status !== "done";
      return overdue || highUnassigned;
    }).length;

    const agentWorking = tasks.filter((t) => {
      if (t.status !== "in_progress") return false;
      try {
        const meta = t.metadata ? JSON.parse(t.metadata) : null;
        return meta?.agentProcessed === true;
      } catch {
        return false;
      }
    }).length;

    const waitingForYou = tasks.filter((t) => {
      if (t.status !== "review") return false;
      if (!currentUserId) return true;
      return t.assignees?.some((a) => a.user.id === currentUserId);
    }).length;

    const completedToday = tasks.filter(
      (t) => t.status === "done" && t.updatedAt && isToday(new Date(t.updatedAt))
    ).length;

    return [
      {
        label: "Needs Attention",
        value: needsAttention,
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: needsAttention > 0 ? "border-amber-500/30" : "border-transparent",
      },
      {
        label: "Agent Working",
        value: agentWorking,
        icon: <Bot className="w-4 h-4" />,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: agentWorking > 0 ? "border-blue-500/30" : "border-transparent",
      },
      {
        label: "Waiting For You",
        value: waitingForYou,
        icon: <Eye className="w-4 h-4" />,
        color: "text-violet-600 dark:text-violet-400",
        bgColor: "bg-violet-500/10",
        borderColor: waitingForYou > 0 ? "border-violet-500/30" : "border-transparent",
      },
      {
        label: "Completed Today",
        value: completedToday,
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: completedToday > 0 ? "border-emerald-500/30" : "border-transparent",
      },
    ];
  }, [tasks, currentUserId]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {indicators.map((ind) => (
        <div
          key={ind.label}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 transition-colors",
            ind.borderColor
          )}
        >
          <div className={cn("p-2 rounded-lg shrink-0", ind.bgColor, ind.color)}>
            {ind.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold leading-none">{ind.value}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
              {ind.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
