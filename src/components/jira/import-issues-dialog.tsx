"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Loader2,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Filter,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getUserJiraProjects,
  getProjectIssues,
  importJiraIssuesAsTasks,
} from "@/lib/actions/jira";
import type { JiraProject, JiraIssue } from "@/lib/jira";

// Jira icon
const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
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
  const [step, setStep] = useState<"projects" | "issues">("projects");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  
  // Projects
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  
  // Issues
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
      fetchProjects();
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "issues" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-1"
                onClick={() => setStep("projects")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <JiraIcon className="w-5 h-5 text-[#0052CC]" />
            {step === "projects" ? "Select Jira Project" : `Import from ${selectedProject?.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === "projects"
              ? "Choose a project to import issues from"
              : "Select issues to import as TaskOS tasks"}
          </DialogDescription>
        </DialogHeader>

        {step === "projects" ? (
          <>
            {/* Project Search */}
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0052CC]" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500/50 mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border bg-card",
                        "hover:border-[#0052CC]/30 hover:bg-[#0052CC]/5 transition-all cursor-pointer"
                      )}
                      onClick={() => handleSelectProject(project)}
                    >
                      {project.avatarUrls?.["32x32"] ? (
                        <img
                          src={project.avatarUrls["32x32"]}
                          alt={project.name}
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[#0052CC]/10 flex items-center justify-center">
                          <JiraIcon className="w-4 h-4 text-[#0052CC]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{project.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {project.key}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        ) : (
          <>
            {/* Issue Filters */}
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
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">To Do</SelectItem>
                  <SelectItem value="indeterminate">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between py-2 border-b">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {selectedIssues.size === filteredIssues.length && filteredIssues.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-[#0052CC]" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select All ({filteredIssues.length})
              </button>
              <Badge variant="secondary">
                {selectedIssues.size} selected
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#0052CC]" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500/50 mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-8">
                <JiraIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No issues found</p>
              </div>
            ) : (
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-2">
                  {filteredIssues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      selected={selectedIssues.has(issue.key)}
                      onToggle={() => handleToggleIssue(issue.key)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedIssues.size === 0 || importing}
                className="bg-[#0052CC] hover:bg-[#0052CC]/90"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Import {selectedIssues.size} Issue{selectedIssues.size !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IssueCard({
  issue,
  selected,
  onToggle,
}: {
  issue: JiraIssue;
  selected: boolean;
  onToggle: () => void;
}) {
  const statusColor = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    indeterminate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  }[issue.fields.status.statusCategory.key] || "bg-gray-100 text-gray-700";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
        selected
          ? "border-[#0052CC] bg-[#0052CC]/5"
          : "border-border hover:border-[#0052CC]/30"
      )}
      onClick={onToggle}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="mt-1"
      />

      {/* Issue Type Icon */}
      {issue.fields.issuetype.iconUrl && (
        <img
          src={issue.fields.issuetype.iconUrl}
          alt={issue.fields.issuetype.name}
          className="w-4 h-4 mt-1"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground">
            {issue.key}
          </span>
          <Badge className={cn("text-xs", statusColor)}>
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
        <p className="font-medium mt-1 line-clamp-2">{issue.fields.summary}</p>
        
        {issue.fields.assignee && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <img
              src={issue.fields.assignee.avatarUrls["24x24"]}
              alt={issue.fields.assignee.displayName}
              className="w-4 h-4 rounded-full"
            />
            <span>{issue.fields.assignee.displayName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
