"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import {
  tasks,
  taskAssignees,
  taskStages,
  taskSteps,
  taskComments,
  taskTags,
  activityLogs,
  users,
} from "@/lib/db/schema";
import {
  getCurrentUser,
  requireWorkspaceMember,
  requireWorkspaceEditor,
} from "@/lib/auth/permissions";
import { and, eq, desc, asc, inArray, sql, gte, lte, isNull, or } from "drizzle-orm";
import { z } from "zod";
import type { TaskStatus, TaskPriority } from "@/lib/db/schema";
import { CACHE_TAGS } from "@/lib/cache";
import { getCachedWorkspaceTasks, getCachedWorkspaceStats, getCachedRecentActivity } from "./cached";

// Schemas
const createTaskSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("low"),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  orderIndex: z.number().optional(),
});

// Log activity
const logActivity = async (
  workspaceId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  taskId?: string,
  metadata?: Record<string, unknown>
) => {
  await db.insert(activityLogs).values({
    workspaceId,
    userId,
    taskId: taskId ?? (entityType === "task" ? entityId : undefined),
    action,
    entityType,
    entityId,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
};

// Create task
export const createTask = async (formData: FormData) => {
  try {
    const workspaceId = formData.get("workspaceId") as string;
    const { user } = await requireWorkspaceEditor(workspaceId);

    // Get steps from formData (JSON string array)
    const stepsJson = formData.get("steps") as string;
    const stepsList: string[] = stepsJson ? JSON.parse(stepsJson) : [];

    const data = createTaskSchema.parse({
      workspaceId,
      projectId: formData.get("projectId") || undefined,
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      status: formData.get("status") || "todo",
      priority: formData.get("priority") || "low",
      dueDate: formData.get("dueDate") || undefined,
      startDate: formData.get("startDate") || undefined,
      assigneeIds: formData.getAll("assigneeIds").filter(Boolean) as string[],
    });

    // Get max order index for this status
    const maxOrder = await db
      .select({ max: sql<number>`COALESCE(MAX(${tasks.orderIndex}), 0)` })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.status, data.status)));

    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        startDate: data.startDate,
        orderIndex: (maxOrder[0]?.max || 0) + 1,
        createdBy: user.id,
      })
      .returning();

    // Add assignees
    if (data.assigneeIds && data.assigneeIds.length > 0) {
      await db.insert(taskAssignees).values(
        data.assigneeIds.map((userId) => ({
          taskId: task.id,
          userId,
          assignedBy: user.id,
        }))
      );
    }

    // Add steps (checklist items)
    if (stepsList.length > 0) {
      await db.insert(taskSteps).values(
        stepsList.map((stepContent, index) => ({
          taskId: task.id,
          content: stepContent,
          completed: false,
          orderIndex: index,
        }))
      );
    }

    // Log activity
    await logActivity(workspaceId, user.id, "created", "task", task.id);

    // Invalidate caches
    revalidateTag(CACHE_TAGS.tasks(workspaceId));
    revalidateTag(CACHE_TAGS.stats(workspaceId));
    revalidateTag(CACHE_TAGS.activity(workspaceId));
    revalidatePath(`/app/${workspaceId}`);

    return { success: true, task };
  } catch (error) {
    console.error("Error creating task:", error);
    return { success: false, error: "Failed to create task" };
  }
};

// Get tasks for workspace (with caching)
export const getWorkspaceTasks = async (
  workspaceId: string,
  filters?: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assigneeId?: string;
    search?: string;
    dueBefore?: string;
    dueAfter?: string;
  }
) => {
  try {
    await requireWorkspaceMember(workspaceId);

    // Use cached version for better performance
    const taskList = await getCachedWorkspaceTasks(workspaceId);

    // Apply client-side filters
    let filteredTasks = taskList;

    if (filters?.status && filters.status.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        filters.status!.includes(task.status)
      );
    }

    if (filters?.priority && filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        filters.priority!.includes(task.priority)
      );
    }

    if (filters?.dueBefore) {
      filteredTasks = filteredTasks.filter(
        (task) => task.dueDate && task.dueDate <= filters.dueBefore!
      );
    }

    if (filters?.dueAfter) {
      filteredTasks = filteredTasks.filter(
        (task) => task.dueDate && task.dueDate >= filters.dueAfter!
      );
    }

    if (filters?.assigneeId) {
      filteredTasks = filteredTasks.filter((task) =>
        task.assignees.some((a) => a.userId === filters.assigneeId)
      );
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
      );
    }

    return { success: true, tasks: filteredTasks };
  } catch (error) {
    console.error("Error getting tasks:", error);
    return { success: false, tasks: [] };
  }
};

