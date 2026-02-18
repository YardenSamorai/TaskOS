"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Download,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Filter,
  RefreshCw,
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
import { taskKeys } from "@/lib/hooks/use-tasks";
import {
  getUserJiraProjects,
  getProjectIssues,
  importJiraIssuesAsTasks,
} from "@/lib/actions/jira";
import type { JiraProject, JiraIssue } from "@/lib/jira";

const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z" />
  </svg>
);

interface ImportIssuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onImportSuccess?: () => void;
}

export function ImportJiraIssuesDialog({
  open,
  onOpenChange,
  workspaceId,
  onImportSuccess,
}: ImportIssuesDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"projects" | "issues">("projects");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [projectSearch, setProjectSearch] = useState("");

  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [issueSearch, setIssueSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("projects");
      setSelectedProject(null);
      setSelectedIssues(new Set());
      setIssues([]);
      setError(null);
      fetchProjects();
    }
  }, [open]);

  const handleRefreshIssues = () => {
    if (selectedProject) {
      fetchIssues(selectedProject);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getUserJiraProjects();
      if (result.success && result.projects) {
        setProjects(result.projects);
      } else {
        setError(result.error || "Failed to fetch projects");
      }
    } catch {
      setError("Failed to fetch Jira projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async (project: JiraProject) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getProjectIssues(project.key, { maxResults: 100 });
      if (result.success && result.issues) {
        setIssues(result.issues);
      } else {
        setError(result.error || "Failed to fetch issues");
      }
    } catch {
      setError("Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (project: JiraProject) => {
    setSelectedProject(project);
    setStep("issues");
    fetchIssues(project);
  };

  const handleToggleIssue = (issueKey: string) => {
    setSelectedIssues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(issueKey)) {
        newSet.delete(issueKey);
      } else {
        newSet.add(issueKey);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIssues.size === filteredIssues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(filteredIssues.map((i) => i.key)));
    }
  };

  const handleImport = async () => {
    if (!selectedProject || selectedIssues.size === 0) return;

    setImporting(true);

    try {
      const result = await importJiraIssuesAsTasks({
        workspaceId,
        projectKey: selectedProject.key,
        issueKeys: Array.from(selectedIssues),
      });

      if (result.success) {
        toast.success(`Imported ${result.imported} issues as tasks!`);
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

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.key.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.fields.summary.toLowerCase().includes(issueSearch.toLowerCase()) ||
      issue.key.toLowerCase().includes(issueSearch.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      issue.fields.status.statusCategory.key === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusColor: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    indeterminate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg">
            {step === "issues" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-1"
                onClick={() => setStep("projects")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="p-2 rounded-lg bg-[#0052CC]/10">
              <JiraIcon className="w-4 h-4 text-[#0052CC]" />
            </div>
            {step === "projects" ? "Import from Jira" : `Import from ${selectedProject?.name}`}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {step === "projects"
              ? "Choose a project to import issues from"
              : "Select issues to import as tasks"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {step === "projects" ? (
          <div className="flex-1 flex flex-col overflow-hidden gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-10 h-10 mx-auto text-destructive/50 mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-colors text-left"
                      onClick={() => handleSelectProject(project)}
                    >
                      {project.avatarUrls?.["32x32"] ? (
                        <img
                          src={project.avatarUrls["32x32"]}
                          alt={project.name}
                          className="w-9 h-9 rounded-lg"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#0052CC]/10 flex items-center justify-center shrink-0">
                          <JiraIcon className="w-4 h-4 text-[#0052CC]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{project.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {project.key}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredProjects.length === 0 && (
                    <div className="text-center py-12">
                      <JiraIcon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No projects found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden gap-3">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={issueSearch}
                  onChange={(e) => setIssueSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">To Do</SelectItem>
                  <SelectItem value="indeterminate">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={handleRefreshIssues}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            </div>

            {/* Select All */}
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

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-10 h-10 mx-auto text-destructive/50 mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <JiraIcon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No issues found</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        selectedIssues.has(issue.key)
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/30 hover:bg-muted/50"
                      )}
                      onClick={() => handleToggleIssue(issue.key)}
                    >
                      <Checkbox
                        checked={selectedIssues.has(issue.key)}
                        onCheckedChange={() => handleToggleIssue(issue.key)}
                        className="mt-0.5"
                      />
                      {issue.fields.issuetype.iconUrl && (
                        <img
                          src={issue.fields.issuetype.iconUrl}
                          alt={issue.fields.issuetype.name}
                          className="w-4 h-4 mt-0.5 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">
                            {issue.key}
                          </span>
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 border-0",
                              statusColor[issue.fields.status.statusCategory.key] || "bg-gray-100 text-gray-700"
                            )}
                          >
                            {issue.fields.status.name}
                          </Badge>
                          {issue.fields.priority && (
                            <img
                              src={issue.fields.priority.iconUrl}
                              alt={issue.fields.priority.name}
                              className="w-4 h-4"
                              title={issue.fields.priority.name}
                            />
                          )}
                        </div>
                        <p className="font-medium text-sm mt-1 line-clamp-2">
                          {issue.fields.summary}
                        </p>
                        {issue.fields.assignee && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                            <img
                              src={issue.fields.assignee.avatarUrls["48x48"]}
                              alt={issue.fields.assignee.displayName}
                              className="w-4 h-4 rounded-full"
                            />
                            <span>{issue.fields.assignee.displayName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
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
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
