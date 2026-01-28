"use client";

import { useState, useEffect } from "react";
import {
  Github,
  Plus,
  Loader2,
  ExternalLink,
  Check,
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
  getLinkedRepositoriesForWorkspace,
  createGitHubIssueFromTask,
  getTaskGitHubInfo,
} from "@/lib/actions/github";

interface CreateIssueButtonProps {
  taskId: string;
  workspaceId: string;
  taskTitle: string;
}

interface LinkedRepo {
  id: string;
  name: string;
  fullName: string;
}

export function CreateIssueButton({ 
  taskId, 
  workspaceId,
  taskTitle 
}: CreateIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [linkedRepos, setLinkedRepos] = useState<LinkedRepo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [existingLink, setExistingLink] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, workspaceId, taskId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if task is already linked
      const githubInfo = await getTaskGitHubInfo(taskId);
      setExistingLink(githubInfo);

      // Get linked repos
      const result = await getLinkedRepositoriesForWorkspace(workspaceId);
      const repos = result.repositories.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.fullName,
      }));
      setLinkedRepos(repos);
      
      if (repos.length > 0 && !selectedRepoId) {
        setSelectedRepoId(repos[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedRepoId) {
      toast.error("Please select a repository");
      return;
    }

    setCreating(true);

    try {
      const result = await createGitHubIssueFromTask({
        taskId,
        repositoryId: selectedRepoId,
      });

      if (result.success) {
        toast.success("GitHub issue created successfully!");
        setExistingLink({
          issueNumber: result.issue?.number,
          issueUrl: result.issue?.html_url,
          repositoryFullName: linkedRepos.find(r => r.id === selectedRepoId)?.fullName,
        });
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to create issue");
      }
    } catch (error) {
      toast.error("Failed to create GitHub issue");
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
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Github className="w-4 h-4" />
        <span>{existingLink.repositoryFullName}#{existingLink.issueNumber}</span>
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
        <Github className="w-4 h-4" />
        Create GitHub Issue
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              Create GitHub Issue
            </DialogTitle>
            <DialogDescription>
              Create a new issue in GitHub linked to this task
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : linkedRepos.length === 0 ? (
            <div className="text-center py-6">
              <Github className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No repositories linked to this workspace.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Link a repository first from the dashboard.
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
                  Repository
                </label>
                <Select
                  value={selectedRepoId}
                  onValueChange={setSelectedRepoId}
                >
                  <SelectTrigger>
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
              </div>

              <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                <p>This will create a new issue in the selected repository with:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Title: Task title</li>
                  <li>Description: Task description</li>
                  <li>Label: Task priority</li>
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
              disabled={creating || linkedRepos.length === 0}
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
