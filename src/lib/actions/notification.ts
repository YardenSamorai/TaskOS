"use server";

import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { notifications, users, tasks, workspaces } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/permissions";
import { eq, desc, and } from "drizzle-orm";

// Get user's notifications
export const getNotifications = async (limit = 20) => {
  try {
    const user = await getCurrentUser();

    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, user.id),
      orderBy: [desc(notifications.createdAt)],
      limit,
    });

    return { success: true, notifications: userNotifications };
  } catch (error) {
    console.error("Error getting notifications:", error);
    return { success: false, notifications: [] };
  }
};

// Get unread count
export const getUnreadCount = async () => {
  try {
    const user = await getCurrentUser();

    const unread = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, user.id),
        eq(notifications.read, false)
      ),
    });

    return { success: true, count: unread.length };
  } catch (error) {
    console.error("Error getting unread count:", error);
    return { success: false, count: 0 };
  }
};

// Mark notification as read
export const markAsRead = async (notificationId: string) => {
  try {
    const user = await getCurrentUser();

    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, user.id)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false };
  }
};

// Mark all as read
export const markAllAsRead = async () => {
  try {
    const user = await getCurrentUser();

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, user.id));

    return { success: true };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return { success: false };
  }
};

// Create notification (used internally)
export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message?: string,
  workspaceId?: string,
  taskId?: string
) => {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
        workspaceId,
        taskId,
      })
      .returning();

    return { success: true, notification };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false };
  }
};

// Delete notification
export const deleteNotification = async (notificationId: string) => {
  try {
    const user = await getCurrentUser();

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, user.id)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false };
  }
};

// Clear all notifications
export const clearAllNotifications = async () => {
  try {
    const user = await getCurrentUser();

    await db
      .delete(notifications)
      .where(eq(notifications.userId, user.id));

    return { success: true };
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return { success: false };
  }
};
