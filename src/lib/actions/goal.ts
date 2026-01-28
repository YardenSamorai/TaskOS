"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/permissions";
import { eq, and, desc, or, isNull } from "drizzle-orm";
import { z } from "zod";

const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  targetValue: z.number().min(1).default(100),
  currentValue: z.number().min(0).default(0),
  unit: z.string().optional(),
  dueDate: z.string().optional(),
  workspaceId: z.string().uuid().optional(),
});

const updateGoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  targetValue: z.number().min(1).optional(),
  currentValue: z.number().min(0).optional(),
  unit: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  completed: z.boolean().optional(),
});

// Create goal
export const createGoal = async (data: z.infer<typeof createGoalSchema>) => {
  try {
    const user = await getCurrentUser();
    const validatedData = createGoalSchema.parse(data);

    const [goal] = await db
      .insert(goals)
      .values({
        userId: user.id,
        title: validatedData.title,
        description: validatedData.description || null,
        targetValue: validatedData.targetValue,
        currentValue: validatedData.currentValue,
        unit: validatedData.unit || null,
        dueDate: validatedData.dueDate || null,
        workspaceId: validatedData.workspaceId || null,
      })
      .returning();

    revalidatePath("/app");
    return { success: true, goal };
  } catch (error) {
    console.error("Error creating goal:", error);
    return { success: false, error: "Failed to create goal" };
  }
};

// Get user's goals
export const getGoals = async (options?: { 
  includeCompleted?: boolean;
  workspaceId?: string;
}) => {
  try {
    const user = await getCurrentUser();

    const conditions = [eq(goals.userId, user.id)];

    if (!options?.includeCompleted) {
      conditions.push(eq(goals.completed, false));
    }

    if (options?.workspaceId) {
      conditions.push(
        or(
          eq(goals.workspaceId, options.workspaceId),
          isNull(goals.workspaceId)
        )!
      );
    }

    const result = await db.query.goals.findMany({
      where: and(...conditions),
      orderBy: [desc(goals.createdAt)],
      with: {
        workspace: true,
      },
    });

    return { success: true, goals: result };
  } catch (error) {
    console.error("Error getting goals:", error);
    return { success: false, goals: [] };
  }
};

// Update goal
export const updateGoal = async (data: z.infer<typeof updateGoalSchema>) => {
  try {
    const user = await getCurrentUser();
    const validatedData = updateGoalSchema.parse(data);

    // Verify ownership
    const existing = await db.query.goals.findFirst({
      where: and(
        eq(goals.id, validatedData.id),
        eq(goals.userId, user.id)
      ),
    });

    if (!existing) {
      return { success: false, error: "Goal not found" };
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.targetValue !== undefined) updateData.targetValue = validatedData.targetValue;
    if (validatedData.currentValue !== undefined) updateData.currentValue = validatedData.currentValue;
    if (validatedData.unit !== undefined) updateData.unit = validatedData.unit;
    if (validatedData.dueDate !== undefined) updateData.dueDate = validatedData.dueDate;
    if (validatedData.completed !== undefined) updateData.completed = validatedData.completed;

    // Auto-complete if target reached
    if (validatedData.currentValue !== undefined && existing.targetValue) {
      if (validatedData.currentValue >= existing.targetValue) {
        updateData.completed = true;
      }
    }

    const [goal] = await db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, validatedData.id))
      .returning();

    revalidatePath("/app");
    return { success: true, goal };
  } catch (error) {
    console.error("Error updating goal:", error);
    return { success: false, error: "Failed to update goal" };
  }
};

// Update goal progress
export const updateGoalProgress = async (id: string, currentValue: number) => {
  try {
    const user = await getCurrentUser();

    const existing = await db.query.goals.findFirst({
      where: and(
        eq(goals.id, id),
        eq(goals.userId, user.id)
      ),
    });

    if (!existing) {
      return { success: false, error: "Goal not found" };
    }

    const completed = currentValue >= existing.targetValue;

    const [goal] = await db
      .update(goals)
      .set({ 
        currentValue,
        completed,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, id))
      .returning();

    revalidatePath("/app");
    return { success: true, goal };
  } catch (error) {
    console.error("Error updating goal progress:", error);
    return { success: false, error: "Failed to update goal progress" };
  }
};

// Delete goal
export const deleteGoal = async (id: string) => {
  try {
    const user = await getCurrentUser();

    const existing = await db.query.goals.findFirst({
      where: and(
        eq(goals.id, id),
        eq(goals.userId, user.id)
      ),
    });

    if (!existing) {
      return { success: false, error: "Goal not found" };
    }

    await db.delete(goals).where(eq(goals.id, id));

    revalidatePath("/app");
    return { success: true };
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { success: false, error: "Failed to delete goal" };
  }
};
