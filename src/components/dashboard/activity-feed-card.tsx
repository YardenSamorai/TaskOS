"use client";

import { Activity, Plus, ArrowRight, Trash2, GitMerge, Edit, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  metadata?: string | null;
  createdAt: string;
  user?: { id: string; name: string | null; image: string | null } | null;
  task?: { id: string; title: string } | null;
}

interface ActivityFeedCardProps {
  activity: ActivityLog[];
}

const actionConfig: Record<string, { icon: React.ReactNode; verb: string; color: string }> = {
  created: {
    icon: <Plus className="w-3 h-3" />,
    verb: "created",
    color: "text-emerald-500",
  },
  updated: {
    icon: <Edit className="w-3 h-3" />,
    verb: "updated",
    color: "text-blue-500",
  },
  deleted: {
    icon: <Trash2 className="w-3 h-3" />,
    verb: "deleted",
    color: "text-red-500",
  },
  moved: {
    icon: <GitMerge className="w-3 h-3" />,
    verb: "moved",
    color: "text-violet-500",
  },
  reviewed: {
    icon: <Eye className="w-3 h-3" />,
    verb: "reviewed",
    color: "text-amber-500",
  },
};

export const ActivityFeedCard = ({ activity }: ActivityFeedCardProps) => {
  const items = activity.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity
          </p>
        ) : (
          <div className="space-y-0">
            {items.map((item, idx) => {
              const config = actionConfig[item.action] || {
                icon: <ArrowRight className="w-3 h-3" />,
                verb: item.action,
                color: "text-muted-foreground",
              };

              let detail = "";
              if (item.action === "moved") {
                try {
                  const meta = item.metadata ? JSON.parse(item.metadata) : null;
                  if (meta?.from && meta?.to) {
                    detail = `${meta.from} → ${meta.to}`;
                  }
                } catch {
                  // ignore
                }
              }

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2.5 py-2.5",
                    idx < items.length - 1 && "border-b border-border/50"
                  )}
                >
                  <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                    <AvatarImage src={item.user?.image || undefined} />
                    <AvatarFallback className="text-[9px] bg-muted">
                      {item.user?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">
                      <span className="font-medium">{item.user?.name || "Someone"}</span>
                      {" "}
                      <span className={cn("inline-flex items-center gap-0.5", config.color)}>
                        {config.icon}
                        {config.verb}
                      </span>
                      {" "}
                      {item.task ? (
                        <span className="text-muted-foreground truncate">
                          {item.task.title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">a {item.entityType}</span>
                      )}
                    </p>
                    {detail && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
