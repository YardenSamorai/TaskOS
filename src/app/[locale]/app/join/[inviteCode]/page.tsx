"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Users, CheckCircle2, XCircle, Zap } from "lucide-react";
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
        // Redirect to the workspace after a short delay
        setTimeout(() => {
          router.push(`/${locale}/app/${res.workspace?.id}/dashboard`);
        }, 1500);
      } else {
        toast.error(res.error || "Failed to join workspace");
      }
    } catch (error) {
      setResult({ success: false, error: "An error occurred" });
      toast.error("An error occurred");
    } finally {
      setIsJoining(false);
    }
  };

  // Auto-join on page load
  useEffect(() => {
    handleJoin();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
            {isJoining ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : result?.success ? (
              <CheckCircle2 className="w-8 h-8 text-white" />
            ) : result?.error ? (
              <XCircle className="w-8 h-8 text-white" />
            ) : (
              <Users className="w-8 h-8 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isJoining
              ? "Joining Workspace..."
              : result?.success
              ? result.alreadyMember
                ? "Already a Member"
                : "Welcome!"
              : result?.error
              ? "Unable to Join"
              : "Join Workspace"}
          </CardTitle>
          <CardDescription>
            {isJoining
              ? "Please wait while we add you to the workspace"
              : result?.success
              ? result.alreadyMember
                ? `You're already a member of ${result.workspace?.name}`
                : `You've been added to ${result.workspace?.name}`
              : result?.error
              ? result.error
              : "Click the button below to join"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.success && (
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">Workspace</p>
              <p className="font-semibold text-lg">{result.workspace?.name}</p>
            </div>
          )}

          {result?.success ? (
            <Button
              className="w-full"
              onClick={() => router.push(`/${locale}/app/${result.workspace?.id}/dashboard`)}
            >
              Go to Workspace
            </Button>
          ) : result?.error ? (
            <div className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                Try Again
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                onClick={() => router.push(`/${locale}/app/workspaces`)}
              >
                Go to Workspaces
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinWorkspacePage;