// Get single task
export const getTask = async (taskId: string) => {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        workspace: true,
        project: true,
        creator: true,
        assignees: {
          with: {
            user: true,
          },
        },
        stages: {
          orderBy: [asc(taskStages.orderIndex)],
          with: {
            steps: {
              orderBy: [asc(taskSteps.orderIndex)],
            },
            attachments: {
              with: {
                uploader: true,
              },
            },
          },
        },
        steps: {
          where: isNull(taskSteps.stageId),
          orderBy: [asc(taskSteps.orderIndex)],
        },
        comments: {
          orderBy: [desc(taskComments.createdAt)],
          with: {
            user: true,
          },
        },
        attachments: {
          with: {
            uploader: true,
          },
        },
        tags: {
          with: {
            tag: true,
          },
        },
        activityLogs: {
          orderBy: [desc(activityLogs.createdAt)],
          limit: 20,
          with: {
            user: true,
          },
        },
      },
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    await requireWorkspaceMember(task.workspaceId);

    return { success: true, task };
  } catch (error) {
    console.error("Error getting task:", error);
    return { success: false, error: "Failed to get task" };
  }
};

// Update task
export const updateTask = async (formData: FormData) => {
  try {
    const taskId = formData.get("taskId") as string;

    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existingTask) {
      return { success: false, error: "Task not found" };
    }

    const { user } = await requireWorkspaceEditor(existingTask.workspaceId);

    const data = updateTaskSchema.parse({
      taskId,
      title: formData.get("title") || undefined,
      description: formData.get("description") ?? undefined,
      status: formData.get("status") || undefined,
      priority: formData.get("priority") || undefined,
      dueDate: formData.get("dueDate") ?? undefined,
      startDate: formData.get("startDate") ?? undefined,
      orderIndex: formData.get("orderIndex")
        ? parseInt(formData.get("orderIndex") as string)
        : undefined,
    });

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (data.title !== undefined && data.title !== existingTask.title) {
      updateData.title = data.title;
      changes.title = { from: existingTask.title, to: data.title };
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.status !== undefined && data.status !== existingTask.status) {
      updateData.status = data.status;
      changes.status = { from: existingTask.status, to: data.status };
    }
    if (data.priority !== undefined && data.priority !== existingTask.priority) {
      updateData.priority = data.priority;
      changes.priority = { from: existingTask.priority, to: data.priority };
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate;
    }
    if (data.orderIndex !== undefined) {
      updateData.orderIndex = data.orderIndex;
    }

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    // Log activity
    if (Object.keys(changes).length > 0) {
      await logActivity(
        existingTask.workspaceId,
        user.id,
        "updated",
        "task",
        taskId,
        taskId,
        changes
      );
    }

    // Invalidate caches
    revalidateTag(CACHE_TAGS.tasks(existingTask.workspaceId));
    revalidateTag(CACHE_TAGS.task(taskId));
    revalidateTag(CACHE_TAGS.stats(existingTask.workspaceId));
    revalidateTag(CACHE_TAGS.activity(existingTask.workspaceId));
    revalidatePath(`/app/${existingTask.workspaceId}`);

    return { success: true, task };
  } catch (error) {
    console.error("Error updating task:", error);
    return { success: false, error: "Failed to update task" };
  }
};

// Update task status (for DnD or quick change)
export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus,
  orderIndex?: number
) => {
  try {
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existingTask) {
      return { success: false, error: "Task not found" };
    }

    const { user } = await requireWorkspaceEditor(existingTask.workspaceId);

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
      updatedBy: user.id,
    };
    
    // Only update orderIndex if provided
    if (orderIndex !== undefined) {
      updateData.orderIndex = orderIndex;
    }

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    if (status !== existingTask.status) {
      await logActivity(
        existingTask.workspaceId,
        user.id,
        "moved",
        "task",
        taskId,
        taskId,
        { from: existingTask.status, to: status }
      );
    }

    // Invalidate caches
    revalidateTag(CACHE_TAGS.tasks(existingTask.workspaceId));
    revalidateTag(CACHE_TAGS.task(taskId));
    revalidateTag(CACHE_TAGS.stats(existingTask.workspaceId));
    revalidatePath(`/app/${existingTask.workspaceId}`);

    return { success: true, task };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, error: "Failed to update task" };
  }
};

