"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Loader2, 
  Sparkles, 
  FolderPlus, 
  Link2, 
  ArrowRight,
  Zap,
  Users,
  ListTodo,
  Building2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { MyTasksCard } from "@/components/dashboard/my-tasks-card";
import { RemindersCard } from "@/components/dashboard/reminders-card";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { getUserWorkspaces } from "@/lib/actions/workspace";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  role: string;
}

// Generate consistent color from string
const getColorFromString = (str: string) => {
  const colors = [
    "from-primary/80 to-primary",
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-violet-600",
    "from-pink-500 to-rose-600",
    "from-cyan-500 to-blue-600",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const GlobalDashboardPage = () => {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  const [currentDate, setCurrentDate] = useState("");

  // Fetch workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const result = await getUserWorkspaces();
        if (result.success && result.workspaces) {
          setWorkspaces(result.workspaces as Workspace[]);
          // Auto-select first workspace if available
          if (result.workspaces.length > 0) {
            setSelectedWorkspace(result.workspaces[0] as Workspace);
          }
        }
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  // Fetch tasks when workspace is selected
  const fetchWorkspaceData = useCallback(async (workspaceId: string) => {
    setTasksLoading(true);
    try {
      // Dynamic import to avoid issues
      const { getWorkspaceTasks } = await import("@/lib/actions/task");
      const { getWorkspace } = await import("@/lib/actions/workspace");
      
      const [tasksResult, workspaceResult] = await Promise.all([
        getWorkspaceTasks(workspaceId),
        getWorkspace(workspaceId),
      ]);
      
      if (tasksResult.success) {
        setTasks(tasksResult.tasks || []);
      }
      if (workspaceResult.success) {
        setMembers(workspaceResult.members || []);
      }
    } catch (error) {
      console.error("Error fetching workspace data:", error);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // Fetch data when workspace changes
  useEffect(() => {
    if (selectedWorkspace) {
      fetchWorkspaceData(selectedWorkspace.id);
    }
  }, [selectedWorkspace, fetchWorkspaceData]);

  // Get tasks for display
  const myTasks = useMemo(() => {
    return tasks.filter((t: any) => t.status !== "done").slice(0, 10);
  }, [tasks]);

  useEffect(() => {
    setMounted(true);
    
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good Morning");
    } else if (hour < 18) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }

    // Set current date
    setCurrentDate(format(new Date(), "EEE, d MMM"));
  }, []);

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{currentDate}</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">
            {greeting}!
          </h1>
          <p className="text-muted-foreground mt-1">
            How can I help you today?
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" size="sm">
            <Sparkles className="w-4 h-4" />
            Ask AI
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            size="sm"
            onClick={() => setCreateWorkspaceOpen(true)}
          >
            <FolderPlus className="w-4 h-4" />
            Create workspace
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            size="sm"
          >
            <Link2 className="w-4 h-4" />
            Connect apps
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Interactive Projects Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  Projects
                </CardTitle>
                {selectedWorkspace && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedWorkspace.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Create new project button */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground h-12"
                onClick={() => setCreateWorkspaceOpen(true)}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" style={{ color: "var(--accent-color)" }} />
                </div>
                Create new project
              </Button>

              {/* Workspace list */}
              {workspaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No projects yet</p>
                  <p className="text-xs mt-1">Create your first project to get started</p>
                </div>
              ) : (
                workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => setSelectedWorkspace(workspace)}
                    className={cn(
                      "flex items-center justify-between w-full p-3 rounded-xl transition-all text-left",
                      selectedWorkspace?.id === workspace.id
                        ? "bg-primary/10 border-2 border-primary/30"
                        : "hover:bg-muted/50 border-2 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-semibold text-sm",
                        getColorFromString(workspace.name)
                      )}>
                        {workspace.imageUrl ? (
                          <img src={workspace.imageUrl} alt="" className="w-full h-full rounded-lg object-cover" />
                        ) : (
                          workspace.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="font-medium block">{workspace.name}</span>
                        <span className="text-xs text-muted-foreground">{workspace.role}</span>
                      </div>
                    </div>
                    {selectedWorkspace?.id === workspace.id && (
                      <Badge variant="default" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </button>
                ))
              )}

              {/* View workspace details link */}
              {selectedWorkspace && (
                <Link 
                  href={`/${locale}/app/${selectedWorkspace.id}/dashboard`}
                  className="block"
                >
                  <Button variant="outline" className="w-full mt-2 gap-2">
                    Open {selectedWorkspace.name}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Calendar Card */}
          {selectedWorkspace ? (
            <CalendarCard 
              locale={locale} 
              workspaceId={selectedWorkspace.id} 
              tasks={tasks} 
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground text-sm py-8">
                  Select a project to view calendar
                </p>
              </CardContent>
            </Card>
          )}

          <RemindersCard />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* My Tasks Card */}
          {selectedWorkspace ? (
            tasksLoading ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ListTodo className="w-5 h-5 text-muted-foreground" />
                    My tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MyTasksCard 
                locale={locale} 
                workspaceId={selectedWorkspace.id} 
                tasks={myTasks} 
                onCreateTask={() => setCreateTaskOpen(true)}
              />
            )
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListTodo className="w-5 h-5 text-muted-foreground" />
                  My tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground text-sm py-8">
                  Select a project to view tasks
                </p>
              </CardContent>
            </Card>
          )}

          <GoalsCard workspaceId={selectedWorkspace?.id} />

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <ListTodo className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Tasks</p>
                    <p className="text-2xl font-bold">{tasks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Building2 className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Projects</p>
                    <p className="text-2xl font-bold">{workspaces.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Focus Mode CTA */}
          {selectedWorkspace && (
            <Card 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/${locale}/app/${selectedWorkspace.id}/focus`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Zap className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                    </div>
                    <div>
                      <p className="font-medium">Focus Mode</p>
                      <p className="text-muted-foreground text-sm">Start a focused work session</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onSuccess={(workspace) => {
          setWorkspaces([...workspaces, workspace as Workspace]);
          setSelectedWorkspace(workspace as Workspace);
        }}
      />
      {selectedWorkspace && (
        <CreateTaskDialog
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          workspaceId={selectedWorkspace.id}
          workspaceName={selectedWorkspace.name}
          locale={locale}
          members={members}
          onSuccess={() => {
            fetchWorkspaceData(selectedWorkspace.id);
          }}
        />
      )}
    </div>
  );
};

export default GlobalDashboardPage;
