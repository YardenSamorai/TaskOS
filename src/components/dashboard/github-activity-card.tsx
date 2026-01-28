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
}

type ActivityItem = {
  type: "commit" | "pr";
  repo: string;
  data: GitHubCommit | GitHubPullRequest;
  timestamp: string;
};

export function GitHubActivityCard({ 
  workspaceId, 
  onOpenIntegrations 
}: GitHubActivityCardProps) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [linkedReposCount, setLinkedReposCount] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [reposDialogOpen, setReposDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    checkConnectionAndFetch();
  }, [workspaceId]);

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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10">
              <Github className="w-4 h-4" />
            </div>
            GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!connected) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10">
              <Github className="w-4 h-4" />
            </div>
            GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Github className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-medium mb-1">Connect GitHub</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Link your repositories to sync issues and track commits
            </p>
            <Button onClick={onOpenIntegrations} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Connect GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No repos linked state
  if (linkedReposCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10">
                <Github className="w-4 h-4" />
              </div>
              GitHub
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                Connected
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FolderGit2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-medium mb-1">Link a Repository</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Link repositories to this workspace to see activity
            </p>
            <Button onClick={() => setReposDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Link Repository
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10">
              <Github className="w-4 h-4" />
            </div>
            GitHub Activity
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setImportDialogOpen(true)}
              title="Import Issues"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setReposDialogOpen(true)}
              title="Manage Repositories"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={checkConnectionAndFetch}
              title="Refresh"
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {linkedReposCount} repositor{linkedReposCount === 1 ? "y" : "ies"} linked
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] -mx-4 px-4">
            <div className="space-y-3">
              {activity.slice(0, 10).map((item, index) => (
                <ActivityItemCard key={`${item.type}-${index}`} item={item} />
              ))}
            </div>
          </ScrollArea>
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
        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
      >
        <GitCommit className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate group-hover:text-primary transition-colors">
            {message}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <code className="bg-muted px-1 rounded font-mono text-[10px]">
              {commit.sha.slice(0, 7)}
            </code>
            <span className="truncate">{item.repo}</span>
            <span>•</span>
            <span className="flex-shrink-0">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
      </a>
    );
  }

  if (item.type === "pr") {
    const pr = item.data as GitHubPullRequest;

    const getIcon = () => {
      if (pr.merged_at) return <GitMerge className="w-4 h-4 text-purple-500" />;
      if (pr.state === "closed") return <X className="w-4 h-4 text-red-500" />;
      return <GitPullRequest className="w-4 h-4 text-green-500" />;
    };

    return (
      <a
        href={pr.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
      >
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate group-hover:text-primary transition-colors">
            {pr.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>#{pr.number}</span>
            <span className="truncate">{item.repo}</span>
            <span>•</span>
            <span className="flex-shrink-0">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
      </a>
    );
  }

  return null;
}
