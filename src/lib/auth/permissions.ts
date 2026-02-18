import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceMembers, users, tasks } from "@/lib/db/schema";
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

// ============== PERMISSION MATRIX ==============
// read     - view tasks, comments, activity
// comment  - add comments to tasks
// create   - create new tasks
// update   - update tasks (status, assignees, fields)
// delete   - delete tasks
// manage   - workspace settings, integrations, invite/remove members, promote to member/viewer
// admin    - owner-only: transfer ownership, promote/demote admins, delete workspace
export type Action = "read" | "comment" | "create" | "update" | "delete" | "manage" | "admin";

const PERMISSION_MATRIX: Record<WorkspaceRole, Action[]> = {
  viewer: ["read"],
  member: ["read", "comment", "create", "update"],
  admin:  ["read", "comment", "create", "update", "delete", "manage"],
  owner:  ["read", "comment", "create", "update", "delete", "manage", "admin"],
};

export function hasPermission(role: WorkspaceRole, action: Action): boolean {
  return PERMISSION_MATRIX[role]?.includes(action) ?? false;
}

/**
 * Anti-escalation: validates that the acting role can assign the target role.
 * Admin cannot promote to admin or owner. Only owner can assign admin.
 */
export function canAssignRole(actingRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  if (targetRole === "owner") return false;
  if (targetRole === "admin") return actingRole === "owner";
  if (targetRole === "member" || targetRole === "viewer") {
    return actingRole === "owner" || actingRole === "admin";
  }
  return false;
}

// ============== USER / MEMBERSHIP HELPERS ==============

export const getCurrentUser = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthError("Not authenticated", "UNAUTHORIZED");
  }

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

/**
 * Require workspace membership and verify a specific action is allowed by the member's role.
 */
export const requireWorkspacePermission = async (
  workspaceId: string,
  action: Action
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

  if (!hasPermission(member.role, action)) {
    throw new AuthError(
      `Insufficient permissions: '${action}' requires a higher role`,
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

// ============== API ROUTE HELPERS ==============
// These work with userId (from API key auth) rather than session.

/**
 * Check workspace membership for an API-authenticated user.
 * Returns membership with role for permission checks.
 */
export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  return db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });
}

/**
 * Fetch a task and verify the calling user is a member of its workspace.
 * Returns { task, membership } or null values if not found/not authorized.
 */
export async function getTaskWithMembership(userId: string, taskId: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    return { task: null, membership: null };
  }

  const membership = await getWorkspaceMembership(userId, task.workspaceId);
  return { task, membership };
}

// ============== LEGACY HELPERS (backward compat) ==============

export const canEditWorkspace = (role: WorkspaceRole) => {
  return hasPermission(role, "manage");
};

export const canManageMembers = (role: WorkspaceRole) => {
  return hasPermission(role, "manage");
};

export const canCreateTasks = (role: WorkspaceRole) => {
  return hasPermission(role, "create");
};

export const canEditTask = (role: WorkspaceRole) => {
  return hasPermission(role, "update");
};

export const canDeleteTask = (role: WorkspaceRole) => {
  return hasPermission(role, "delete");
};

export const canViewWorkspace = (role: WorkspaceRole) => {
  return hasPermission(role, "read");
};
