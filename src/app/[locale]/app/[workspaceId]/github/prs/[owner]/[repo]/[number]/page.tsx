"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  GitPullRequest,
  GitMerge,
  GitBranch,
  ExternalLink,
  Copy,
  Check,
  Clock,
  User,
  Loader2,
  X,
  MessageSquare,
  FileCode,
  ChevronRight,
  ArrowRight,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { fetchPullRequestDetails } from "@/lib/actions/github";
import type { GitHubPullRequest, GitHubRepo } from "@/lib/github";
import { toast } from "sonner";

export default function PRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;
  const owner = params.owner as string;
  const repo = params.repo as string;
  const number = parseInt(params.number as string);

  const [loading, setLoading] = useState(true);
  const [pr, setPR] = useState<GitHubPullRequest | null>(null);
  const [repository, setRepository] = useState<GitHubRepo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPRDetails();
  }, [owner, repo, number]);

  const loadPRDetails = async () => {
    setLoading(true);
    try {
      const result = await fetchPullRequestDetails({ owner, repo, number });
      if (result.success && result.pullRequest) {
        setPR(result.pullRequest);
        setRepository(result.repository || null);
      }
    } catch (error) {
      console.error("Error loading PR:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <GitPullRequest className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">Pull request not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const getIcon = () => {
    if (pr.merged_at) return <GitMerge className="w-6 h-6 text-purple-500" />;
    if (pr.state === "closed") return <X className="w-6 h-6 text-red-500" />;
    return <GitPullRequest className="w-6 h-6 text-green-500" />;
  };

  const getStatusBadge = () => {
    if (pr.merged_at)
      return (
        <Badge className="bg-purple-500 text-white">
          <GitMerge className="w-3 h-3 mr-1" />
          Merged
        </Badge>
      );
    if (pr.state === "closed")
      return (
        <Badge variant="destructive">
          <X className="w-3 h-3 mr-1" />
          Closed
        </Badge>
      );
    if (pr.draft)
      return (
        <Badge variant="outline">
          Draft
        </Badge>
      );
    return (
      <Badge className="bg-green-500 text-white">
        <GitPullRequest className="w-3 h-3 mr-1" />
        Open
      </Badge>
    );
  };

  const getStatusColor = () => {
    if (pr.merged_at) return "bg-purple-500/10";
    if (pr.state === "closed") return "bg-red-500/10";
    return "bg-green-500/10";
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="gap-2 -ml-2"
        onClick={() => router.push(`/${locale}/app/${workspaceId}/github/prs`)}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Pull Requests
      </Button>

      {/* PR Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={cn("p-3 rounded-xl shrink-0", getStatusColor())}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">{pr.title}</h1>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground flex-wrap">
              <span>#{pr.number}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={pr.user.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {pr.user.login[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{pr.user.login}</span>
              </span>
              <span>wants to merge into</span>
            </div>
          </div>
        </div>

        {/* Branch Info */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs gap-1.5 px-3 py-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            {pr.head.ref}
          </Badge>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <Badge variant="outline" className="font-mono text-xs gap-1.5 px-3 py-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            {pr.base.ref}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </a>
          </Button>

          {repository && (
            <Badge variant="secondary" className="gap-1">
              {repository.full_name}
            </Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-sm font-medium">
                  {formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {pr.merged_at && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <GitMerge className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Merged</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(pr.merged_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Head SHA</p>
                <code className="text-xs font-mono">{pr.head.sha.slice(0, 7)}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Body */}
      {pr.body && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">{pr.body}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mergeable State */}
      {pr.state === "open" && pr.mergeable_state && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  pr.mergeable_state === "clean"
                    ? "bg-green-500/10"
                    : pr.mergeable_state === "blocked"
                    ? "bg-red-500/10"
                    : "bg-yellow-500/10"
                )}
              >
                {pr.mergeable_state === "clean" ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : pr.mergeable_state === "blocked" ? (
                  <X className="w-4 h-4 text-red-500" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {pr.mergeable_state === "clean"
                    ? "Ready to merge"
                    : pr.mergeable_state === "blocked"
                    ? "Merge blocked"
                    : `Merge status: ${pr.mergeable_state}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pr.mergeable_state === "clean"
                    ? "All checks have passed and this PR can be merged"
                    : pr.mergeable_state === "blocked"
                    ? "This PR cannot be merged yet"
                    : "Check GitHub for more details"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
