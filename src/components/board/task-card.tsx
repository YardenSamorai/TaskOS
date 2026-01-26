"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Calendar, CheckSquare, MessageSquare, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, parseISO } from "date-fns";
import type { Task, User } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: User }[];
  tags: { tag: { id: string; name: string; color: string } }[];
  stages: { id: string; status: string }[];
  steps: { id: string; completed: boolean }[];
}

interface TaskCardProps {
  task: TaskWithRelations;
  locale: string;
  workspaceId: string;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const TaskCard = ({ task, locale, workspaceId, isDragging }: TaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSteps = task.steps.filter((s) => s.completed).length;
  const totalSteps = task.steps.length;

  const isOverdue =
    task.dueDate &&
    isPast(parseISO(task.dueDate)) &&
    !isToday(parseISO(task.dueDate)) &&
    task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-manipulation",
        (isSortableDragging || isDragging) && "opacity-50"
      )}
    >
      <Link href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}>
        <Card
          className={cn(
            "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/20 transition-all",
            isDragging && "shadow-xl rotate-3 cursor-grabbing"
          )}
        >
          <CardContent className="p-3 space-y-3">
            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.slice(0, 3).map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 text-[10px] font-medium rounded-full"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
                {task.tags.length > 3 && (
                  <span className="px-2 py-0.5 text-[10px] text-muted-foreground">
                    +{task.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {task.title}
            </h4>

            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5", priorityColors[task.priority])}
              >
                {task.priority}
              </Badge>

              {task.dueDate && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-[10px]",
                    isOverdue ? "text-red-500" : "text-muted-foreground"
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {isToday(parseISO(task.dueDate))
                    ? "Today"
                    : format(parseISO(task.dueDate), "MMM d")}
                </span>
              )}
            </div>

            {/* Progress bar for steps */}
            {totalSteps > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" />
                    {completedSteps}/{totalSteps}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              {/* Assignees */}
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 3).map((assignee) => (
                  <Avatar key={assignee.id} className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={assignee.user.imageUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {assignee.user.name?.[0] || assignee.user.email[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>

              {/* Icons */}
              <div className="flex items-center gap-2 text-muted-foreground">
                {task.stages.length > 0 && (
                  <span className="text-[10px]">{task.stages.length} stages</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};
