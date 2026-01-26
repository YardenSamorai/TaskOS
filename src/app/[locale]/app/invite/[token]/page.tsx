"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Mail,
  Shield,
  User,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getInvitationByToken, acceptInvitation } from "@/lib/actions/invitation";
import { formatDistanceToNow } from "date-fns";

const roleIcons: Record<string, React.ElementType> = {
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const roleDescriptions: Record<string, string> = {
  admin: "Can manage members and settings",
  member: "Can create and edit tasks",
  viewer: "Can only view content",
};

const InviteTokenPage = () => {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const locale = params.locale as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Load invitation details
  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const result = await getInvitationByToken(token);
        if (result.success && result.invitation) {
          setInvitation(result.invitation);
        } else {
          setError(result.error || "Invitation not found");
        }
      } catch (err) {
        setError("Failed to load invitation");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await acceptInvitation(token);
      if (result.success) {
        setAccepted(true);
        if (result.alreadyMember) {
          toast.info("You're already a member of this workspace");
        } else {
          toast.success("Successfully joined the workspace!");
        }
      } else {
        toast.error(result.error || "Failed to accept invitation");
        setError(result.error || "Failed to accept invitation");
      }
    } catch (err) {
      toast.error("An error occurred");
      setError("An error occurred");
    } finally {
      setIsAccepting(false);
    }
  };

  const goToWorkspace = () => {
    if (invitation?.workspace?.id) {
      router.push(`/${locale}/app/${invitation.workspace.id}/dashboard`);
    }
  };

  const goToWorkspaces = () => {
    router.push(`/${locale}/app/workspaces`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={goToWorkspaces}>
              Go to My Workspaces
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired invitation
  if (invitation && !invitation.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation to join <strong>{invitation.workspace?.name}</strong> has expired or
              been cancelled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Please ask the workspace admin to send you a new invitation.
            </p>
            <Button className="w-full" variant="outline" onClick={goToWorkspaces}>
              Go to My Workspaces
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md relative">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/25">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome to the Team!</CardTitle>
            <CardDescription className="text-base">
              You've joined <strong>{invitation.workspace?.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">{invitation.workspace?.name}</p>
              <Badge variant="outline" className="mt-2">
                {roleLabels[invitation.role]}
              </Badge>
            </div>

            <Button
              className="w-full gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
              onClick={goToWorkspace}
            >
              Go to Workspace
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invitation details & accept button
  const RoleIcon = roleIcons[invitation?.role] || User;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription className="text-base">
            You've been invited to join a workspace
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Workspace Info */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-muted/50 to-muted text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Workspace</p>
              <p className="font-bold text-xl">{invitation?.workspace?.name}</p>
              {invitation?.workspace?.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {invitation.workspace.description}
                </p>
              )}
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <RoleIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Your Role</p>
                <p className="text-sm text-muted-foreground">
                  {roleDescriptions[invitation?.role]}
                </p>
              </div>
            </div>
            <Badge variant="outline">{roleLabels[invitation?.role]}</Badge>
          </div>

          {/* Invited By */}
          {invitation?.inviter && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <Avatar className="w-10 h-10">
                <AvatarImage src={invitation.inviter.imageUrl} />
                <AvatarFallback>
                  {invitation.inviter.name?.[0] || invitation.inviter.email?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Invited by</p>
                <p className="font-medium truncate">
                  {invitation.inviter.name || invitation.inviter.email}
                </p>
              </div>
            </div>
          )}

          {/* Expiration notice */}
          <p className="text-xs text-center text-muted-foreground">
            This invitation expires{" "}
            {formatDistanceToNow(new Date(invitation?.expiresAt), { addSuffix: true })}
          </p>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* Accept Button */}
          <Button
            className="w-full h-12 text-base gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-lg shadow-blue-500/25"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Accept Invitation
          </Button>

          <Button variant="ghost" className="w-full" onClick={goToWorkspaces}>
            Go to My Workspaces
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteTokenPage;
