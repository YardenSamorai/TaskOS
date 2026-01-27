"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { workspaceInvitations, workspaceMembers, workspaces, users } from "@/lib/db/schema";
import { getCurrentUser, requireWorkspaceAdmin } from "@/lib/auth/permissions";
import { checkCanAddMember, PlanLimitError } from "@/lib/auth/plan-check";
import { and, eq, gt, or } from "drizzle-orm";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/cache";
import { sendInvitationEmail } from "@/lib/email";

// Schemas
const createInvitationSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

// Generate secure token (works in both Node and Edge)
const generateToken = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Create invitation
export const createInvitation = async (formData: FormData) => {
  try {
    const data = createInvitationSchema.parse({
      workspaceId: formData.get("workspaceId"),
      email: formData.get("email"),
      role: formData.get("role") || "member",
    });

    const { user } = await requireWorkspaceAdmin(data.workspaceId);

    // Check plan limits
    await checkCanAddMember(data.workspaceId);

    // Get workspace
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, data.workspaceId),
    });

    if (!workspace) {
      return { success: false, error: "Workspace not found" };
    }

    // Check if user is already a member
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    });

    if (existingUser) {
      const existingMember = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, data.workspaceId),
          eq(workspaceMembers.userId, existingUser.id)
        ),
      });

      if (existingMember) {
        return { success: false, error: "User is already a member of this workspace" };
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.workspaceInvitations.findFirst({
      where: and(
        eq(workspaceInvitations.workspaceId, data.workspaceId),
        eq(workspaceInvitations.email, data.email.toLowerCase()),
        eq(workspaceInvitations.status, "pending"),
        gt(workspaceInvitations.expiresAt, new Date())
      ),
    });

    if (existingInvitation) {
      return { success: false, error: "An invitation has already been sent to this email" };
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = generateToken();

    const [invitation] = await db
      .insert(workspaceInvitations)
      .values({
        workspaceId: data.workspaceId,
        email: data.email.toLowerCase(),
        role: data.role,
        invitedBy: user.id,
        token,
        expiresAt,
      })
      .returning();

    // Send invitation email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://task-os.app"}/en/app/invite/${token}`;
    const roleLabels: Record<string, string> = {
      admin: "Admin",
      member: "Member",
      viewer: "Viewer",
    };

    await sendInvitationEmail({
      to: data.email.toLowerCase(),
      workspaceName: workspace.name,
      inviterName: user.name || user.email,
      inviteLink,
      role: roleLabels[data.role] || "Member",
    });

    revalidatePath(`/app/${data.workspaceId}/members`);

    return {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error creating invitation:", error);
    if (error instanceof PlanLimitError) {
      return { success: false, error: error.message, code: error.code };
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid email address" };
    }
    return { success: false, error: "Failed to create invitation" };
  }
};

// Get workspace invitations
export const getWorkspaceInvitations = async (workspaceId: string) => {
  try {
    await requireWorkspaceAdmin(workspaceId);

    const invitations = await db.query.workspaceInvitations.findMany({
      where: and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        eq(workspaceInvitations.status, "pending")
      ),
      with: {
        inviter: {
          columns: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
    });

    // Mark expired invitations
    const now = new Date();
    const validInvitations = invitations.map((inv) => ({
      ...inv,
      isExpired: inv.expiresAt < now,
    }));

    return { success: true, invitations: validInvitations };
  } catch (error) {
    console.error("Error getting invitations:", error);
    return { success: false, invitations: [] };
  }
};

// Accept invitation by token
export const acceptInvitation = async (token: string) => {
  try {
    const user = await getCurrentUser();

    const invitation = await db.query.workspaceInvitations.findFirst({
      where: and(
        eq(workspaceInvitations.token, token),
        eq(workspaceInvitations.status, "pending")
      ),
      with: {
        workspace: true,
      },
    });

    if (!invitation) {
      return { success: false, error: "Invalid or expired invitation" };
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await db
        .update(workspaceInvitations)
        .set({ status: "expired" })
        .where(eq(workspaceInvitations.id, invitation.id));

      return { success: false, error: "This invitation has expired" };
    }

    // Check if user email matches invitation email
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return {
        success: false,
        error: `This invitation was sent to ${invitation.email}. Please sign in with that email address.`,
      };
    }

    // Check if already a member
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, invitation.workspaceId),
        eq(workspaceMembers.userId, user.id)
      ),
    });

    if (existingMember) {
      // Mark invitation as accepted
      await db
        .update(workspaceInvitations)
        .set({ status: "accepted" })
        .where(eq(workspaceInvitations.id, invitation.id));

      return {
        success: true,
        workspace: invitation.workspace,
        alreadyMember: true,
      };
    }

    // Add user to workspace
    await db.insert(workspaceMembers).values({
      workspaceId: invitation.workspaceId,
      userId: user.id,
      role: invitation.role,
    });

    // Mark invitation as accepted
    await db
      .update(workspaceInvitations)
      .set({ status: "accepted" })
      .where(eq(workspaceInvitations.id, invitation.id));

    // Invalidate caches
    revalidateTag(CACHE_TAGS.workspaces(user.id));
    revalidateTag(CACHE_TAGS.members(invitation.workspaceId));
    revalidatePath("/app/workspaces");
    revalidatePath(`/app/${invitation.workspaceId}/members`);

    return { success: true, workspace: invitation.workspace };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return { success: false, error: "Failed to accept invitation" };
  }
};

// Cancel invitation
export const cancelInvitation = async (invitationId: string) => {
  try {
    const invitation = await db.query.workspaceInvitations.findFirst({
      where: eq(workspaceInvitations.id, invitationId),
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    await requireWorkspaceAdmin(invitation.workspaceId);

    await db
      .update(workspaceInvitations)
      .set({ status: "cancelled" })
      .where(eq(workspaceInvitations.id, invitationId));

    revalidatePath(`/app/${invitation.workspaceId}/members`);

    return { success: true };
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return { success: false, error: "Failed to cancel invitation" };
  }
};

// Resend invitation (creates a new token)
export const resendInvitation = async (invitationId: string) => {
  try {
    const invitation = await db.query.workspaceInvitations.findFirst({
      where: eq(workspaceInvitations.id, invitationId),
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    const { user } = await requireWorkspaceAdmin(invitation.workspaceId);

    // Generate new token and extend expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const token = generateToken();

    await db
      .update(workspaceInvitations)
      .set({
        token,
        expiresAt,
        status: "pending",
        invitedBy: user.id,
      })
      .where(eq(workspaceInvitations.id, invitationId));

    revalidatePath(`/app/${invitation.workspaceId}/members`);

    return { success: true, token };
  } catch (error) {
    console.error("Error resending invitation:", error);
    return { success: false, error: "Failed to resend invitation" };
  }
};

// Get invitation by token (public, for invite link page)
export const getInvitationByToken = async (token: string) => {
  try {
    const invitation = await db.query.workspaceInvitations.findFirst({
      where: eq(workspaceInvitations.token, token),
      with: {
        workspace: {
          columns: {
            id: true,
            name: true,
            description: true,
          },
        },
        inviter: {
          columns: {
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    const isExpired = invitation.expiresAt < new Date();
    const isValid = invitation.status === "pending" && !isExpired;

    return {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        isExpired,
        isValid,
        workspace: invitation.workspace,
        inviter: invitation.inviter,
        expiresAt: invitation.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error getting invitation:", error);
    return { success: false, error: "Failed to get invitation" };
  }
};
