"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Download, TrendingUp, ArrowUpRight, Users, CheckCircle, Clock, PauseCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useWorkspace, useWorkspaceMembers } from "@/lib/hooks/use-workspaces";
import { useWorkspaceStats, useTasks, useRecentActivity } from "@/lib/hooks/use-tasks";
import { ProjectAnalyticsChart } from "@/components/dashboard/project-analytics-chart";
import { TimeTracker } from "@/components/dashboard/time-tracker";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { format } from "date-fns";

const DashboardPage = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);

  const { data, isLoading } = useWorkspace(workspaceId);
  const { data: stats } = useWorkspaceStats(workspaceId);
  const { data: tasks = [] } = useTasks(workspaceId);
  const { data: activity = [] } = useRecentActivity(workspaceId);
  const { data: membersData } = useWorkspaceMembers(workspaceId);
  
  const workspace = data?.workspace;
  const members = membersData?.members || [];

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

  // Calculate stats
  const totalTasks = stats?.total || 0;
  const completedTasks = stats?.completed || 0;
  const inProgressTasks = stats?.inProgress || 0;
  const pendingTasks = tasks.filter((t: any) => t.status === "todo").length;

  // Mock increase data (in real app, compare with previous period)
  const statsCards = [
    {
      label: "Total Tasks",
      value: totalTasks,
      increase: "+3",
      subtitle: "Increased from last month",
      color: "text-foreground",
    },
    {
      label: "Completed",
      value: completedTasks,
      increase: `+${Math.max(1, Math.floor(completedTasks * 0.2))}`,
      subtitle: "Increased from last month",
      color: "text-emerald-500",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      increase: `+${Math.max(1, Math.floor(inProgressTasks * 0.3))}`,
      subtitle: "Increased from last month",
      color: "text-blue-500",
    },
    {
      label: "Pending",
      value: pendingTasks,
      increase: null,
      subtitle: "To discuss",
      color: "text-orange-500",
    },
  ];

  // Get team members with their current tasks
  const teamWithTasks = members.slice(0, 4).map((member: any) => {
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

  // Mock meetings data
  const meetings = [
    { name: "Daily Standup", time: "09:00 am-09:30 am", avatar: members[0]?.user?.imageUrl },
    { name: "Sprint Planning", time: "10:00 am-11:00 am", avatar: members[1]?.user?.imageUrl },
    { name: "Design Review", time: "02:00 pm-03:00 pm", avatar: members[2]?.user?.imageUrl },
    { name: "Team Sync", time: "04:00 pm-04:30 pm", avatar: members[3]?.user?.imageUrl },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Plan, prioritize, and accomplish your tasks with ease.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25"
            onClick={() => setIsCreateTaskDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
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
                    {stat.increase && (
                      <span className="text-emerald-500 text-sm font-medium">{stat.increase}</span>
                    )}
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

        {/* Meetings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Meetings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {meetings.map((meeting, index) => (
              <div key={index} className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src={meeting.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm">
                    {meeting.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{meeting.name}</p>
                  <p className="text-xs text-muted-foreground">{meeting.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              Add Meeting
            </Button>
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="w-4 h-4" />
            </Button>
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

        {/* Time Tracker & Mobile App */}
        <div className="space-y-6">
          <TimeTracker />
          
          {/* Mobile App Download Card */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <CardContent className="pt-6 relative">
              <h3 className="font-semibold text-lg">Download our Mobile App</h3>
              <p className="text-slate-400 text-sm mt-1">Stay online everywhere</p>
              <Button className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100">
                Download
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateTaskDialogOpen}
        onOpenChange={setIsCreateTaskDialogOpen}
        workspaceId={workspaceId}
        locale={locale}
        members={members}
      />
    </div>
  );
};

export default DashboardPage;
