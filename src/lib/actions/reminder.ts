"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/permissions";
import { eq, and, desc, gte, lte, or, isNull } from "drizzle-orm";
import { z } from "zod";

const createReminderSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  linkedTaskId: z.string().uuid().optional(),
});

const updateReminderSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  dueTime: z.string().nullable().optional(),
  completed: z.boolean().optional(),
});

// Create reminder
export const createReminder = async (data: z.infer<typeof createReminderSchema>) => {
  try {
    const user = await getCurrentUser();
    const validatedData = createReminderSchema.parse(data);

    const [reminder] = await db
      .insert(reminders)
      .values({
        userId: user.id,
        title: validatedData.title,
        description: validatedData.description || null,
        dueDate: validatedData.dueDate || null,
        dueTime: validatedData.dueTime || null,
        linkedTaskId: validatedData.linkedTaskId || null,
      })
      .returning();

    revalidatePath("/app");
    return { success: true, reminder };
  } catch (error) {
    console.error("Error creating reminder:", error);
    return { success: false, error: "Failed to create reminder" };
  }
};

// Get user's reminders
export const getReminders = async (options?: { 
  includeCompleted?: boolean;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const user = await getCurrentUser();

    const conditions = [eq(reminders.userId, user.id)];

    if (!options?.includeCompleted) {
      conditions.push(eq(reminders.completed, false));
    }

    if (options?.startDate) {
      conditions.push(
        or(
          gte(reminders.dueDate, options.startDate),
          isNull(reminders.dueDate)
        )!
      );
    }

    if (options?.endDate) {
      conditions.push(
        or(
          lte(reminders.dueDate, options.endDate),
          isNull(reminders.dueDate)
        )!
      );
    }

    const result = await db.query.reminders.findMany({
      where: and(...conditions),
      orderBy: [desc(reminders.dueDate), desc(reminders.createdAt)],
      with: {
        linkedTask: true,
      },
    });

    return { success: true, reminders: result };
  } catch (error) {
    console.error("Error getting reminders:", error);
    return { success: false, reminders: [] };
  }
};

// Update reminder
export const updateReminder = async (data: z.infer<typeof updateReminderSchema>) => {
  try {
    const user = await getCurrentUser();
    const validatedData = updateReminderSchema.parse(data);

    // Verify ownership
    const existing = await db.query.reminders.findFirst({
      where: and(
        eq(reminders.id, validatedData.id),
        eq(reminders.userId, user.id)
      ),
    });

    if (!existing) {
      return { success: false, error: "Reminder not found" };
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.dueDate !== undefined) updateData.dueDate = validatedData.dueDate;
    if (validatedData.dueTime !== undefined) updateData.dueTime = validatedData.dueTime;
    if (validatedData.completed !== undefined) updateData.completed = validatedData.completed;

    const [reminder] = await db
      .update(reminders)
      .set(updateData)
      .where(eq(reminders.id, validatedData.id))
      .returning();

    revalidatePath("/app");
    return { success: true, reminder };
  } catch (error) {
    console.error("Error updating reminder:", error);
    return { success: false, error: "Failed to update reminder" };
  }
};

// Toggle reminder completion
export const toggleReminder = async (id: string) => {
  try {
    const user = await getCurrentUser();

    const existing = await db.query.reminders.findFirst({
      where: and(
        eq(reminders.id, id),
        eq(reminders.userId, user.id)
      ),
    });

    if (!existing) {
      return { success: false, error: "Reminder not found" };
    }

    const [reminder] = await db
      .update(reminders)
      .set({ 
        completed: !existing.completed,
        updatedAt: new Date(),
      })
      .where(eq(reminders.id, id))
      .returning();

    revalidatePath("/app");
    return { success: true, reminder };
  } catch (error) {
    console.error("Error toggling reminder:", error);
    return { success: false, error: "Failed to toggle reminder" };
  }
};

// Delete reminder
export const deleteReminder = async (id: string) => {
  try {
    const user = await getCurrentUser();

    const existing = await db.query.reminders.findFirst({
      where: and(
        eq(reminders.id, id),
        eq(reminders.userId, user.id)
      ),
    });

    if (!existing) {
      return { success: false, error: "Reminder not found" };
    }

    await db.delete(reminders).where(eq(reminders.id, id));

    revalidatePath("/app");
    return { success: true };
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return { success: false, error: "Failed to delete reminder" };
  }
};
