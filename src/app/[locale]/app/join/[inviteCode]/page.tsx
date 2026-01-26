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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { joinWorkspaceByInvite } from "@/lib/actions/workspace";

const JoinWorkspacePage = () => {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.inviteCode as string;
  const locale = params.locale as string;

  const [isJoining, setIsJoining] = useState(false);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    workspace?: any;
    alreadyMember?: boolean;
    error?: string;
  } | null>(null);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const res = await joinWorkspaceByInvite(inviteCode);
      setResult(res);

      if (res.success) {
        if (res.alreadyMember) {
          toast.info("You're already a member of this workspace");
        } else {
          toast.success("Successfully joined the workspace!");
        }
      } else {
        toast.error(res.error || "Failed to join workspace");
      }
    } catch (error) {
      setResult({ success: false, error: "An error occurred. Please try again." });
      toast.error("An error occurred");
    } finally {
      setIsJoining(false);
    }
  };

  // Auto-join on page load
  useEffect(() => {
    if (!autoJoinAttempted) {
      setAutoJoinAttempted(true);
      handleJoin();
    }
  }, [autoJoinAttempted]);

  const goToWorkspace = () => {
    if (result?.workspace?.id) {
      router.push(`/${locale}/app/${result.workspace.id}/dashboard`);
    }
  };

  const goToWorkspaces = () => {
    router.push(`/${locale}/app/workspaces`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative overflow-hidden">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-violet-500/20 opacity-50" />
        
        <CardHeader className="text-center relative">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
            {isJoining ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            ) : result?.success ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : result?.error ? (
              <XCircle className="w-10 h-10 text-white" />
            ) : (
              <Users className="w-10 h-10 text-white" />
            )}
          </div>

          {/* Title */}
          <CardTitle className="text-2xl">
            {isJoining
              ? "Joining Workspace..."
              : result?.success
              ? result.alreadyMember
                ? "Already a Member!"
                : "Welcome to the Team!"
              : result?.error
              ? "Unable to Join"
              : "Join Workspace"}
          </CardTitle>

          {/* Description */}
          <CardDescription className="text-base">
            {isJoining
              ? "Please wait while we add you to the workspace"
              : result?.success
              ? result.alreadyMember
                ? `You're already a member of "${result.workspace?.name}"`
                : `You've been added to "${result.workspace?.name}"`
              : result?.error
              ? result.error
              : "Click the button below to join"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 relative">
          {/* Workspace Info */}
          {result?.success && result.workspace && (
            <div className="p-6 rounded-xl bg-gradient-to-br from-muted/50 to-muted text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-3">
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-sm text-muted-foreground">Workspace</p>
              <p className="font-bold text-xl">{result.workspace.name}</p>
              {result.workspace.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {result.workspace.description}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {result?.success ? (
            <Button
              className="w-full gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-lg shadow-blue-500/25 h-12 text-base"
              onClick={goToWorkspace}
            >
              Go to Workspace
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : result?.error ? (
            <div className="space-y-3">
              <Button
                className="w-full h-12"
                variant="outline"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                Try Again
              </Button>
              <Button
                className="w-full h-12"
                variant="ghost"
                onClick={goToWorkspaces}
              >
                Go to My Workspaces
              </Button>
            </div>
          ) : null}

          {/* Loading indicator */}
          {isJoining && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse delay-75" />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-150" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinWorkspacePage;