// Delete task
export const deleteTask = async (taskId: string) => {
  try {
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existingTask) {
      return { success: false, error: "Task not found" };
    }

    const { user } = await requireWorkspaceEditor(existingTask.workspaceId);

    // Delete the task first
    await db.delete(tasks).where(eq(tasks.id, taskId));

    // Log activity WITHOUT taskId (task no longer exists)
    await logActivity(
      existingTask.workspaceId,
      user.id,
      "deleted",
      "task",
      undefined, // Don't reference deleted task
      undefined,
      { taskId, title: existingTask.title }
    );

    // Invalidate caches
    revalidateTag(CACHE_TAGS.tasks(existingTask.workspaceId));
    revalidateTag(CACHE_TAGS.task(taskId));
    revalidateTag(CACHE_TAGS.stats(existingTask.workspaceId));
    revalidateTag(CACHE_TAGS.activity(existingTask.workspaceId));
    revalidatePath(`/app/${existingTask.workspaceId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, error: "Failed to delete task" };
  }
};

// Add assignee
export const addAssignee = async (taskId: string, userId: string) => {
  try {
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existingTask) {
      return { success: false, error: "Task not found" };
    }

    const { user } = await requireWorkspaceEditor(existingTask.workspaceId);

    // Check if already assigned
    const existing = await db.query.taskAssignees.findFirst({
      where: and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)),
    });

    if (existing) {
      return { success: true, alreadyAssigned: true };
    }

    await db.insert(taskAssignees).values({
      taskId,
      userId,
      assignedBy: user.id,
    });

    const assignedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    await logActivity(
      existingTask.workspaceId,
      user.id,
      "assigned",
      "task",
      taskId,
      taskId,
      { assignee: assignedUser?.name || assignedUser?.email }
    );

    revalidatePath(`/app/${existingTask.workspaceId}`);

    return { success: true };
  } catch (error) {
    console.error("Error adding assignee:", error);
    return { success: false, error: "Failed to add assignee" };
  }
};

// Remove assignee
export const removeAssignee = async (taskId: string, userId: string) => {
  try {
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!existingTask) {
      return { success: false, error: "Task not found" };
    }

    const { user } = await requireWorkspaceEditor(existingTask.workspaceId);

    await db
      .delete(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)));

    revalidatePath(`/app/${existingTask.workspaceId}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing assignee:", error);
    return { success: false, error: "Failed to remove assignee" };
  }
};

// Get workspace stats (with caching)
export const getWorkspaceStats = async (workspaceId: string) => {
  try {
    await requireWorkspaceMember(workspaceId);

    // Use cached version for better performance
    const stats = await getCachedWorkspaceStats(workspaceId);

    return { success: true, stats };
  } catch (error) {
    console.error("Error getting workspace stats:", error);
    return { success: false, stats: null };
  }
};

// Get recent activity (with caching)
export const getRecentActivity = async (workspaceId: string, limit = 10) => {
  try {
    await requireWorkspaceMember(workspaceId);

    // Use cached version for better performance
    const activity = await getCachedRecentActivity(workspaceId, limit);

    return { success: true, activity };
  } catch (error) {
    console.error("Error getting activity:", error);
    return { success: false, activity: [] };
  }
};

// Create stage
export const createStage = async (
  taskId: string,
  name: string,
  description?: string
) => {
  try {
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        stages: true,
      },
    });

    if (!existingTask) {
      return { success: false, error: "Task not found" };
    }

    const { user } = await requireWorkspaceEditor(existingTask.workspaceId);

    // Get max order index
    const maxOrder = existingTask.stages.length > 0
      ? Math.max(...existingTask.stages.map((s) => s.orderIndex))
      : -1;

    const [stage] = await db
      .insert(taskStages)
      .values({
        taskId,
        name,
        description,
        orderIndex: maxOrder + 1,
        status: "pending",
      })
      .returning();

    // Log activity
    await logActivity(
      existingTask.workspaceId,
      user.id,
      "added_stage",
      "stage",
      stage.id,
      taskId,
      { stageName: name }
    );

    // Invalidate caches
    revalidateTag(CACHE_TAGS.task(taskId));
    revalidateTag(CACHE_TAGS.tasks(existingTask.workspaceId));
    revalidatePath(`/app/${existingTask.workspaceId}/tasks/${taskId}`);

    return { success: true, stage };
  } catch (error) {
    console.error("Error creating stage:", error);
    return { success: false, error: "Failed to create stage" };
  }
};

