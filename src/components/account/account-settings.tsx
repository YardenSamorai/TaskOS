"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  User, 
  Crown, 
  Sparkles, 
  Check, 
  Building2,
  HardDrive,
  Users,
  Zap,
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
  Camera,
  Sun,
  Moon,
  Monitor,
  Languages,
  Volume2,
  VolumeX,
  Smartphone,
  Laptop,
  Keyboard,
  Download,
  Trash2,
  Link2,
  Unlink,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  MessageSquare,
  AtSign,
  UserPlus,
  FileText,
  Activity,
  BellRing,
  BellOff,
  Timer,
  MapPin,
  Type,
  Contrast,
  CircleDot,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PLAN_INFO, PLAN_LIMITS } from "@/lib/plans";
import { setPassword, changePassword, checkHasPassword } from "@/lib/actions/auth";
import { 
  getNotificationPreferences, 
  updateNotificationPreferences,
  type NotificationPreferencesInput 
} from "@/lib/actions/notification-preferences";
import { toast } from "sonner";
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

type TabType = "overview" | "notifications" | "appearance" | "language" | "security" | "billing";

// Notification preferences type
interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskDueSoon: boolean;
  mentions: boolean;
  comments: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

// Appearance preferences type  
interface AppearancePreferences {
  theme: "light" | "dark" | "system";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  reducedMotion: boolean;
  compactMode: boolean;
  sidebarPosition: "left" | "right";
}

// Language preferences type
interface LanguagePreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  weekStart: "sunday" | "monday";
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  taskAssigned: true,
  taskCompleted: true,
  taskDueSoon: true,
  mentions: true,
  comments: true,
  weeklyDigest: true,
  marketingEmails: false,
  soundEnabled: true,
  desktopNotifications: true,
};

const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "system",
  accentColor: "#6366f1",
  fontSize: "medium",
  reducedMotion: false,
  compactMode: false,
  sidebarPosition: "left",
};

const DEFAULT_LANGUAGE: LanguagePreferences = {
  language: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  weekStart: "sunday",
};

