"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getUserJiraProjects,
  createJiraIssueFromTask,
  getTaskJiraInfo,
} from "@/lib/actions/jira";
import type { JiraProject } from "@/lib/jira";

// Jira icon
const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
  </svg>
);

interface CreateJiraIssueButtonProps {
  taskId: string;
  taskTitle: string;
}

export function CreateJiraIssueButton({ 
  taskId, 
  taskTitle 
}: CreateJiraIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>("");
  const [existingLink, setExistingLink] = useState<{
    issueKey: string;
    issueUrl: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, taskId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if task is already linked
      const jiraInfo = await getTaskJiraInfo(taskId);
      if (jiraInfo.success && jiraInfo.jiraInfo) {
        setExistingLink({
          issueKey: jiraInfo.jiraInfo.issueKey,
          issueUrl: jiraInfo.jiraInfo.issueUrl,
        });
      }

      // Get projects
      const result = await getUserJiraProjects();
      if (result.success && result.projects) {
        setProjects(result.projects);
        if (result.projects.length > 0 && !selectedProjectKey) {
          setSelectedProjectKey(result.projects[0].key);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedProjectKey) {
      toast.error("Please select a project");
      return;
    }

    setCreating(true);

    try {
      const result = await createJiraIssueFromTask({
        taskId,
        projectKey: selectedProjectKey,
      });

      if (result.success && result.issue) {
        toast.success("Jira issue created successfully!");
        setExistingLink({
          issueKey: result.issue.key,
          issueUrl: result.issue.url,
        });
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to create issue");
      }
    } catch (error) {
      toast.error("Failed to create Jira issue");
    } finally {
      setCreating(false);
    }
  };

  // If already linked, show the link
  if (existingLink) {
    return (
      <a
        href={existingLink.issueUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-[#0052CC] hover:underline"
      >
        <JiraIcon className="w-4 h-4" />
        <span>{existingLink.issueKey}</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <JiraIcon className="w-4 h-4 text-[#0052CC]" />
        Create Jira Issue
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <JiraIcon className="w-5 h-5 text-[#0052CC]" />
              Create Jira Issue
            </DialogTitle>
            <DialogDescription>
              Create a new issue in Jira linked to this task
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-6">
              <JiraIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No Jira projects found.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Make sure you have access to at least one project.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Task
                </label>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {taskTitle}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Jira Project
                </label>
                <Select
                  value={selectedProjectKey}
                  onValueChange={setSelectedProjectKey}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.key}>
                        <div className="flex items-center gap-2">
                          {project.avatarUrls?.["16x16"] && (
                            <img
                              src={project.avatarUrls["16x16"]}
                              alt=""
                              className="w-4 h-4 rounded"
                            />
                          )}
                          {project.name} ({project.key})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                <p>This will create a new issue in the selected project with:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Title: Task title</li>
                  <li>Description: Task description</li>
                  <li>Type: Task</li>
                  <li>Priority: Mapped from task priority</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || projects.length === 0}
              className="bg-[#0052CC] hover:bg-[#0052CC]/90"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
