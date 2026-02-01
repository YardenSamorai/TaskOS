"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Github,
  GitCommit,
  GitPullRequest,
  GitMerge,
  GitBranch,
  AlertCircle,
  Star,
  GitFork,
  Eye,
  Code,
  Loader2,
  RefreshCw,
  Settings,
  ExternalLink,
  Clock,
  ArrowRight,
  Plus,
  Activity,
  TrendingUp,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
  fetchRecentActivityForWorkspace,
  getLinkedRepositoriesForWorkspace,
} from "@/lib/actions/github";
import { getUserIntegrations } from "@/lib/actions/integration";
import { RepositoriesDialog } from "@/components/github/repositories-dialog";
import { IntegrationsDialog } from "@/components/integrations/integrations-dialog";
import type { GitHubCommit, GitHubPullRequest } from "@/lib/github";

type ActivityItem = {
  type: "commit" | "pr";
  repo: string;
  data: GitHubCommit | GitHubPullRequest;
  timestamp: string;
};

type LinkedRepo = {
  id: string;
  name: string;
  fullName: string | null;
  url: string | null;
  defaultBranch: string | null;
  isPrivate: boolean;
};

export default function GitHubPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [linkedRepos, setLinkedRepos] = useState<LinkedRepo[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [reposDialogOpen, setReposDialogOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const integrationsResult = await getUserIntegrations();
      const githubIntegration = integrationsResult.integrations.find(
        (i: any) => i.provider === "github" && i.isActive
      );

      setConnected(!!githubIntegration);

      if (githubIntegration) {
        const reposResult = await getLinkedRepositoriesForWorkspace(workspaceId);
        setLinkedRepos(reposResult.repositories as LinkedRepo[]);

        if (reposResult.repositories.length > 0) {
          const activityResult = await fetchRecentActivityForWorkspace(workspaceId);
          if (activityResult.success) {
            setActivity(activityResult.activity as ActivityItem[]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading GitHub data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getStats = () => {
    const commits = activity.filter((a) => a.type === "commit").length;
    const prs = activity.filter((a) => a.type === "pr").length;
    const openPRs = activity.filter(
      (a) => a.type === "pr" && (a.data as GitHubPullRequest).state === "open"
    ).length;
    const mergedPRs = activity.filter(
      (a) => a.type === "pr" && (a.data as GitHubPullRequest).merged_at
    ).length;

    return { commits, prs, openPRs, mergedPRs };
  };

  const navigateToCommit = (commit: GitHubCommit, repoFullName: string) => {
    const [owner, repo] = repoFullName.split("/");
    router.push(`/${locale}/app/${workspaceId}/github/commits/${owner}/${repo}/${commit.sha}`);
  };

  const navigateToPR = (pr: GitHubPullRequest, repoFullName: string) => {
    const [owner, repo] = repoFullName.split("/");
    router.push(`/${locale}/app/${workspaceId}/github/prs/${owner}/${repo}/${pr.number}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not connected state
  if (!connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#24292e] text-white">
                <Github className="w-6 h-6" />
              </div>
              GitHub
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect GitHub to sync your repositories
            </p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-[#24292e]/10 dark:bg-white/10 flex items-center justify-center mb-6">
              <Github className="w-10 h-10 text-[#24292e] dark:text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect Your GitHub Account</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Link your GitHub account to view commits, pull requests, and sync issues with your tasks.
            </p>
            <Button onClick={() => setIntegrationsOpen(true)} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Connect GitHub
            </Button>
          </CardContent>
        </Card>

        <IntegrationsDialog
          open={integrationsOpen}
          onOpenChange={setIntegrationsOpen}
          workspaceId={workspaceId}
        />
      </div>
    );
  }

  // Connected but no repos linked
  if (linkedRepos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#24292e] text-white">
                <Github className="w-6 h-6" />
              </div>
              GitHub
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                Connected
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Link repositories to get started
            </p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Code className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Link a Repository</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Choose which repositories you want to track in this workspace.
            </p>
            <Button onClick={() => setReposDialogOpen(true)} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Link Repository
            </Button>
          </CardContent>
        </Card>

        <RepositoriesDialog
          open={reposDialogOpen}
          onOpenChange={setReposDialogOpen}
          workspaceId={workspaceId}
          onRepositoryChange={loadData}
        />
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#24292e] text-white">
              <Github className="w-6 h-6" />
            </div>
            GitHub
          </h1>
          <p className="text-muted-foreground mt-1">
            {linkedRepos.length} repositor{linkedRepos.length === 1 ? "y" : "ies"} linked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReposDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Manage
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <GitCommit className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.commits}</p>
                <p className="text-sm text-muted-foreground">Commits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <GitPullRequest className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.openPRs}</p>
                <p className="text-sm text-muted-foreground">Open PRs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <GitMerge className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.mergedPRs}</p>
                <p className="text-sm text-muted-foreground">Merged</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10">
                <Code className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{linkedRepos.length}</p>
                <p className="text-sm text-muted-foreground">Repos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest commits and pull requests</CardDescription>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-1">
                    {activity.map((item, index) => (
                      <ActivityRow
                        key={`${item.type}-${index}`}
                        item={item}
                        onCommitClick={navigateToCommit}
                        onPRClick={navigateToPR}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Repositories Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Code className="w-5 h-5" />
                Linked Repositories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="p-3 rounded-lg border hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{repo.name}</span>
                        {repo.isPrivate && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Private
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {repo.fullName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => window.open(repo.url || "#", "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => setReposDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Repository
              </Button>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => router.push(`/${locale}/app/${workspaceId}/github/issues`)}
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  View Issues
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => router.push(`/${locale}/app/${workspaceId}/github/prs`)}
              >
                <span className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-green-500" />
                  View Pull Requests
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <RepositoriesDialog
        open={reposDialogOpen}
        onOpenChange={setReposDialogOpen}
        workspaceId={workspaceId}
        onRepositoryChange={loadData}
      />
    </div>
  );
}

function ActivityRow({
  item,
  onCommitClick,
  onPRClick,
}: {
  item: ActivityItem;
  onCommitClick: (commit: GitHubCommit, repo: string) => void;
  onPRClick: (pr: GitHubPullRequest, repo: string) => void;
}) {
  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  if (item.type === "commit") {
    const commit = item.data as GitHubCommit;
    const message = commit.commit.message.split("\n")[0];
    const repoName = item.repo.split("/")[1];

    return (
      <div
        onClick={() => onCommitClick(commit, item.repo)}
        className="p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
            <GitCommit className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {message}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {commit.sha.slice(0, 7)}
              </code>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{repoName}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {commit.author && (
              <Avatar className="w-6 h-6">
                <AvatarImage src={commit.author.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {commit.author.login[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "pr") {
    const pr = item.data as GitHubPullRequest;
    const repoName = item.repo.split("/")[1];

    const getIcon = () => {
      if (pr.merged_at) return <GitMerge className="w-4 h-4 text-purple-500" />;
      if (pr.state === "closed") return <X className="w-4 h-4 text-red-500" />;
      return <GitPullRequest className="w-4 h-4 text-green-500" />;
    };

    const getStatusBadge = () => {
      if (pr.merged_at)
        return (
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 text-[10px]">
            Merged
          </Badge>
        );
      if (pr.state === "closed")
        return (
          <Badge variant="secondary" className="bg-red-500/10 text-red-600 text-[10px]">
            Closed
          </Badge>
        );
      if (pr.draft)
        return (
          <Badge variant="outline" className="text-[10px]">
            Draft
          </Badge>
        );
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[10px]">
          Open
        </Badge>
      );
    };

    return (
      <div
        onClick={() => onPRClick(pr, item.repo)}
        className="p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "p-2 rounded-lg shrink-0",
              pr.merged_at
                ? "bg-purple-500/10"
                : pr.state === "closed"
                ? "bg-red-500/10"
                : "bg-green-500/10"
            )}
          >
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {pr.title}
              </p>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">#{pr.number}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{repoName}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Avatar className="w-6 h-6">
              <AvatarImage src={pr.user.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {pr.user.login[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
