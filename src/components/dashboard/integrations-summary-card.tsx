"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Link2, Github, Cloud, ExternalLink, Loader2, Plus, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getUserIntegrations } from "@/lib/actions/integration";

const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z" />
  </svg>
);

interface Integration {
  id: string;
  provider: string;
  isActive: boolean;
  displayName?: string | null;
  createdAt: string | Date;
}

const PROVIDERS = [
  { key: "github", label: "GitHub", icon: <Github className="w-3.5 h-3.5" /> },
  { key: "jira", label: "Jira", icon: <JiraIcon className="w-3.5 h-3.5" /> },
  { key: "azure_devops", label: "Azure", icon: <Cloud className="w-3.5 h-3.5" /> },
] as const;

type ProviderKey = (typeof PROVIDERS)[number]["key"];

interface IntegrationsSummaryCardProps {
  workspaceId: string;
  onOpenIntegrations: () => void;
  onImport?: (provider: ProviderKey) => void;
}

export const IntegrationsSummaryCard = ({
  workspaceId,
  onOpenIntegrations,
  onImport,
}: IntegrationsSummaryCardProps) => {
  const params = useParams();
  const locale = params.locale as string;

  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integrations", workspaceId],
    queryFn: async () => {
      const result = await getUserIntegrations(workspaceId);
      if (!result.success) return [];
      return (result.integrations || []) as Integration[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const connectedProviders = useMemo(() => {
    const connected = PROVIDERS.filter((p) =>
      integrations.some((i) => i.provider === p.key && i.isActive)
    );
    if (connected.length > 0 && !activeTab) {
      setActiveTab(connected[0].key);
    }
    return connected;
  }, [integrations, activeTab]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (connectedProviders.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Connect your tools for a unified workflow
            </p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenIntegrations}>
              <Plus className="w-3.5 h-3.5" />
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeIntegration = integrations.find(
    (i) => i.provider === activeTab && i.isActive
  );

  return (
    <Card>
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            Integrations
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onOpenIntegrations}
          >
            Manage
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-3 border-b">
          {connectedProviders.map((p) => (
            <button
              key={p.key}
              onClick={() => setActiveTab(p.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                activeTab === p.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeIntegration ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Connected
                </Badge>
                {activeIntegration.displayName && (
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {activeIntegration.displayName}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === "github" && "Sync commits, PRs, and issues from GitHub."}
              {activeTab === "jira" && "Import and track Jira issues alongside your tasks."}
              {activeTab === "azure_devops" && "Sync work items from Azure DevOps boards."}
            </p>
            {onImport && activeTab && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 h-8 text-xs"
                onClick={() => onImport(activeTab as ProviderKey)}
              >
                <Download className="w-3.5 h-3.5" />
                Import {activeTab === "github" ? "Issues" : activeTab === "jira" ? "Issues" : "Work Items"}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            Select an integration tab to view details.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