const ACCENT_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Jerusalem", label: "Jerusalem (IST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export const AccountSettings = ({ user, usageStats }: AccountSettingsProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  
  // Preferences state
  const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
  const [appearance, setAppearance] = useState<AppearancePreferences>(DEFAULT_APPEARANCE);
  const [language, setLanguage] = useState<LanguagePreferences>(DEFAULT_LANGUAGE);
  
  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const plan = usageStats.plan;
  const planInfo = PLAN_INFO[plan];
  const limits = usageStats.limits;

  // Load preferences from database and localStorage
  useEffect(() => {
    // Load notification preferences from database
    getNotificationPreferences().then((result) => {
      if (result.success && result.preferences) {
        setNotifications({
          emailNotifications: result.preferences.emailNotifications,
          pushNotifications: result.preferences.pushNotifications,
          taskAssigned: result.preferences.taskAssigned,
          taskCompleted: result.preferences.taskCompleted,
          taskDueSoon: result.preferences.taskDueSoon,
          mentions: result.preferences.mentions,
          comments: result.preferences.comments,
          weeklyDigest: result.preferences.weeklyDigest,
          marketingEmails: result.preferences.marketingEmails,
          soundEnabled: result.preferences.soundEnabled,
          desktopNotifications: result.preferences.desktopNotifications,
        });
      }
    });

    // Load appearance and language from localStorage (client-side only)
    const savedAppearance = localStorage.getItem("taskos-appearance");
    const savedLanguage = localStorage.getItem("taskos-language");
    
    if (savedAppearance) {
      const parsed = JSON.parse(savedAppearance);
      setAppearance(parsed);
      if (parsed.theme) setTheme(parsed.theme);
    }
    if (savedLanguage) setLanguage(JSON.parse(savedLanguage));
    
    // Check if user has password
    checkHasPassword().then(result => setHasPassword(result.hasPassword));
  }, [setTheme]);

  // Save notification preferences to database
  const saveNotifications = async (newPrefs: NotificationPreferences) => {
    setNotifications(newPrefs);
    
    // Save to database
    const result = await updateNotificationPreferences({
      emailNotifications: newPrefs.emailNotifications,
      pushNotifications: newPrefs.pushNotifications,
      taskAssigned: newPrefs.taskAssigned,
      taskCompleted: newPrefs.taskCompleted,
      taskDueSoon: newPrefs.taskDueSoon,
      mentions: newPrefs.mentions,
      comments: newPrefs.comments,
      weeklyDigest: newPrefs.weeklyDigest,
      marketingEmails: newPrefs.marketingEmails,
      soundEnabled: newPrefs.soundEnabled,
      desktopNotifications: newPrefs.desktopNotifications,
    });

    if (result.success) {
      toast.success("Notification settings saved");
    } else {
      toast.error("Failed to save notification settings");
    }
  };

  const saveAppearance = (newPrefs: AppearancePreferences) => {
    setAppearance(newPrefs);
    localStorage.setItem("taskos-appearance", JSON.stringify(newPrefs));
    if (newPrefs.theme !== appearance.theme) {
      setTheme(newPrefs.theme);
    }
    toast.success("Appearance settings saved");
  };

  const saveLanguage = (newPrefs: LanguagePreferences) => {
    setLanguage(newPrefs);
    localStorage.setItem("taskos-language", JSON.stringify(newPrefs));
    toast.success("Language settings saved");
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setIsChangingPassword(true);

    try {
      let result;
      if (hasPassword) {
        result = await changePassword(passwordData.current, passwordData.new);
      } else {
        result = await setPassword(passwordData.new);
      }

      if (result.success) {
        toast.success(hasPassword ? "Password changed successfully" : "Password set successfully");
        setShowPasswordForm(false);
        setPasswordData({ current: "", new: "", confirm: "" });
        setHasPassword(true);
      } else {
        toast.error(result.error || "Failed to update password");
      }
    } catch (error) {
      toast.error("An error occurred");
    }

    setIsChangingPassword(false);
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

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "language", label: "Language", icon: Globe },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-violet-600/20 to-fuchsia-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full filter blur-3xl animate-pulse delay-1000" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-12">
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
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickStatCard icon={Building2} label="Workspaces" value={usageStats.usage.workspaces.toString()} limit={limits.maxWorkspaces === Infinity ? "∞" : limits.maxWorkspaces.toString()} color="blue" />
          <QuickStatCard icon={Users} label="Team Size" value={limits.maxMembersPerWorkspace === Infinity ? "∞" : limits.maxMembersPerWorkspace.toString()} limit="per workspace" color="violet" />
          <QuickStatCard icon={HardDrive} label="Storage" value={`${limits.maxFileSizeMB}MB`} limit="max file" color="emerald" />
          <QuickStatCard icon={Zap} label="AI Credits" value={limits.features.aiTaskEnhancement ? "∞" : "0"} limit={limits.features.aiTaskEnhancement ? "available" : "upgrade"} color="amber" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-muted/50 rounded-xl">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`gap-2 ${activeTab === tab.id ? "shadow-md" : ""}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <OverviewTab 
            user={user}
            usageStats={usageStats}
            plan={plan}
            planInfo={planInfo}
            limits={limits}
            workspaceUsagePercent={workspaceUsagePercent}
            onTabChange={setActiveTab}
          />
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <NotificationsTab 
            preferences={notifications}
            onSave={saveNotifications}
            isPro={plan !== "free"}
          />
        )}

        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <AppearanceTab 
            preferences={appearance}
            onSave={saveAppearance}
            theme={theme}
            setTheme={setTheme}
          />
        )}

        {/* Language Tab */}
        {activeTab === "language" && (
          <LanguageTab 
            preferences={language}
            onSave={saveLanguage}
          />
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <SecurityTab 
            user={user}
            hasPassword={hasPassword}
            showPasswordForm={showPasswordForm}
            setShowPasswordForm={setShowPasswordForm}
            passwordData={passwordData}
            setPasswordData={setPasswordData}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isChangingPassword={isChangingPassword}
            onPasswordChange={handlePasswordChange}
          />
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <BillingTab 
            plan={plan}
            planInfo={planInfo}
          />
        )}

        {/* Sign Out */}
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

