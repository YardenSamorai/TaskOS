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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

    // For GitHub, redirect to OAuth
    if (provider.id === "github") {
      const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
      if (!clientId) {
        toast.error("GitHub integration not configured");
        setConnecting(null);
        return;
      }

      const redirectUri = `${window.location.origin}/api/integrations/github/callback`;
      const scope = "repo,read:user";
      const state = workspaceId || "global";
      
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
      
      window.location.href = authUrl;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Connect Apps
          </DialogTitle>
          <DialogDescription>
            Connect your favorite tools and services to enhance your workflow
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="available" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="connected">
              Connected
              {integrations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {integrations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="flex-1 overflow-auto mt-4">
            <div className="grid gap-4">
              {providers.map((provider) => {
                const connected = getConnectedProvider(provider.id);
                
                return (
                  <Card key={provider.id} className={cn(
                    "transition-all",
                    connected && "border-primary/50 bg-primary/5"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            provider.bgColor,
                            provider.color
                          )}>
                            {provider.icon}
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {provider.name}
                              {provider.comingSoon && (
                                <Badge variant="secondary" className="text-xs">
                                  Coming Soon
                                </Badge>
                              )}
                              {connected && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                  <Check className="w-3 h-3 mr-1" />
                                  Connected
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {provider.description}
                            </CardDescription>
                          </div>
                        </div>
                        
                        {connected ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDisconnect(connected.id)}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button 
                            size="sm"
                            onClick={() => handleConnect(provider)}
                            disabled={connecting === provider.id}
                          >
                            {connecting === provider.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Connect
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    
                    {connected && connected.providerUsername && (
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-emerald-500" />
                          Connected as <span className="font-medium text-foreground">{connected.providerUsername}</span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="connected" className="flex-1 overflow-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-12">
                <Link2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">No integrations connected</h3>
                <p className="text-muted-foreground text-sm">
                  Connect your first app from the Available tab
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {integrations.map((integration) => {
                  const provider = providers.find(p => p.id === integration.provider);
                  if (!provider) return null;

                  return (
                    <Card key={integration.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              provider.bgColor,
                              provider.color
                            )}>
                              {provider.icon}
                            </div>
                            <div>
                              <h4 className="font-medium">{provider.name}</h4>
                              {integration.providerUsername && (
                                <p className="text-sm text-muted-foreground">
                                  @{integration.providerUsername}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Active</span>
                              <Switch
                                checked={integration.isActive}
                                onCheckedChange={() => handleToggle(integration.id)}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDisconnect(integration.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {integration.lastSyncAt && (
                          <p className="text-xs text-muted-foreground mt-3">
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
      </DialogContent>
    </Dialog>
  );
};
