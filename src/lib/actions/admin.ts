"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { UserPlan } from "@/lib/db/schema";

// Schema for updating user plan
const updatePlanSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["free", "pro", "enterprise"]),
  expiresAt: z.date().optional(),
});

// Admin function to update a user's plan
// In production, this should be protected with admin authentication
export const adminUpdateUserPlan = async (
  userId: string,
  plan: UserPlan,
  expiresAt?: Date
) => {
  try {
    const validated = updatePlanSchema.parse({ userId, plan, expiresAt });

    await db
      .update(users)
      .set({
        plan: validated.plan,
        planExpiresAt: expiresAt || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, validated.userId));

    return { success: true };
  } catch (error) {
    console.error("Error updating user plan:", error);
    return { success: false, error: "Failed to update user plan" };
  }
};

// Get user by email (for admin lookup)
export const adminGetUserByEmail = async (email: string) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    console.error("Error getting user:", error);
    return { success: false, error: "Failed to get user" };
  }
};

// List all users with their plans (for admin dashboard)
export const adminListUsers = async () => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        plan: users.plan,
        planExpiresAt: users.planExpiresAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    return { success: true, users: allUsers };
  } catch (error) {
    console.error("Error listing users:", error);
    return { success: false, error: "Failed to list users", users: [] };
  }
};
