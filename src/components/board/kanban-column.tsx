"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 min-w-72 bg-muted/30 rounded-xl border border-border transition-colors",
        isOver && "border-primary bg-primary/5"
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

      {/* Tasks */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[100px]">
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                Drop tasks here
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
      </ScrollArea>
    </div>
  );
};
