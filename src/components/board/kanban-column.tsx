"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils";
import type { Task, User } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: User }[];
  tags: { tag: { id: string; name: string; color: string } }[];
  stages: { id: string; status: string }[];
  steps: { id: string; completed: boolean }[];
}

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: TaskWithRelations[];
  onAddTask: () => void;
  locale: string;
  workspaceId: string;
}

export const KanbanColumn = ({
  id,
  title,
  color,
  tasks,
  onAddTask,
  locale,
  workspaceId,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver, active } = useDroppable({ 
    id,
    data: {
      type: "column",
      column: id,
    },
  });

  const isDraggingOver = isOver && active?.data?.current?.type === "task";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 min-w-72 rounded-xl border-2 transition-all duration-200",
        isDraggingOver 
          ? "border-primary bg-primary/5 shadow-lg" 
          : "border-border bg-muted/30",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <h3 className="font-semibold">{title}</h3>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAddTask}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 overflow-y-auto p-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={cn(
            "space-y-2 min-h-[120px] rounded-lg transition-colors duration-200",
            isDraggingOver && "bg-primary/5"
          )}>
            {tasks.length === 0 ? (
              <div className={cn(
                "flex items-center justify-center h-28 text-sm rounded-lg border-2 border-dashed transition-all duration-200",
                isDraggingOver 
                  ? "border-primary text-primary bg-primary/10" 
                  : "border-muted-foreground/20 text-muted-foreground"
              )}>
                {isDraggingOver ? "Drop here" : "No tasks"}
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  locale={locale}
                  workspaceId={workspaceId}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
