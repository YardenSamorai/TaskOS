"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  FolderPlus,
  Rocket,
  Users,
  ListTodo,
  Calendar,
  LayoutDashboard,
  Kanban,
  Crown,
  Shield,
  User,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Plus,
  BarChart3,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { getWorkspaceStats } from "@/lib/actions/task";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface WorkspaceWithRole {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  role: string;
  createdAt: string;
}

interface WorkspaceStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  dueToday: number;
}

const roleConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  owner: { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Owner" },
  admin: { icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10", label: "Admin" },
  member: { icon: User, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Member" },
  viewer: { icon: Eye, color: "text-slate-400", bg: "bg-slate-400/10", label: "Viewer" },
};

const getGradient = (name: string) => {
  const gradients = [
    "from-blue-500 to-cyan-500",
    "from-violet-500 to-purple-500",
    "from-emerald-500 to-green-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
};

const StatBadge = ({ icon: Icon, value, label, color }: { icon: React.ElementType; value: number; label: string; color: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={cn("w-5 h-5 rounded flex items-center justify-center", color.replace("text-", "bg-").replace("500", "500/10"))}>
      <Icon className={cn("w-3 h-3", color)} />
    </div>
    <span className="text-sm font-semibold">{value}</span>
    <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
  </div>
);

const WorkspaceOverviewCard = ({
  workspace,
  locale,
}: {
  workspace: WorkspaceWithRole;
  locale: string;
}) => {
  const gradient = getGradient(workspace.name);
  const roleInfo = roleConfig[workspace.role] || roleConfig.member;
  const RoleIcon = roleInfo.icon;

  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getWorkspaceStats(workspace.id);
        if (!cancelled && result.success && result.stats) {
          setStats(result.stats as WorkspaceStats);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [workspace.id]);

  const completionRate = stats && stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <Card className="group relative overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:border-primary/30">
      <div className={cn("h-1 w-full bg-gradient-to-r", gradient)} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
              gradient
            )}>
              <span className="text-lg font-bold text-white">
                {workspace.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <Link
                href={`/${locale}/app/${workspace.id}/dashboard`}
                className="text-base font-bold hover:text-primary transition-colors line-clamp-1 block"
              >
                {workspace.name}
              </Link>
              <div className={cn(
                "flex items-center gap-1 text-[11px] font-medium mt-0.5",
                roleInfo.color
              )}>
                <RoleIcon className="w-3 h-3" />
                <span>{roleInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        {workspace.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
            {workspace.description}
          </p>
        )}

        {statsLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{stats.total} tasks</span>
                <span className="font-medium">{completionRate}% done</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", gradient)}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Stat badges */}
            <div className="flex items-center gap-3 flex-wrap">
              {stats.overdue > 0 && (
                <StatBadge icon={AlertTriangle} value={stats.overdue} label="overdue" color="text-red-500" />
              )}
              {stats.dueToday > 0 && (
                <StatBadge icon={Clock} value={stats.dueToday} label="today" color="text-amber-500" />
              )}
              <StatBadge icon={TrendingUp} value={stats.inProgress} label="active" color="text-blue-500" />
              <StatBadge icon={CheckCircle2} value={stats.completed} label="done" color="text-emerald-500" />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No task data available</p>
        )}

        {/* Quick links */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border">
          <Link href={`/${locale}/app/${workspace.id}/dashboard`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full gap-1 h-7 text-xs">
              <LayoutDashboard className="w-3 h-3" />
              Dashboard
            </Button>
          </Link>
          <Link href={`/${locale}/app/${workspace.id}/board`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full gap-1 h-7 text-xs">
              <Kanban className="w-3 h-3" />
              Board
            </Button>
          </Link>
          <Link href={`/${locale}/app/${workspace.id}/tasks`} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full gap-1 h-7 text-xs">
              <ListTodo className="w-3 h-3" />
              Tasks
            </Button>
          </Link>
          <Link href={`/${locale}/app/${workspace.id}/settings`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

const AllWorkspacesPage = () => {
  const { locale } = useParams() as { locale: string };
  const { data: session } = useSession();

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  const { data: workspaces = [], isLoading } = useWorkspaces();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] || "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspaces...</p>
        </div>
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto shadow-xl">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">
              {greeting}{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-xl text-muted-foreground">
              Welcome to TaskOS. Create your first workspace to get started.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {[
              { icon: ListTodo, color: "blue", title: "Manage Tasks", desc: "Create, organize, and track your tasks with ease" },
              { icon: Users, color: "emerald", title: "Collaborate", desc: "Work together with your team in real-time" },
              { icon: Calendar, color: "violet", title: "Stay Organized", desc: "Calendar view, deadlines, and reminders" },
              { icon: BarChart3, color: "amber", title: "Track Progress", desc: "Visual pipelines and completion metrics" },
            ].map((f) => (
              <Card key={f.title}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg bg-${f.color}-500/10`}>
                      <f.icon className={`w-5 h-5 text-${f.color}-500`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            size="lg"
            className="gap-2 text-lg px-8 h-14"
            onClick={() => setCreateWorkspaceOpen(true)}
          >
            <FolderPlus className="w-5 h-5" />
            Create Your First Workspace
          </Button>
        </div>

        <CreateWorkspaceDialog
          open={createWorkspaceOpen}
          onOpenChange={setCreateWorkspaceOpen}
          locale={locale}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} overview
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateWorkspaceOpen(true)}>
          <Plus className="w-4 h-4" />
          New Workspace
        </Button>
      </div>

      {/* Workspace Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Your Workspaces</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(workspaces as WorkspaceWithRole[]).map((workspace) => (
            <WorkspaceOverviewCard
              key={workspace.id}
              workspace={workspace}
              locale={locale}
            />
          ))}
        </div>
      </div>

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        locale={locale}
      />
    </div>
  );
};

export default AllWorkspacesPage;
