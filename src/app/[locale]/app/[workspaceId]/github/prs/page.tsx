"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  GitPullRequest,
  GitMerge,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  ArrowLeft,
  X,
  GitBranch,
  MessageSquare,
  FileCode,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  fetchAllPullRequestsForWorkspace,
  getLinkedRepositoriesForWorkspace,
} from "@/lib/actions/github";
import type { GitHubPullRequest } from "@/lib/github";

type PRWithRepo = {
  repo: string;
  repoId: string;
  pr: GitHubPullRequest;
};

export default function GitHubPRsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const [loading, setLoading] = useState(true);
  const [prs, setPrs] = useState<PRWithRepo[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");
  const [repoFilter, setRepoFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [repos, setRepos] = useState<Array<{ id: string; name: string; fullName: string | null }>>([]);

  useEffect(() => {
    loadData();
  }, [workspaceId, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reposResult, prsResult] = await Promise.all([
        getLinkedRepositoriesForWorkspace(workspaceId),
        fetchAllPullRequestsForWorkspace(workspaceId, filter),
      ]);

      setRepos(reposResult.repositories as any[]);
      setPrs(prsResult.pullRequests as PRWithRepo[]);
    } catch (error) {
      console.error("Error loading pull requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPRs = prs.filter((item) => {
    if (repoFilter !== "all" && item.repoId !== repoFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.pr.title.toLowerCase().includes(query) ||
        item.pr.body?.toLowerCase().includes(query) ||
        `#${item.pr.number}`.includes(query) ||
        item.pr.head.ref.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const openCount = prs.filter((p) => p.pr.state === "open").length;
  const closedCount = prs.filter((p) => p.pr.state === "closed" && !p.pr.merged_at).length;
  const mergedCount = prs.filter((p) => p.pr.merged_at).length;

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

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="gap-2 -ml-2"
        onClick={() => router.push(`/${locale}/app/${workspaceId}/github`)}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to GitHub
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10">
              <GitPullRequest className="w-6 h-6 text-green-500" />
            </div>
            Pull Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            {openCount} open, {mergedCount} merged, {closedCount} closed
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <GitPullRequest className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <GitMerge className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mergedCount}</p>
              <p className="text-xs text-muted-foreground">Merged</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <X className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{closedCount}</p>
              <p className="text-xs text-muted-foreground">Closed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pull requests..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={repoFilter} onValueChange={setRepoFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All repositories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All repositories</SelectItem>
            {repos.map((repo) => (
              <SelectItem key={repo.id} value={repo.id}>
                {repo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="open" className="gap-1.5">
              <GitPullRequest className="w-3.5 h-3.5" />
              Open
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-1.5">
              <GitMerge className="w-3.5 h-3.5" />
              Merged
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* PRs List */}
      {filteredPRs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitPullRequest className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No pull requests found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {filteredPRs.map((item) => (
                  <PRRow
                    key={item.pr.id}
                    item={item}
                    onClick={() => navigateToPR(item.pr, item.repo)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PRRow({
  item,
  onClick,
}: {
  item: PRWithRepo;
  onClick: () => void;
}) {
  const { pr, repo } = item;
  const repoName = repo.split("/")[1];

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
      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg shrink-0 mt-0.5",
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm sm:text-base group-hover:text-primary transition-colors">
                  {pr.title}
                </h3>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">{repoName}</span>
                <span>#{pr.number}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={pr.user.avatar_url} />
                    <AvatarFallback className="text-[8px]">
                      {pr.user.login[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {pr.user.login}
                </span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true })}</span>
              </div>

              {/* Branch Info */}
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Badge variant="outline" className="font-mono text-[10px] gap-1">
                  <GitBranch className="w-3 h-3" />
                  {pr.head.ref}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="font-mono text-[10px] gap-1">
                  <GitBranch className="w-3 h-3" />
                  {pr.base.ref}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(pr.html_url, "_blank");
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
