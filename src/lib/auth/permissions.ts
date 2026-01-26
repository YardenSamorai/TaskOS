import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { workspaceMembers, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { WorkspaceRole } from "@/lib/db/schema";

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const getCurrentUser = async () => {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw new AuthError("Not authenticated", "UNAUTHORIZED");
  }

  // Try to find user in database
  let user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  // If user doesn't exist, create them (auto-sync from Clerk)
  if (!user) {
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      throw new AuthError("User not found", "NOT_FOUND");
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new AuthError("User has no email", "NOT_FOUND");
    }

    const fullName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ");

    // Create user in database
    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        email: primaryEmail,
        name: fullName || null,
        imageUrl: clerkUser.imageUrl || null,
      })
      .returning();

    user = newUser;
    console.log(`User auto-synced from Clerk: ${user.email}`);
  }

  return user;
};

export const requireWorkspaceRole = async (
  workspaceId: string,
  requiredRoles: WorkspaceRole[]
) => {
  const user = await getCurrentUser();

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, user.id)
    ),
    with: {
      workspace: true,
    },
  });

  if (!member) {
    throw new AuthError("Not a member of this workspace", "FORBIDDEN");
  }

  if (!requiredRoles.includes(member.role)) {
    throw new AuthError(
      `Requires one of these roles: ${requiredRoles.join(", ")}`,
      "FORBIDDEN"
    );
  }

  return { user, member, workspace: member.workspace };
};

export const requireWorkspaceMember = async (workspaceId: string) => {
  return requireWorkspaceRole(workspaceId, ["owner", "admin", "member", "viewer"]);
};

export const requireWorkspaceEditor = async (workspaceId: string) => {
  return requireWorkspaceRole(workspaceId, ["owner", "admin", "member"]);
};

export const requireWorkspaceAdmin = async (workspaceId: string) => {
  return requireWorkspaceRole(workspaceId, ["owner", "admin"]);
};

export const requireWorkspaceOwner = async (workspaceId: string) => {
  return requireWorkspaceRole(workspaceId, ["owner"]);
};

// Check if user can perform action on workspace
export const canEditWorkspace = (role: WorkspaceRole) => {
  return ["owner", "admin"].includes(role);
};

export const canManageMembers = (role: WorkspaceRole) => {
  return ["owner", "admin"].includes(role);
};

export const canCreateTasks = (role: WorkspaceRole) => {
  return ["owner", "admin", "member"].includes(role);
};

export const canEditTask = (role: WorkspaceRole) => {
  return ["owner", "admin", "member"].includes(role);
};

export const canDeleteTask = (role: WorkspaceRole) => {
  return ["owner", "admin"].includes(role);
};

export const canViewWorkspace = (role: WorkspaceRole) => {
  return ["owner", "admin", "member", "viewer"].includes(role);
};
