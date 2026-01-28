"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Kanban,
  ListTodo,
  Calendar,
  Target,
  Settings,
  Users,
  Plus,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { useTasks } from "@/lib/hooks/use-tasks";
import { Badge } from "@/components/ui/badge";

const priorityColors: Record<string, string> = {
  low: "bg-slate-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const locale = (params.locale as string) || "en";
  const workspaceId = params.workspaceId as string | undefined;

  const { data: workspaces = [] } = useWorkspaces();
  const { data: tasks = [] } = useTasks(workspaceId || "");

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  // Filter tasks based on search
  const filteredTasks = tasks.filter((task: any) =>
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.description?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  // Filter workspaces based on search
  const filteredWorkspaces = workspaces.filter((ws: any) =>
    ws.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 3);

  // Don't render until client-side to prevent hydration mismatch
  if (!mounted) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search tasks, workspaces, or type a command..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Tasks */}
        {filteredTasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {filteredTasks.map((task: any) => (
              <CommandItem
                key={task.id}
                value={`task-${task.id}`}
                onSelect={() => runCommand(() => 
                  router.push(`/${locale}/app/${task.workspaceId}/tasks/${task.id}`)
                )}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span className="flex-1 truncate">{task.title}</span>
                <Badge 
                  variant="secondary" 
                  className={`ml-2 ${priorityColors[task.priority]} text-white text-[10px] px-1.5`}
                >
                  {task.priority}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Workspaces */}
        {filteredWorkspaces.length > 0 && (
          <CommandGroup heading="Workspaces">
            {filteredWorkspaces.map((ws: any) => (
              <CommandItem
                key={ws.id}
                value={`workspace-${ws.id}`}
                onSelect={() => runCommand(() => 
                  router.push(`/${locale}/app/${ws.id}/dashboard`)
                )}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                <span>{ws.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Navigation */}
        {workspaceId && (
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => runCommand(() => 
                router.push(`/${locale}/app/${workspaceId}/dashboard`)
              )}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => 
                router.push(`/${locale}/app/${workspaceId}/board`)
              )}
            >
              <Kanban className="mr-2 h-4 w-4" />
              <span>Board</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => 
                router.push(`/${locale}/app/${workspaceId}/tasks`)
              )}
            >
              <ListTodo className="mr-2 h-4 w-4" />
              <span>Tasks</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => 
                router.push(`/${locale}/app/${workspaceId}/calendar`)
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>Calendar</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => 
                router.push(`/${locale}/app/${workspaceId}/focus`)
              )}
            >
              <Target className="mr-2 h-4 w-4" />
              <span>Focus</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => 
                router.push(`/${locale}/app/${workspaceId}/members`)
              )}
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Members</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => 
                router.push(`/${locale}/app/${workspaceId}/settings`)
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => 
              router.push(`/${locale}/app/dashboard`)
            )}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>All Workspaces</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Settings */}
        <CommandGroup heading="Settings">
          <CommandItem
            onSelect={() => runCommand(() => 
              setTheme(theme === "dark" ? "light" : "dark")
            )}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Toggle Theme</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => signOut({ callbackUrl: "/" }))}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
