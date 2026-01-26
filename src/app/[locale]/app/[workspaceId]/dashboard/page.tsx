"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowUpRight, Users, Activity, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useWorkspaceStats, useTasks, useRecentActivity } from "@/lib/hooks/use-tasks";
import { ProjectAnalyticsChart } from "@/components/dashboard/project-analytics-chart";
import { TimeTracker } from "@/components/dashboard/time-tracker";
import { formatDistanceToNow } from "date-fns";

const DashboardPage = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data, isLoading } = useWorkspace(workspaceId);
  const { data: stats } = useWorkspaceStats(workspaceId);
  const { data: tasks = [] } = useTasks(workspaceId);
  const { data: activity = [] } = useRecentActivity(workspaceId);
  
  const workspace = data?.workspace;
  const members = data?.members || [];

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

  // Calculate stats from real data
  const totalTasks = stats?.total || 0;
  const completedTasks = stats?.completed || 0;
  const inProgressTasks = stats?.inProgress || 0;
  const pendingTasks = tasks.filter((t: any) => t.status === "todo").length;

  const statsCards = [
    {
      label: "Total Tasks",
      value: totalTasks,
      subtitle: "All tasks in workspace",
      color: "text-foreground",
    },
    {
      label: "Completed",
      value: completedTasks,
      subtitle: "Tasks done",
      color: "text-emerald-500",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      subtitle: "Currently working",
      color: "text-blue-500",
    },
    {
      label: "Pending",
      value: pendingTasks,
      subtitle: "To do",
      color: "text-orange-500",
    },
  ];

  // Get team members with their current tasks (real data)
  const teamWithTasks = members.slice(0, 5).map((member: any) => {
    const memberTasks = tasks.filter((t: any) => 
      t.assignees?.some((a: any) => a.userId === member.userId)
    );
    const inProgress = memberTasks.find((t: any) => t.status === "in_progress");
    return {
      ...member,
      currentTask: inProgress?.title || "No active task",
      status: inProgress ? "in_progress" : "pending",
    };
  });

  // Recent activity (real data)
  const recentActivity = activity.slice(0, 5);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {workspace.description || "Plan, prioritize, and accomplish your tasks with ease."}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index} className="bg-card hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={`text-4xl font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Project Analytics - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Project Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectAnalyticsChart tasks={tasks} />
          </CardContent>
        </Card>

        {/* Recent Activity (Real Data) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No activity yet</p>
                <p className="text-sm">Activity will appear here</p>
              </div>
            ) : (
              recentActivity.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                    <AvatarImage src={item.user?.imageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm">
                      {item.user?.name?.charAt(0) || item.user?.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.user?.name || item.user?.email || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.action} {item.task?.title ? `"${item.task.title}"` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Team Collaboration */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Collaboration
            </CardTitle>
            <Link href={`/${locale}/app/${workspaceId}/members`}>
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamWithTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No team members yet</p>
                <p className="text-sm">Invite members to collaborate</p>
              </div>
            ) : (
              teamWithTasks.map((member: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                      <AvatarImage src={member.user?.imageUrl} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                        {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.user?.name || member.user?.email || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {member.currentTask}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`${
                      member.status === "in_progress" 
                        ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20" 
                        : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                    }`}
                  >
                    {member.status === "in_progress" ? "In progress" : "Pending"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Time Tracker & Quick Links */}
        <div className="space-y-6">
          <TimeTracker />
          
          {/* Quick Links Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/${locale}/app/${workspaceId}/tasks`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Calendar className="w-4 h-4" />
                  View All Tasks
                </Button>
              </Link>
              <Link href={`/${locale}/app/${workspaceId}/board`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Activity className="w-4 h-4" />
                  Kanban Board
                </Button>
              </Link>
              <Link href={`/${locale}/app/${workspaceId}/members`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="w-4 h-4" />
                  Team Members
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
