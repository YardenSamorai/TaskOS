"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Settings,
  Trash2,
  Loader2,
  AlertTriangle,
  Users,
  Crown,
  Shield,
  User,
  Eye,
  MoreHorizontal,
  UserPlus,
  Search,
  Clock,
  Mail,
  X,
  RefreshCw,
  Copy,
  Check,
  GitBranch,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { updateWorkspace, deleteWorkspace, updateMemberRole, removeMember } from "@/lib/actions/workspace";
import { getWorkspaceInvitations, cancelInvitation, resendInvitation } from "@/lib/actions/invitation";
import { InviteMembersDialog } from "@/components/workspaces/invite-members-dialog";
import { BranchConventions } from "@/components/settings/branch-conventions";
import { formatDistanceToNow } from "date-fns";

const roleIcons: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const roleColors: Record<string, string> = {
  owner: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  admin: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  member: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  viewer: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isExpired: boolean;
  inviter: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

const SettingsPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const defaultTab = searchParams.get("tab") || "general";

  const { data, isLoading, refetch } = useWorkspace(workspaceId);
  const workspace = data?.workspace;
  const role = data?.role;
  const members = workspace?.members || [];

  // General settings state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Members state
  const [searchQuery, setSearchQuery] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  // Invitations state
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const canEdit = role === "owner" || role === "admin";
  const canDelete = role === "owner";

  // Sync form state when workspace loads
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || "");
    }
  }, [workspace]);

  // Load invitations
  const loadInvitations = async () => {
    if (!canEdit) return;
    setLoadingInvitations(true);
    try {
      const result = await getWorkspaceInvitations(workspaceId);
      if (result.success) {
        setInvitations(result.invitations as PendingInvitation[]);
      }
    } catch (error) {
      console.error("Failed to load invitations:", error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    if (canEdit) {
      loadInvitations();
    }
  }, [workspaceId, canEdit]);

  // Filter & sort members
  const filteredMembers = useMemo(() => {
    const filtered = members.filter((member: any) => {
      const mName = member.user?.name?.toLowerCase() || "";
      const email = member.user?.email?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      return mName.includes(query) || email.includes(query);
    });
    const roleOrder = { owner: 0, admin: 1, member: 2, viewer: 3 };
    return [...filtered].sort(
      (a: any, b: any) =>
        (roleOrder[a.role as keyof typeof roleOrder] || 4) -
        (roleOrder[b.role as keyof typeof roleOrder] || 4)
    );
  }, [members, searchQuery]);

  const filteredInvitations = useMemo(
    () => invitations.filter((inv) => inv.email.toLowerCase().includes(searchQuery.toLowerCase())),
    [invitations, searchQuery]
  );

  // --- Handlers ---

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("workspaceId", workspaceId);
      formData.set("name", name || workspace?.name || "");
      formData.set("description", description);
      const result = await updateWorkspace(formData);
      if (result.success) {
        toast.success("Workspace updated successfully");
        refetch();
      } else {
        toast.error(result.error || "Failed to update workspace");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteWorkspace(workspaceId);
      if (result.success) {
        toast.success("Workspace deleted");
        router.push(`/${locale}/app/dashboard`);
      } else {
        toast.error(result.error || "Failed to delete workspace");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: "admin" | "member" | "viewer") => {
    try {
      const result = await updateMemberRole(workspaceId, memberId, newRole);
      if (result.success) {
        toast.success("Role updated successfully");
        refetch();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMemberId(memberToRemove.id);
    try {
      const result = await removeMember(workspaceId, memberToRemove.id);
      if (result.success) {
        toast.success("Member removed");
        refetch();
      } else {
        toast.error(result.error || "Failed to remove member");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setRemovingMemberId(null);
      setMemberToRemove(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      const result = await cancelInvitation(invitationId);
      if (result.success) {
        toast.success("Invitation cancelled");
        loadInvitations();
      } else {
        toast.error(result.error || "Failed to cancel invitation");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setCancellingId(null);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const result = await resendInvitation(invitationId);
      if (result.success) {
        toast.success("Invitation resent");
        loadInvitations();
      } else {
        toast.error(result.error || "Failed to resend invitation");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setResendingId(null);
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/${locale}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // --- Loading / Not found ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Manage Workspace</h1>
          <p className="text-sm text-muted-foreground truncate">{workspace.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4 hidden sm:block" />
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4 hidden sm:block" />
            Members
            <Badge variant="secondary" className="ms-1 h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5">
              {members.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="git" className="gap-2">
            <GitBranch className="w-4 h-4 hidden sm:block" />
            Git
          </TabsTrigger>
        </TabsList>

        {/* ═══════ GENERAL TAB ═══════ */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic workspace information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="My Workspace"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  placeholder="What's this workspace for?"
                  rows={3}
                />
              </div>
              {canEdit && (
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  Save Changes
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {canDelete && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 me-2" />
                      Delete Workspace
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the workspace
                        <strong className="text-foreground"> {workspace.name}</strong> and remove all
                        associated data including tasks, comments, and files.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                        Delete Workspace
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════ MEMBERS TAB ═══════ */}
        <TabsContent value="members" className="space-y-6">
          {/* Invite + Search row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members or invitations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {canEdit && (
              <InviteMembersDialog
                workspaceId={workspaceId}
                workspaceName={workspace.name}
                inviteCode={workspace.inviteCode}
                canManage={canEdit}
                onInviteCodeRegenerated={() => refetch()}
                onInvitationSent={() => loadInvitations()}
              >
                <Button className="gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-lg shadow-blue-500/25 shrink-0">
                  <UserPlus className="w-4 h-4" />
                  Invite Members
                </Button>
              </InviteMembersDialog>
            )}
          </div>

          {/* Pending Invitations */}
          {canEdit && filteredInvitations.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Pending Invitations
                </CardTitle>
                <CardDescription>
                  {filteredInvitations.length} invitation{filteredInvitations.length !== 1 ? "s" : ""} waiting for response
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {filteredInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 ${
                        invitation.isExpired ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className={roleColors[invitation.role]}>
                              {roleLabels[invitation.role]}
                            </Badge>
                            <span>·</span>
                            {invitation.isExpired ? (
                              <span className="text-red-500">Expired</span>
                            ) : (
                              <span>
                                Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => copyInviteLink(invitation.token)}>
                          {copiedToken === invitation.token ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleResendInvitation(invitation.id)}
                              disabled={resendingId === invitation.id}
                            >
                              {resendingId === invitation.id ? (
                                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4 me-2" />
                              )}
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              disabled={cancellingId === invitation.id}
                            >
                              {cancellingId === invitation.id ? (
                                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                              ) : (
                                <X className="w-4 h-4 me-2" />
                              )}
                              Cancel Invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Members List */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">All Members</CardTitle>
              {searchQuery && (
                <CardDescription>
                  Showing {filteredMembers.length} of {members.length} members
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {searchQuery ? "No members found matching your search" : "No members yet"}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredMembers.map((member: any) => {
                    const RoleIcon = roleIcons[member.role];
                    const isOwner = member.role === "owner";

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarImage src={member.user?.imageUrl} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                              {member.user?.name?.[0] || member.user?.email?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {member.user?.name || "Unknown User"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {member.user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          {canEdit && !isOwner ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                handleRoleChange(member.id, value as "admin" | "member" | "viewer")
                              }
                            >
                              <SelectTrigger className="w-24 sm:w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="member">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Member
                                  </div>
                                </SelectItem>
                                <SelectItem value="viewer">
                                  <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    Viewer
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={roleColors[member.role]}>
                              <RoleIcon className="w-3 h-3 me-1" />
                              {roleLabels[member.role]}
                            </Badge>
                          )}

                          {canEdit && !isOwner && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setMemberToRemove({
                                      id: member.id,
                                      name: member.user?.name || member.user?.email || "this member",
                                    })
                                  }
                                >
                                  <Trash2 className="w-4 h-4 me-2" />
                                  Remove from workspace
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Descriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role Permissions</CardTitle>
              <CardDescription>Understand what each role can do in the workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {Object.entries(roleLabels).map(([r, label]) => {
                  const Icon = roleIcons[r];
                  return (
                    <div
                      key={r}
                      className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${roleColors[r]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          {r === "owner" && "Full control over workspace, can delete workspace"}
                          {r === "admin" && "Can manage members, settings, and all tasks"}
                          {r === "member" && "Can create, edit, and complete tasks"}
                          {r === "viewer" && "Can only view tasks and comments"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ GIT TAB ═══════ */}
        <TabsContent value="git">
          <BranchConventions workspaceId={workspaceId} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this
              workspace? They will lose access to all workspace content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingMemberId && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
