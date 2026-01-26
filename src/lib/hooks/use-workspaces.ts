"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserWorkspaces, createWorkspace, getWorkspace } from "@/lib/actions/workspace";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  lists: () => [...workspaceKeys.all, "list"] as const,
  list: (filters: string) => [...workspaceKeys.lists(), { filters }] as const,
  details: () => [...workspaceKeys.all, "detail"] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
};

export const useWorkspaces = () => {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: async () => {
      const result = await getUserWorkspaces();
      if (!result.success) {
        throw new Error("Failed to fetch workspaces");
      }
      return result.workspaces;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useWorkspace = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: async () => {
      const result = await getWorkspace(workspaceId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch workspace");
      }
      return { 
        workspace: result.workspace, 
        role: result.role,
        members: result.members || [],
      };
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await createWorkspace(formData);
      if (!result.success) {
        throw new Error(result.error || "Failed to create workspace");
      }
      return result.workspace;
    },
    onSuccess: () => {
      // Invalidate workspaces list to trigger refetch
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
};
