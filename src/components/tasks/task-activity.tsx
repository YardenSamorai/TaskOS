"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  MessageSquare,
  Paperclip,
  User,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Task, ActivityLog, User as UserType } from "@/lib/db/schema";

interface ActivityWithUser extends ActivityLog {
  user: UserType;
}

interface TaskWithActivity extends Task {
  activityLogs: ActivityWithUser[];
}

interface TaskActivityProps {
  task: TaskWithActivity;
}

const actionIcons: Record<string, React.ElementType> = {
  created: PlusCircle,
  updated: Edit,
  completed: CheckCircle2,
  moved: ArrowRight,
  commented: MessageSquare,
  attached: Paperclip,
  assigned: User,
  unassigned: User,
};

const actionColors: Record<string, string> = {
  created: "text-emerald-500 bg-emerald-500/10",
  updated: "text-blue-500 bg-blue-500/10",
  completed: "text-green-500 bg-green-500/10",
  moved: "text-orange-500 bg-orange-500/10",
  commented: "text-violet-500 bg-violet-500/10",
  attached: "text-pink-500 bg-pink-500/10",
  assigned: "text-cyan-500 bg-cyan-500/10",
  unassigned: "text-slate-500 bg-slate-500/10",
};

const getActivityDescription = (activity: ActivityWithUser) => {
  const metadata = activity.metadata ? JSON.parse(activity.metadata) : null;

  switch (activity.action) {
    case "created":
      return "created this task";
    case "moved":
      if (metadata?.from && metadata?.to) {
        return `moved from ${metadata.from.replace("_", " ")} to ${metadata.to.replace("_", " ")}`;
      }
      return "moved this task";
    case "assigned":
      return metadata?.assignee
        ? `assigned ${metadata.assignee}`
        : "assigned someone";
    case "updated":
      if (metadata?.status) {
        return `changed status to ${metadata.status.to}`;
      }
      if (metadata?.priority) {
        return `changed priority to ${metadata.priority.to}`;
      }
      return "updated this task";
    case "completed":
      return "completed this task";
    case "commented":
      return "commented";
    case "attached":
      return "added an attachment";
    default:
      return activity.action;
  }
};

export const TaskActivity = ({ task }: TaskActivityProps) => {
  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {task.activityLogs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No activity yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pe-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute start-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {task.activityLogs.map((activity) => {
                  const Icon = actionIcons[activity.action] || Activity;
                  const color = actionColors[activity.action] || "text-slate-500 bg-slate-500/10";

                  return (
                    <div key={activity.id} className="relative flex gap-3 ps-10">
                      {/* Icon */}
                      <div
                        className={`absolute start-0 w-8 h-8 rounded-full flex items-center justify-center ${color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={activity.user.image || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {activity.user.name?.[0] || activity.user.email[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">
                            {activity.user.name || activity.user.email}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {getActivityDescription(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
