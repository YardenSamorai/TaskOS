"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkspaceTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getWorkspaceStats,
  getRecentActivity,
} from "@/lib/actions/task";
import type { TaskStatus, TaskPriority } from "@/lib/db/schema";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (workspaceId: string, filters?: TaskFilters) =>
    [...taskKeys.lists(), workspaceId, filters] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  stats: (workspaceId: string) => ["stats", workspaceId] as const,
  activity: (workspaceId: string) => ["activity", workspaceId] as const,
};

interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
}

export const useTasks = (workspaceId: string, filters?: TaskFilters) => {
  return useQuery({
    queryKey: taskKeys.list(workspaceId, filters),
    queryFn: async () => {
      const result = await getWorkspaceTasks(workspaceId, filters);
      if (!result.success) {
        throw new Error("Failed to fetch tasks");
      }
      return result.tasks;
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: async () => {
      const result = await getTask(taskId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch task");
      }
      return result.task;
    },
    enabled: !!taskId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useWorkspaceStats = (workspaceId: string) => {
  return useQuery({
    queryKey: taskKeys.stats(workspaceId),
    queryFn: async () => {
      const result = await getWorkspaceStats(workspaceId);
      if (!result.success) {
        throw new Error("Failed to fetch stats");
      }
      return result.stats;
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useRecentActivity = (workspaceId: string, limit = 10) => {
  return useQuery({
    queryKey: [...taskKeys.activity(workspaceId), limit],
    queryFn: async () => {
      const result = await getRecentActivity(workspaceId, limit);
      if (!result.success) {
        throw new Error("Failed to fetch activity");
      }
      return result.activity;
    },
    enabled: !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useCreateTask = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createTask(formData);
      if (!result.success) {
        throw new Error(result.error || "Failed to create task");
      }
      return result.task;
    },
    onSuccess: () => {
      // Invalidate tasks list and stats
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(workspaceId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.activity(workspaceId) });
    },
  });
};

export const useUpdateTask = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await updateTask(formData);
      if (!result.success) {
        throw new Error(result.error || "Failed to update task");
      }
      return result.task;
    },
    onSuccess: (task) => {
      if (task) {
        // Update task in cache
        queryClient.setQueryData(taskKeys.detail(task.id), task);
      }
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(workspaceId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.activity(workspaceId) });
    },
  });
};

export const useUpdateTaskStatus = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
      orderIndex,
    }: {
      taskId: string;
      status: TaskStatus;
      orderIndex: number;
    }) => {
      const result = await updateTaskStatus(taskId, status, orderIndex);
      if (!result.success) {
        throw new Error(result.error || "Failed to update task status");
      }
      return result.task;
    },
    // Optimistic update for instant feedback
    onMutate: async ({ taskId, status, orderIndex }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(
        taskKeys.list(workspaceId)
      );

      // Optimistically update
      queryClient.setQueryData(
        taskKeys.list(workspaceId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any[] | undefined) =>
          old?.map((task) =>
            task.id === taskId ? { ...task, status, orderIndex } : task
          )
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(
          taskKeys.list(workspaceId),
          context.previousTasks
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(workspaceId) });
    },
  });
};

export const useDeleteTask = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const result = await deleteTask(taskId);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete task");
      }
    },
    // Optimistic update
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(
        taskKeys.list(workspaceId)
      );

      queryClient.setQueryData(
        taskKeys.list(workspaceId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any[] | undefined) => old?.filter((task) => task.id !== taskId)
      );

      return { previousTasks };
    },
    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          taskKeys.list(workspaceId),
          context.previousTasks
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(workspaceId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.activity(workspaceId) });
    },
  });
};
