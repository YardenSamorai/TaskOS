"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { 
  Loader2, 
  Sparkles, 
  FolderPlus, 
  Link2, 
  ArrowRight,
  Zap,
  Users,
  ListTodo,
  Puzzle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useTasks } from "@/lib/hooks/use-tasks";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { IntegrationsDialog } from "@/components/integrations/integrations-dialog";
import { ProjectsCard } from "@/components/dashboard/projects-card";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { MyTasksCard } from "@/components/dashboard/my-tasks-card";
import { RemindersCard } from "@/components/dashboard/reminders-card";
import { TodosCard } from "@/components/dashboard/todos-card";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { GitHubActivityCard } from "@/components/dashboard/github-activity-card";
import { JiraActivityCard } from "@/components/dashboard/jira-activity-card";
import { GitHubOnboardingDialog } from "@/components/github/github-onboarding-dialog";
import { RepositoriesDialog } from "@/components/github/repositories-dialog";
import { JiraOnboardingDialog } from "@/components/jira/jira-onboarding-dialog";
import { JiraProjectsDialog } from "@/components/jira/jira-projects-dialog";
import { AzureDevOpsOnboardingDialog } from "@/components/azure-devops/azure-devops-onboarding-dialog";
import { AzureDevOpsProjectsDialog } from "@/components/azure-devops/azure-devops-projects-dialog";
import { format } from "date-fns";
import { toast } from "sonner";

const DashboardPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data, isLoading } = useWorkspace(workspaceId);
  const { data: tasks = [], refetch: refetchTasks } = useTasks(workspaceId);
  
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [githubOnboardingOpen, setGithubOnboardingOpen] = useState(false);
  const [jiraOnboardingOpen, setJiraOnboardingOpen] = useState(false);
  const [azureDevOpsOnboardingOpen, setAzureDevOpsOnboardingOpen] = useState(false);
  const [repositoriesOpen, setRepositoriesOpen] = useState(false);
  const [jiraProjectsOpen, setJiraProjectsOpen] = useState(false);
  const [azureDevOpsProjectsOpen, setAzureDevOpsProjectsOpen] = useState(false);
  const [jiraRefreshKey, setJiraRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  const [currentDate, setCurrentDate] = useState("");
  const [githubRefreshKey, setGithubRefreshKey] = useState(0);

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

  // Check for new integration connection
  useEffect(() => {
    const integration = searchParams.get("integration");
    const status = searchParams.get("status");
    const isNew = searchParams.get("new");

    if (status === "connected") {
      if (integration === "github") {
        if (isNew === "true") {
          setGithubOnboardingOpen(true);
        } else {
          toast.success("GitHub reconnected successfully!");
        }
      } else if (integration === "jira") {
        if (isNew === "true") {
          setJiraOnboardingOpen(true);
        } else {
          toast.success("Jira reconnected successfully!");
        }
      } else if (integration === "azure_devops") {
        if (isNew === "true") {
          setAzureDevOpsOnboardingOpen(true);
        } else {
          toast.success("Azure DevOps reconnected successfully!");
        }
      }
      
      // Clean URL
      router.replace(`/${locale}/app/${workspaceId}/dashboard`, { scroll: false });
    }
  }, [searchParams, locale, workspaceId, router]);

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
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <p className="text-muted-foreground text-xs sm:text-sm">{currentDate}</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">
            {greeting}, {userName}!
          </h1>
          <p className="text-muted-foreground text-sm mt-1 hidden sm:block">
            How can I help you today?
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="gap-2 flex-1 sm:flex-none"
            size="sm"
            onClick={() => router.push(`/${locale}/app/extensions`)}
          >
            <Puzzle className="w-4 h-4" />
            <span className="hidden xs:inline">IDE Extension</span>
            <span className="xs:hidden">IDE</span>
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 flex-1 sm:flex-none"
            size="sm"
            onClick={() => setCreateWorkspaceOpen(true)}
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Create workspace</span>
            <span className="sm:hidden">New</span>
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 w-full sm:w-auto"
            size="sm"
            onClick={() => setIntegrationsOpen(true)}
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Connect apps</span>
            <span className="sm:hidden">Connect</span>
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Projects - order 1 on mobile, stays first */}
          <div className="order-1">
            <ProjectsCard 
              locale={locale} 
              currentWorkspaceId={workspaceId}
              onCreateWorkspace={() => setCreateWorkspaceOpen(true)} 
            />
          </div>
          {/* My Tasks - order 2 on mobile (before Calendar), hidden on lg (shown in right column) */}
          <div className="order-2 lg:hidden">
            <MyTasksCard 
              locale={locale} 
              workspaceId={workspaceId} 
              tasks={myTasks as any[]} 
              onCreateTask={() => setCreateTaskOpen(true)}
              onRefresh={() => refetchTasks()}
            />
          </div>
          {/* Calendar - order 3 on mobile */}
          <div className="order-3">
            <CalendarCard 
              locale={locale} 
              workspaceId={workspaceId} 
              tasks={tasks as any[]} 
            />
          </div>
          {/* Rest of left column */}
          <div className="order-4">
            <GitHubActivityCard 
              workspaceId={workspaceId}
              onOpenIntegrations={() => setIntegrationsOpen(true)}
              refreshKey={githubRefreshKey}
            />
          </div>
          <div className="order-5">
            <JiraActivityCard
              workspaceId={workspaceId}
              onOpenIntegrations={() => setIntegrationsOpen(true)}
              refreshKey={jiraRefreshKey}
            />
          </div>
          <div className="order-6">
            <RemindersCard />
          </div>
          <div className="order-7">
            <TodosCard />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* My Tasks - hidden on mobile (shown in left column), visible on lg */}
          <div className="hidden lg:block">
            <MyTasksCard 
              locale={locale} 
              workspaceId={workspaceId} 
              tasks={myTasks as any[]} 
              onCreateTask={() => setCreateTaskOpen(true)}
              onRefresh={() => refetchTasks()}
            />
          </div>
          <GoalsCard workspaceId={workspaceId} />

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4 sm:pt-6 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-primary/10 shrink-0">
                    <ListTodo className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "var(--accent-color)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs sm:text-sm truncate">Tasks</p>
                    <p className="text-xl sm:text-2xl font-bold">{tasks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:pt-6 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-primary/10 shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: "var(--accent-color)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs sm:text-sm truncate">Members</p>
                    <p className="text-xl sm:text-2xl font-bold">{members.length}</p>
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
            <CardContent className="p-4 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shrink-0">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">Focus Mode</p>
                    <p className="text-muted-foreground text-xs sm:text-sm truncate">25 min Pomodoro</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        locale={locale}
      />
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        locale={locale}
        members={members}
      />
      <IntegrationsDialog
        open={integrationsOpen}
        onOpenChange={setIntegrationsOpen}
        workspaceId={workspaceId}
      />
      <GitHubOnboardingDialog
        open={githubOnboardingOpen}
        onOpenChange={setGithubOnboardingOpen}
        onLinkRepository={() => setRepositoriesOpen(true)}
      />
      <RepositoriesDialog
        open={repositoriesOpen}
        onOpenChange={setRepositoriesOpen}
        workspaceId={workspaceId}
        onRepositoryChange={() => setGithubRefreshKey(k => k + 1)}
      />
      <JiraOnboardingDialog
        open={jiraOnboardingOpen}
        onOpenChange={setJiraOnboardingOpen}
        onLinkProject={() => setJiraProjectsOpen(true)}
      />
      <JiraProjectsDialog
        open={jiraProjectsOpen}
        onOpenChange={setJiraProjectsOpen}
        workspaceId={workspaceId}
        onSelectProject={() => {
          setJiraProjectsOpen(false);
          setJiraRefreshKey(k => k + 1);
        }}
      />
      <AzureDevOpsOnboardingDialog
        open={azureDevOpsOnboardingOpen}
        onOpenChange={setAzureDevOpsOnboardingOpen}
        onLinkProject={() => setAzureDevOpsProjectsOpen(true)}
      />
      <AzureDevOpsProjectsDialog
        open={azureDevOpsProjectsOpen}
        onOpenChange={setAzureDevOpsProjectsOpen}
        workspaceId={workspaceId}
      />
    </div>
  );
};

export default DashboardPage;
