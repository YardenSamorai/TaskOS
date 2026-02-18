import { NextRequest } from "next/server";
import { verifyApiKey } from "@/lib/actions/api-keys";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasFeature } from "@/lib/plans";
import { getTaskWithMembership, getWorkspaceMembership, hasPermission } from "@/lib/auth/permissions";
import type { UserPlan, WorkspaceRole } from "@/lib/db/schema";
import type { Action } from "@/lib/auth/permissions";

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  apiKeyId: string;
  userPlan: "pro" | "enterprise";
  scopes: string[];
  boundWorkspaceId?: string;
}

export async function authenticateApiRequest(
  request: NextRequest
): Promise<{
  authenticated: boolean;
  request?: AuthenticatedRequest;
  error?: string;
  status?: number;
}> {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return {
        authenticated: false,
        error: "Missing Authorization header",
        status: 401,
      };
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return {
        authenticated: false,
        error: "Invalid Authorization header format. Use: Bearer <token>",
        status: 401,
      };
    }

    const apiKey = parts[1];
    const verification = await verifyApiKey(apiKey);

    if (!verification.valid || !verification.userId) {
      return {
        authenticated: false,
        error: "Invalid or expired API key",
        status: 401,
      };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, verification.userId),
    });

    if (!user) {
      return {
        authenticated: false,
        error: "User not found",
        status: 401,
      };
    }

    const userPlan = (user.plan as UserPlan) || "free";
    if (!hasFeature(userPlan, "apiAccess")) {
      return {
        authenticated: false,
        error: "API Access is a Pro feature. Please upgrade to Pro plan or higher.",
        status: 403,
      };
    }

    const planForRateLimit = userPlan === "enterprise" ? "enterprise" : "pro";

    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.userId = verification.userId;
    authenticatedRequest.apiKeyId = verification.apiKeyId!;
    authenticatedRequest.userPlan = planForRateLimit;
    authenticatedRequest.scopes = verification.scopes || ["read:tasks"];
    authenticatedRequest.boundWorkspaceId = verification.workspaceId || undefined;

    return {
      authenticated: true,
      request: authenticatedRequest,
    };
  } catch (error) {
    console.error("API authentication error:", error);
    return {
      authenticated: false,
      error: "Authentication failed",
      status: 500,
    };
  }
}

/**
 * Verify the authenticated request has the required scope.
 */
export function requireScope(
  request: AuthenticatedRequest,
  scope: string
): { allowed: boolean; error?: string } {
  if (!request.scopes.includes(scope)) {
    return {
      allowed: false,
      error: `API key lacks required scope: ${scope}`,
    };
  }
  return { allowed: true };
}

/**
 * Verify workspace access for API-authenticated user.
 * Checks scope, workspace binding, membership, and action permission.
 */
export async function requireApiWorkspaceAccess(
  request: AuthenticatedRequest,
  workspaceId: string,
  action: Action
): Promise<{ allowed: boolean; role?: WorkspaceRole; error?: string; status?: number }> {
  // Check workspace binding
  if (request.boundWorkspaceId && request.boundWorkspaceId !== workspaceId) {
    return { allowed: false, error: "API key is bound to a different workspace", status: 403 };
  }

  // Check scope
  const scopeMap: Record<string, string> = {
    read: "read:tasks",
    comment: "write:tasks",
    create: "write:tasks",
    update: "write:tasks",
    delete: "write:tasks",
    manage: "manage:workspace",
    admin: "manage:workspace",
  };
  const requiredScope = scopeMap[action] || "read:tasks";
  const scopeCheck = requireScope(request, requiredScope);
  if (!scopeCheck.allowed) {
    return { allowed: false, error: scopeCheck.error, status: 403 };
  }

  // Check membership
  const membership = await getWorkspaceMembership(request.userId, workspaceId);
  if (!membership) {
    return { allowed: false, error: "Not a member of this workspace", status: 403 };
  }

  // Check role permission
  if (!hasPermission(membership.role, action)) {
    return { allowed: false, error: `Insufficient permissions for action: ${action}`, status: 403 };
  }

  return { allowed: true, role: membership.role };
}

/**
 * Verify task access for API-authenticated user.
 * Resolves the task, checks workspace membership and action permission.
 */
export async function requireApiTaskAccess(
  request: AuthenticatedRequest,
  taskId: string,
  action: Action
): Promise<{
  allowed: boolean;
  task?: any;
  role?: WorkspaceRole;
  error?: string;
  status?: number;
}> {
  const { task, membership } = await getTaskWithMembership(request.userId, taskId);

  if (!task) {
    return { allowed: false, error: "Task not found", status: 404 };
  }

  // Check workspace binding
  if (request.boundWorkspaceId && request.boundWorkspaceId !== task.workspaceId) {
    return { allowed: false, error: "Task not found", status: 404 };
  }

  // Check scope
  const scopeMap: Record<string, string> = {
    read: "read:tasks",
    comment: "write:tasks",
    create: "write:tasks",
    update: "write:tasks",
    delete: "write:tasks",
  };
  const requiredScope = scopeMap[action] || "read:tasks";
  const scopeCheck = requireScope(request, requiredScope);
  if (!scopeCheck.allowed) {
    return { allowed: false, error: scopeCheck.error, status: 403 };
  }

  if (!membership) {
    return { allowed: false, error: "Not a member of this workspace", status: 403 };
  }

  if (!hasPermission(membership.role, action)) {
    return { allowed: false, error: `Insufficient permissions for action: ${action}`, status: 403 };
  }

  return { allowed: true, task, role: membership.role };
}
