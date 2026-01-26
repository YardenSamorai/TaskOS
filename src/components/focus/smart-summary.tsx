"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow, isToday, subDays } from "date-fns";
import {
  Sparkles,
  TrendingUp,
  CheckCircle2,
  PlusCircle,
  MessageSquare,
  Paperclip,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ActivityLog, User } from "@/lib/db/schema";

interface ActivityWithUser extends ActivityLog {
  user: User;
  task?: { title: string } | null;
}

interface SmartSummaryProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    dueToday: number;
  } | null;
  activity: ActivityWithUser[];
}

export const SmartSummary = ({ stats, activity }: SmartSummaryProps) => {
  const t = useTranslations("summary");

  // Generate smart insights based on activity
  const insights = useMemo(() => {
    if (!activity.length || !stats) return [];

    const messages: string[] = [];

    // Check recent completions
    const recentCompletions = activity.filter(
      (a) => a.action === "completed" || (a.action === "moved" && a.metadata?.includes('"to":"done"'))
    ).length;

    if (recentCompletions > 0) {
      messages.push(`🎉 Great progress! ${recentCompletions} tasks completed recently.`);
    }

    // Check for overdue items
    if (stats.overdue > 0) {
      messages.push(`⚠️ You have ${stats.overdue} overdue task${stats.overdue > 1 ? 's' : ''}. Consider prioritizing these.`);
    }

    // Check tasks due today
    if (stats.dueToday > 0) {
      messages.push(`📅 ${stats.dueToday} task${stats.dueToday > 1 ? 's' : ''} due today.`);
    }

    // Productivity insight
    const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    if (completionRate >= 75) {
      messages.push(`🚀 Amazing! You've completed ${Math.round(completionRate)}% of your tasks.`);
    } else if (completionRate >= 50) {
      messages.push(`💪 Good job! ${Math.round(completionRate)}% of tasks completed. Keep it up!`);
    }

    // In progress insight
    if (stats.inProgress > 3) {
      messages.push(`💡 Tip: You have ${stats.inProgress} tasks in progress. Consider focusing on fewer tasks at once.`);
    }

    return messages.slice(0, 3);
  }, [activity, stats]);

  // Count activity by type
  const activityStats = useMemo(() => {
    const counts = {
      created: 0,
      completed: 0,
      commented: 0,
      attached: 0,
    };

    activity.forEach((a) => {
      if (a.action === "created") counts.created++;
      if (a.action === "completed" || (a.action === "moved" && a.metadata?.includes('"to":"done"')))
        counts.completed++;
      if (a.action === "commented") counts.commented++;
      if (a.action === "attached") counts.attached++;
    });

    return counts;
  }, [activity]);

  if (!stats) return null;

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: CheckCircle2, label: t("tasksCompleted"), value: activityStats.completed, color: "text-emerald-500" },
            { icon: PlusCircle, label: t("tasksCreated"), value: activityStats.created, color: "text-blue-500" },
            { icon: MessageSquare, label: t("commentsAdded"), value: activityStats.commented, color: "text-violet-500" },
            { icon: Paperclip, label: t("filesUploaded"), value: activityStats.attached, color: "text-pink-500" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`${stat.color} mb-1`}>
                <stat.icon className="w-5 h-5 mx-auto" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-violet-200 dark:border-violet-800">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Insights
            </h4>
            {insights.map((insight, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                {insight}
              </p>
            ))}
          </div>
        )}

        {/* Recent activity preview */}
        {activity.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-violet-200 dark:border-violet-800">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-500" />
              Recent Activity
            </h4>
            <div className="space-y-2">
              {activity.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={item.user.imageUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {item.user.name?.[0] || item.user.email[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {item.user.name?.split(" ")[0] || item.user.email.split("@")[0]}
                    </span>{" "}
                    {item.action}{" "}
                    {item.task && (
                      <span className="font-medium text-foreground">
                        "{item.task.title.slice(0, 30)}
                        {item.task.title.length > 30 ? "..." : ""}"
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
