"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, users } from "@/lib/db/schema";
import { getCurrentUser, requireWorkspaceAdmin, requireWorkspaceOwner } from "@/lib/auth/permissions";
import { checkCanCreateWorkspace, checkCanAddMember, PlanLimitError } from "@/lib/auth/plan-check";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/cache";
import { getCachedUserWorkspaces, getCachedWorkspace } from "./cached";

// Schemas
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// Generate slug from name
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) + "-" + Math.random().toString(36).slice(2, 8);
};

// Generate invite code
const generateInviteCode = () => {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
};

// Create workspace
export const createWorkspace = async (formData: FormData) => {
  try {
    const user = await getCurrentUser();

    // Check plan limits
    await checkCanCreateWorkspace();

    const data = createWorkspaceSchema.parse({
      name: formData.get("name"),
      description: formData.get("description"),
    });

    const slug = generateSlug(data.name);
    const inviteCode = generateInviteCode();

    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: data.name,
        description: data.description,
        slug,
        ownerId: user.id,
        inviteCode,
      })
      .returning();

    // Add owner as member
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });

    // Invalidate user's workspaces cache
    revalidateTag(CACHE_TAGS.workspaces(user.id));
    revalidatePath("/app/dashboard");

    return { success: true, workspace };
  } catch (error) {
    console.error("Error creating workspace:", error);
    if (error instanceof PlanLimitError) {
      return { success: false, error: error.message, code: error.code, plan: error.currentPlan };
    }
    return { success: false, error: "Failed to create workspace" };
  }
};

// Get user's workspaces (with caching)
export const getUserWorkspaces = async () => {
  try {
    const user = await getCurrentUser();

    // Use cached version for better performance
    const workspacesData = await getCachedUserWorkspaces(user.id);

    return {
      success: true,
      workspaces: workspacesData,
    };
  } catch (error) {
    console.error("Error getting workspaces:", error);
    return { success: false, workspaces: [] };
  }
};

// Get single workspace (with caching)
export const getWorkspace = async (workspaceId: string) => {
  try {
    const user = await getCurrentUser();

    // Use cached version for better performance
    const data = await getCachedWorkspace(workspaceId, user.id);

    if (!data) {
      return { success: false, error: "Workspace not found" };
    }

    return {
      success: true,
      workspace: data.workspace,
      role: data.role,
      members: data.workspace.members || [],
    };
  } catch (error) {
    console.error("Error getting workspace:", error);
    return { success: false, error: "Failed to get workspace" };
  }
};

// Update workspace
export const updateWorkspace = async (formData: FormData) => {
  try {
    const data = updateWorkspaceSchema.parse({
      workspaceId: formData.get("workspaceId"),
      name: formData.get("name") || undefined,
      description: formData.get("description") || undefined,
    });

    await requireWorkspaceAdmin(data.workspaceId);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    const [workspace] = await db
      .update(workspaces)
      .set(updateData)
      .where(eq(workspaces.id, data.workspaceId))
      .returning();

    // Invalidate workspace cache
    revalidateTag(CACHE_TAGS.workspace(data.workspaceId));
    revalidatePath(`/app/${data.workspaceId}`);

    return { success: true, workspace };
  } catch (error) {
    console.error("Error updating workspace:", error);
    return { success: false, error: "Failed to update workspace" };
  }
};

// Delete workspace
export const deleteWorkspace = async (workspaceId: string) => {
  try {
    const { user } = await requireWorkspaceOwner(workspaceId);

    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

    // Invalidate all related caches
    revalidateTag(CACHE_TAGS.workspace(workspaceId));
    revalidateTag(CACHE_TAGS.workspaces(user.id));
    revalidatePath("/app/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return { success: false, error: "Failed to delete workspace" };
  }
};

// Regenerate invite code
export const regenerateInviteCode = async (workspaceId: string) => {
  try {
    await requireWorkspaceAdmin(workspaceId);

    const inviteCode = generateInviteCode();

    const [workspace] = await db
      .update(workspaces)
      .set({ inviteCode, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    revalidatePath(`/app/${workspaceId}/settings`);

    return { success: true, inviteCode: workspace.inviteCode };
  } catch (error) {
    console.error("Error regenerating invite code:", error);
    return { success: false, error: "Failed to regenerate invite code" };
  }
};

// Join workspace by invite code
export const joinWorkspaceByInvite = async (inviteCode: string) => {
  try {
    const user = await getCurrentUser();

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.inviteCode, inviteCode),
    });

    if (!workspace) {
      return { success: false, error: "Invalid invite code" };
    }

    // Check if already a member
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspace.id),
        eq(workspaceMembers.userId, user.id)
      ),
    });

    if (existingMember) {
      return { success: true, workspace, alreadyMember: true };
    }

    // Add as member
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "member",
    });

    // Invalidate caches
    revalidateTag(CACHE_TAGS.workspaces(user.id));
    revalidateTag(CACHE_TAGS.members(workspace.id));
    revalidatePath("/app/dashboard");

    return { success: true, workspace };
  } catch (error) {
    console.error("Error joining workspace:", error);
    return { success: false, error: "Failed to join workspace" };
  }
};

// Update member role
export const updateMemberRole = async (
  workspaceId: string,
  memberId: string,
  role: "admin" | "member" | "viewer"
) => {
  try {
    await requireWorkspaceAdmin(workspaceId);

    // Find the membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.id, memberId)
      ),
    });

    if (!membership) {
      return { success: false, error: "Member not found" };
    }

    // Can't change owner's role
    if (membership.role === "owner") {
      return { success: false, error: "Cannot change owner's role" };
    }

    await db
      .update(workspaceMembers)
      .set({ role })
      .where(eq(workspaceMembers.id, memberId));

    revalidatePath(`/app/${workspaceId}/settings`);

    return { success: true };
  } catch (error) {
    console.error("Error updating member role:", error);
    return { success: false, error: "Failed to update member role" };
  }
};

// Remove member
export const removeMember = async (workspaceId: string, memberId: string) => {
  try {
    await requireWorkspaceAdmin(workspaceId);

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.id, memberId)
      ),
    });

    if (!membership) {
      return { success: false, error: "Member not found" };
    }

    if (membership.role === "owner") {
      return { success: false, error: "Cannot remove owner" };
    }

    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId));

    revalidatePath(`/app/${workspaceId}/settings`);

    return { success: true };
  } catch (error) {
    console.error("Error removing member:", error);
    return { success: false, error: "Failed to remove member" };
  }
};

// Leave workspace
export const leaveWorkspace = async (workspaceId: string) => {
  try {
    const user = await getCurrentUser();

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id)
      ),
    });

    if (!membership) {
      return { success: false, error: "Not a member" };
    }

    if (membership.role === "owner") {
      return { success: false, error: "Owner cannot leave workspace. Transfer ownership or delete workspace." };
    }

    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, membership.id));

    revalidatePath("/app/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error leaving workspace:", error);
    return { success: false, error: "Failed to leave workspace" };
  }
};
