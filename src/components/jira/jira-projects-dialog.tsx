"use client";

import { useState, useEffect } from "react";
import {
  Search,
  FolderKanban,
  Loader2,
  ExternalLink,
  Users,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUserJiraProjects } from "@/lib/actions/jira";
import type { JiraProject } from "@/lib/jira";

// Jira icon
const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
  </svg>
);

interface JiraProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSelectProject?: (project: JiraProject) => void;
}

export function JiraProjectsDialog({
  open,
  onOpenChange,
  workspaceId,
  onSelectProject,
}: JiraProjectsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
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
    } catch (err) {
      setError("Failed to fetch Jira projects");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectProject = (project: JiraProject) => {
    onSelectProject?.(project);
    toast.success(`Selected project: ${project.name}`);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <JiraIcon className="w-5 h-5 text-[#0052CC]" />
            Jira Projects
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Select a project to import issues
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0052CC]" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <JiraIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProjects}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-8">
            <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "No projects match your search" : "No projects found"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={() => handleSelectProject(project)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function ProjectCard({
  project,
  onSelect,
}: {
  project: JiraProject;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card",
        "hover:border-[#0052CC]/30 hover:bg-[#0052CC]/5 transition-all cursor-pointer"
      )}
      onClick={onSelect}
    >
      {/* Project Avatar */}
      {project.avatarUrls?.["48x48"] ? (
        <img
          src={project.avatarUrls["48x48"]}
          alt={project.name}
          className="w-10 h-10 rounded"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-[#0052CC]/10 flex items-center justify-center">
          <FolderKanban className="w-5 h-5 text-[#0052CC]" />
        </div>
      )}

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{project.name}</span>
          <Badge variant="secondary" className="text-xs">
            {project.key}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="capitalize">{project.projectTypeKey?.replace("_", " ")}</span>
          {project.isPrivate && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Private
            </span>
          )}
        </div>
      </div>

      {/* Select Button */}
      <Button size="sm" className="bg-[#0052CC] hover:bg-[#0052CC]/90">
        Select
      </Button>
    </div>
  );
}
