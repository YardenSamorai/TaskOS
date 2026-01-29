"use client";

import { useState, useEffect } from "react";
import { 
  Github, 
  GitBranch, 
  Cloud, 
  Link2, 
  Check, 
  X, 
  ExternalLink,
  Loader2,
  Settings,
  Trash2,
  RefreshCw,
  Plus,
  AlertCircle
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getUserIntegrations, 
  deleteIntegration, 
  toggleIntegration 
} from "@/lib/actions/integration";
import type { Integration } from "@/lib/db/schema";

interface IntegrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
}

interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  available: boolean;
  comingSoon?: boolean;
  connectUrl?: string;
}

// Jira icon component
const JiraIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
  </svg>
);

const providers: IntegrationProvider[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Connect your GitHub repositories to link commits, PRs, and issues to tasks",
    icon: <Github className="w-6 h-6" />,
    color: "text-[#24292e] dark:text-white",
    bgColor: "bg-[#24292e]/10 dark:bg-white/10",
    available: true,
  },
  {
    id: "jira",
    name: "Jira",
    description: "Import and sync Jira issues with TaskOS tasks for seamless project management",
    icon: <JiraIcon />,
    color: "text-[#0052CC]",
    bgColor: "bg-[#0052CC]/10",
    available: true,
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    description: "Connect Bitbucket repositories for seamless code integration",
    icon: <GitBranch className="w-6 h-6" />,
    color: "text-[#0052CC]",
    bgColor: "bg-[#0052CC]/10",
    available: true,
    comingSoon: true,
  },
  {
    id: "azure_devops",
    name: "Azure DevOps",
    description: "Link Azure DevOps repositories, pipelines, and work items",
    icon: <Cloud className="w-6 h-6" />,
    color: "text-[#0078D4]",
    bgColor: "bg-[#0078D4]/10",
    available: true,
    comingSoon: true,
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Connect GitLab repositories and merge requests",
    icon: <GitBranch className="w-6 h-6" />,
    color: "text-[#FC6D26]",
    bgColor: "bg-[#FC6D26]/10",
    available: true,
    comingSoon: true,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications and updates directly in your Slack channels",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
      </svg>
    ),
    color: "text-[#E01E5A]",
    bgColor: "bg-[#E01E5A]/10",
    available: true,
    comingSoon: true,
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync task deadlines and meetings with Google Calendar",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.5 4H18V3c0-.55-.45-1-1-1s-1 .45-1 1v1H8V3c0-.55-.45-1-1-1s-1 .45-1 1v1H4.5C3.12 4 2 5.12 2 6.5v13C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 5.12 20.88 4 19.5 4zM19 19.5c0 .27-.23.5-.5.5h-13c-.27 0-.5-.23-.5-.5V9h14v10.5zm0-12H5V6.5c0-.27.23-.5.5-.5H6v1c0 .55.45 1 1 1s1-.45 1-1V6h8v1c0 .55.45 1 1 1s1-.45 1-1V6h.5c.27 0 .5.23.5.5V7.5z"/>
        <path d="M10.56 18h.88v-3.48l1.7 1.26.52-.7-2.22-1.66v-.01h-.88V18zm-4-4.7c0 .24.03.46.09.64.06.19.14.35.26.48.11.13.25.24.42.3.17.07.37.1.6.1.2 0 .37-.02.52-.07.15-.05.28-.12.39-.21l.1.21h.78v-2.87h-1.9v.67h1.12v.38c-.12.09-.24.15-.38.19s-.3.06-.49.06c-.23 0-.4-.08-.52-.24-.12-.16-.18-.41-.18-.74 0-.16.02-.3.06-.43.04-.13.1-.24.18-.33.08-.09.18-.16.3-.21.12-.05.26-.07.41-.07.2 0 .37.04.51.12.14.08.27.18.38.32l.6-.5c-.16-.2-.36-.37-.6-.49-.24-.12-.54-.18-.9-.18-.29 0-.55.05-.78.14-.23.1-.42.23-.58.4-.16.17-.28.37-.37.6-.08.23-.13.48-.13.76z"/>
      </svg>
    ),
    color: "text-[#4285F4]",
    bgColor: "bg-[#4285F4]/10",
    available: true,
    comingSoon: true,
  },
];

