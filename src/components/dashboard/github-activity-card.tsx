"use client";

import { useState, useEffect } from "react";
import {
  Github,
  GitCommit,
  GitPullRequest,
  GitMerge,
  ExternalLink,
  Loader2,
  RefreshCw,
  Settings,
  Download,
  Plus,
  FolderGit2,
  X,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  fetchRecentActivityForWorkspace,
  getLinkedRepositoriesForWorkspace,
} from "@/lib/actions/github";
import { getUserIntegrations } from "@/lib/actions/integration";
import { RepositoriesDialog } from "@/components/github/repositories-dialog";
import { ImportIssuesDialog } from "@/components/github/import-issues-dialog";
import type { GitHubCommit, GitHubPullRequest } from "@/lib/github";

interface GitHubActivityCardProps {
  workspaceId: string;
  onOpenIntegrations?: () => void;
  refreshKey?: number;
}

type ActivityItem = {
  type: "commit" | "pr";
  repo: string;
  data: GitHubCommit | GitHubPullRequest;
  timestamp: string;
};

export function GitHubActivityCard({ 
  workspaceId, 
  onOpenIntegrations,
  refreshKey = 0,
}: GitHubActivityCardProps) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [linkedReposCount, setLinkedReposCount] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [reposDialogOpen, setReposDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    checkConnectionAndFetch();
  }, [workspaceId, refreshKey]);

  const checkConnectionAndFetch = async () => {
    setLoading(true);

    try {
      // Check if GitHub is connected
      const integrationsResult = await getUserIntegrations();
      const githubIntegration = integrationsResult.integrations.find(
        (i: any) => i.provider === "github" && i.isActive
      );
      
      setConnected(!!githubIntegration);

      if (githubIntegration) {
        // Check linked repos
        const reposResult = await getLinkedRepositoriesForWorkspace(workspaceId);
        setLinkedReposCount(reposResult.repositories.length);

        // Fetch activity if repos are linked
        if (reposResult.repositories.length > 0) {
          const activityResult = await fetchRecentActivityForWorkspace(workspaceId);
          if (activityResult.success) {
            setActivity(activityResult.activity as ActivityItem[]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching GitHub data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10">
              <Github className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            GitHub
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex items-center justify-center py-6 sm:py-8">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!connected) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10">
              <Github className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            GitHub
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-center py-4 sm:py-6">
            <Github className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/30 mb-2 sm:mb-3" />
            <h3 className="font-medium text-sm sm:text-base mb-1">Connect GitHub</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
              Link repos to sync issues
            </p>
            <Button onClick={onOpenIntegrations} size="sm" className="text-xs sm:text-sm">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No repos linked state
  if (linkedReposCount === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base flex-wrap">
              <div className="p-1.5 sm:p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10 shrink-0">
                <Github className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span>GitHub</span>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[10px] sm:text-xs">
                Connected
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-center py-4 sm:py-6">
            <FolderGit2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/30 mb-2 sm:mb-3" />
            <h3 className="font-medium text-sm sm:text-base mb-1">Link a Repository</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
              Link repos to see activity
            </p>
            <Button onClick={() => setReposDialogOpen(true)} size="sm" className="text-xs sm:text-sm">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Link Repo
            </Button>
          </div>
        </CardContent>

        <RepositoriesDialog
          open={reposDialogOpen}
          onOpenChange={setReposDialogOpen}
          workspaceId={workspaceId}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10 shrink-0">
              <Github className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="truncate">GitHub</span>
          </CardTitle>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={() => setImportDialogOpen(true)}
              title="Import Issues"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={() => setReposDialogOpen(true)}
              title="Manage Repositories"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              onClick={checkConnectionAndFetch}
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
          {linkedReposCount} repo{linkedReposCount === 1 ? "" : "s"} linked
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-6 sm:py-8">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-4 sm:py-6 text-muted-foreground text-xs sm:text-sm">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="h-[240px] sm:h-[300px] overflow-y-auto overflow-x-hidden">
            <div className="space-y-2 sm:space-y-3 pr-1">
              {activity.slice(0, 10).map((item, index) => (
                <ActivityItemCard key={`${item.type}-${index}`} item={item} />
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <RepositoriesDialog
        open={reposDialogOpen}
        onOpenChange={setReposDialogOpen}
        workspaceId={workspaceId}
        onRepositoryChange={checkConnectionAndFetch}
      />
      <ImportIssuesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        workspaceId={workspaceId}
        onImportSuccess={checkConnectionAndFetch}
      />
    </Card>
  );
}

function ActivityItemCard({ item }: { item: ActivityItem }) {
  if (item.type === "commit") {
    const commit = item.data as GitHubCommit;
    const message = commit.commit.message.split("\n")[0];

    return (
      <a
        href={commit.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full p-1.5 sm:p-2 rounded-lg hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-start gap-2 sm:gap-3 w-full">
          <GitCommit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
              {message}
            </p>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              <code className="bg-muted px-1 rounded font-mono text-[9px] sm:text-[10px] shrink-0">
                {commit.sha.slice(0, 7)}
              </code>
              <span className="shrink-0">•</span>
              <span className="shrink-0">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }).replace(' ago', '')}
              </span>
            </div>
          </div>
        </div>
      </a>
    );
  }

  if (item.type === "pr") {
    const pr = item.data as GitHubPullRequest;

    const getIcon = () => {
      if (pr.merged_at) return <GitMerge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />;
      if (pr.state === "closed") return <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />;
      return <GitPullRequest className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />;
    };

    return (
      <a
        href={pr.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full p-1.5 sm:p-2 rounded-lg hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-start gap-2 sm:gap-3 w-full">
          <div className="shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
              {pr.title}
            </p>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              <span className="shrink-0">#{pr.number}</span>
              <span className="shrink-0">•</span>
              <span className="shrink-0">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }).replace(' ago', '')}
              </span>
            </div>
          </div>
        </div>
      </a>
    );
  }

  return null;
}
