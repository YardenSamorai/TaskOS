"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Loader2, 
  ArrowUpRight, 
  Users, 
  Activity, 
  Calendar, 
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Target,
  TrendingUp,
  CalendarDays,
  Bell,
  ChevronRight,
  ListTodo,
  Timer,
  Zap,
  Flag,
  CircleDot,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { useWorkspaceStats, useTasks, useRecentActivity } from "@/lib/hooks/use-tasks";
import { ProjectAnalyticsChart } from "@/components/dashboard/project-analytics-chart";
import { TimeTracker } from "@/components/dashboard/time-tracker";
import { formatDistanceToNow, format, isToday, isTomorrow, isPast } from "date-fns";
import { getPersonalDashboardData, PersonalDashboardData } from "@/lib/actions/dashboard";

// Priority colors
const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200" },
  medium: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200" },
  high: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200" },
  urgent: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", border: "border-red-200" },
};

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

// Motivational quotes
const motivationalQuotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Your focus determines your reality.", author: "George Lucas" },
  { text: "Small daily improvements are the key to long-term results.", author: "Unknown" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is the sum of small efforts repeated daily.", author: "Robert Collier" },
  { text: "Progress, not perfection.", author: "Unknown" },
];

const DashboardPage = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const { data, isLoading } = useWorkspace(workspaceId);
  const { data: stats } = useWorkspaceStats(workspaceId);
  const { data: tasks = [] } = useTasks(workspaceId);
  const { data: activity = [] } = useRecentActivity(workspaceId);
  
  const [personalData, setPersonalData] = useState<PersonalDashboardData | null>(null);
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [quote] = useState(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

  const workspace = data?.workspace;
  const members = data?.members || [];

  // Fetch personal dashboard data
  useEffect(() => {
    const fetchPersonalData = async () => {
      try {
        const data = await getPersonalDashboardData(workspaceId);
        setPersonalData(data);
      } catch (error) {
        console.error("Error fetching personal dashboard data:", error);
      } finally {
        setLoadingPersonal(false);
      }
    };
    fetchPersonalData();
  }, [workspaceId]);

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

  // Calculate completion percentage
  const completionPercent = personalData?.myTasks.total 
    ? Math.round((personalData.myTasks.completed / personalData.myTasks.total) * 100) 
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Quote */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-violet-500/5 to-background border p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Welcome back! Here&apos;s your overview for <span className="font-medium text-foreground">{workspace.name}</span>
            </p>
            <div className="mt-3 flex items-start gap-2 max-w-lg">
              <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground italic">
                &ldquo;{quote.text}&rdquo; — <span className="text-foreground/70">{quote.author}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/app/${workspaceId}/tasks`}>
              <Button variant="outline" className="gap-2" size="sm">
                <ListTodo className="w-4 h-4" />
                <span className="hidden sm:inline">All Tasks</span>
                <span className="sm:hidden">Tasks</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Personal Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* My Tasks */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-violet-500/10" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Tasks</p>
                <p className="text-2xl font-bold">{personalData?.myTasks.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className={`relative overflow-hidden ${(personalData?.myTasks.overdue || 0) > 0 ? 'border-red-200 dark:border-red-900' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-500">{personalData?.myTasks.overdue || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Due Today */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/10" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-amber-500">{personalData?.myTasks.dueToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <Timer className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-violet-500">{personalData?.myTasks.inProgress || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-emerald-500">{personalData?.myTasks.completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {(personalData?.myTasks.total || 0) > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: "var(--accent-color)" }} />
                <span className="text-sm font-medium">My Completion Rate</span>
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--accent-color)" }}>
                {completionPercent}%
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${completionPercent}%`,
                  background: "linear-gradient(90deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, #10b981))"
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                Upcoming Deadlines
              </CardTitle>
              <Link href={`/${locale}/app/${workspaceId}/calendar`}>
                <Button variant="ghost" size="sm" className="gap-1">
                  View Calendar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <CardDescription>Tasks with due dates assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPersonal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (personalData?.upcomingDeadlines.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No upcoming deadlines</p>
                <p className="text-sm">Tasks with due dates will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {personalData?.upcomingDeadlines.map((task) => (
                  <Link
                    key={task.id}
                    href={`/${locale}/app/${task.workspaceId}/tasks/${task.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`w-1.5 h-12 rounded-full ${
                      task.isOverdue ? "bg-red-500" :
                      task.daysUntilDue === 0 ? "bg-amber-500" :
                      task.daysUntilDue <= 2 ? "bg-orange-500" :
                      "bg-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${priorityColors[task.priority].bg} ${priorityColors[task.priority].text}`}
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {statusLabels[task.status]}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        task.isOverdue ? "text-red-500" :
                        task.daysUntilDue === 0 ? "text-amber-500" :
                        "text-muted-foreground"
                      }`}>
                        {task.isOverdue 
                          ? `${Math.abs(task.daysUntilDue)} days overdue`
                          : task.daysUntilDue === 0 
                            ? "Due today"
                            : task.daysUntilDue === 1
                              ? "Due tomorrow"
                              : `${task.daysUntilDue} days left`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Comments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-500" />
              Recent Comments
            </CardTitle>
            <CardDescription>Comments on your tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPersonal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (personalData?.recentComments.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No recent comments</p>
                <p className="text-sm">Comments on your tasks will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {personalData?.recentComments.slice(0, 5).map((comment) => (
                  <Link
                    key={comment.id}
                    href={`/${locale}/app/${comment.workspaceId}/tasks/${comment.taskId}`}
                    className="block p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs">
                          {comment.author.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.author.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          on "{comment.taskTitle}"
                        </p>
                        <p className="text-sm mt-1 line-clamp-2">{comment.content.replace(/<[^>]*>/g, '')}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity on My Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Activity on My Tasks
              </CardTitle>
            </div>
            <CardDescription>Recent actions by team members on your tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPersonal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (personalData?.myTaskActivity.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No recent activity</p>
                <p className="text-sm">Activity on your tasks will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {personalData?.myTaskActivity.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={item.user.image || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm">
                        {item.user.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{item.user.name}</span>
                        <span className="text-muted-foreground"> {item.action}</span>
                        {item.taskTitle && (
                          <span className="font-medium"> "{item.taskTitle}"</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Task Distribution */}
        <div className="space-y-6">
          {/* Task Distribution by Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CircleDot className="w-4 h-4" />
                My Tasks by Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {personalData?.tasksByStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-muted-foreground">
                    {statusLabels[item.status]}
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status === "done" ? "bg-emerald-500" :
                        item.status === "in_progress" ? "bg-violet-500" :
                        item.status === "review" ? "bg-amber-500" :
                        item.status === "todo" ? "bg-blue-500" :
                        "bg-slate-400"
                      }`}
                      style={{ 
                        width: `${personalData.myTasks.total > 0 ? (item.count / personalData.myTasks.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <div className="w-8 text-sm font-medium text-right">{item.count}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/${locale}/app/my-day`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Zap className="w-4 h-4" style={{ color: "var(--accent-color)" }} />
                  My Day
                </Button>
              </Link>
              <Link href={`/${locale}/app/${workspaceId}/board`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Activity className="w-4 h-4" />
                  Kanban Board
                </Button>
              </Link>
              <Link href={`/${locale}/app/${workspaceId}/calendar`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Calendar className="w-4 h-4" />
                  Calendar View
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

          {/* Time Tracker */}
          <TimeTracker />
        </div>
      </div>

      {/* Team Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Overview
            </CardTitle>
            <Link href={`/${locale}/app/${workspaceId}/members`}>
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {members.slice(0, 8).map((member: any) => {
              const memberTasks = tasks.filter((t: any) => 
                t.assignees?.some((a: any) => a.userId === member.userId)
              );
              const completedCount = memberTasks.filter((t: any) => t.status === "done").length;
              const inProgressCount = memberTasks.filter((t: any) => t.status === "in_progress").length;
              
              return (
                <div key={member.userId} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.user?.image} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                      {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {member.user?.name || member.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {memberTasks.length} tasks • {completedCount} done
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
