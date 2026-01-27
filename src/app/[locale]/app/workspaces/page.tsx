"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Sun,
  Sparkles,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Rocket,
  Users,
  FolderKanban,
  Zap,
  Star,
  BookOpen,
  MessageSquare,
  Timer,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { WorkspacesEmpty } from "@/components/workspaces/workspaces-empty";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { cn } from "@/lib/utils";

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", emoji: "☀️" };
  if (hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (hour < 21) return { text: "Good evening", emoji: "🌅" };
  return { text: "Good night", emoji: "🌙" };
};

// Motivational quotes for productivity
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Small daily improvements are the key to long-term results.", author: "Unknown" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Your focus determines your reality.", author: "George Lucas" },
];

// Quick action card
const QuickActionCard = ({
  icon: Icon,
  title,
  description,
  href,
  gradient,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  gradient: string;
  onClick?: () => void;
}) => {
  const content = (
    <Card className="group cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-all hover:border-primary/20 h-full">
      <CardContent className="p-5">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", gradient)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (onClick) {
    return <button onClick={onClick} className="text-left w-full">{content}</button>;
  }

  return <Link href={href || "#"}>{content}</Link>;
};

// Tip card
const TipCard = ({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) => (
  <div className="flex gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

const WorkspacesPage = () => {
  const params = useParams();
  const locale = params.locale as string;
  const { data: session } = useSession();
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const t = useTranslations("workspaces");

  const [createOpen, setCreateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const greeting = mounted ? getGreeting() : { text: "Hello", emoji: "👋" };
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  // Calculate some stats
  const totalWorkspaces = workspaces.length;
  const ownedWorkspaces = workspaces.filter((w: any) => w.role === "owner").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Sun className="w-4 h-4" />
              <span>{new Date().toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {greeting.text}, {firstName}! {greeting.emoji}
            </h1>
            <p className="text-muted-foreground max-w-lg">
              &ldquo;{quote.text}&rdquo; — <span className="text-foreground/70">{quote.author}</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/${locale}/app/my-day`}>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Target className="w-4 h-4" />
                My Day
              </Button>
            </Link>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("create")}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionCard
            icon={Plus}
            title="New Workspace"
            description="Create a new project space"
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
            onClick={() => setCreateOpen(true)}
          />
          <QuickActionCard
            icon={Target}
            title="My Day"
            description="Focus on today's tasks"
            href={`/${locale}/app/my-day`}
            gradient="bg-gradient-to-br from-violet-500 to-purple-500"
          />
          <QuickActionCard
            icon={Timer}
            title="Start Focus"
            description="Begin a Pomodoro session"
            href={`/${locale}/app/my-day`}
            gradient="bg-gradient-to-br from-orange-500 to-red-500"
          />
          <QuickActionCard
            icon={Calendar}
            title="View Calendar"
            description="See upcoming deadlines"
            href={workspaces[0] ? `/${locale}/app/${workspaces[0].id}/calendar` : `/${locale}/app/my-day`}
            gradient="bg-gradient-to-br from-emerald-500 to-green-500"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Workspaces Section - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary" />
              {t("title")}
              {totalWorkspaces > 0 && (
                <span className="text-sm font-normal text-muted-foreground">({totalWorkspaces})</span>
              )}
            </h2>
            {totalWorkspaces > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !workspaces || workspaces.length === 0 ? (
            <WorkspacesEmpty locale={locale} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {workspaces.map((workspace: any) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Tips & Stats */}
        <div className="space-y-6">
          {/* Stats Card */}
          {totalWorkspaces > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Your Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FolderKanban className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalWorkspaces}</p>
                      <p className="text-xs text-muted-foreground">Total Workspaces</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{ownedWorkspaces}</p>
                      <p className="text-xs text-muted-foreground">Owned by You</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalWorkspaces - ownedWorkspaces}</p>
                      <p className="text-xs text-muted-foreground">Shared with You</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TipCard
                icon={Target}
                title="Use Process Mode"
                description="Break complex tasks into stages for better tracking"
                color="bg-emerald-500"
              />
              <TipCard
                icon={Timer}
                title="Try Pomodoro"
                description="Work in 25-min focused sessions with breaks"
                color="bg-orange-500"
              />
              <TipCard
                icon={MessageSquare}
                title="Real-time Updates"
                description="Comments and changes sync instantly with your team"
                color="bg-blue-500"
              />
              <TipCard
                icon={Sparkles}
                title="AI Enhancement"
                description="Let AI improve your task descriptions"
                color="bg-violet-500"
              />
            </CardContent>
          </Card>

          {/* Getting Started Card - Show for new users */}
          {totalWorkspaces === 0 && (
            <Card className="border-dashed border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-primary" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-sm">Create your first workspace</p>
                    <p className="text-xs text-muted-foreground">A workspace is your project home</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Add your first task</p>
                    <p className="text-xs text-muted-foreground">Break your project into actionable items</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Invite your team</p>
                    <p className="text-xs text-muted-foreground">Collaborate and track progress together</p>
                  </div>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="w-full gap-2 mt-2">
                  <Plus className="w-4 h-4" />
                  Create Workspace
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                Keyboard Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { keys: ["⌘", "K"], action: "Quick search" },
                { keys: ["⌘", "N"], action: "New task" },
                { keys: ["⌘", "B"], action: "Toggle sidebar" },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{shortcut.action}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd key={j} className="px-2 py-1 rounded bg-muted text-xs font-mono">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} locale={locale} />
    </div>
  );
};

export default WorkspacesPage;
