"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { 
  Loader2, 
  Sparkles, 
  FolderPlus, 
  Link2, 
  ArrowRight,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useTasks } from "@/lib/hooks/use-tasks";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { ProjectsCard } from "@/components/dashboard/projects-card";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { MyTasksCard } from "@/components/dashboard/my-tasks-card";
import { RemindersCard } from "@/components/dashboard/reminders-card";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { format } from "date-fns";

const DashboardPage = () => {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data, isLoading } = useWorkspace(workspaceId);
  const { data: tasks = [] } = useTasks(workspaceId);
  
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  const [currentDate, setCurrentDate] = useState("");

  const workspace = data?.workspace;
  const members = data?.members || [];

  // Get user's first name
  const userName = useMemo(() => {
    const currentMember = members.find((m: any) => m.role === "owner");
    if (currentMember?.user?.name) {
      return currentMember.user.name.split(" ")[0];
    }
    return "there";
  }, [members]);

  // Get tasks assigned to current user
  const myTasks = useMemo(() => {
    // For now, show all tasks - in production, filter by current user
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

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 space-y-6 pb-8 p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-zinc-500 text-sm">{currentDate}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
              {greeting}, {userName}!
            </h1>
            <p className="text-zinc-400 mt-1">
              How can I help you today?
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2"
              size="sm"
            >
              <Sparkles className="w-4 h-4" />
              Ask AI
            </Button>
            <Button 
              variant="outline" 
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
              size="sm"
              onClick={() => setCreateWorkspaceOpen(true)}
            >
              <FolderPlus className="w-4 h-4" />
              Create workspace
            </Button>
            <Button 
              variant="outline" 
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
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
            <ProjectsCard 
              locale={locale} 
              onCreateWorkspace={() => setCreateWorkspaceOpen(true)} 
            />
            <CalendarCard 
              locale={locale} 
              workspaceId={workspaceId} 
              tasks={tasks as any[]} 
            />
            <RemindersCard />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <MyTasksCard 
              locale={locale} 
              workspaceId={workspaceId} 
              tasks={myTasks as any[]} 
              onCreateTask={() => setCreateTaskOpen(true)}
            />
            <GoalsCard workspaceId={workspaceId} />

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <p className="text-zinc-500 text-sm">Total Tasks</p>
                <p className="text-2xl font-bold text-white mt-1">{tasks.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <p className="text-zinc-500 text-sm">Team Members</p>
                <p className="text-2xl font-bold text-white mt-1">{members.length}</p>
              </div>
            </div>

            {/* Focus Mode CTA */}
            <button
              onClick={() => router.push(`/${locale}/app/workspaces`)}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Focus Mode</p>
                    <p className="text-zinc-500 text-sm">Start a focused work session</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-amber-500 transition-colors" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onSuccess={(workspace) => {
          router.push(`/${locale}/app/${workspace.id}/dashboard`);
        }}
      />
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        locale={locale}
        members={members}
      />
    </div>
  );
};

export default DashboardPage;
