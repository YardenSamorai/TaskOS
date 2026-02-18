"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Copy,
  Check,
  RefreshCw,
  Link2,
  Mail,
  Share2,
  Loader2,
  UserPlus,
  Send,
} from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { regenerateInviteCode } from "@/lib/actions/workspace";
import { createInvitation } from "@/lib/actions/invitation";
import { useWorkspaces, useWorkspace } from "@/lib/hooks/use-workspaces";

interface InviteMembersDialogProps {
  workspaceId: string;
  workspaceName: string;
  inviteCode: string | null;
  canManage: boolean;
  children: React.ReactNode;
  onInviteCodeRegenerated?: (newCode: string) => void;
  onInvitationSent?: () => void;
}

export const InviteMembersDialog = ({
  workspaceId: initialWorkspaceId,
  workspaceName: initialWorkspaceName,
  inviteCode: initialInviteCode,
  canManage,
  children,
  onInviteCodeRegenerated,
  onInvitationSent,
}: InviteMembersDialogProps) => {
  const params = useParams();
  const locale = params.locale as string;

  const { data: allWorkspaces = [] } = useWorkspaces();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialWorkspaceId);

  // Only show workspaces where user is owner or admin
  const manageableWorkspaces = useMemo(
    () => allWorkspaces.filter((ws: any) => ws.role === "owner" || ws.role === "admin"),
    [allWorkspaces]
  );

  // Fetch full details for the selected workspace (for inviteCode)
  const { data: selectedWsData } = useWorkspace(selectedWorkspaceId);

  const isCurrentWorkspace = selectedWorkspaceId === initialWorkspaceId;
  const activeWorkspaceName = isCurrentWorkspace
    ? initialWorkspaceName
    : (selectedWsData?.workspace?.name || manageableWorkspaces.find((ws: any) => ws.id === selectedWorkspaceId)?.name || "");
  const activeInviteCode = isCurrentWorkspace
    ? initialInviteCode
    : (selectedWsData?.workspace?.inviteCode || null);

  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState(activeInviteCode);

  // Sync invite code when selected workspace changes
  useEffect(() => {
    setCurrentInviteCode(activeInviteCode);
  }, [activeInviteCode]);

  // Email invitation state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [isSending, setIsSending] = useState(false);
  const [open, setOpen] = useState(false);

  const inviteLink =
    typeof window !== "undefined" && currentInviteCode
      ? `${window.location.origin}/${locale}/app/join/${currentInviteCode}`
      : "";

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleRegenerateCode = async () => {
    if (!canManage) return;

    setIsRegenerating(true);
    try {
      const result = await regenerateInviteCode(selectedWorkspaceId);
      if (result.success && result.inviteCode) {
        setCurrentInviteCode(result.inviteCode);
        if (isCurrentWorkspace) {
          onInviteCodeRegenerated?.(result.inviteCode);
        }
        toast.success("Invite link regenerated! Previous links are now invalid.");
      } else {
        toast.error(result.error || "Failed to regenerate invite code");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("workspaceId", selectedWorkspaceId);
      formData.append("email", email.trim());
      formData.append("role", role);

      const result = await createInvitation(formData);

      if (result.success) {
        toast.success(`Invitation sent to ${email}`);
        setEmail("");
        setRole("member");
        if (isCurrentWorkspace) {
          onInvitationSent?.();
        }
      } else {
        toast.error(result.error || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSending(false);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join ${activeWorkspaceName} on TaskOS`);
    const body = encodeURIComponent(
      `Hey!\n\nI'd like to invite you to join "${activeWorkspaceName}" workspace on TaskOS.\n\nClick the link below to join:\n${inviteLink}\n\nSee you there!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${activeWorkspaceName}`,
          text: `Join "${activeWorkspaceName}" workspace on TaskOS`,
          url: inviteLink,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("Failed to share");
        }
      }
    } else {
      copyToClipboard(inviteLink);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>{children}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            Invite Members
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Invite people to join <strong>{activeWorkspaceName}</strong>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Workspace Selector */}
        {manageableWorkspaces.length > 1 && (
          <div className="space-y-2 mt-2">
            <Label htmlFor="workspace-select">Workspace</Label>
            <Select
              value={selectedWorkspaceId}
              onValueChange={setSelectedWorkspaceId}
            >
              <SelectTrigger id="workspace-select" className="w-full">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {manageableWorkspaces.map((ws: any) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: ws.id === initialWorkspaceId ? "var(--accent-color)" : "hsl(var(--muted-foreground))" }}
                      />
                      <span>{ws.name}</span>
                      {ws.id === initialWorkspaceId && (
                        <span className="text-xs text-muted-foreground">(current)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs defaultValue="email" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              By Email
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="w-4 h-4" />
              By Link
            </TabsTrigger>
          </TabsList>

          {/* Email Invitation Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as typeof role)}
                  disabled={isSending}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex flex-col">
                        <span>Admin</span>
                        <span className="text-xs text-muted-foreground">
                          Can manage members and settings
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex flex-col">
                        <span>Member</span>
                        <span className="text-xs text-muted-foreground">
                          Can create and edit tasks
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col">
                        <span>Viewer</span>
                        <span className="text-xs text-muted-foreground">
                          Can only view content
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isSending || !email.trim()}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Invitation
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center">
              The invitation will expire in 7 days
            </p>
          </TabsContent>

          {/* Link Invitation Tab */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="font-mono text-sm bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(inviteLink)}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can join as a member
              </p>
            </div>

            {/* Quick Share */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(inviteLink)}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={shareViaEmail} className="gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Button>
              {"share" in navigator && (
                <Button
                  variant="outline"
                  onClick={shareNative}
                  className="gap-2 col-span-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share via...
                </Button>
              )}
            </div>

            {/* Admin: Regenerate Link */}
            {canManage && (
              <div className="pt-4 border-t space-y-2">
                <Button
                  variant="outline"
                  onClick={handleRegenerateCode}
                  disabled={isRegenerating}
                  className="w-full gap-2"
                >
                  {isRegenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate Link
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  This will invalidate the current link
                </p>
              </div>
            )}

            {/* Invite Code Display */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Invite Code
              </p>
              <p className="text-2xl font-mono font-bold tracking-widest">
                {currentInviteCode}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
