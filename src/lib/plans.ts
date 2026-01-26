import type { UserPlan } from "@/lib/db/schema";

// Plan feature limits
export interface PlanLimits {
  maxWorkspaces: number;
  maxMembersPerWorkspace: number;
  maxFilesPerTask: number;
  maxFileSizeMB: number;
  activityHistoryDays: number;
  features: {
    processMode: boolean;
    aiTaskEnhancement: boolean;
    advancedFilters: boolean;
    customTags: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  free: {
    maxWorkspaces: 3,
    maxMembersPerWorkspace: 5,
    maxFilesPerTask: 5,
    maxFileSizeMB: 5,
    activityHistoryDays: 7,
    features: {
      processMode: false,
      aiTaskEnhancement: false,
      advancedFilters: false,
      customTags: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  pro: {
    maxWorkspaces: Infinity,
    maxMembersPerWorkspace: 50,
    maxFilesPerTask: Infinity,
    maxFileSizeMB: 50,
    activityHistoryDays: 30,
    features: {
      processMode: true,
      aiTaskEnhancement: true,
      advancedFilters: true,
      customTags: true,
      prioritySupport: true,
      apiAccess: false,
    },
  },
  enterprise: {
    maxWorkspaces: Infinity,
    maxMembersPerWorkspace: Infinity,
    maxFilesPerTask: Infinity,
    maxFileSizeMB: 100,
    activityHistoryDays: Infinity,
    features: {
      processMode: true,
      aiTaskEnhancement: true,
      advancedFilters: true,
      customTags: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
};

// Plan display information
export const PLAN_INFO: Record<UserPlan, { name: string; description: string; price: string }> = {
  free: {
    name: "Free",
    description: "Perfect for personal use",
    price: "$0/month",
  },
  pro: {
    name: "Pro",
    description: "For growing teams",
    price: "$12/user/month",
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organizations",
    price: "Custom",
  },
};

// Helper to get plan limits
export const getPlanLimits = (plan: UserPlan): PlanLimits => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

// Check if a feature is available for a plan
export const hasFeature = (plan: UserPlan, feature: keyof PlanLimits["features"]): boolean => {
  return PLAN_LIMITS[plan]?.features[feature] ?? false;
};

// Check if user can create more workspaces
export const canCreateWorkspace = (plan: UserPlan, currentCount: number): boolean => {
  const limits = getPlanLimits(plan);
  return currentCount < limits.maxWorkspaces;
};

// Check if user can add more members to workspace
export const canAddMember = (plan: UserPlan, currentCount: number): boolean => {
  const limits = getPlanLimits(plan);
  return currentCount < limits.maxMembersPerWorkspace;
};

// Check if user can upload more files to task
export const canUploadFile = (plan: UserPlan, currentCount: number): boolean => {
  const limits = getPlanLimits(plan);
  return currentCount < limits.maxFilesPerTask;
};

// Get remaining quota
export const getRemainingWorkspaces = (plan: UserPlan, currentCount: number): number => {
  const limits = getPlanLimits(plan);
  if (limits.maxWorkspaces === Infinity) return Infinity;
  return Math.max(0, limits.maxWorkspaces - currentCount);
};

export const getRemainingMembers = (plan: UserPlan, currentCount: number): number => {
  const limits = getPlanLimits(plan);
  if (limits.maxMembersPerWorkspace === Infinity) return Infinity;
  return Math.max(0, limits.maxMembersPerWorkspace - currentCount);
};

export const getRemainingFiles = (plan: UserPlan, currentCount: number): number => {
  const limits = getPlanLimits(plan);
  if (limits.maxFilesPerTask === Infinity) return Infinity;
  return Math.max(0, limits.maxFilesPerTask - currentCount);
};
