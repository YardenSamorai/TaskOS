"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  FolderKanban,
  ExternalLink,
  ClipboardList,
  Bug,
  Sparkles,
  BookOpen,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getUserIntegrations } from "@/lib/actions/integration";
import {
  getUserAzureOrganizations,
  getUserAzureDevOpsProjects,
  getProjectWorkItems,
} from "@/lib/actions/azure-devops";
import { AzureDevOpsProjectsDialog } from "@/components/azure-devops/azure-devops-projects-dialog";
import { ImportWorkItemsDialog } from "@/components/azure-devops/import-work-items-dialog";
import type { AzureDevOpsProject, AzureDevOpsWorkItem } from "@/lib/azure-devops";

interface AzureDevOpsCardProps {
  workspaceId: string;
  onOpenIntegrations?: () => void;
  refreshKey?: number;
}

const workItemTypeIcon: Record<string, React.ReactNode> = {
  Task: <ClipboardList className="w-3.5 h-3.5 text-yellow-500" />,
  Bug: <Bug className="w-3.5 h-3.5 text-red-500" />,
  "User Story": <BookOpen className="w-3.5 h-3.5 text-blue-500" />,
  Feature: <Sparkles className="w-3.5 h-3.5 text-purple-500" />,
  Epic: <Sparkles className="w-3.5 h-3.5 text-orange-500" />,
};

const stateColor: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-600",
  Active: "bg-yellow-500/10 text-yellow-600",
  Resolved: "bg-purple-500/10 text-purple-600",
  Closed: "bg-green-500/10 text-green-600",
};

export function AzureDevOpsCard({
  workspaceId,
  onOpenIntegrations,
  refreshKey = 0,
}: AzureDevOpsCardProps) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [organization, setOrganization] = useState("");
  const [projects, setProjects] = useState<AzureDevOpsProject[]>([]);
  const [recentItems, setRecentItems] = useState<AzureDevOpsWorkItem[]>([]);
  const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    checkConnectionAndFetch();
  }, [workspaceId, refreshKey]);

  const checkConnectionAndFetch = async () => {
    setLoading(true);
    try {
      const integrationsResult = await getUserIntegrations();
      const azureIntegration = integrationsResult.integrations.find(
        (i: any) => i.provider === "azure_devops" && i.isActive
      );

      setConnected(!!azureIntegration);

      if (azureIntegration) {
        const orgResult = await getUserAzureOrganizations();
        if (orgResult.success && orgResult.organizations?.length) {
          const org = orgResult.organizations[0].name;
          setOrganization(org);

          const projResult = await getUserAzureDevOpsProjects(org);
          if (projResult.success && projResult.projects) {
            setProjects(projResult.projects);

            // Fetch recent work items from first project
            if (projResult.projects.length > 0) {
              const itemsResult = await getProjectWorkItems(
                org,
                projResult.projects[0].name,
                { states: ["New", "Active"], maxResults: 8 }
              );
              if (itemsResult.success && itemsResult.workItems) {
                setRecentItems(itemsResult.workItems);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching Azure DevOps data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#0078D4]/10">
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0078D4]" />
            </div>
            Azure DevOps
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex items-center justify-center py-6 sm:py-8">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[#0078D4]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected
  if (!connected) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
            <div className="p-1.5 sm:p-2 rounded-lg bg-[#0078D4]/10">
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0078D4]" />
            </div>
            Azure DevOps
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="text-center py-4 sm:py-6">
            <Cloud className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/30 mb-2 sm:mb-3" />
            <h3 className="font-medium text-sm sm:text-base mb-1">Connect Azure DevOps</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
              Import work items and track progress
            </p>
            <Button
              onClick={onOpenIntegrations}
              size="sm"
              className="text-xs sm:text-sm bg-[#0078D4] hover:bg-[#005A9E]"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected - show projects & recent items
  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base min-w-0 flex-wrap">
              <div className="p-1.5 sm:p-2 rounded-lg bg-[#0078D4]/10 shrink-0">
                <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0078D4]" />
              </div>
              <span>Azure DevOps</span>
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0"
              >
                Connected
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setImportDialogOpen(true)}
                title="Import Work Items"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setProjectsDialogOpen(true)}
                title="Browse Projects"
              >
                <FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={checkConnectionAndFetch}
                title="Refresh"
                disabled={loading}
              >
                <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
            {organization} · {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>

        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 overflow-hidden">
          {recentItems.length === 0 ? (
            <div className="text-center py-4 sm:py-6 text-muted-foreground">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">No active work items</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                className="text-[#0078D4] text-xs sm:text-sm mt-1"
              >
                Import work items
              </Button>
            </div>
          ) : (
            <>
              <div className="h-[200px] sm:h-[260px] overflow-y-auto overflow-x-hidden">
                <div className="space-y-1 sm:space-y-1.5">
                  {recentItems.map((item) => {
                    const fields = item.fields;
                    const type = fields["System.WorkItemType"] || "Task";
                    const state = fields["System.State"] || "New";
                    const title = fields["System.Title"];
                    const assignee = fields["System.AssignedTo"]?.displayName;
                    const iteration = fields["System.IterationPath"];
                    const boardColumn = fields["System.BoardColumn"];
                    const project = fields["System.TeamProject"];

                    const iterationShort = iteration?.includes("\\")
                      ? iteration.split("\\").pop()
                      : iteration;

                    return (
                      <a
                        key={item.id}
                        href={`https://dev.azure.com/${organization}/${project}/_workitems/edit/${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 p-1.5 sm:p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="shrink-0 mt-0.5">
                          {workItemTypeIcon[type] || (
                            <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-foreground group-hover:text-[#0078D4] transition-colors truncate">
                            {title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">#{item.id}</span>
                            {assignee && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                · {assignee}
                              </span>
                            )}
                            {(boardColumn || iterationShort) && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                · {boardColumn || iterationShort}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn("text-[9px] sm:text-[10px] shrink-0", stateColor[state] || "")}
                        >
                          {state}
                        </Badge>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Import
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => setProjectsDialogOpen(true)}
                >
                  <FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Projects
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AzureDevOpsProjectsDialog
        open={projectsDialogOpen}
        onOpenChange={setProjectsDialogOpen}
        workspaceId={workspaceId}
      />
      <ImportWorkItemsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        workspaceId={workspaceId}
        onImportSuccess={checkConnectionAndFetch}
      />
    </>
  );
}
