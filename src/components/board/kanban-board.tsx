"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "../tasks/create-task-dialog";
import { useUpdateTaskStatus } from "@/lib/hooks/use-tasks";
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

const columnIds = columns.map((c) => c.id);

export const KanbanBoard = ({
  initialTasks,
  workspaceId,
  locale,
  members,
}: KanbanBoardProps) => {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogStatus, setCreateDialogStatus] = useState<TaskStatus>("todo");
  
  // Hook for updating task status with proper cache invalidation
  const updateTaskStatusMutation = useUpdateTaskStatus(workspaceId);
  
  // Sync local state with prop changes (e.g., after refetch)
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Optimized sensors for better responsiveness
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Start dragging after 3px movement
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Shorter delay for touch
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId) || null,
    [tasks, activeId]
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

  // Find which column a task or column ID belongs to
  const findColumn = useCallback((id: UniqueIdentifier): TaskStatus | null => {
    // Check if it's a column ID
    if (columnIds.includes(id as TaskStatus)) {
      return id as TaskStatus;
    }
    
    // Find which column contains this task
    const task = tasks.find((t) => t.id === id);
    return task?.status || null;
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn || activeColumn === overColumn) {
      return;
    }

    // Move task to new column immediately for visual feedback
    setTasks((prev) => {
      const activeTask = prev.find((t) => t.id === activeId);
      if (!activeTask) return prev;

      return prev.map((t) =>
        t.id === activeId ? { ...t, status: overColumn } : t
      );
    });
  }, [findColumn]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Determine target column
    const targetColumn = findColumn(overId);
    if (!targetColumn) return;

    // Get tasks in target column (excluding the active task)
    const columnTasks = tasks
      .filter((t) => t.status === targetColumn && t.id !== activeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // Calculate new order index
    let newOrderIndex: number;
    
    if (columnIds.includes(overId as TaskStatus)) {
      // Dropped on column itself - add to end
      newOrderIndex = columnTasks.length;
    } else {
      // Dropped on another task - insert at that position
      const overTaskIndex = columnTasks.findIndex((t) => t.id === overId);
      newOrderIndex = overTaskIndex >= 0 ? overTaskIndex : columnTasks.length;
    }

    // Update local state with optimistic update
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === activeId
          ? { ...t, status: targetColumn, orderIndex: newOrderIndex }
          : t
      );

      // Reorder all tasks in the target column
      const columnTasksUpdated = updated
        .filter((t) => t.status === targetColumn)
        .sort((a, b) => {
          if (a.id === activeId) return newOrderIndex - 0.5;
          return a.orderIndex - b.orderIndex;
        })
        .map((t, idx) => ({ ...t, orderIndex: idx }));

      return updated.map((t) => {
        const reordered = columnTasksUpdated.find((ct) => ct.id === t.id);
        return reordered || t;
      });
    });

    // Persist to database using the mutation hook
    updateTaskStatusMutation.mutate(
      { taskId: activeId, status: targetColumn, orderIndex: newOrderIndex },
      {
        onError: () => {
          toast.error("Failed to update task");
          setTasks(initialTasks);
        },
      }
    );
  }, [tasks, findColumn, initialTasks, updateTaskStatusMutation]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleAddTask = (status: TaskStatus) => {
    setCreateDialogStatus(status);
    setCreateDialogOpen(true);
  };

  const handleTaskCreated = (task: TaskWithRelations) => {
    setTasks((prev) => [...prev, task]);
    setCreateDialogOpen(false);
  };

  // Custom collision detection - prioritize columns
  const collisionDetection = useCallback((args: any) => {
    // First check for pointer within
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      // Prioritize column collisions
      const columnCollision = pointerCollisions.find((c) => 
        columnIds.includes(c.id as TaskStatus)
      );
      if (columnCollision) {
        return [columnCollision];
      }
      return pointerCollisions;
    }

    // Fallback to rect intersection
    return rectIntersection(args);
  }, []);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="flex gap-4 h-full overflow-x-auto pb-4 px-1">
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

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}>
          {activeTask && (
            <div className="rotate-3 scale-105">
              <TaskCard
                task={activeTask}
                locale={locale}
                workspaceId={workspaceId}
                isDragging
              />
            </div>
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
