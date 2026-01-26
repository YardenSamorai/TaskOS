import { unstable_cache as nextCache } from "next/cache";
import { db } from "@/lib/db";
import {
  tasks,
  workspaces,
  workspaceMembers,
  activityLogs,
  taskStages,
  taskSteps,
} from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { CACHE_TAGS, CACHE_DURATIONS } from "@/lib/cache";

// Cached workspace data
export const getCachedWorkspace = (workspaceId: string, userId: string) =>
  nextCache(
    async () => {
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
        with: {
          workspace: {
            with: {
              members: {
                with: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!membership) return null;

      return {
        workspace: membership.workspace,
        role: membership.role,
      };
    },
    [`workspace-${workspaceId}-${userId}`],
    {
      revalidate: CACHE_DURATIONS.medium,
      tags: [CACHE_TAGS.workspace(workspaceId)],
    }
  )();

// Cached user workspaces
export const getCachedUserWorkspaces = (userId: string) =>
  nextCache(
    async () => {
      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
        with: {
          workspace: true,
        },
      });

      return memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      }));
    },
    [`user-workspaces-${userId}`],
    {
      revalidate: CACHE_DURATIONS.medium,
      tags: [CACHE_TAGS.workspaces(userId)],
    }
  )();

// Cached workspace tasks
export const getCachedWorkspaceTasks = (workspaceId: string) =>
  nextCache(
    async () => {
      const taskList = await db.query.tasks.findMany({
        where: eq(tasks.workspaceId, workspaceId),
        with: {
          creator: true,
          assignees: {
            with: {
              user: true,
            },
          },
          tags: {
            with: {
              tag: true,
            },
          },
          stages: {
            orderBy: [asc(taskStages.orderIndex)],
          },
          steps: {
            orderBy: [asc(taskSteps.orderIndex)],
          },
        },
        orderBy: [asc(tasks.orderIndex)],
      });

      return taskList;
    },
    [`workspace-tasks-${workspaceId}`],
    {
      revalidate: CACHE_DURATIONS.short,
      tags: [CACHE_TAGS.tasks(workspaceId)],
    }
  )();

// Cached workspace stats
export const getCachedWorkspaceStats = (workspaceId: string) =>
  nextCache(
    async () => {
      const allTasks = await db.query.tasks.findMany({
        where: eq(tasks.workspaceId, workspaceId),
        columns: {
          status: true,
          dueDate: true,
        },
      });

      const today = new Date().toISOString().split("T")[0];

      return {
        total: allTasks.length,
        completed: allTasks.filter((t) => t.status === "done").length,
        inProgress: allTasks.filter((t) => t.status === "in_progress").length,
        overdue: allTasks.filter(
          (t) => t.dueDate && t.dueDate < today && t.status !== "done"
        ).length,
        dueToday: allTasks.filter((t) => t.dueDate === today).length,
      };
    },
    [`workspace-stats-${workspaceId}`],
    {
      revalidate: CACHE_DURATIONS.short,
      tags: [CACHE_TAGS.stats(workspaceId)],
    }
  )();

// Cached recent activity
export const getCachedRecentActivity = (workspaceId: string, limit = 10) =>
  nextCache(
    async () => {
      const activity = await db.query.activityLogs.findMany({
        where: eq(activityLogs.workspaceId, workspaceId),
        orderBy: [desc(activityLogs.createdAt)],
        limit,
        with: {
          user: true,
          task: true,
        },
      });

      return activity;
    },
    [`workspace-activity-${workspaceId}-${limit}`],
    {
      revalidate: CACHE_DURATIONS.short,
      tags: [CACHE_TAGS.activity(workspaceId)],
    }
  )();

// Cached workspace members
export const getCachedWorkspaceMembers = (workspaceId: string) =>
  nextCache(
    async () => {
      const members = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId, workspaceId),
        with: {
          user: true,
        },
      });

      return members;
    },
    [`workspace-members-${workspaceId}`],
    {
      revalidate: CACHE_DURATIONS.long,
      tags: [CACHE_TAGS.members(workspaceId)],
    }
  )();
