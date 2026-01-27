"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Calendar, CheckSquare, MessageSquare, Paperclip, Clock, Flag, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow, parseISO, formatDistanceToNow } from "date-fns";
import type { Task, User } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: User }[];
  tags: { tag: { id: string; name: string; color: string } }[];
  stages: { id: string; status: string }[];
  steps: { id: string; completed: boolean }[];
  _count?: { comments: number; attachments: number };
}

interface TaskCardProps {
  task: TaskWithRelations;
  locale: string;
  workspaceId: string;
  isDragging?: boolean;
}

const priorityConfig: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  low: { 
    bg: "bg-slate-500/10", 
    text: "text-slate-500", 
    icon: "border-slate-400",
    label: "Low"
  },
  medium: { 
    bg: "bg-blue-500/10", 
    text: "text-blue-500", 
    icon: "border-blue-400",
    label: "Medium"
  },
  high: { 
    bg: "bg-orange-500/10", 
    text: "text-orange-500", 
    icon: "border-orange-400",
    label: "High"
  },
  urgent: { 
    bg: "bg-red-500/10", 
    text: "text-red-500", 
    icon: "border-red-400",
    label: "Urgent"
  },
};

export const TaskCard = ({ task, locale, workspaceId, isDragging }: TaskCardProps) => {
  const router = useRouter();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: task.id,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  const completedSteps = task.steps.filter((s) => s.completed).length;
  const totalSteps = task.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const isOverdue =
    task.dueDate &&
    isPast(parseISO(task.dueDate)) &&
    !isToday(parseISO(task.dueDate)) &&
    task.status !== "done";

  const isDueToday = task.dueDate && isToday(parseISO(task.dueDate));
  const isDueTomorrow = task.dueDate && isTomorrow(parseISO(task.dueDate));

  // Handle click to navigate (only if not dragging)
  const handleClick = (e: React.MouseEvent) => {
    if (isSortableDragging || isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    router.push(`/${locale}/app/${workspaceId}/tasks/${task.id}`);
  };

  const getDueDateDisplay = () => {
    if (!task.dueDate) return null;
    const date = parseISO(task.dueDate);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isOverdue) return formatDistanceToNow(date, { addSuffix: true });
    return format(date, "MMM d");
  };

  const priorityStyle = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none select-none",
        (isSortableDragging || isDragging) && "opacity-40 z-50"
      )}
    >
      <Card
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={cn(
          "group cursor-grab active:cursor-grabbing transition-all duration-200 overflow-hidden",
          "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
          "bg-gradient-to-br from-card to-card/80",
          isDragging && "shadow-2xl cursor-grabbing border-primary/50 scale-105",
          isOverdue && "border-red-500/30",
          task.status === "done" && "opacity-75"
        )}
      >
        {/* Priority indicator bar */}
        <div className={cn(
          "h-1 w-full",
          task.priority === "urgent" && "bg-gradient-to-r from-red-500 to-orange-500",
          task.priority === "high" && "bg-gradient-to-r from-orange-500 to-amber-500",
          task.priority === "medium" && "bg-gradient-to-r from-blue-500 to-cyan-500",
          task.priority === "low" && "bg-gradient-to-r from-slate-400 to-slate-300",
        )} />
        
        <CardContent className="p-4 space-y-3">
          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.slice(0, 3).map(({ tag }) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-[11px] font-medium rounded-md"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                    border: `1px solid ${tag.color}30`,
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="px-2 py-0.5 text-[11px] text-muted-foreground bg-muted rounded-md">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h4 className={cn(
            "font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors",
            task.status === "done" && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h4>

          {/* Progress bar for steps */}
          {totalSteps > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Progress
                </span>
                <span className={cn(
                  "font-medium",
                  progress === 100 ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {completedSteps}/{totalSteps}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    progress === 100 
                      ? "bg-gradient-to-r from-emerald-500 to-green-400" 
                      : "bg-gradient-to-r from-primary to-violet-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            {/* Priority badge */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-md",
              priorityStyle.bg
            )}>
              <Flag className={cn("w-3 h-3", priorityStyle.text)} />
              <span className={cn("font-medium", priorityStyle.text)}>
                {priorityStyle.label}
              </span>
            </div>

            {/* Due date */}
            {task.dueDate && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md",
                isOverdue && "bg-red-500/10 text-red-500",
                isDueToday && !isOverdue && "bg-amber-500/10 text-amber-500",
                isDueTomorrow && "bg-blue-500/10 text-blue-500",
                !isOverdue && !isDueToday && !isDueTomorrow && "bg-muted text-muted-foreground"
              )}>
                <Clock className="w-3 h-3" />
                <span className="font-medium">{getDueDateDisplay()}</span>
              </div>
            )}

            {/* Process mode indicator */}
            {task.stages.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500">
                <Sparkles className="w-3 h-3" />
                <span className="font-medium">{task.stages.length} stages</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            {/* Assignees */}
            <div className="flex items-center gap-2">
              {task.assignees.length > 0 ? (
                <div className="flex -space-x-2">
                  {task.assignees.slice(0, 3).map((assignee) => (
                    <Avatar key={assignee.id} className="w-7 h-7 border-2 border-card ring-0">
                      <AvatarImage src={assignee.user.image || undefined} />
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-violet-500 text-white">
                        {assignee.user.name?.[0] || assignee.user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {task.assignees.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                      +{task.assignees.length - 3}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">Unassigned</span>
              )}
            </div>

            {/* Indicators */}
            <div className="flex items-center gap-2 text-muted-foreground">
              {(task._count?.comments || 0) > 0 && (
                <div className="flex items-center gap-1 text-[11px]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{task._count?.comments}</span>
                </div>
              )}
              {(task._count?.attachments || 0) > 0 && (
                <div className="flex items-center gap-1 text-[11px]">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{task._count?.attachments}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
