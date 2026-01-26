import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers, attachments } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getCurrentUser } from "./permissions";
import { PLAN_LIMITS, canCreateWorkspace, canAddMember, canUploadFile, hasFeature } from "@/lib/plans";
import type { UserPlan } from "@/lib/db/schema";

export class PlanLimitError extends Error {
  constructor(
    message: string,
    public code: "WORKSPACE_LIMIT" | "MEMBER_LIMIT" | "FILE_LIMIT" | "FEATURE_LOCKED",
    public currentPlan: UserPlan,
    public requiredPlan: UserPlan = "pro"
  ) {
    super(message);
    this.name = "PlanLimitError";
  }
}

// Get user's current plan
export const getUserPlan = async (userId?: string): Promise<UserPlan> => {
  if (!userId) {
    const user = await getCurrentUser();
    return user.plan || "free";
  }
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  return (user?.plan as UserPlan) || "free";
};

// Count user's workspaces (where they are owner)
export const countUserWorkspaces = async (userId: string): Promise<number> => {
  const result = await db
    .select({ count: count() })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId));
  
  return result[0]?.count || 0;
};

// Count workspace members
export const countWorkspaceMembers = async (workspaceId: string): Promise<number> => {
  const result = await db
    .select({ count: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  
  return result[0]?.count || 0;
};

// Count task attachments
export const countTaskAttachments = async (taskId: string): Promise<number> => {
  const result = await db
    .select({ count: count() })
    .from(attachments)
    .where(eq(attachments.taskId, taskId));
  
  return result[0]?.count || 0;
};

// Check if user can create a workspace
export const checkCanCreateWorkspace = async (): Promise<void> => {
  const user = await getCurrentUser();
  const plan = (user.plan as UserPlan) || "free";
  const currentCount = await countUserWorkspaces(user.id);
  
  if (!canCreateWorkspace(plan, currentCount)) {
    const limit = PLAN_LIMITS[plan].maxWorkspaces;
    throw new PlanLimitError(
      `You've reached the limit of ${limit} workspaces on the ${plan} plan. Upgrade to Pro for unlimited workspaces.`,
      "WORKSPACE_LIMIT",
      plan
    );
  }
};

// Check if user can add a member to workspace
export const checkCanAddMember = async (workspaceId: string): Promise<void> => {
  const user = await getCurrentUser();
  const plan = (user.plan as UserPlan) || "free";
  const currentCount = await countWorkspaceMembers(workspaceId);
  
  if (!canAddMember(plan, currentCount)) {
    const limit = PLAN_LIMITS[plan].maxMembersPerWorkspace;
    throw new PlanLimitError(
      `You've reached the limit of ${limit} members per workspace on the ${plan} plan. Upgrade to Pro for more members.`,
      "MEMBER_LIMIT",
      plan
    );
  }
};

// Check if user can upload a file to task
export const checkCanUploadFile = async (taskId: string): Promise<void> => {
  const user = await getCurrentUser();
  const plan = (user.plan as UserPlan) || "free";
  const currentCount = await countTaskAttachments(taskId);
  
  if (!canUploadFile(plan, currentCount)) {
    const limit = PLAN_LIMITS[plan].maxFilesPerTask;
    throw new PlanLimitError(
      `You've reached the limit of ${limit} files per task on the ${plan} plan. Upgrade to Pro for unlimited files.`,
      "FILE_LIMIT",
      plan
    );
  }
};

// Check if user has access to a feature
export const checkHasFeature = async (feature: keyof typeof PLAN_LIMITS.free.features): Promise<void> => {
  const user = await getCurrentUser();
  const plan = (user.plan as UserPlan) || "free";
  
  if (!hasFeature(plan, feature)) {
    throw new PlanLimitError(
      `The ${feature.replace(/([A-Z])/g, ' $1').toLowerCase()} feature is not available on the ${plan} plan. Upgrade to Pro to unlock this feature.`,
      "FEATURE_LOCKED",
      plan
    );
  }
};

// Get user's usage stats
export const getUserUsageStats = async () => {
  const user = await getCurrentUser();
  const plan = (user.plan as UserPlan) || "free";
  const limits = PLAN_LIMITS[plan];
  
  const workspaceCount = await countUserWorkspaces(user.id);
  
  return {
    plan,
    limits,
    usage: {
      workspaces: workspaceCount,
      workspacesLimit: limits.maxWorkspaces,
      workspacesRemaining: limits.maxWorkspaces === Infinity ? Infinity : limits.maxWorkspaces - workspaceCount,
    },
  };
};

// Upgrade user plan (admin function)
export const upgradeUserPlan = async (userId: string, newPlan: UserPlan, expiresAt?: Date) => {
  await db
    .update(users)
    .set({
      plan: newPlan,
      planExpiresAt: expiresAt || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
};

// Downgrade user plan
export const downgradeUserPlan = async (userId: string) => {
  await db
    .update(users)
    .set({
      plan: "free",
      planExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
};
