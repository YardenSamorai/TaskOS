"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban,
  Download,
  Settings,
  Loader2,
  ExternalLink,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getUserIntegrations } from "@/lib/actions/integration";
import { getUserJiraProjects } from "@/lib/actions/jira";
import { JiraProjectsDialog } from "@/components/jira/jira-projects-dialog";
import { ImportJiraIssuesDialog } from "@/components/jira/import-issues-dialog";
import type { JiraProject } from "@/lib/jira";

// Jira icon
const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
  </svg>
);

interface JiraActivityCardProps {
  workspaceId: string;
  onOpenIntegrations?: () => void;
  refreshKey?: number;
}

export function JiraActivityCard({
  workspaceId,
  onOpenIntegrations,
  refreshKey = 0,
}: JiraActivityCardProps) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [jiraUrl, setJiraUrl] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionAndFetch();
  }, [workspaceId, refreshKey]);

  const checkConnectionAndFetch = async () => {
    setLoading(true);

    try {
      // Check if Jira is connected
      const integrationsResult = await getUserIntegrations();
      const jiraIntegration = integrationsResult.integrations.find(
        (i: any) => i.provider === "jira" && i.isActive
      );

      setConnected(!!jiraIntegration);

      if (jiraIntegration) {
        // Get Jira URL from metadata
        if (jiraIntegration.metadata) {
          try {
            const metadata = JSON.parse(jiraIntegration.metadata as string);
            setJiraUrl(metadata.url);
          } catch {}
        }

        // Fetch projects
        const projectsResult = await getUserJiraProjects();
        if (projectsResult.success && projectsResult.projects) {
          setProjects(projectsResult.projects.slice(0, 5));
        }
      }
    } catch (error) {
      console.error("Error checking Jira connection:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <JiraIcon className="w-5 h-5 text-[#0052CC]" />
            Jira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!connected) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <JiraIcon className="w-5 h-5 text-[#0052CC]" />
            Jira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <JiraIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Connect Jira to import and sync issues
            </p>
            <Button
              onClick={onOpenIntegrations}
              className="bg-[#0052CC] hover:bg-[#0052CC]/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Jira
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <JiraIcon className="w-5 h-5 text-[#0052CC]" />
              Jira
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Connected
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={checkConnectionAndFetch}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setImportDialogOpen(true)}
                title="Import Issues"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setProjectsDialogOpen(true)}
                title="Browse Projects"
              >
                <FolderKanban className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No projects found</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setProjectsDialogOpen(true)}
                className="text-[#0052CC]"
              >
                Browse Projects
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      "hover:bg-muted/50 transition-colors cursor-pointer"
                    )}
                    onClick={() => {
                      if (jiraUrl) {
                        window.open(`${jiraUrl}/browse/${project.key}`, "_blank");
                      }
                    }}
                  >
                    {project.avatarUrls?.["24x24"] ? (
                      <img
                        src={project.avatarUrls["24x24"]}
                        alt={project.name}
                        className="w-6 h-6 rounded"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-[#0052CC]/10 flex items-center justify-center">
                        <JiraIcon className="w-3 h-3 text-[#0052CC]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.key}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setImportDialogOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Import Issues
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setProjectsDialogOpen(true)}
            >
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <JiraProjectsDialog
        open={projectsDialogOpen}
        onOpenChange={setProjectsDialogOpen}
        workspaceId={workspaceId}
        onSelectProject={(project) => {
          setProjectsDialogOpen(false);
          setImportDialogOpen(true);
        }}
      />
      <ImportJiraIssuesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        workspaceId={workspaceId}
        onImportSuccess={checkConnectionAndFetch}
      />
    </>
  );
}
