"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Crown, 
  Sparkles, 
  Check, 
  Building2,
  HardDrive,
  Users,
  Zap,
  Settings,
  LogOut,
  Shield,
  Bell,
  Globe,
  Palette,
  Lock,
  Mail,
  Calendar,
  TrendingUp,
  Award,
  Rocket,
  Star,
  ChevronRight,
  ExternalLink,
  CreditCard,
  Clock,
  BarChart3,
  Target,
  Gift,
  X,
  Camera
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
  const { data: session } = useSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "billing" | "security">("overview");

  const plan = usageStats.plan;
  const planInfo = PLAN_INFO[plan];
  const limits = usageStats.limits;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  const workspaceUsagePercent = limits.maxWorkspaces === Infinity 
    ? 0 
    : (usageStats.usage.workspaces / limits.maxWorkspaces) * 100;

  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  }) : 'Recently';

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || user.email?.[0].toUpperCase() || "U";

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section with Gradient Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-violet-600/20 to-fuchsia-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full filter blur-3xl animate-pulse delay-1000" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-12">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-violet-600 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-300" />
              <Avatar className="relative w-24 h-24 md:w-32 md:h-32 border-4 border-background">
                <AvatarImage src={session?.user?.image || user.image || ""} />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {plan !== "free" && (
                <div className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-lg">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold">{user.name || "Welcome!"}</h1>
                <Badge 
                  className={`px-3 py-1 text-sm ${
                    plan === "pro" 
                      ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white border-0" 
                      : plan === "enterprise"
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0"
                      : "bg-muted"
                  }`}
                >
                  {plan === "pro" && <Crown className="w-3 h-3 me-1" />}
                  {plan === "enterprise" && <Award className="w-3 h-3 me-1" />}
                  {planInfo.name} Plan
                </Badge>
              </div>
              <p className="text-muted-foreground text-lg">{user.email}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Member since {memberSince}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {usageStats.usage.workspaces} workspace{usageStats.usage.workspaces !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {plan === "free" && (
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/25">
                  <Sparkles className="w-4 h-4" />
                  Upgrade
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickStatCard 
            icon={Building2} 
            label="Workspaces" 
            value={usageStats.usage.workspaces.toString()} 
            limit={limits.maxWorkspaces === Infinity ? "∞" : limits.maxWorkspaces.toString()}
            color="blue"
          />
          <QuickStatCard 
            icon={Users} 
            label="Team Size" 
            value={limits.maxMembersPerWorkspace === Infinity ? "∞" : limits.maxMembersPerWorkspace.toString()} 
            limit="per workspace"
            color="violet"
          />
          <QuickStatCard 
            icon={HardDrive} 
            label="Storage" 
            value={`${limits.maxFileSizeMB}MB`} 
            limit="max file"
            color="emerald"
          />
          <QuickStatCard 
            icon={Zap} 
            label="AI Credits" 
            value={limits.features.aiTaskEnhancement ? "Unlimited" : "0"} 
            limit={limits.features.aiTaskEnhancement ? "available" : "upgrade needed"}
            color="amber"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-muted/50 rounded-xl w-fit">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "billing", label: "Billing", icon: CreditCard },
            { id: "security", label: "Security", icon: Shield },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`gap-2 ${activeTab === tab.id ? "shadow-md" : ""}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Usage Overview */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Usage Overview
                      </CardTitle>
                      <CardDescription>Your current plan limits and usage</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                      {plan === "free" ? "Free Tier" : `${planInfo.name} Plan`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Workspaces Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Building2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Workspaces</p>
                          <p className="text-sm text-muted-foreground">
                            {usageStats.usage.workspaces} of {limits.maxWorkspaces === Infinity ? "unlimited" : limits.maxWorkspaces} used
                          </p>
                        </div>
                      </div>
                      {limits.maxWorkspaces !== Infinity && (
                        <span className={`text-2xl font-bold ${workspaceUsagePercent >= 80 ? "text-orange-500" : "text-blue-500"}`}>
                          {Math.round(workspaceUsagePercent)}%
                        </span>
                      )}
                    </div>
                    {limits.maxWorkspaces !== Infinity && (
                      <Progress 
                        value={workspaceUsagePercent} 
                        className={`h-3 ${workspaceUsagePercent >= 80 ? "[&>div]:bg-orange-500" : "[&>div]:bg-blue-500"}`}
                      />
                    )}
                    {workspaceUsagePercent >= 80 && plan === "free" && (
                      <p className="text-sm text-orange-500 flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        Running low! Upgrade for unlimited workspaces
                      </p>
                    )}
                  </div>

                  {/* Other Limits */}
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                    <LimitItem 
                      icon={Users} 
                      label="Team Members" 
                      value={limits.maxMembersPerWorkspace === Infinity ? "Unlimited" : `${limits.maxMembersPerWorkspace} per workspace`}
                      available={true}
                    />
                    <LimitItem 
                      icon={HardDrive} 
                      label="File Storage" 
                      value={`${limits.maxFileSizeMB}MB max per file`}
                      available={true}
                    />
                    <LimitItem 
                      icon={Clock} 
                      label="Activity History" 
                      value={limits.activityHistoryDays === Infinity ? "Unlimited" : `${limits.activityHistoryDays} days`}
                      available={true}
                    />
                    <LimitItem 
                      icon={HardDrive} 
                      label="Files per Task" 
                      value={limits.maxFilesPerTask === Infinity ? "Unlimited" : `${limits.maxFilesPerTask} files`}
                      available={true}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Features Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-500" />
                    Features & Capabilities
                  </CardTitle>
                  <CardDescription>What's included in your plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <FeatureCard 
                      icon={Zap} 
                      title="AI Task Enhancement" 
                      description="Smart task suggestions and auto-completion"
                      available={limits.features.aiTaskEnhancement}
                    />
                    <FeatureCard 
                      icon={Target} 
                      title="Process Mode" 
                      description="Advanced workflow management"
                      available={limits.features.processMode}
                    />
                    <FeatureCard 
                      icon={BarChart3} 
                      title="Advanced Filters" 
                      description="Powerful search and filtering"
                      available={limits.features.advancedFilters}
                    />
                    <FeatureCard 
                      icon={Palette} 
                      title="Custom Tags" 
                      description="Organize with custom labels"
                      available={limits.features.customTags}
                    />
                    <FeatureCard 
                      icon={Shield} 
                      title="Priority Support" 
                      description="24/7 dedicated assistance"
                      available={limits.features.prioritySupport}
                    />
                    <FeatureCard 
                      icon={Globe} 
                      title="API Access" 
                      description="Build custom integrations"
                      available={limits.features.apiAccess}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upgrade Card - Only for free users */}
              {plan === "free" && (
                <Card className="relative overflow-hidden border-2 border-blue-500/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-fuchsia-500/10" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                  
                  <CardHeader className="relative">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
                        <Rocket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle>Upgrade to Pro</CardTitle>
                        <CardDescription>Unlock your full potential</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-4">
                    <div className="space-y-3">
                      {[
                        "Unlimited workspaces",
                        "AI Task Enhancement",
                        "50 team members",
                        "Priority support",
                        "Advanced analytics",
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="p-0.5 rounded-full bg-emerald-500/20">
                            <Check className="w-3 h-3 text-emerald-500" />
                          </div>
                          {feature}
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-3xl font-bold">$12</span>
                        <span className="text-muted-foreground">/user/month</span>
                      </div>
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/25">
                        <Sparkles className="w-4 h-4 me-2" />
                        Upgrade Now
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        14-day free trial • Cancel anytime
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pro Badge for Pro users */}
              {plan === "pro" && (
                <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-violet-500/10 border-blue-500/30">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
                        <Crown className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Pro Member</h3>
                        <p className="text-muted-foreground">Thank you for your support!</p>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <QuickAction icon={Bell} label="Notification Settings" />
                  <QuickAction icon={Globe} label="Language & Region" />
                  <QuickAction icon={Palette} label="Appearance" />
                </CardContent>
              </Card>

              {/* Referral Card */}
              <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <Gift className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Invite Friends</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get 1 month free for each friend who signs up!
                      </p>
                      <Button variant="outline" size="sm" className="mt-3 gap-2">
                        Share Link
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="max-w-3xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>Manage your subscription and payment methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${plan === "free" ? "bg-muted" : "bg-gradient-to-br from-blue-500 to-violet-600"}`}>
                      {plan === "free" ? <User className="w-6 h-6" /> : <Crown className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{planInfo.name} Plan</p>
                      <p className="text-sm text-muted-foreground">{planInfo.price}</p>
                    </div>
                  </div>
                  {plan === "free" ? (
                    <Button className="bg-gradient-to-r from-blue-600 to-violet-600">
                      Upgrade
                    </Button>
                  ) : (
                    <Button variant="outline">Manage</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "security" && (
          <div className="max-w-3xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Keep your account safe and secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SecurityItem 
                  icon={Lock} 
                  title="Password" 
                  description="Change your password"
                  action="Change"
                />
                <SecurityItem 
                  icon={Shield} 
                  title="Two-Factor Authentication" 
                  description="Add an extra layer of security"
                  action="Enable"
                />
                <SecurityItem 
                  icon={Mail} 
                  title="Email Verification" 
                  description="Your email is verified"
                  verified
                />
              </CardContent>
            </Card>

            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="text-red-500 flex items-center gap-2">
                  <X className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm">Delete</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sign Out Section */}
        <div className="mt-8 pt-8 border-t">
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const QuickStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  limit, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  limit: string;
  color: "blue" | "violet" | "emerald" | "amber";
}) => {
  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/20 text-blue-500",
    violet: "from-violet-500/20 to-violet-600/20 text-violet-500",
    emerald: "from-emerald-500/20 to-emerald-600/20 text-emerald-500",
    amber: "from-amber-500/20 to-amber-600/20 text-amber-500",
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color].split(" ")[0]} ${colorClasses[color].split(" ")[1]} opacity-50`} />
      <CardContent className="relative pt-6">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]} w-fit mb-3`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{limit}</p>
      </CardContent>
    </Card>
  );
};

const LimitItem = ({ 
  icon: Icon, 
  label, 
  value, 
  available 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  available: boolean;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
    <div className={`p-2 rounded-lg ${available ? "bg-emerald-500/10" : "bg-muted"}`}>
      <Icon className={`w-4 h-4 ${available ? "text-emerald-500" : "text-muted-foreground"}`} />
    </div>
    <div>
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs text-muted-foreground">{value}</p>
    </div>
  </div>
);

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  available 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  available: boolean;
}) => (
  <div className={`p-4 rounded-xl border transition-all ${
    available 
      ? "bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-500/40" 
      : "bg-muted/50 border-transparent opacity-60"
  }`}>
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${available ? "bg-emerald-500/10" : "bg-muted"}`}>
        <Icon className={`w-5 h-5 ${available ? "text-emerald-500" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{title}</p>
          {!available && (
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
              Pro
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      {available && <Check className="w-5 h-5 text-emerald-500" />}
    </div>
  </div>
);

const QuickAction = ({ 
  icon: Icon, 
  label, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick?: () => void;
}) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="text-sm">{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
  </button>
);

const SecurityItem = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  verified,
  onClick 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  action?: string;
  verified?: boolean;
  onClick?: () => void;
}) => (
  <div className="flex items-center justify-between p-4 rounded-lg border">
    <div className="flex items-center gap-4">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    {verified ? (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
        <Check className="w-3 h-3 me-1" />
        Verified
      </Badge>
    ) : action && (
      <Button variant="outline" size="sm" onClick={onClick}>{action}</Button>
    )}
  </div>
);
