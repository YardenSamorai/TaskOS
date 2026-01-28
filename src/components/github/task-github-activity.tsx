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
  Link2,
  AlertCircle,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  fetchCommitsForTask,
  fetchPullRequestsForTask,
  syncTaskToGitHub,
} from "@/lib/actions/github";
import type { GitHubCommit, GitHubPullRequest } from "@/lib/github";
import { toast } from "sonner";

interface TaskGitHubActivityProps {
  taskId: string;
  metadata?: {
    github?: {
      issueId: number;
      issueNumber: number;
      issueUrl: string;
      repositoryId: string;
      repositoryFullName: string;
    };
  };
}

export function TaskGitHubActivity({ taskId, metadata }: TaskGitHubActivityProps) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [taskId]);

  const fetchActivity = async () => {
    setLoading(true);

    try {
      const [commitsResult, prsResult] = await Promise.all([
        fetchCommitsForTask(taskId),
        fetchPullRequestsForTask(taskId),
      ]);

      if (commitsResult.success) {
        setCommits(commitsResult.commits);
      }
      if (prsResult.success) {
        setPullRequests(prsResult.pullRequests);
      }
    } catch (error) {
      console.error("Error fetching GitHub activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!metadata?.github) {
      toast.error("Task is not linked to a GitHub issue");
      return;
    }

    setSyncing(true);

    try {
      const result = await syncTaskToGitHub(taskId);

      if (result.success) {
        toast.success("Task synced to GitHub");
      } else {
        toast.error(result.error || "Failed to sync");
      }
    } catch (error) {
      toast.error("Failed to sync to GitHub");
    } finally {
      setSyncing(false);
    }
  };

  const githubInfo = metadata?.github;
  const hasActivity = commits.length > 0 || pullRequests.length > 0;

  if (!githubInfo && !hasActivity) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              <span className="font-medium">GitHub Activity</span>
              {(commits.length > 0 || pullRequests.length > 0) && (
                <Badge variant="secondary" className="ml-2">
                  {commits.length + pullRequests.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {githubInfo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSync();
                  }}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              )}
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Linked Issue */}
            {githubInfo && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Linked to{" "}
                    <a
                      href={githubInfo.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {githubInfo.repositoryFullName}#{githubInfo.issueNumber}
                    </a>
                  </span>
                </div>
                <a
                  href={githubInfo.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Pull Requests */}
                {pullRequests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <GitPullRequest className="w-4 h-4" />
                      Pull Requests ({pullRequests.length})
                    </h4>
                    <div className="space-y-2">
                      {pullRequests.map((pr) => (
                        <PRCard key={pr.id} pr={pr} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Commits */}
                {commits.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <GitCommit className="w-4 h-4" />
                      Commits ({commits.length})
                    </h4>
                    <div className="space-y-2">
                      {commits.slice(0, 5).map((commit) => (
                        <CommitCard key={commit.sha} commit={commit} />
                      ))}
                      {commits.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          +{commits.length - 5} more commits
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* No activity */}
                {!hasActivity && !githubInfo && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No GitHub activity linked to this task</p>
                    <p className="text-xs mt-1">
                      Link this task to a GitHub issue or reference it in commits
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function PRCard({ pr }: { pr: GitHubPullRequest }) {
  const getStatusIcon = () => {
    if (pr.merged_at) {
      return <GitMerge className="w-4 h-4 text-purple-500" />;
    }
    if (pr.state === "closed") {
      return <X className="w-4 h-4 text-red-500" />;
    }
    if (pr.draft) {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    return <GitPullRequest className="w-4 h-4 text-green-500" />;
  };

  const getStatusLabel = () => {
    if (pr.merged_at) return "Merged";
    if (pr.state === "closed") return "Closed";
    if (pr.draft) return "Draft";
    return "Open";
  };

  return (
    <a
      href={pr.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
    >
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{pr.title}</span>
          <span className="text-xs text-muted-foreground">#{pr.number}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={cn(
            "px-1.5 py-0.5 rounded-full",
            pr.merged_at && "bg-purple-500/10 text-purple-600",
            pr.state === "closed" && !pr.merged_at && "bg-red-500/10 text-red-600",
            pr.state === "open" && pr.draft && "bg-gray-500/10 text-gray-600",
            pr.state === "open" && !pr.draft && "bg-green-500/10 text-green-600"
          )}>
            {getStatusLabel()}
          </span>
          <span>{pr.head.ref} → {pr.base.ref}</span>
          <span>{formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true })}</span>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

function CommitCard({ commit }: { commit: GitHubCommit }) {
  const message = commit.commit.message.split("\n")[0]; // First line only

  return (
    <a
      href={commit.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
    >
      <GitCommit className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{message}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono">
            {commit.sha.slice(0, 7)}
          </code>
          {commit.author && (
            <span className="flex items-center gap-1">
              <Avatar className="w-4 h-4">
                <AvatarImage src={commit.author.avatar_url} />
                <AvatarFallback className="text-[8px]">
                  {commit.commit.author.name[0]}
                </AvatarFallback>
              </Avatar>
              {commit.author.login}
            </span>
          )}
          <span>
            {formatDistanceToNow(new Date(commit.commit.author.date), { addSuffix: true })}
          </span>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </a>
  );
}