// Update stage status
export const updateStageStatus = async (
  stageId: string,
  status: "pending" | "active" | "completed"
) => {
  try {
    const existingStage = await db.query.taskStages.findFirst({
      where: eq(taskStages.id, stageId),
      with: {
        task: true,
      },
    });

    if (!existingStage) {
      return { success: false, error: "Stage not found" };
    }

    const { user } = await requireWorkspaceEditor(existingStage.task.workspaceId);

    const [stage] = await db
      .update(taskStages)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : null,
      })
      .where(eq(taskStages.id, stageId))
      .returning();

    // Invalidate caches
    revalidateTag(CACHE_TAGS.task(existingStage.taskId));
    revalidateTag(CACHE_TAGS.tasks(existingStage.task.workspaceId));

    return { success: true, stage };
  } catch (error) {
    console.error("Error updating stage:", error);
    return { success: false, error: "Failed to update stage" };
  }
};

// Create step
export const createStep = async (
  taskId: string,
  content: string,
  stageId?: string
) => {
  try {
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        steps: true,
      },
    });

    if (!existingTask) {
      return { success: false, error: "Task not found" };
    }

    const { user } = await requireWorkspaceEditor(existingTask.workspaceId);

    // Get max order index for this stage or task
    const relevantSteps = stageId
      ? existingTask.steps.filter((s) => s.stageId === stageId)
      : existingTask.steps.filter((s) => !s.stageId);
    const maxOrder = relevantSteps.length > 0
      ? Math.max(...relevantSteps.map((s) => s.orderIndex))
      : -1;

    const [step] = await db
      .insert(taskSteps)
      .values({
        taskId,
        stageId,
        content,
        orderIndex: maxOrder + 1,
        completed: false,
      })
      .returning();

    // Invalidate caches
    revalidateTag(CACHE_TAGS.task(taskId));
    revalidateTag(CACHE_TAGS.tasks(existingTask.workspaceId));

    return { success: true, step };
  } catch (error) {
    console.error("Error creating step:", error);
    return { success: false, error: "Failed to create step" };
  }
};

// Toggle step completion
export const toggleStep = async (stepId: string) => {
  try {
    const existingStep = await db.query.taskSteps.findFirst({
      where: eq(taskSteps.id, stepId),
      with: {
        task: true,
      },
    });

    if (!existingStep) {
      return { success: false, error: "Step not found" };
    }

    const { user } = await requireWorkspaceEditor(existingStep.task.workspaceId);

    const [step] = await db
      .update(taskSteps)
      .set({
        completed: !existingStep.completed,
        completedBy: !existingStep.completed ? user.id : null,
        completedAt: !existingStep.completed ? new Date() : null,
      })
      .where(eq(taskSteps.id, stepId))
      .returning();

    // Invalidate caches
    revalidateTag(CACHE_TAGS.task(existingStep.taskId));
    revalidateTag(CACHE_TAGS.tasks(existingStep.task.workspaceId));
    revalidateTag(CACHE_TAGS.stats(existingStep.task.workspaceId));

    return { success: true, step };
  } catch (error) {
    console.error("Error toggling step:", error);
    return { success: false, error: "Failed to toggle step" };
  }
};

// Delete step
export const deleteStep = async (stepId: string) => {
  try {
    const existingStep = await db.query.taskSteps.findFirst({
      where: eq(taskSteps.id, stepId),
      with: {
        task: true,
      },
    });

    if (!existingStep) {
      return { success: false, error: "Step not found" };
    }

    await requireWorkspaceEditor(existingStep.task.workspaceId);

    await db.delete(taskSteps).where(eq(taskSteps.id, stepId));

    // Invalidate caches
    revalidateTag(CACHE_TAGS.task(existingStep.taskId));
    revalidateTag(CACHE_TAGS.tasks(existingStep.task.workspaceId));

    return { success: true };
  } catch (error) {
    console.error("Error deleting step:", error);
    return { success: false, error: "Failed to delete step" };
  }
};

// Delete stage
export const deleteStage = async (stageId: string) => {
  try {
    const existingStage = await db.query.taskStages.findFirst({
      where: eq(taskStages.id, stageId),
      with: {
        task: true,
      },
    });

    if (!existingStage) {
      return { success: false, error: "Stage not found" };
    }

    await requireWorkspaceEditor(existingStage.task.workspaceId);

    await db.delete(taskStages).where(eq(taskStages.id, stageId));

    // Invalidate caches
    revalidateTag(CACHE_TAGS.task(existingStage.taskId));
    revalidateTag(CACHE_TAGS.tasks(existingStage.task.workspaceId));

    return { success: true };
  } catch (error) {
    console.error("Error deleting stage:", error);
    return { success: false, error: "Failed to delete stage" };
  }
};
