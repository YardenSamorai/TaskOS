"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Github,
  Search,
  Download,
  AlertCircle,
  Loader2,
  Circle,
  CheckCircle2,
  User,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { taskKeys } from "@/lib/hooks/use-tasks";
import {
  getLinkedRepositoriesForWorkspace,
  fetchRepositoryIssues,
  importIssuesAsTasks,
} from "@/lib/actions/github";
import type { GitHubIssue } from "@/lib/github";

interface ImportIssuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onImportSuccess?: () => void;
}

interface LinkedRepo {
  id: string;
  name: string;
  fullName: string;
}

export function ImportIssuesDialog({
  open,
  onOpenChange,
  workspaceId,
  onImportSuccess,
}: ImportIssuesDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [linkedRepos, setLinkedRepos] = useState<LinkedRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"open" | "closed" | "all">("open");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchLinkedRepos();
    }
  }, [open, workspaceId]);

  useEffect(() => {
    if (selectedRepoId) {
      fetchIssues();
    }
  }, [selectedRepoId, stateFilter]);

  const fetchLinkedRepos = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getLinkedRepositoriesForWorkspace(workspaceId);

      if (result.repositories.length === 0) {
        setError("No repositories linked. Link a repository first.");
        setLoading(false);
        return;
      }

      const repos = result.repositories.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.fullName,
      }));

      setLinkedRepos(repos);
      setSelectedRepoId(repos[0].id);
    } catch (error) {
      console.error("Error fetching linked repos:", error);
      setError("Failed to fetch linked repositories");
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    if (!selectedRepoId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchRepositoryIssues(workspaceId, selectedRepoId, stateFilter);

      if (!result.success) {
        setError(result.error || "Failed to fetch issues");
        return;
      }

      setIssues(result.issues);
      setSelectedIssues(new Set());
    } catch (error) {
      console.error("Error fetching issues:", error);
      setError("Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIssues.size === filteredIssues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(filteredIssues.map((i) => i.id)));
    }
  };

  const handleToggleIssue = (issueId: number) => {
    setSelectedIssues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const handleImport = async () => {
    if (!selectedRepoId || selectedIssues.size === 0) return;

    setImporting(true);

    try {
      const result = await importIssuesAsTasks({
        workspaceId,
        repositoryId: selectedRepoId,
        issueIds: Array.from(selectedIssues),
      });

      if (result.success) {
        toast.success(`Imported ${result.count} issues as tasks`);
        await queryClient.invalidateQueries({ queryKey: taskKeys.all });
        onImportSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to import issues");
      }
    } catch {
      toast.error("Failed to import issues");
    } finally {
      setImporting(false);
    }
  };

  const filteredIssues = issues.filter(
    (issue) =>
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.body?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-[#24292e]/10 dark:bg-white/10">
              <Github className="w-4 h-4" />
            </div>
            Import GitHub Issues
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Select issues to import as tasks
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Repository selector and filters */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedRepoId || ""}
            onValueChange={setSelectedRepoId}
            disabled={linkedRepos.length === 0}
          >
            <SelectTrigger className="w-[220px]">
              <Github className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="Select repository" />
            </SelectTrigger>
            <SelectContent>
              {linkedRepos.map((repo) => (
                <SelectItem key={repo.id} value={repo.id}>
                  {repo.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={stateFilter}
            onValueChange={(v) => setStateFilter(v as typeof stateFilter)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">
                <span className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 text-green-500" />
                  Open
                </span>
              </SelectItem>
              <SelectItem value="closed">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-purple-500" />
                  Closed
                </span>
              </SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Issues list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-10 h-10 mx-auto text-destructive/50 mb-3" />
            <h3 className="font-semibold text-sm mb-1">Error</h3>
            <p className="text-muted-foreground text-xs">{error}</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-12">
            <Github className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold text-sm mb-1">No issues found</h3>
            <p className="text-muted-foreground text-xs">
              {search ? "Try a different search term" : "This repository has no issues"}
            </p>
          </div>
        ) : (
          <>
            {/* Select all */}
            <div className="flex items-center justify-between py-1">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Checkbox
                  checked={selectedIssues.size === filteredIssues.length && filteredIssues.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                Select All ({filteredIssues.length})
              </button>
              {selectedIssues.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedIssues.size} selected
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
              <div className="space-y-2">
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedIssues.has(issue.id)
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/30 hover:bg-muted/50"
                    )}
                    onClick={() => handleToggleIssue(issue.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIssues.has(issue.id)}
                        onCheckedChange={() => handleToggleIssue(issue.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {issue.state === "open" ? (
                              <Circle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            )}
                            <span className="font-medium text-sm">{issue.title}</span>
                            <span className="text-muted-foreground text-xs">#{issue.number}</span>
                          </div>
                          <a
                            href={issue.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {issue.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {issue.labels.map((label) => (
                              <Badge
                                key={label.id}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4"
                                style={{
                                  backgroundColor: `#${label.color}15`,
                                  borderColor: `#${label.color}50`,
                                  color: `#${label.color}`,
                                }}
                              >
                                {label.name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {issue.user.login}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                          </span>
                          {issue.assignees.length > 0 && (
                            <span>
                              Assigned to {issue.assignees.map((a) => a.login).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <ResponsiveDialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIssues.size === 0 || importing}
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Import {selectedIssues.size} Issue{selectedIssues.size !== 1 ? "s" : ""}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
