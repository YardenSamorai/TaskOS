import { unstable_cache } from "next/cache";
import { cache } from "react";

// Cache tags for targeted revalidation
export const CACHE_TAGS = {
  workspaces: (userId: string) => `workspaces-${userId}`,
  workspace: (workspaceId: string) => `workspace-${workspaceId}`,
  tasks: (workspaceId: string) => `tasks-${workspaceId}`,
  task: (taskId: string) => `task-${taskId}`,
  stats: (workspaceId: string) => `stats-${workspaceId}`,
  activity: (workspaceId: string) => `activity-${workspaceId}`,
  members: (workspaceId: string) => `members-${workspaceId}`,
} as const;

// Simple string tags for general use
export const TASKS_TAG = "tasks";
export const ACTIVITY_TAG = "activity";
export const STATS_TAG = "stats";

// Cache durations (in seconds)
export const CACHE_DURATIONS = {
  short: 30,      // 30 seconds - for frequently changing data
  medium: 60,     // 1 minute - for most data
  long: 300,      // 5 minutes - for rarely changing data
  static: 3600,   // 1 hour - for almost static data
} as const;

// React cache wrapper for request-level deduplication
export const requestCache = cache;

// Create a cached function with unstable_cache
export const createCachedFunction = <T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  keyParts: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
) => {
  return unstable_cache(fn, keyParts, {
    revalidate: options.revalidate ?? CACHE_DURATIONS.medium,
    tags: options.tags ?? [],
  }) as T;
};

// Dedupe requests within the same render
export const dedupeRequest = <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  const requestCache = new Map<string, Promise<T>>();
  
  if (requestCache.has(key)) {
    return requestCache.get(key)!;
  }
  
  const promise = fn();
  requestCache.set(key, promise);
  return promise;
};
