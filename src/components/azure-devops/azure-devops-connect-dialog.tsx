"use client";

import { useState } from "react";
import {
  Cloud,
  Key,
  Building2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AzureDevOpsConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  onConnected?: () => void;
}

export function AzureDevOpsConnectDialog({
  open,
  onOpenChange,
  workspaceId,
  onConnected,
}: AzureDevOpsConnectDialogProps) {
  const [organization, setOrganization] = useState("");
  const [pat, setPat] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!organization.trim() || !pat.trim()) {
      setError("Both fields are required");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations/azure-devops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pat: pat.trim(),
          organization: organization.trim(),
          workspaceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      toast.success(
        `Connected to Azure DevOps as ${data.displayName || data.organization}!`
      );
      setPat("");
      setOrganization("");
      onOpenChange(false);
      onConnected?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md p-0 overflow-hidden">
       <div className="dialog-flush">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0078D4] to-[#005A9E] p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <ResponsiveDialogHeader className="p-0">
                <ResponsiveDialogTitle className="text-lg font-bold text-white">
                  Connect Azure DevOps
                </ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <ResponsiveDialogDescription className="text-white/70 text-sm mt-0.5">
                Use a Personal Access Token (PAT) to connect
              </ResponsiveDialogDescription>
            </div>
          </div>
        </div>

        <ResponsiveDialogBody className="p-5 space-y-4">
          {/* How to get PAT */}
          <div className="bg-muted/50 rounded-lg p-3 border text-xs space-y-1.5">
            <p className="font-medium text-sm flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#0078D4]" />
              How to create a PAT:
            </p>
            <ol className="space-y-1 text-muted-foreground ml-5">
              <li>1. Open Azure DevOps → click your avatar (top right)</li>
              <li>2. Select <strong className="text-foreground">Personal access tokens</strong></li>
              <li>3. Click <strong className="text-foreground">New Token</strong> → set scope to <strong className="text-foreground">Full access</strong></li>
              <li>4. Copy the token and paste below</li>
            </ol>
            <a
              href="https://dev.azure.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#0078D4] hover:underline font-medium mt-1"
            >
              Open Azure DevOps <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Organization */}
          <div className="space-y-1.5">
            <Label htmlFor="org" className="text-sm font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Organization Name
            </Label>
            <Input
              id="org"
              placeholder="my-organization"
              value={organization}
              onChange={(e) => {
                setOrganization(e.target.value);
                setError(null);
              }}
              className="h-9"
            />
            <div className="bg-muted/50 rounded-md p-2.5 border border-dashed space-y-1">
              <p className="text-[11px] text-muted-foreground">
                Find your organization name from the URL after signing in:
              </p>
              <div className="flex items-center gap-1 bg-background rounded px-2 py-1 border font-mono text-xs">
                <span className="text-muted-foreground">https://dev.azure.com/</span>
                <span className="text-[#0078D4] font-bold">{organization || "your-org"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Go to{" "}
                <a
                  href="https://dev.azure.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0078D4] hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  dev.azure.com <ExternalLink className="w-2.5 h-2.5" />
                </a>
                {" "}→ sign in → copy the name from the URL bar
              </p>
            </div>
          </div>

          {/* PAT */}
          <div className="space-y-1.5">
            <Label htmlFor="pat" className="text-sm font-medium flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              Personal Access Token
            </Label>
            <Input
              id="pat"
              type="password"
              placeholder="Paste your PAT here..."
              value={pat}
              onChange={(e) => {
                setPat(e.target.value);
                setError(null);
              }}
              className="h-9 font-mono text-xs"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Connect Button */}
          <Button
            className="w-full gap-2 bg-[#0078D4] hover:bg-[#005A9E]"
            onClick={handleConnect}
            disabled={connecting || !organization.trim() || !pat.trim()}
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Connect
              </>
            )}
          </Button>
        </ResponsiveDialogBody>
       </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
