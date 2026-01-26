"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: string;
}

interface AppStore {
  // Current workspace
  currentWorkspace: WorkspaceData | null;
  setCurrentWorkspace: (workspace: WorkspaceData | null) => void;
  
  // Cached workspaces list
  workspaces: WorkspaceData[];
  setWorkspaces: (workspaces: WorkspaceData[]) => void;
  
  // Navigation state
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;
  
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      
      workspaces: [],
      setWorkspaces: (workspaces) => set({ workspaces }),
      
      isNavigating: false,
      setIsNavigating: (isNavigating) => set({ isNavigating }),
      
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: "taskos-app-store",
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
        workspaces: state.workspaces,
      }),
    }
  )
);
