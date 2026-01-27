"use server";

import { db } from "@/lib/db";
import { todos, tasks, workspaces, taskAssignees, users, Todo, NewTodo } from "@/lib/db/schema";
import { eq, and, desc, asc, gte, lte, or, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/permissions";
import { z } from "zod";

// ============== SCHEMAS ==============

const createTodoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  linkedTaskId: z.string().uuid().optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  dueTime: z.string().nullable().optional(),
  linkedTaskId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().optional(),
});

// ============== TYPES ==============

export type TodoWithLinkedTask = Todo & {
  linkedTask?: {
    id: string;
    title: string;
    status: string;
    workspaceId: string;
    workspace?: { name: string };
  } | null;
};

// ============== ACTIONS ==============

/**
 * Get all todos for the current user
 */
export async function getTodos(options?: {
  completed?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
}) {
  const user = await getCurrentUser();

  const conditions = [eq(todos.userId, user.id)];

  if (options?.completed !== undefined) {
    conditions.push(eq(todos.completed, options.completed));
  }

  if (options?.dueDateFrom) {
    conditions.push(gte(todos.dueDate, options.dueDateFrom));
  }

  if (options?.dueDateTo) {
    conditions.push(lte(todos.dueDate, options.dueDateTo));
  }

  const result = await db.query.todos.findMany({
    where: and(...conditions),
    with: {
      linkedTask: {
        columns: {
          id: true,
          title: true,
          status: true,
          workspaceId: true,
        },
      },
    },
    orderBy: [asc(todos.completed), asc(todos.orderIndex), desc(todos.createdAt)],
  });

  return result as TodoWithLinkedTask[];
}

/**
 * Get todos for "My Day" view
 */
export async function getMyDayData() {
  const user = await getCurrentUser();
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Get personal todos
  const userTodos = await db.query.todos.findMany({
    where: and(
      eq(todos.userId, user.id),
      eq(todos.completed, false)
    ),
    with: {
      linkedTask: {
        columns: {
          id: true,
          title: true,
          status: true,
          workspaceId: true,
        },
      },
    },
    orderBy: [asc(todos.orderIndex), desc(todos.createdAt)],
  });

  // Get tasks assigned to user across all workspaces
  const assignedTasks = await db
    .select({
      task: tasks,
      workspace: {
        id: workspaces.id,
        name: workspaces.name,
      },
    })
    .from(tasks)
    .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
    .innerJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
    .where(
      and(
        eq(taskAssignees.userId, user.id),
        or(
          eq(tasks.status, "todo"),
          eq(tasks.status, "in_progress"),
          eq(tasks.status, "review")
        )
      )
    )
    .orderBy(asc(tasks.dueDate), desc(tasks.priority));

  // Categorize tasks
  const overdueTasks = assignedTasks.filter(
    (t) => t.task.dueDate && t.task.dueDate < today
  );
  const todayTasks = assignedTasks.filter(
    (t) => t.task.dueDate === today
  );
  const upcomingTasks = assignedTasks.filter(
    (t) => t.task.dueDate && t.task.dueDate > today && t.task.dueDate <= weekEnd
  );
  const noDueDateTasks = assignedTasks.filter(
    (t) => !t.task.dueDate
  );

  return {
    todos: userTodos as TodoWithLinkedTask[],
    tasks: {
      overdue: overdueTasks,
      today: todayTasks,
      upcoming: upcomingTasks,
      noDueDate: noDueDateTasks,
      total: assignedTasks.length,
    },
  };
}

/**
 * Create a new todo
 */
export async function createTodo(data: z.infer<typeof createTodoSchema>) {
  const user = await getCurrentUser();
  const validatedData = createTodoSchema.parse(data);

  // Get the highest order index
  const lastTodo = await db.query.todos.findFirst({
    where: eq(todos.userId, user.id),
    orderBy: desc(todos.orderIndex),
  });

  const newOrderIndex = (lastTodo?.orderIndex ?? 0) + 1;

  const [todo] = await db
    .insert(todos)
    .values({
      userId: user.id,
      title: validatedData.title,
      description: validatedData.description,
      priority: validatedData.priority || "medium",
      dueDate: validatedData.dueDate,
      dueTime: validatedData.dueTime,
      linkedTaskId: validatedData.linkedTaskId,
      orderIndex: newOrderIndex,
    })
    .returning();

  revalidatePath("/[locale]/app/my-day", "page");
  revalidatePath("/[locale]/app/workspaces", "page");
  return { success: true, todo };
}

