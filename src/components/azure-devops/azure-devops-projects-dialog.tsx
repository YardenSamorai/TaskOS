"use client";

import { useState, useEffect } from "react";
import {
  Search,
  FolderKanban,
  Loader2,
  ExternalLink,
  Cloud,
  Building2,
} from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getUserAzureOrganizations,
  getUserAzureDevOpsProjects,
} from "@/lib/actions/azure-devops";
import type { AzureDevOpsProject } from "@/lib/azure-devops";

interface AzureDevOpsProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSelectProject?: (organization: string, project: AzureDevOpsProject) => void;
}

export function AzureDevOpsProjectsDialog({
  open,
  onOpenChange,
  workspaceId,
  onSelectProject,
}: AzureDevOpsProjectsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<
    { id: string; name: string; uri: string }[]
  >([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [projects, setProjects] = useState<AzureDevOpsProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      loadOrganizations();
    }
  }, [open]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const result = await getUserAzureOrganizations();
      if (result.success && result.organizations) {
        setOrganizations(result.organizations);
        if (result.organizations.length === 1) {
          setSelectedOrg(result.organizations[0].name);
          loadProjects(result.organizations[0].name);
        }
      } else {
        toast.error(result.error || "Failed to load organizations");
      }
    } catch {
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async (org: string) => {
    setLoadingProjects(true);
    setSelectedOrg(org);
    try {
      const result = await getUserAzureDevOpsProjects(org);
      if (result.success && result.projects) {
        setProjects(result.projects);
      } else {
        toast.error(result.error || "Failed to load projects");
      }
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <ResponsiveDialogHeader className="p-4 sm:p-6 pb-2">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-[#0078D4]/10">
              <Cloud className="w-4 h-4 text-[#0078D4]" />
            </div>
            Azure DevOps Projects
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-sm">
            {selectedOrg
              ? `Projects in ${selectedOrg}`
              : "Select an organization to view projects"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 pb-4 sm:pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedOrg && organizations.length > 1 ? (
            /* Organization selection */
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Select an organization:
              </p>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => loadProjects(org.name)}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0078D4]/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#0078D4]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{org.name}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Projects list */
            <>
              {organizations.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-2 w-fit text-xs"
                  onClick={() => {
                    setSelectedOrg(null);
                    setProjects([]);
                  }}
                >
                  ← Back to organizations
                </Button>
              )}

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loadingProjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "No projects match your search" : "No projects found"}
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 -mx-1 px-1">
                  <div className="space-y-2">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-[#0078D4]/30 transition-colors text-left"
                        onClick={() => {
                          if (selectedOrg && onSelectProject) {
                            onSelectProject(selectedOrg, project);
                          }
                          onOpenChange(false);
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#0078D4]/10 flex items-center justify-center shrink-0">
                          <FolderKanban className="w-5 h-5 text-[#0078D4]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{project.name}</p>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="secondary"
                            className="text-[10px] capitalize"
                          >
                            {project.state}
                          </Badge>
                          <a
                            href={`https://dev.azure.com/${selectedOrg}/${project.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
