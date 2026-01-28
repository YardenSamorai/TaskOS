"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { 
  Loader2, 
  Sparkles, 
  FolderPlus, 
  Link2, 
  ArrowRight,
  Zap,
  Users,
  ListTodo
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useTasks } from "@/lib/hooks/use-tasks";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { ProjectsCard } from "@/components/dashboard/projects-card";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { MyTasksCard } from "@/components/dashboard/my-tasks-card";
import { RemindersCard } from "@/components/dashboard/reminders-card";
import { TodosCard } from "@/components/dashboard/todos-card";
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
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{currentDate}</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">
            {greeting}, {userName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            How can I help you today?
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="gap-2"
            size="sm"
          >
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
          <ProjectsCard 
            locale={locale} 
            currentWorkspaceId={workspaceId}
            onCreateWorkspace={() => setCreateWorkspaceOpen(true)} 
          />
          <CalendarCard 
            locale={locale} 
            workspaceId={workspaceId} 
            tasks={tasks as any[]} 
          />
          <RemindersCard />
          <TodosCard />
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <ListTodo className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Total Tasks</p>
                    <p className="text-2xl font-bold">{tasks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Users className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Team Members</p>
                    <p className="text-2xl font-bold">{members.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Focus Mode CTA */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors bg-gradient-to-br from-violet-500/5 to-indigo-500/5"
            onClick={() => router.push(`/${locale}/app/${workspaceId}/focus-mode`)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Focus Mode</p>
                    <p className="text-muted-foreground text-sm">25 min Pomodoro with ambient music</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
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
