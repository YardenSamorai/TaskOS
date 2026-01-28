"use client";

import { useState, useEffect } from "react";
import {
  Github,
  Search,
  Download,
  AlertCircle,
  Loader2,
  Check,
  Circle,
  CheckCircle2,
  Tag,
  User,
  Calendar,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
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
      setSelectedIssues(new Set(filteredIssues.map(i => i.id)));
    }
  };

  const handleToggleIssue = (issueId: number) => {
    setSelectedIssues(prev => {
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
        onImportSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to import issues");
      }
    } catch (error) {
      toast.error("Failed to import issues");
    } finally {
      setImporting(false);
    }
  };

  const filteredIssues = issues.filter(issue =>
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.body?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Import GitHub Issues
          </DialogTitle>
          <DialogDescription>
            Select issues to import as tasks in this workspace
          </DialogDescription>
        </DialogHeader>

        {/* Repository selector and filters */}
        <div className="flex flex-wrap gap-3">
          <Select
            value={selectedRepoId || ""}
            onValueChange={setSelectedRepoId}
            disabled={linkedRepos.length === 0}
          >
            <SelectTrigger className="w-[250px]">
              <Github className="w-4 h-4 mr-2" />
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
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">
                <span className="flex items-center gap-2">
                  <Circle className="w-3 h-3 text-green-500" />
                  Open
                </span>
              </SelectItem>
              <SelectItem value="closed">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-purple-500" />
                  Closed
                </span>
              </SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive/50 mb-4" />
            <h3 className="font-semibold mb-1">Error</h3>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Github className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-1">No issues found</h3>
            <p className="text-muted-foreground text-sm">
              {search ? "Try a different search term" : "This repository has no issues"}
            </p>
          </div>
        ) : (
          <>
            {/* Select all header */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIssues.size === filteredIssues.length && filteredIssues.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIssues.size} of {filteredIssues.length} selected
                </span>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
              <div className="space-y-2 py-2">
                {filteredIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    selected={selectedIssues.has(issue.id)}
                    onToggle={() => handleToggleIssue(issue.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="border-t pt-4">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface IssueCardProps {
  issue: GitHubIssue;
  selected: boolean;
  onToggle: () => void;
}

function IssueCard({ issue, selected, onToggle }: IssueCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all",
        selected ? "border-primary bg-primary/5" : "hover:border-primary/30"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              {issue.state === "open" ? (
                <Circle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
              )}
              <span className="font-medium">{issue.title}</span>
              <span className="text-muted-foreground text-sm">#{issue.number}</span>
            </div>
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {issue.labels.map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="text-xs"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    borderColor: `#${label.color}`,
                    color: `#${label.color}`,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {issue.user.login}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
            </span>
            {issue.assignees.length > 0 && (
              <span className="flex items-center gap-1">
                Assigned to {issue.assignees.map(a => a.login).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
