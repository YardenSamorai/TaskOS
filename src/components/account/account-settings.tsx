"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { 
  User, 
  Crown, 
  Sparkles, 
  Check, 
  ArrowRight,
  Building2,
  HardDrive,
  Users,
  Zap,
  Settings,
  LogOut
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PLAN_INFO, PLAN_LIMITS } from "@/lib/plans";
import type { User as DBUser, UserPlan } from "@/lib/db/schema";

interface AccountSettingsProps {
  user: DBUser;
  usageStats: {
    plan: UserPlan;
    limits: typeof PLAN_LIMITS.free;
    usage: {
      workspaces: number;
      workspacesLimit: number;
      workspacesRemaining: number;
    };
  };
}

export const AccountSettings = ({ user, usageStats }: AccountSettingsProps) => {
  const { user: clerkUser } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const plan = usageStats.plan;
  const planInfo = PLAN_INFO[plan];
  const limits = usageStats.limits;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  const workspaceUsagePercent = limits.maxWorkspaces === Infinity 
    ? 0 
    : (usageStats.usage.workspaces / limits.maxWorkspaces) * 100;

  const getPlanBadgeColor = (p: UserPlan) => {
    switch (p) {
      case "pro":
        return "bg-gradient-to-r from-blue-500 to-violet-600 text-white border-0";
      case "enterprise":
        return "bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0";
      default:
        return "bg-muted";
    }
  };

  const proFeatures = [
    { icon: Building2, text: "Unlimited workspaces" },
    { icon: Users, text: "Up to 50 members per workspace" },
    { icon: HardDrive, text: "Unlimited file uploads" },
    { icon: Zap, text: "AI Task Enhancement" },
    { icon: Sparkles, text: "Process Mode" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account and subscription</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={clerkUser?.imageUrl || user.imageUrl || ""} />
              <AvatarFallback className="text-lg">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{user.name || "No name set"}</h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" onClick={() => openUserProfile()}>
              <Settings className="w-4 h-4 me-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Subscription
                <Badge className={getPlanBadgeColor(plan)}>
                  {plan === "pro" && <Crown className="w-3 h-3 me-1" />}
                  {planInfo.name}
                </Badge>
              </CardTitle>
              <CardDescription>{planInfo.description}</CardDescription>
            </div>
            {plan === "free" && (
              <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500">
                <Sparkles className="w-4 h-4 me-2" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Usage
            </h4>
            
            {/* Workspaces */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Workspaces
                </span>
                <span>
                  {usageStats.usage.workspaces} / {limits.maxWorkspaces === Infinity ? "∞" : limits.maxWorkspaces}
                </span>
              </div>
              {limits.maxWorkspaces !== Infinity && (
                <Progress value={workspaceUsagePercent} className="h-2" />
              )}
            </div>

            {/* Members limit */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Members per workspace
              </span>
              <span>{limits.maxMembersPerWorkspace === Infinity ? "Unlimited" : limits.maxMembersPerWorkspace}</span>
            </div>

            {/* Files limit */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                Files per task
              </span>
              <span>{limits.maxFilesPerTask === Infinity ? "Unlimited" : limits.maxFilesPerTask}</span>
            </div>

            {/* Max file size */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                Max file size
              </span>
              <span>{limits.maxFileSizeMB} MB</span>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Features
            </h4>
            <div className="grid gap-2">
              <FeatureRow
                label="AI Task Enhancement"
                available={limits.features.aiTaskEnhancement}
              />
              <FeatureRow
                label="Process Mode"
                available={limits.features.processMode}
              />
              <FeatureRow
                label="Advanced Filters"
                available={limits.features.advancedFilters}
              />
              <FeatureRow
                label="Custom Tags"
                available={limits.features.customTags}
              />
              <FeatureRow
                label="Priority Support"
                available={limits.features.prioritySupport}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Card - Only show for free users */}
      {plan === "free" && (
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-violet-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-blue-500" />
              Upgrade to Pro
            </CardTitle>
            <CardDescription>
              Unlock all features and remove limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-3">
              {proFeatures.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <feature.icon className="w-4 h-4 text-blue-500" />
                  {feature.text}
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-semibold text-lg">{PLAN_INFO.pro.price}</p>
                <p className="text-sm text-muted-foreground">Billed monthly</p>
              </div>
              <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500">
                Upgrade Now
                <ArrowRight className="w-4 h-4 ms-2" />
              </Button>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              14-day free trial · Cancel anytime · No credit card required
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 me-2" />
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const FeatureRow = ({ label, available }: { label: string; available: boolean }) => (
  <div className="flex items-center justify-between text-sm py-1">
    <span>{label}</span>
    {available ? (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
        <Check className="w-3 h-3 me-1" />
        Available
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-muted text-muted-foreground">
        Pro Only
      </Badge>
    )}
  </div>
);
