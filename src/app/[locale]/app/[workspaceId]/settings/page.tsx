"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Settings, Trash2, RefreshCw, Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { updateWorkspace, deleteWorkspace, regenerateInviteCode } from "@/lib/actions/workspace";

const SettingsPage = () => {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data, isLoading, refetch } = useWorkspace(workspaceId);
  const workspace = data?.workspace;
  const role = data?.role;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Set initial values when data loads
  useState(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || "");
    }
  });

  const canEdit = role === "owner" || role === "admin";
  const canDelete = role === "owner";

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
    } catch (error) {
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
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRegenerateInvite = async () => {
    if (!canEdit) return;
    setIsRegenerating(true);
    try {
      const result = await regenerateInviteCode(workspaceId);
      if (result.success) {
        toast.success("Invite code regenerated");
        refetch();
      } else {
        toast.error(result.error || "Failed to regenerate invite code");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyInviteLink = () => {
    if (!workspace?.inviteCode) return;
    const link = `${window.location.origin}/${locale}/app/join/${workspace.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
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
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground truncate">Manage your workspace settings</p>
        </div>
      </div>

      {/* General Settings */}
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
              value={name || workspace.name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              placeholder="My Workspace"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description || workspace.description || ""}
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

      {/* Invite Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Members</CardTitle>
          <CardDescription>Share this link to invite people to your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/app/join/${workspace.inviteCode}`}
              readOnly
              className="font-mono text-xs sm:text-sm flex-1"
            />
            <Button variant="outline" size="icon" onClick={copyInviteLink} className="self-end sm:self-auto shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              onClick={handleRegenerateInvite}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 me-2" />
              )}
              Regenerate Invite Code
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
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
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
    </div>
  );
};

export default SettingsPage;
