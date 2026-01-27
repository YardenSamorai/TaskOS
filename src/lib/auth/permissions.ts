import { auth } from "@/lib/auth";
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
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthError("Not authenticated", "UNAUTHORIZED");
  }

  // Find user in database
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    throw new AuthError("User not found", "NOT_FOUND");
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
