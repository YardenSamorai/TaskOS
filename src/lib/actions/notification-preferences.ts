"use server";

import { db } from "@/lib/db";
import { userNotificationPreferences } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/permissions";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type NotificationPreferencesInput = {
  emailNotifications?: boolean;
  taskAssigned?: boolean;
  taskCompleted?: boolean;
  taskDueSoon?: boolean;
  mentions?: boolean;
  comments?: boolean;
  weeklyDigest?: boolean;
  marketingEmails?: boolean;
  pushNotifications?: boolean;
  desktopNotifications?: boolean;
  soundEnabled?: boolean;
};

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferencesInput = {
  emailNotifications: true,
  taskAssigned: true,
  taskCompleted: true,
  taskDueSoon: true,
  mentions: true,
  comments: true,
  weeklyDigest: true,
  marketingEmails: false,
  pushNotifications: true,
  desktopNotifications: true,
  soundEnabled: true,
};

// Get user's notification preferences
export async function getNotificationPreferences() {
  try {
    const user = await getCurrentUser();

    let preferences = await db.query.userNotificationPreferences.findFirst({
      where: eq(userNotificationPreferences.userId, user.id),
    });

    // Create default preferences if none exist
    if (!preferences) {
      const [newPrefs] = await db
        .insert(userNotificationPreferences)
        .values({
          userId: user.id,
          ...DEFAULT_PREFERENCES,
        })
        .returning();
      preferences = newPrefs;
    }

    return { success: true, preferences };
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return { success: false, error: "Failed to get preferences", preferences: null };
  }
}

// Update notification preferences
export async function updateNotificationPreferences(input: NotificationPreferencesInput) {
  try {
    const user = await getCurrentUser();

    // Check if preferences exist
    const existing = await db.query.userNotificationPreferences.findFirst({
      where: eq(userNotificationPreferences.userId, user.id),
    });

    let preferences;
    if (existing) {
      // Update existing
      const [updated] = await db
        .update(userNotificationPreferences)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(userNotificationPreferences.userId, user.id))
        .returning();
      preferences = updated;
    } else {
      // Create new
      const [created] = await db
        .insert(userNotificationPreferences)
        .values({
          userId: user.id,
          ...DEFAULT_PREFERENCES,
          ...input,
        })
        .returning();
      preferences = created;
    }

    revalidatePath("/app/account");
    return { success: true, preferences };
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return { success: false, error: "Failed to update preferences" };
  }
}

// Get preferences for a specific user (used internally for sending notifications)
export async function getUserNotificationPreferences(userId: string) {
  try {
    const preferences = await db.query.userNotificationPreferences.findFirst({
      where: eq(userNotificationPreferences.userId, userId),
    });

    // Return defaults if no preferences set
    if (!preferences) {
      return {
        ...DEFAULT_PREFERENCES,
        userId,
      };
    }

    return preferences;
  } catch (error) {
    console.error("Error getting user notification preferences:", error);
    // Return defaults on error
    return {
      ...DEFAULT_PREFERENCES,
      userId,
    };
  }
}

// Check if user wants a specific notification type
export async function shouldSendEmailNotification(
  userId: string,
  notificationType: keyof NotificationPreferencesInput
): Promise<boolean> {
  const prefs = await getUserNotificationPreferences(userId);
  
  // First check if email notifications are enabled at all
  if (!prefs.emailNotifications) return false;
  
  // Then check the specific notification type
  return prefs[notificationType] === true;
}