/**
 * Update a todo
 */
export async function updateTodo(todoId: string, data: z.infer<typeof updateTodoSchema>) {
  const user = await getCurrentUser();
  const validatedData = updateTodoSchema.parse(data);

  // Verify ownership
  const existingTodo = await db.query.todos.findFirst({
    where: and(eq(todos.id, todoId), eq(todos.userId, user.id)),
  });

  if (!existingTodo) {
    throw new Error("Todo not found or access denied");
  }

  const [updated] = await db
    .update(todos)
    .set({
      ...validatedData,
      updatedAt: new Date(),
    })
    .where(eq(todos.id, todoId))
    .returning();

  revalidatePath("/[locale]/app/my-day", "page");
  return updated;
}

/**
 * Toggle todo completion
 */
export async function toggleTodo(todoId: string) {
  const user = await getCurrentUser();

  const existingTodo = await db.query.todos.findFirst({
    where: and(eq(todos.id, todoId), eq(todos.userId, user.id)),
  });

  if (!existingTodo) {
    throw new Error("Todo not found or access denied");
  }

  const [updated] = await db
    .update(todos)
    .set({
      completed: !existingTodo.completed,
      updatedAt: new Date(),
    })
    .where(eq(todos.id, todoId))
    .returning();

  revalidatePath("/[locale]/app/my-day", "page");
  return updated;
}

/**
 * Delete a todo
 */
export async function deleteTodo(todoId: string) {
  const user = await getCurrentUser();

  const existingTodo = await db.query.todos.findFirst({
    where: and(eq(todos.id, todoId), eq(todos.userId, user.id)),
  });

  if (!existingTodo) {
    throw new Error("Todo not found or access denied");
  }

  await db.delete(todos).where(eq(todos.id, todoId));

  revalidatePath("/[locale]/app/my-day", "page");
  return { success: true };
}

/**
 * Convert a todo to a full task
 */
export async function convertTodoToTask(
  todoId: string,
  workspaceId: string
) {
  const user = await getCurrentUser();

  const existingTodo = await db.query.todos.findFirst({
    where: and(eq(todos.id, todoId), eq(todos.userId, user.id)),
  });

  if (!existingTodo) {
    throw new Error("Todo not found or access denied");
  }

  // Create task
  const [task] = await db
    .insert(tasks)
    .values({
      workspaceId,
      title: existingTodo.title,
      description: existingTodo.description,
      status: "todo",
      priority: existingTodo.priority || "medium",
      dueDate: existingTodo.dueDate,
      createdBy: user.id,
      orderIndex: 0,
    })
    .returning();

  // Assign to creator
  await db.insert(taskAssignees).values({
    taskId: task.id,
    userId: user.id,
  });

  // Delete the todo (or link it)
  await db.delete(todos).where(eq(todos.id, todoId));

  revalidatePath("/[locale]/app/my-day", "page");
  return task;
}

/**
 * Reorder todos
 */
export async function reorderTodos(todoIds: string[]) {
  const user = await getCurrentUser();

  // Update order index for each todo
  await Promise.all(
    todoIds.map((id, index) =>
      db
        .update(todos)
        .set({ orderIndex: index, updatedAt: new Date() })
        .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
    )
  );

  revalidatePath("/[locale]/app/my-day", "page");
  return { success: true };
}

/**
 * Clear completed todos
 */
export async function clearCompletedTodos() {
  const user = await getCurrentUser();

  await db
    .delete(todos)
    .where(and(eq(todos.userId, user.id), eq(todos.completed, true)));

  revalidatePath("/[locale]/app/my-day", "page");
  return { success: true };
}
