"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, Crown, Shield, User, Eye, MoreHorizontal, Trash2, Loader2, Copy, Check, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { updateMemberRole, removeMember } from "@/lib/actions/workspace";

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

const MembersPage = () => {
  const params = useParams();
  const t = useTranslations();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data, isLoading, refetch } = useWorkspace(workspaceId);
  const workspace = data?.workspace;
  const currentRole = data?.role;
  const members = workspace?.members || [];

  const [copied, setCopied] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  const canManage = currentRole === "owner" || currentRole === "admin";

  const copyInviteLink = () => {
    if (!workspace?.inviteCode) return;
    const link = `${window.location.origin}/${locale}/app/join/${workspace.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
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
    } catch (error) {
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
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setRemovingMemberId(null);
      setMemberToRemove(null);
    }
  };

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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""} in this workspace
            </p>
          </div>
        </div>
        <Button onClick={copyInviteLink} className="gap-2">
          {copied ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {copied ? "Copied!" : "Invite Members"}
        </Button>
      </div>

      {/* Invite Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite Link</CardTitle>
          <CardDescription>Share this link to invite people to your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/app/join/${workspace.inviteCode}`}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copyInviteLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {members.map((member: any) => {
              const RoleIcon = roleIcons[member.role];
              const isOwner = member.role === "owner";
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.user?.imageUrl} />
                      <AvatarFallback>
                        {member.user?.name?.[0] || member.user?.email?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user?.name || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {canManage && !isOwner ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleRoleChange(member.id, value as "admin" | "member" | "viewer")
                        }
                      >
                        <SelectTrigger className="w-32">
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
                      <Badge
                        variant="outline"
                        className={roleColors[member.role]}
                      >
                        <RoleIcon className="w-3 h-3 me-1" />
                        {roleLabels[member.role]}
                      </Badge>
                    )}

                    {canManage && !isOwner && (
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
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(roleLabels).map(([role, label]) => {
              const Icon = roleIcons[role];
              return (
                <div key={role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`p-2 rounded-lg ${roleColors[role]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {role === "owner" && "Full control over workspace"}
                      {role === "admin" && "Can manage members and settings"}
                      {role === "member" && "Can create and edit tasks"}
                      {role === "viewer" && "Can only view tasks"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

export default MembersPage;