export const IntegrationsDialog = ({ 
  open, 
  onOpenChange,
  workspaceId 
}: IntegrationsDialogProps) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchIntegrations();
    }
  }, [open, workspaceId]);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const result = await getUserIntegrations(workspaceId);
      if (result.success) {
        setIntegrations(result.integrations);
      }
    } catch (error) {
      console.error("Error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: IntegrationProvider) => {
    if (provider.comingSoon) {
      toast.info(`${provider.name} integration coming soon!`);
      return;
    }

    setConnecting(provider.id);

    // For GitHub, redirect to our API route which handles the OAuth flow
    if (provider.id === "github") {
      const apiUrl = new URL("/api/integrations/github", window.location.origin);
      if (workspaceId) {
        apiUrl.searchParams.set("workspaceId", workspaceId);
      }
      window.location.href = apiUrl.toString();
      return;
    }

    // For Jira, redirect to our API route which handles the OAuth flow
    if (provider.id === "jira") {
      const apiUrl = new URL("/api/integrations/jira", window.location.origin);
      if (workspaceId) {
        apiUrl.searchParams.set("workspaceId", workspaceId);
      }
      window.location.href = apiUrl.toString();
      return;
    }

    setConnecting(null);
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const result = await deleteIntegration(integrationId);
      if (result.success) {
        setIntegrations(integrations.filter(i => i.id !== integrationId));
        toast.success("Integration disconnected");
      } else {
        toast.error(result.error || "Failed to disconnect");
      }
    } catch (error) {
      toast.error("Failed to disconnect integration");
    }
  };

  const handleToggle = async (integrationId: string) => {
    try {
      const result = await toggleIntegration(integrationId);
      if (result.success && result.integration) {
        setIntegrations(integrations.map(i => 
          i.id === integrationId ? result.integration : i
        ));
      }
    } catch (error) {
      toast.error("Failed to toggle integration");
    }
  };

  const getConnectedProvider = (providerId: string) => {
    return integrations.find(i => i.provider === providerId && i.isActive);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <ResponsiveDialogHeader className="p-4 sm:p-6 pb-2">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            Connect Apps
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-xs sm:text-sm">
            Enhance your workflow with powerful integrations
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Tabs defaultValue="available" className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 pb-4 sm:pb-6">
          <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
            <TabsTrigger value="available" className="text-xs sm:text-sm">Available</TabsTrigger>
            <TabsTrigger value="connected" className="text-xs sm:text-sm gap-1.5">
              Connected
              {integrations.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] sm:text-xs">
                  {integrations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="flex-1 overflow-auto mt-3 sm:mt-4 -mx-1 px-1">
            <div className="grid gap-2.5 sm:gap-4">
              {providers.map((provider) => {
                const connected = getConnectedProvider(provider.id);
                
                return (
                  <Card key={provider.id} className={cn(
                    "transition-all overflow-hidden",
                    connected && "border-primary/50 bg-primary/5",
                    !provider.comingSoon && "hover:border-primary/30 hover:shadow-sm"
                  )}>
                    <CardHeader className="p-3 sm:p-4">
                      {/* Mobile: Stack layout */}
                      <div className="flex flex-col xs:flex-row xs:items-start gap-3">
                        {/* Icon + Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0",
                            provider.bgColor,
                            provider.color,
                            "[&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6"
                          )}>
                            {provider.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              {provider.name}
                              {provider.comingSoon && (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                                  Soon
                                </Badge>
                              )}
                              {connected && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] sm:text-xs px-1.5 py-0">
                                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                                  Connected
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-0.5 text-[11px] sm:text-sm line-clamp-2 sm:line-clamp-none">
                              {provider.description}
                            </CardDescription>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <div className="flex xs:block">
                          {connected ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full xs:w-auto h-8 text-xs sm:text-sm"
                              onClick={() => handleDisconnect(connected.id)}
                            >
                              Disconnect
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              className={cn(
                                "w-full xs:w-auto h-8 text-xs sm:text-sm gap-1",
                                provider.comingSoon && "opacity-50"
                              )}
                              onClick={() => handleConnect(provider)}
                              disabled={connecting === provider.id || provider.comingSoon}
                            >
                              {connecting === provider.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Connect
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {connected && connected.providerUsername && (
                      <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">
                            Connected as <span className="font-medium text-foreground">{connected.providerUsername}</span>
                          </span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="connected" className="flex-1 overflow-auto mt-3 sm:mt-4 -mx-1 px-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
              </div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Link2 className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold mb-1 text-sm sm:text-base">No apps connected</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Connect your first app from Available
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-4">
                {integrations.map((integration) => {
                  const provider = providers.find(p => p.id === integration.provider);
                  if (!provider) return null;

                  return (
                    <Card key={integration.id} className="overflow-hidden">
                      <CardContent className="p-3 sm:py-4 sm:px-4">
                        {/* Mobile: Stack layout */}
                        <div className="flex flex-col xs:flex-row xs:items-center gap-3">
                          {/* Icon + Info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                              "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                              provider.bgColor,
                              provider.color,
                              "[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5"
                            )}>
                              {provider.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-sm sm:text-base">{provider.name}</h4>
                              {integration.providerUsername && (
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                  @{integration.providerUsername}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center justify-between xs:justify-end gap-3 border-t xs:border-0 pt-3 xs:pt-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm text-muted-foreground">Active</span>
                              <Switch
                                checked={integration.isActive}
                                onCheckedChange={() => handleToggle(integration.id)}
                                className="scale-90 sm:scale-100"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDisconnect(integration.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {integration.lastSyncAt && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3">
                            Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
