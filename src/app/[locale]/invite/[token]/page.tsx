"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  LogIn,
  UserPlus,
  Building2,
  Star,
  Zap,
  Target,
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

const features = [
  { icon: Target, text: "Organize tasks with Kanban boards" },
  { icon: Users, text: "Collaborate with your team" },
  { icon: Zap, text: "AI-powered task enhancement" },
  { icon: Star, text: "Track progress in real-time" },
];

const PublicInvitePage = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.token as string;
  const locale = params.locale as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [emailMismatch, setEmailMismatch] = useState(false);
  const hasAutoAccepted = useRef(false);

  const isAuthenticated = status === "authenticated";
  const isAuthLoading = status === "loading";
  
  // Check if user's email matches invitation email
  const userEmail = session?.user?.email?.toLowerCase();
  const invitationEmail = invitation?.email?.toLowerCase();
  const isEmailMatch = !userEmail || !invitationEmail || userEmail === invitationEmail;

  // Load invitation details (public - no auth required)
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

  // Auto-accept invitation when user returns from login
  // This triggers when the user was redirected to login and comes back authenticated
  useEffect(() => {
    const autoAccept = async () => {
      // Check for email mismatch first - don't attempt if emails don't match
      if (isAuthenticated && invitation?.email && userEmail && userEmail !== invitationEmail) {
        setEmailMismatch(true);
        return; // Don't attempt auto-accept
      }

      // Only auto-accept if:
      // - User is authenticated
      // - Invitation is loaded and valid
      // - Not already accepting or accepted
      // - Haven't already tried auto-accept
      // - Emails match
      if (
        isAuthenticated && 
        invitation?.isValid && 
        !isAccepting && 
        !accepted && 
        !error &&
        !emailMismatch &&
        !hasAutoAccepted.current &&
        isEmailMatch
      ) {
        hasAutoAccepted.current = true;
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
            // Check if it's an email mismatch error
            if (result.error?.includes("sent to") || result.error?.includes("sign in with")) {
              setEmailMismatch(true);
            } else {
              toast.error(result.error || "Failed to accept invitation");
              hasAutoAccepted.current = false; // Allow retry for other errors
            }
          }
        } catch (err) {
          toast.error("An error occurred");
          hasAutoAccepted.current = false; // Allow retry
        } finally {
          setIsAccepting(false);
        }
      }
    };

    autoAccept();
  }, [isAuthenticated, invitation, isAccepting, accepted, error, token, emailMismatch, isEmailMatch, userEmail, invitationEmail]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to sign-in with callback (existing users more likely)
      const callbackUrl = `/${locale}/invite/${token}`;
      router.push(`/${locale}/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

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
    router.push(`/${locale}/app/dashboard`);
  };

  // Loading state (including auto-accept in progress)
  if (isLoading || isAuthLoading || (isAccepting && isAuthenticated && !accepted)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500" />
            <p className="mt-4 text-muted-foreground">
              {isAccepting ? "Joining workspace..." : "Loading invitation..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              This invitation link may be invalid or has expired.
            </p>
            {isAuthenticated ? (
              <Button className="w-full" onClick={goToWorkspaces}>
                Go to My Workspaces
              </Button>
            ) : (
              <div className="space-y-2">
                <Button className="w-full" asChild>
                  <Link href={`/${locale}/sign-up`}>Create an Account</Link>
                </Button>
                <Button className="w-full" variant="outline" asChild>
                  <Link href={`/${locale}/sign-in`}>Sign In</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired invitation
  if (invitation && !invitation.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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
            {isAuthenticated ? (
              <Button className="w-full" variant="outline" onClick={goToWorkspaces}>
                Go to My Workspaces
              </Button>
            ) : (
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/${locale}/sign-in`}>Sign In</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email mismatch - user signed in with wrong email
  if (emailMismatch && isAuthenticated && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-amber-500" />
            </div>
            <CardTitle>Wrong Email Address</CardTitle>
            <CardDescription>
              You're signed in with a different email than the invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">You're signed in as:</p>
                <p className="font-semibold text-red-700 dark:text-red-300">{session?.user?.email}</p>
              </div>
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Invitation sent to:</p>
                <p className="font-semibold text-green-700 dark:text-green-300">{invitation.email}</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                To accept this invitation, please sign out and sign in with <strong>{invitation.email}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Button 
                className="w-full gap-2" 
                onClick={() => {
                  // Sign out and redirect back to this page
                  window.location.href = `/${locale}/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/invite/${token}`)}`;
                }}
              >
                <LogIn className="w-4 h-4" />
                Sign in with {invitation.email}
              </Button>
              <Button variant="outline" className="w-full" onClick={goToWorkspaces}>
                Go to My Workspaces
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state (after accepting)
  if (accepted) {
    // Generate confetti pieces
    const confettiColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
    const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: 8 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 overflow-hidden">
        {/* Confetti */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="absolute animate-confetti"
              style={{
                left: `${piece.left}%`,
                top: '-20px',
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                backgroundColor: piece.color,
                borderRadius: piece.id % 3 === 0 ? '50%' : piece.id % 3 === 1 ? '2px' : '0',
                transform: `rotate(${piece.rotation}deg)`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Background glows */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md relative z-10">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/25">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome to the Team! 🎉</CardTitle>
            <CardDescription className="text-base">
              You've successfully joined <strong>{invitation.workspace?.name}</strong>
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
              className="w-full h-12 text-base gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-lg"
              onClick={goToWorkspace}
            >
              Go to Workspace
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Confetti animation styles */}
        <style jsx>{`
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
          .animate-confetti {
            animation: confetti-fall linear forwards;
          }
        `}</style>
      </div>
    );
  }

  // Main invitation view
  const RoleIcon = roleIcons[invitation?.role] || User;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/5 to-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex">
        {/* Left side - Invitation details */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-8">
              <Link href={`/${locale}`} className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold">TaskOS</span>
              </Link>
            </div>

            <Card className="border-0 shadow-xl shadow-blue-500/10">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                  <Mail className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl">You're Invited!</CardTitle>
                <CardDescription className="text-base">
                  Join your team and start collaborating
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Workspace Info */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/5 to-violet-500/5 border border-blue-500/10 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Workspace</p>
                    <p className="font-bold text-xl mt-1">{invitation?.workspace?.name}</p>
                    {invitation?.workspace?.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
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
                      <p className="font-medium text-sm">Your Role</p>
                      <p className="text-xs text-muted-foreground">
                        {roleDescriptions[invitation?.role]}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/10">
                    {roleLabels[invitation?.role]}
                  </Badge>
                </div>

                {/* Invited By */}
                {invitation?.inviter && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <Avatar className="w-10 h-10 ring-2 ring-white shadow">
                      <AvatarImage src={invitation.inviter.image} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-white">
                        {invitation.inviter.name?.[0] || invitation.inviter.email?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Invited by</p>
                      <p className="font-medium truncate">
                        {invitation.inviter.name || invitation.inviter.email}
                      </p>
                    </div>
                  </div>
                )}

                {/* Expiration notice */}
                <p className="text-xs text-center text-muted-foreground">
                  ⏰ This invitation expires{" "}
                  {formatDistanceToNow(new Date(invitation?.expiresAt), { addSuffix: true })}
                </p>

                {/* Error message */}
                {error && (
                  <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                {isAuthenticated ? (
                  <>
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
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-center text-muted-foreground">
                      Create an account or sign in to accept this invitation
                    </p>
                    <Button
                      className="w-full h-12 text-base gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 shadow-lg shadow-blue-500/25"
                      asChild
                    >
                      <Link href={`/${locale}/sign-up?callbackUrl=${encodeURIComponent(`/${locale}/invite/${token}`)}`}>
                        <UserPlus className="w-5 h-5" />
                        Create Account & Join
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full h-11 gap-2" asChild>
                      <Link href={`/${locale}/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/invite/${token}`)}`}>
                        <LogIn className="w-4 h-4" />
                        Already have an account? Sign in
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Right side - Features (hidden on mobile) */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gradient-to-br from-blue-600 to-violet-700">
          <div className="max-w-md text-white">
            <h2 className="text-3xl font-bold mb-4">
              Join {invitation?.workspace?.name} on TaskOS
            </h2>
            <p className="text-blue-100 mb-8">
              TaskOS helps teams organize, track, and accomplish their tasks with powerful features and beautiful design.
            </p>
            
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-white/20">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-white/20 border-2 border-blue-600 flex items-center justify-center text-xs font-bold"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-blue-100">
                  Join thousands of teams already using TaskOS
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvitePage;
