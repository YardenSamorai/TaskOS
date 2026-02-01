"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Tag,
  User,
  ArrowLeft,
  Download,
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
  fetchAllIssuesForWorkspace,
  getLinkedRepositoriesForWorkspace,
  importIssuesAsTasks,
} from "@/lib/actions/github";
import { getUserIntegrations } from "@/lib/actions/integration";
import type { GitHubIssue } from "@/lib/github";
import { toast } from "sonner";

type IssueWithRepo = {
  repo: string;
  repoId: string;
  issue: GitHubIssue;
};

export default function GitHubIssuesPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<IssueWithRepo[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");
  const [repoFilter, setRepoFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [repos, setRepos] = useState<Array<{ id: string; name: string; fullName: string | null }>>([]);
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [workspaceId, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reposResult, issuesResult] = await Promise.all([
        getLinkedRepositoriesForWorkspace(workspaceId),
        fetchAllIssuesForWorkspace(workspaceId, filter),
      ]);

      setRepos(reposResult.repositories as any[]);
      setIssues(issuesResult.issues as IssueWithRepo[]);
    } catch (error) {
      console.error("Error loading issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter((item) => {
    if (repoFilter !== "all" && item.repoId !== repoFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.issue.title.toLowerCase().includes(query) ||
        item.issue.body?.toLowerCase().includes(query) ||
        `#${item.issue.number}`.includes(query)
      );
    }
    return true;
  });

  const toggleIssueSelection = (issueId: number) => {
    const newSelection = new Set(selectedIssues);
    if (newSelection.has(issueId)) {
      newSelection.delete(issueId);
    } else {
      newSelection.add(issueId);
    }
    setSelectedIssues(newSelection);
  };

  const handleImportSelected = async () => {
    if (selectedIssues.size === 0) return;

    setImporting(true);
    try {
      // Group by repo
      const issuesByRepo = new Map<string, number[]>();
      filteredIssues
        .filter((item) => selectedIssues.has(item.issue.id))
        .forEach((item) => {
          const existing = issuesByRepo.get(item.repoId) || [];
          issuesByRepo.set(item.repoId, [...existing, item.issue.id]);
        });

      let totalImported = 0;
      for (const [repoId, issueIds] of issuesByRepo) {
        const result = await importIssuesAsTasks({
          workspaceId,
          repositoryId: repoId,
          issueIds,
        });
        if (result.success) {
          totalImported += result.count || 0;
        }
      }

      toast.success(`Imported ${totalImported} issue${totalImported === 1 ? "" : "s"} as tasks`);
      setSelectedIssues(new Set());
    } catch (error) {
      toast.error("Failed to import issues");
    } finally {
      setImporting(false);
    }
  };

  const openCount = issues.filter((i) => i.issue.state === "open").length;
  const closedCount = issues.filter((i) => i.issue.state === "closed").length;

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
            <div className="p-2.5 rounded-xl bg-yellow-500/10">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
            </div>
            Issues
          </h1>
          <p className="text-muted-foreground mt-1">
            {openCount} open, {closedCount} closed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIssues.size > 0 && (
            <Button onClick={handleImportSelected} disabled={importing} className="gap-2">
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Import {selectedIssues.size} as Tasks
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search issues..."
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
              <AlertCircle className="w-3.5 h-3.5" />
              Open
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Closed
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No issues found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {filteredIssues.map((item) => (
                  <IssueRow
                    key={item.issue.id}
                    item={item}
                    selected={selectedIssues.has(item.issue.id)}
                    onSelect={() => toggleIssueSelection(item.issue.id)}
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

function IssueRow({
  item,
  selected,
  onSelect,
}: {
  item: IssueWithRepo;
  selected: boolean;
  onSelect: () => void;
}) {
  const { issue, repo } = item;
  const repoName = repo.split("/")[1];

  return (
    <div
      className={cn(
        "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
        selected && "bg-primary/5"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg shrink-0 mt-0.5",
            issue.state === "open" ? "bg-green-500/10" : "bg-purple-500/10"
          )}
        >
          {issue.state === "open" ? (
            <AlertCircle className="w-4 h-4 text-green-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-sm sm:text-base truncate">{issue.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">{repoName}</span>
                <span>#{issue.number}</span>
                <span>•</span>
                <span>
                  opened {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                </span>
                <span>by</span>
                <span className="flex items-center gap-1">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={issue.user.avatar_url} />
                    <AvatarFallback className="text-[8px]">
                      {issue.user.login[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {issue.user.login}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                window.open(issue.html_url, "_blank");
              }}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {issue.labels.slice(0, 5).map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{
                    borderColor: `#${label.color}50`,
                    backgroundColor: `#${label.color}10`,
                    color: `#${label.color}`,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
              {issue.labels.length > 5 && (
                <span className="text-[10px] text-muted-foreground">
                  +{issue.labels.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Assignees */}
          {issue.assignees.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-muted-foreground mr-1">Assignees:</span>
              <div className="flex -space-x-1">
                {issue.assignees.slice(0, 5).map((assignee) => (
                  <Avatar key={assignee.login} className="w-5 h-5 border-2 border-background">
                    <AvatarImage src={assignee.avatar_url} />
                    <AvatarFallback className="text-[8px]">
                      {assignee.login[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
