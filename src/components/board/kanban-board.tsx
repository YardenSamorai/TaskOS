"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "../tasks/create-task-dialog";
import { updateTaskStatus } from "@/lib/actions/task";
import { toast } from "sonner";
import type { Task, TaskStatus, User, WorkspaceMember } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: User }[];
  tags: { tag: { id: string; name: string; color: string } }[];
  stages: { id: string; status: string }[];
  steps: { id: string; completed: boolean }[];
}

interface KanbanBoardProps {
  initialTasks: TaskWithRelations[];
  workspaceId: string;
  locale: string;
  members: (WorkspaceMember & { user: User })[];
}

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: "backlog", title: "Backlog", color: "bg-slate-500" },
  { id: "todo", title: "To Do", color: "bg-blue-500" },
  { id: "in_progress", title: "In Progress", color: "bg-orange-500" },
  { id: "review", title: "Review", color: "bg-purple-500" },
  { id: "done", title: "Done", color: "bg-emerald-500" },
];

export const KanbanBoard = ({
  initialTasks,
  workspaceId,
  locale,
  members,
}: KanbanBoardProps) => {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogStatus, setCreateDialogStatus] = useState<TaskStatus>("todo");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Small delay to distinguish from scroll
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithRelations[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort by orderIndex
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if over a column
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn) {
      if (activeTask.status !== overColumn.id) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, status: overColumn.id } : t
          )
        );
      }
      return;
    }

    // Over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (activeTask.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: overTask.status } : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Get the target column
    let targetStatus: TaskStatus;
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn) {
      targetStatus = overColumn.id;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    // Calculate new order index
    const targetTasks = tasks.filter(
      (t) => t.status === targetStatus && t.id !== activeId
    );
    const overIndex = targetTasks.findIndex((t) => t.id === overId);
    let newOrderIndex: number;

    if (overIndex === -1) {
      // Moving to empty column or end
      newOrderIndex = targetTasks.length > 0 
        ? Math.max(...targetTasks.map((t) => t.orderIndex)) + 1 
        : 0;
    } else {
      // Moving before/after another task
      newOrderIndex = overIndex;
    }

    // Update local state
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === activeId
          ? { ...t, status: targetStatus, orderIndex: newOrderIndex }
          : t
      );

      // Reorder tasks in target column
      const targetColumnTasks = updated
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => {
          if (a.id === activeId) return -1;
          if (b.id === activeId) return 1;
          return a.orderIndex - b.orderIndex;
        })
        .map((t, i) => ({ ...t, orderIndex: i }));

      return updated.map((t) => {
        const reordered = targetColumnTasks.find((rt) => rt.id === t.id);
        return reordered || t;
      });
    });

    // Persist to database
    try {
      await updateTaskStatus(activeId, targetStatus, newOrderIndex);
    } catch (error) {
      toast.error("Failed to update task");
      // Revert on error
      setTasks(initialTasks);
    }
  };

  const handleAddTask = (status: TaskStatus) => {
    setCreateDialogStatus(status);
    setCreateDialogOpen(true);
  };

  const handleTaskCreated = (task: TaskWithRelations) => {
    setTasks((prev) => [...prev, task]);
    setCreateDialogOpen(false);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByStatus[column.id]}
              onAddTask={() => handleAddTask(column.id)}
              locale={locale}
              workspaceId={workspaceId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              locale={locale}
              workspaceId={workspaceId}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        locale={locale}
        defaultStatus={createDialogStatus}
        members={members}
        onSuccess={handleTaskCreated}
      />
    </>
  );
};
