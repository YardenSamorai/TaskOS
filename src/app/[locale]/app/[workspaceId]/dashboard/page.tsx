"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  FolderPlus,
  Link2,
  Puzzle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useTasks, useRecentActivity } from "@/lib/hooks/use-tasks";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { IntegrationsDialog } from "@/components/integrations/integrations-dialog";
import { ExecutionPulse } from "@/components/dashboard/execution-pulse";
import { AgentSummaryCard } from "@/components/dashboard/agent-summary-card";
import { TaskPipeline } from "@/components/dashboard/task-pipeline";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { IntegrationsSummaryCard } from "@/components/dashboard/integrations-summary-card";
import { ActivityFeedCard } from "@/components/dashboard/activity-feed-card";
import { GitHubOnboardingDialog } from "@/components/github/github-onboarding-dialog";
import { RepositoriesDialog } from "@/components/github/repositories-dialog";
import { JiraOnboardingDialog } from "@/components/jira/jira-onboarding-dialog";
import { JiraProjectsDialog } from "@/components/jira/jira-projects-dialog";
import { AzureDevOpsOnboardingDialog } from "@/components/azure-devops/azure-devops-onboarding-dialog";
import { AzureDevOpsProjectsDialog } from "@/components/azure-devops/azure-devops-projects-dialog";
import { ImportIssuesDialog as ImportGitHubIssuesDialog } from "@/components/github/import-issues-dialog";
import { ImportJiraIssuesDialog } from "@/components/jira/import-issues-dialog";
import { ImportWorkItemsDialog } from "@/components/azure-devops/import-work-items-dialog";
import { format } from "date-fns";
import { toast } from "sonner";

const DashboardPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data, isLoading } = useWorkspace(workspaceId);
  const { data: tasks = [], refetch: refetchTasks } = useTasks(workspaceId);
  const { data: activity = [] } = useRecentActivity(workspaceId, 10);

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
  const [githubRefreshKey, setGithubRefreshKey] = useState(0);
  const [azureRefreshKey, setAzureRefreshKey] = useState(0);
  const [importGithubOpen, setImportGithubOpen] = useState(false);
  const [importJiraOpen, setImportJiraOpen] = useState(false);
  const [importAzureOpen, setImportAzureOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  const [currentDate, setCurrentDate] = useState("");

  const workspace = data?.workspace;
  const members = data?.members || [];
  const currentUserId = session?.user?.id;

  const userName = useMemo(() => {
    if (session?.user?.name) {
      return session.user.name.split(" ")[0];
    }
    const currentMember = members.find((m: any) => m.role === "owner");
    if (currentMember?.user?.name) {
      return currentMember.user.name.split(" ")[0];
    }
    return "there";
  }, [members, session]);

  const reviewCount = useMemo(() => {
    return tasks.filter((t: any) => {
      if (t.status !== "review") return false;
      if (!currentUserId) return true;
      return t.assignees?.some((a: any) => a.user.id === currentUserId);
    }).length;
  }, [tasks, currentUserId]);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
    setCurrentDate(format(new Date(), "EEE, d MMM"));
  }, []);

  useEffect(() => {
    const integration = searchParams.get("integration");
    const status = searchParams.get("status");
    const isNew = searchParams.get("new");

    if (status === "connected") {
      if (integration === "github") {
        if (isNew === "true") setGithubOnboardingOpen(true);
        else toast.success("GitHub reconnected successfully!");
      } else if (integration === "jira") {
        if (isNew === "true") setJiraOnboardingOpen(true);
        else toast.success("Jira reconnected successfully!");
      } else if (integration === "azure_devops") {
        if (isNew === "true") setAzureDevOpsOnboardingOpen(true);
        else toast.success("Azure DevOps reconnected successfully!");
      }
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
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs sm:text-sm">{currentDate}</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mt-1">
            {greeting}, {userName}!
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => router.push(`/${locale}/app/extensions`)}
          >
            <Puzzle className="w-4 h-4" />
            <span className="hidden sm:inline">IDE Extension</span>
            <span className="sm:hidden">IDE</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateWorkspaceOpen(true)}
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Workspace</span>
            <span className="sm:hidden">New</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setIntegrationsOpen(true)}
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Integrations</span>
            <span className="sm:hidden">Connect</span>
          </Button>
        </div>
      </div>

      {/* Zone 1: Execution Pulse */}
      <ExecutionPulse tasks={tasks as any[]} currentUserId={currentUserId} />

      {/* Zone 2: Agent Summary */}
      <AgentSummaryCard activity={activity as any[]} reviewCount={reviewCount} />

      {/* Zone 3: Main Work Surface */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Left column - 60% (3/5) */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          <TaskPipeline
            tasks={tasks as any[]}
            currentUserId={currentUserId}
            onCreateTask={() => setCreateTaskOpen(true)}
          />
        </div>

        {/* Right column - 40% (2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <CalendarCard
            locale={locale}
            workspaceId={workspaceId}
            tasks={tasks as any[]}
          />
          <IntegrationsSummaryCard
            workspaceId={workspaceId}
            onOpenIntegrations={() => setIntegrationsOpen(true)}
            onImport={(provider) => {
              if (provider === "github") setImportGithubOpen(true);
              else if (provider === "jira") setImportJiraOpen(true);
              else if (provider === "azure_devops") setImportAzureOpen(true);
            }}
          />
          <ActivityFeedCard activity={activity as any[]} />
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
        onRepositoryChange={() => setGithubRefreshKey((k) => k + 1)}
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
          setJiraRefreshKey((k) => k + 1);
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
        onSelectProject={() => {
          setAzureDevOpsProjectsOpen(false);
          setAzureRefreshKey((k) => k + 1);
        }}
      />
      <ImportGitHubIssuesDialog
        open={importGithubOpen}
        onOpenChange={setImportGithubOpen}
        workspaceId={workspaceId}
        onImportSuccess={() => refetchTasks()}
      />
      <ImportJiraIssuesDialog
        open={importJiraOpen}
        onOpenChange={setImportJiraOpen}
        workspaceId={workspaceId}
        onImportSuccess={() => refetchTasks()}
      />
      <ImportWorkItemsDialog
        open={importAzureOpen}
        onOpenChange={setImportAzureOpen}
        workspaceId={workspaceId}
        onImportSuccess={() => refetchTasks()}
      />
    </div>
  );
};

export default DashboardPage;
