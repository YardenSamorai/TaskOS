"use client";

import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, Plus, Edit, ArrowRight, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRecentActivity } from "@/lib/hooks/use-tasks";

interface DashboardActivityProps {
  workspaceId: string;
}

const actionIcons: Record<string, React.ElementType> = {
  created: Plus,
  updated: Edit,
  moved: ArrowRight,
  deleted: Trash2,
  completed: CheckCircle2,
};

const actionColors: Record<string, string> = {
  created: "text-green-500 bg-green-500/10",
  updated: "text-blue-500 bg-blue-500/10",
  moved: "text-orange-500 bg-orange-500/10",
  deleted: "text-red-500 bg-red-500/10",
  completed: "text-violet-500 bg-violet-500/10",
};

export const DashboardActivity = ({ workspaceId }: DashboardActivityProps) => {
  const { data: activity = [], isLoading } = useRecentActivity(workspaceId);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground/70">
                Activity will appear here as you work
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {activity.map((item: any) => {
                const Icon = actionIcons[item.action] || Activity;
                const colorClass = actionColors[item.action] || "text-muted-foreground bg-muted";

                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={item.user?.imageUrl} />
                      <AvatarFallback className="text-xs">
                        {item.user?.name?.[0] || item.user?.email?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {item.user?.name || item.user?.email || "Unknown"}
                        </span>
                        <div className={`p-1 rounded ${colorClass}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.action} {item.task?.title && `"${item.task.title}"`}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