// ============== TAB COMPONENTS ==============

interface OverviewTabProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  usageStats: { workspaces: number; tasks: number; collaborators: number };
  plan: string;
  planInfo: { name: string; price: string; period: string };
  limits: { workspaces: number; tasks: number; collaborators: number };
  workspaceUsagePercent: number;
  onTabChange: (tab: string) => void;
}

const OverviewTab = ({ 
  user, 
  usageStats, 
  plan, 
  planInfo, 
  limits, 
  workspaceUsagePercent,
  onTabChange 
}: OverviewTabProps) => (
  <div className="grid lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 space-y-6">
      {/* Usage Overview Card */}
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
              {planInfo.name} Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
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
              <Progress value={workspaceUsagePercent} className={`h-3 ${workspaceUsagePercent >= 80 ? "[&>div]:bg-orange-500" : "[&>div]:bg-blue-500"}`} />
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
            <LimitItem icon={Users} label="Team Members" value={limits.maxMembersPerWorkspace === Infinity ? "Unlimited" : `${limits.maxMembersPerWorkspace} per workspace`} />
            <LimitItem icon={HardDrive} label="File Storage" value={`${limits.maxFileSizeMB}MB max per file`} />
            <LimitItem icon={Clock} label="Activity History" value={limits.activityHistoryDays === Infinity ? "Unlimited" : `${limits.activityHistoryDays} days`} />
            <LimitItem icon={HardDrive} label="Files per Task" value={limits.maxFilesPerTask === Infinity ? "Unlimited" : `${limits.maxFilesPerTask} files`} />
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
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            <FeatureCard icon={Zap} title="AI Task Enhancement" description="Smart task suggestions" available={limits.features.aiTaskEnhancement} />
            <FeatureCard icon={Target} title="Process Mode" description="Advanced workflows" available={limits.features.processMode} />
            <FeatureCard icon={BarChart3} title="Advanced Filters" description="Powerful search" available={limits.features.advancedFilters} />
            <FeatureCard icon={Palette} title="Custom Tags" description="Custom labels" available={limits.features.customTags} />
            <FeatureCard icon={Shield} title="Priority Support" description="24/7 assistance" available={limits.features.prioritySupport} />
            <FeatureCard icon={Globe} title="API Access" description="Custom integrations" available={limits.features.apiAccess} />
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Sidebar */}
    <div className="space-y-6">
      {plan === "free" && (
        <Card className="relative overflow-hidden border-2 border-blue-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-fuchsia-500/10" />
          <CardHeader className="relative">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>Unlock everything</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            {["Unlimited workspaces", "AI Task Enhancement", "50 team members", "Priority support"].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="p-0.5 rounded-full bg-emerald-500/20">
                  <Check className="w-3 h-3 text-emerald-500" />
                </div>
                {f}
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold">$12</span>
                <span className="text-muted-foreground">/user/month</span>
              </div>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500">
                <Sparkles className="w-4 h-4 me-2" />
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <QuickAction icon={Bell} label="Notifications" onClick={() => onTabChange("notifications")} />
          <QuickAction icon={Globe} label="Language & Region" onClick={() => onTabChange("language")} />
          <QuickAction icon={Palette} label="Appearance" onClick={() => onTabChange("appearance")} />
          <QuickAction icon={Shield} label="Security" onClick={() => onTabChange("security")} />
          <QuickAction icon={Download} label="Export Data" badge="Pro" disabled={plan === "free"} />
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card className="bg-gradient-to-br from-slate-500/5 to-slate-600/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-500/10">
              <Keyboard className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="font-semibold">Keyboard Shortcuts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">K</kbd> to open command palette
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const NotificationsTab = ({ preferences, onSave, isPro }: { 
  preferences: NotificationPreferences; 
  onSave: (prefs: NotificationPreferences) => void;
  isPro: boolean;
}) => {
  const [local, setLocal] = useState(preferences);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
    // Request notification permission when enabling desktop notifications
    if (key === "desktopNotifications" && value && notificationPermission !== "granted") {
      const permission = await requestNotificationPermission();
      if (!permission) {
        toast.error("Notification permission denied. Please enable notifications in your browser settings.");
        return;
      }
    }
    
    const updated = { ...local, [key]: value };
    setLocal(updated);
    onSave(updated);
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("This browser doesn't support notifications");
      return false;
    }
    
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission === "granted";
  };

  const testNotification = () => {
    if (notificationPermission !== "granted") {
      toast.error("Please enable notifications first");
      return;
    }
    
    new Notification("Test Notification 🎉", {
      body: "Great! Your notifications are working correctly.",
      icon: "/icons/icon.svg",
    });
    
    if (local.soundEnabled) {
      // Play a simple notification sound
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        console.warn("Could not play notification sound");
      }
    }
    
    toast.success("Test notification sent!");
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Manage what emails you receive</CardDescription>
              </div>
            </div>
            <Switch 
              checked={local.emailNotifications} 
              onCheckedChange={(v) => updatePref("emailNotifications", v)} 
            />
          </div>
        </CardHeader>
        {local.emailNotifications && (
          <CardContent className="space-y-4">
            <NotificationToggle
              icon={UserPlus}
              title="Task Assigned"
              description="When someone assigns a task to you"
              checked={local.taskAssigned}
              onChange={(v: boolean) => updatePref("taskAssigned", v)}
            />
            <NotificationToggle
              icon={CheckCircle2}
              title="Task Completed"
              description="When a task you're following is completed"
              checked={local.taskCompleted}
              onChange={(v: boolean) => updatePref("taskCompleted", v)}
            />
            <NotificationToggle
              icon={Timer}
              title="Due Date Reminders"
              description="Reminders before task due dates"
              checked={local.taskDueSoon}
              onChange={(v: boolean) => updatePref("taskDueSoon", v)}
            />
            <NotificationToggle
              icon={AtSign}
              title="Mentions"
              description="When someone mentions you in a comment"
              checked={local.mentions}
              onChange={(v: boolean) => updatePref("mentions", v)}
            />
            <NotificationToggle
              icon={MessageSquare}
              title="Comments"
              description="New comments on your tasks"
              checked={local.comments}
              onChange={(v: boolean) => updatePref("comments", v)}
            />
            <NotificationToggle
              icon={FileText}
              title="Weekly Digest"
              description="Weekly summary of your activity"
              checked={local.weeklyDigest}
              onChange={(v: boolean) => updatePref("weeklyDigest", v)}
            />
          </CardContent>
        )}
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <BellRing className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>Browser and mobile notifications</CardDescription>
              </div>
            </div>
            <Switch 
              checked={local.pushNotifications} 
              onCheckedChange={(v) => updatePref("pushNotifications", v)} 
            />
          </div>
        </CardHeader>
        {local.pushNotifications && (
          <CardContent className="space-y-4">
            {/* Permission Status */}
            <div className="p-3 rounded-lg border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${notificationPermission === "granted" ? "bg-emerald-500/10" : notificationPermission === "denied" ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                  {notificationPermission === "granted" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : notificationPermission === "denied" ? (
                    <BellOff className="w-4 h-4 text-red-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {notificationPermission === "granted" 
                      ? "Notifications Enabled" 
                      : notificationPermission === "denied"
                      ? "Notifications Blocked"
                      : "Permission Required"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notificationPermission === "denied" 
                      ? "Please enable in browser settings"
                      : notificationPermission === "granted"
                      ? "You'll receive desktop notifications"
                      : "Click to enable notifications"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {notificationPermission === "granted" && (
                  <Button variant="outline" size="sm" onClick={testNotification}>
                    <Bell className="w-3 h-3 me-1" />
                    Test
                  </Button>
                )}
                {notificationPermission === "default" && (
                  <Button variant="outline" size="sm" onClick={requestNotificationPermission}>
                    Enable
                  </Button>
                )}
              </div>
            </div>

            <NotificationToggle
              icon={Laptop}
              title="Desktop Notifications"
              description="Show notifications on your desktop"
              checked={local.desktopNotifications}
              onChange={(v: boolean) => updatePref("desktopNotifications", v)}
              disabled={notificationPermission !== "granted"}
            />
            <NotificationToggle
              icon={Volume2}
              title="Sound Effects"
              description="Play sounds for notifications"
              checked={local.soundEnabled}
              onChange={(v: boolean) => updatePref("soundEnabled", v)}
            />
          </CardContent>
        )}
      </Card>

      {/* Marketing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Gift className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <CardTitle>Marketing Communications</CardTitle>
                <CardDescription>Product updates and special offers</CardDescription>
              </div>
            </div>
            <Switch 
              checked={local.marketingEmails} 
              onCheckedChange={(v) => updatePref("marketingEmails", v)} 
            />
          </div>
        </CardHeader>
      </Card>

      {/* Pro Feature: Notification Schedule */}
      {!isPro && (
        <Card className="border-dashed border-2 opacity-75">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Notification Schedule</h3>
                  <Badge className="bg-gradient-to-r from-blue-500 to-violet-600 text-white border-0">Pro</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Set quiet hours and custom notification schedules
                </p>
              </div>
              <Button variant="outline" size="sm">Upgrade</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const AppearanceTab = ({ preferences, onSave, theme, setTheme }: { 
  preferences: AppearancePreferences; 
  onSave: (prefs: AppearancePreferences) => void;
  theme: string | undefined;
  setTheme: (theme: string) => void;
}) => {
  const [local, setLocal] = useState(preferences);

  // Apply appearance settings to DOM
  const applyAppearance = useCallback((prefs: AppearancePreferences) => {
    const root = document.documentElement;
    
    // Accent color
    root.style.setProperty("--accent-color", prefs.accentColor);
    
    // Convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return { r: 99, g: 102, b: 241, str: "99, 102, 241" };
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return { r, g, b, str: `${r}, ${g}, ${b}` };
    };
    
    // Convert RGB to HSL
    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    const rgb = hexToRgb(prefs.accentColor);
    root.style.setProperty("--accent-color-rgb", rgb.str);
    
    // Set HSL for primary color override
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    root.style.setProperty("--accent-color-hsl", hsl);
    root.style.setProperty("--primary", hsl);
    root.setAttribute("data-accent", "true");
    
    // Font size
    const fontSizes = { small: "14px", medium: "16px", large: "18px" };
    root.style.fontSize = fontSizes[prefs.fontSize];
    root.classList.remove("font-small", "font-medium", "font-large");
    root.classList.add(`font-${prefs.fontSize}`);
    
    // Compact mode
    root.classList.toggle("compact-mode", prefs.compactMode);
    
    // Reduced motion
    root.classList.toggle("reduce-motion", prefs.reducedMotion);
  }, []);

  // Apply on mount and when preferences change
  useEffect(() => {
    applyAppearance(local);
  }, [local, applyAppearance]);

  const updatePref = <K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) => {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    onSave(updated);
    applyAppearance(updated);
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-violet-500" />
            Theme
          </CardTitle>
          <CardDescription>Choose your preferred color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "light", icon: Sun, label: "Light", desc: "Bright and clean" },
              { value: "dark", icon: Moon, label: "Dark", desc: "Easy on the eyes" },
              { value: "system", icon: Monitor, label: "System", desc: "Match your device" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => { setTheme(t.value); updatePref("theme", t.value as any); }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  theme === t.value 
                    ? "border-blue-500 bg-blue-500/5" 
                    : "border-transparent bg-muted/50 hover:bg-muted"
                }`}
              >
                <div className={`p-3 rounded-lg w-fit mb-3 ${
                  theme === t.value ? "bg-blue-500/10" : "bg-muted"
                }`}>
                  <t.icon className={`w-6 h-6 ${theme === t.value ? "text-blue-500" : "text-muted-foreground"}`} />
                </div>
                <p className="font-medium">{t.label}</p>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDot className="w-5 h-5" style={{ color: local.accentColor }} />
            Accent Color
          </CardTitle>
          <CardDescription>Personalize your interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => updatePref("accentColor", color.value)}
                className={`w-10 h-10 rounded-full transition-all ${
                  local.accentColor === color.value 
                    ? "ring-2 ring-offset-2 ring-offset-background scale-110" 
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: color.value, boxShadow: local.accentColor === color.value ? `0 0 0 2px ${color.value}` : undefined }}
                title={color.name}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font Size */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-emerald-500" />
            Font Size
          </CardTitle>
          <CardDescription>Adjust text size for readability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "small", label: "Small", sample: "Aa", size: "text-sm" },
              { value: "medium", label: "Medium", sample: "Aa", size: "text-base" },
              { value: "large", label: "Large", sample: "Aa", size: "text-lg" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => updatePref("fontSize", f.value as any)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  local.fontSize === f.value 
                    ? "border-emerald-500 bg-emerald-500/5" 
                    : "border-transparent bg-muted/50 hover:bg-muted"
                }`}
              >
                <span className={`${f.size} font-bold block mb-2`}>{f.sample}</span>
                <p className="text-sm">{f.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Options */}
      <Card>
        <CardHeader>
          <CardTitle>Display Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Contrast className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Reduced Motion</p>
                <p className="text-sm text-muted-foreground">Minimize animations</p>
              </div>
            </div>
            <Switch checked={local.reducedMotion} onCheckedChange={(v) => updatePref("reducedMotion", v)} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Compact Mode</p>
                <p className="text-sm text-muted-foreground">Show more content with less spacing</p>
              </div>
            </div>
            <Switch checked={local.compactMode} onCheckedChange={(v) => updatePref("compactMode", v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const LanguageTab = ({ preferences, onSave }: { 
  preferences: LanguagePreferences; 
  onSave: (prefs: LanguagePreferences) => void;
}) => {
  const [local, setLocal] = useState(preferences);
  const router = useRouter();
  const pathname = usePathname();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const updatePref = <K extends keyof LanguagePreferences>(key: K, value: LanguagePreferences[K]) => {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    onSave(updated);
  };

  // Handle language change with actual navigation
  const handleLanguageChange = (langCode: string) => {
    if (langCode === local.language) return;
    
    setIsChangingLanguage(true);
    updatePref("language", langCode);
    
    // Navigate to the new locale
    // The pathname looks like /en/app/account, we need to replace /en with the new locale
    const pathParts = pathname.split('/');
    if (pathParts.length > 1) {
      pathParts[1] = langCode;
    }
    const newPath = pathParts.join('/');
    
    // Use setTimeout to show the toast before navigation
    setTimeout(() => {
      router.push(newPath);
    }, 500);
  };

  // Preview current date/time with selected format
  const previewDate = new Date();
  const formatPreviewDate = (format: string) => {
    switch (format) {
      case "DD/MM/YYYY":
        return previewDate.toLocaleDateString("en-GB");
      case "YYYY-MM-DD":
        return previewDate.toLocaleDateString("en-CA");
      case "MM/DD/YYYY":
      default:
        return previewDate.toLocaleDateString("en-US");
    }
  };

  const formatPreviewTime = (format: "12h" | "24h") => {
    return previewDate.toLocaleTimeString(format === "24h" ? "en-GB" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: format === "12h",
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-blue-500" />
            Language
          </CardTitle>
          <CardDescription>Select your preferred language - the page will reload</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => ["en", "he"].includes(lang.code) ? handleLanguageChange(lang.code) : null}
                disabled={isChangingLanguage || !["en", "he"].includes(lang.code)}
                className={`p-4 rounded-xl border-2 transition-all text-center relative ${
                  local.language === lang.code 
                    ? "border-blue-500 bg-blue-500/5" 
                    : !["en", "he"].includes(lang.code)
                    ? "border-transparent bg-muted/30 opacity-50 cursor-not-allowed"
                    : "border-transparent bg-muted/50 hover:bg-muted"
                } ${isChangingLanguage ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isChangingLanguage && local.language === lang.code && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
                )}
                <span className={`text-2xl mb-2 block ${!["en", "he"].includes(lang.code) ? "grayscale" : ""}`}>{lang.flag}</span>
                <p className={`font-medium text-sm ${!["en", "he"].includes(lang.code) ? "text-muted-foreground" : ""}`}>{lang.name}</p>
                {!["en", "he"].includes(lang.code) && (
                  <Badge variant="outline" className="mt-1 text-xs bg-muted/50">Coming Soon</Badge>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Only English and Hebrew are fully supported. Other languages are coming soon.
          </p>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            Timezone
          </CardTitle>
          <CardDescription>Set your local timezone for accurate scheduling</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={local.timezone} onValueChange={(v) => updatePref("timezone", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current time in {local.timezone.split('/').pop()?.replace('_', ' ')}</p>
              <p className="text-xs text-muted-foreground">Updates when you change timezone</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold">
                {formatPreviewTime(local.timeFormat)}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {formatPreviewDate(local.dateFormat)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-500" />
            Date & Time Format
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-3 block">Date Format</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "MM/DD/YYYY", label: "01/27/2026" },
                { value: "DD/MM/YYYY", label: "27/01/2026" },
                { value: "YYYY-MM-DD", label: "2026-01-27" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => updatePref("dateFormat", f.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    local.dateFormat === f.value 
                      ? "border-violet-500 bg-violet-500/5" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <p className="font-mono text-sm">{f.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Time Format</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "12h", label: "12-hour", example: "2:30 PM" },
                { value: "24h", label: "24-hour", example: "14:30" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => updatePref("timeFormat", f.value as any)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    local.timeFormat === f.value 
                      ? "border-violet-500 bg-violet-500/5" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <p className="font-medium">{f.label}</p>
                  <p className="text-sm text-muted-foreground font-mono">{f.example}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Week Starts On</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "sunday", label: "Sunday" },
                { value: "monday", label: "Monday" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => updatePref("weekStart", f.value as any)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    local.weekStart === f.value 
                      ? "border-violet-500 bg-violet-500/5" 
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <p className="font-medium">{f.label}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface SecurityTabProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  hasPassword: boolean;
  showPasswordForm: boolean;
  setShowPasswordForm: (show: boolean) => void;
  passwordData: { current: string; new: string; confirm: string };
  setPasswordData: (data: { current: string; new: string; confirm: string }) => void;
  showPassword: { current: boolean; new: boolean; confirm: boolean };
  setShowPassword: (data: { current: boolean; new: boolean; confirm: boolean }) => void;
  isChangingPassword: boolean;
  onPasswordChange: () => void;
}

const SecurityTab = ({ 
  user, 
  hasPassword, 
  showPasswordForm, 
  setShowPasswordForm, 
  passwordData, 
  setPasswordData, 
  showPassword, 
  setShowPassword, 
  isChangingPassword, 
  onPasswordChange 
}: SecurityTabProps) => {
  const passwordRequirements = [
    { label: "8+ characters", met: passwordData.new.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(passwordData.new) },
    { label: "Lowercase", met: /[a-z]/.test(passwordData.new) },
    { label: "Number", met: /[0-9]/.test(passwordData.new) },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password
          </CardTitle>
          <CardDescription>
            {hasPassword ? "Change your password" : "Set a password to enable email sign-in"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${hasPassword ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                  {hasPassword ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{hasPassword ? "Password is set" : "No password set"}</p>
                  <p className="text-sm text-muted-foreground">
                    {hasPassword 
                      ? "You can sign in with email and password" 
                      : "You're using Google Sign-In only"
                    }
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                {hasPassword ? "Change" : "Set Password"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {hasPassword && (
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                      placeholder="Enter current password"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordData.new && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {passwordRequirements.map((req, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-full ${req.met ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                        {req.met && <Check className="w-3 h-3 inline me-1" />}
                        {req.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  placeholder="Confirm new password"
                />
                {passwordData.confirm && passwordData.new !== passwordData.confirm && (
                  <p className="text-xs text-red-500">Passwords don't match</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={onPasswordChange} disabled={isChangingPassword}>
                  {isChangingPassword && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {hasPassword ? "Update Password" : "Set Password"}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordData({ current: "", new: "", confirm: "" });
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>Manage your connected sign-in methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white border">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <Check className="w-3 h-3 me-1" />
              Connected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Shield className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security</CardDescription>
              </div>
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Laptop className="w-5 h-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Monitor className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Current Session</p>
                  <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">This device • Just now</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/30 bg-red-500/5">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" size="sm">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const BillingTab = ({ plan, planInfo }: { plan: UserPlan; planInfo: any }) => (
  <div className="max-w-3xl space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Current Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-fuchsia-500/10 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${plan === "free" ? "bg-muted" : "bg-gradient-to-br from-blue-500 to-violet-600"}`}>
                {plan === "free" ? <User className="w-8 h-8" /> : <Crown className="w-8 h-8 text-white" />}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{planInfo.name} Plan</h3>
                <p className="text-muted-foreground">{planInfo.price}</p>
              </div>
            </div>
            {plan === "free" ? (
              <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500">
                <Sparkles className="w-4 h-4 me-2" />
                Upgrade to Pro
              </Button>
            ) : (
              <Button variant="outline">Manage Subscription</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {plan !== "free" && (
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-14 h-9 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
                VISA
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/26</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">Update</Button>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Compare Plans */}
    <Card>
      <CardHeader>
        <CardTitle>Compare Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: "Free", price: "$0", features: ["3 workspaces", "5 members", "Basic features"] },
            { name: "Pro", price: "$12", features: ["Unlimited workspaces", "50 members", "AI features", "Priority support"], popular: true },
            { name: "Enterprise", price: "Custom", features: ["Everything in Pro", "SSO/SAML", "Dedicated support", "Custom contracts"] },
          ].map((p) => (
            <div key={p.name} className={`p-4 rounded-xl border-2 ${p.popular ? "border-blue-500 bg-blue-500/5" : "border-transparent bg-muted/50"}`}>
              {p.popular && (
                <Badge className="mb-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white border-0">Popular</Badge>
              )}
              <h4 className="font-bold text-lg">{p.name}</h4>
              <p className="text-2xl font-bold mt-1">{p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <ul className="mt-4 space-y-2">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============== HELPER COMPONENTS ==============

const QuickStatCard = ({ icon: Icon, label, value, limit, color }: { icon: React.ElementType; label: string; value: number; limit?: string; color: string }) => {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/20 text-blue-500",
    violet: "from-violet-500/20 to-violet-600/20 text-violet-500",
    emerald: "from-emerald-500/20 to-emerald-600/20 text-emerald-500",
    amber: "from-amber-500/20 to-amber-600/20 text-amber-500",
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-50`} />
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

const LimitItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
    <div className="p-2 rounded-lg bg-emerald-500/10">
      <Icon className="w-4 h-4 text-emerald-500" />
    </div>
    <div>
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs text-muted-foreground">{value}</p>
    </div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, description, available }: { icon: React.ElementType; title: string; description: string; available: boolean }) => (
  <div className={`p-4 rounded-xl border transition-all ${
    available ? "bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border-emerald-500/20" : "bg-muted/50 border-transparent opacity-60"
  }`}>
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${available ? "bg-emerald-500/10" : "bg-muted"}`}>
        <Icon className={`w-5 h-5 ${available ? "text-emerald-500" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{title}</p>
          {!available && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500">Pro</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      {available && <Check className="w-5 h-5 text-emerald-500" />}
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick, badge, disabled }: { icon: React.ElementType; label: string; onClick: () => void; badge?: string; disabled?: boolean }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors group ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="text-sm">{label}</span>
      {badge && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500">{badge}</Badge>}
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
  </button>
);

interface NotificationToggleProps {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const NotificationToggle = ({ icon: Icon, title, description, checked, onChange, disabled }: NotificationToggleProps) => (
  <div className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors ${disabled ? "opacity-50" : ""}`}>
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);
