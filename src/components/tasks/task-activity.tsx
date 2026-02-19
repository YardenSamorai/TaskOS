"use client";

import { useEffect, useState, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  MessageSquare,
  Paperclip,
  User,
  Edit,
  Loader2,
  Clock,
  Tag,
  GitCommit,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getTaskActivityCount, getActivityDetail } from "@/lib/actions/task";
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
  "agent.log": FileText,
  "agent.completed": CheckCircle2,
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
  "agent.log": "text-indigo-500 bg-indigo-500/10",
  "agent.completed": "text-green-500 bg-green-500/10",
};

const actionLabels: Record<string, string> = {
  created: "Task Created",
  updated: "Task Updated",
  completed: "Task Completed",
  moved: "Status Changed",
  commented: "Comment Added",
  attached: "Attachment Added",
  assigned: "Assignee Added",
  unassigned: "Assignee Removed",
  "agent.log": "Agent Log",
  "agent.completed": "Agent Completed",
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
    case "agent.log":
      return metadata?.summary
        ? metadata.summary.length > 80
          ? metadata.summary.substring(0, 80) + "…"
          : metadata.summary
        : "logged progress";
    case "agent.completed":
      return metadata?.summary
        ? metadata.summary.length > 80
          ? metadata.summary.substring(0, 80) + "…"
          : metadata.summary
        : "completed via agent";
    default:
      return activity.action;
  }
};

// ── Metadata key/value renderer ──

const HIDDEN_METADATA_KEYS = new Set(["_dedupeKey"]);

function MetadataSection({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(
    ([key]) => !HIDDEN_METADATA_KEYS.has(key)
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5" />
        Metadata
      </h4>
      <div className="rounded-lg border bg-muted/40 divide-y">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-3 px-3 py-2 text-sm">
            <span className="font-mono text-muted-foreground min-w-[100px] shrink-0">
              {key}
            </span>
            <span className="break-all">
              {renderMetadataValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderMetadataValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }
  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{String(value)}</Badge>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">[]</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, i) => (
          <Badge key={i} variant="outline" className="font-mono text-xs">
            {String(item)}
          </Badge>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <pre className="text-xs bg-muted rounded p-1.5 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return String(value);
}

// ── Activity Detail Dialog ──

interface ActivityDetailData {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | Date;
  user: { id: string; name: string | null; email: string; image: string | null } | null;
}

function ActivityDetailDialog({
  open,
  onOpenChange,
  taskId,
  activityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  activityId: string | null;
}) {
  const [data, setData] = useState<ActivityDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await getActivityDetail(taskId, activityId);
      if (result.success && result.activity) {
        setData(result.activity as ActivityDetailData);
      } else {
        setError(result.error || "Failed to load activity");
      }
    } catch {
      setError("Failed to load activity details");
    } finally {
      setLoading(false);
    }
  }, [taskId, activityId]);

  useEffect(() => {
    if (open && activityId) {
      fetchDetail();
    }
    if (!open) {
      setData(null);
      setError(null);
    }
  }, [open, activityId, fetchDetail]);

  const Icon = data ? (actionIcons[data.action] || Activity) : Activity;
  const color = data ? (actionColors[data.action] || "text-slate-500 bg-slate-500/10") : "";
  const label = data ? (actionLabels[data.action] || data.action) : "Activity";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {data && (
              <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </span>
            )}
            {label}
          </DialogTitle>
          <DialogDescription>
            {data?.user && (
              <span>
                By {data.user.name || data.user.email}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive py-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Timestamp */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {format(new Date(data.createdAt), "MMMM d, yyyy 'at' HH:mm:ss")}
              </span>
              <span className="text-xs">
                ({formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })})
              </span>
            </div>

            {/* Event info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Event Type</span>
                <Badge variant="outline">{data.action}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-0.5">Entity Type</span>
                <Badge variant="outline">{data.entityType}</Badge>
              </div>
            </div>

            {/* Summary / message (agent logs) */}
            {data.metadata?.summary && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message
                </h4>
                <p className="text-sm bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {String(data.metadata.summary)}
                </p>
              </div>
            )}

            {/* Git info (agent logs) */}
            {data.metadata?.gitHead && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitCommit className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono text-xs">{String(data.metadata.gitHead).substring(0, 12)}</span>
              </div>
            )}

            {/* Full metadata */}
            {data.metadata && <MetadataSection metadata={data.metadata} />}

            {/* User card */}
            {data.user && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={data.user.image || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {data.user.name?.[0] || data.user.email[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{data.user.name || data.user.email}</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Activity Count Badge ──

function ActivityCountBadge({ taskId }: { taskId: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTaskActivityCount(taskId).then((result) => {
      if (!cancelled) {
        setCount(result.count);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [taskId]);

  if (loading) {
    return (
      <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 h-5 min-w-[20px] justify-center">
        <Loader2 className="w-3 h-3 animate-spin" />
      </Badge>
    );
  }

  if (count === null || count === 0) {
    return (
      <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0 h-5 min-w-[20px] justify-center text-muted-foreground">
        0
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 h-5 min-w-[20px] justify-center">
      {count}
    </Badge>
  );
}

// ── Main Component ──

export const TaskActivity = ({ task }: TaskActivityProps) => {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleActivityClick = (activityId: string) => {
    setSelectedActivityId(activityId);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="sticky top-24">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5" />
            Activity
            <ActivityCountBadge taskId={task.id} />
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
                <div className="absolute start-4 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-4">
                  {task.activityLogs.map((activity) => {
                    const Icon = actionIcons[activity.action] || Activity;
                    const color = actionColors[activity.action] || "text-slate-500 bg-slate-500/10";

                    return (
                      <div
                        key={activity.id}
                        className="relative flex gap-3 ps-10 cursor-pointer rounded-lg py-1.5 -mx-1.5 px-1.5 transition-colors hover:bg-muted/60"
                        onClick={() => handleActivityClick(activity.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleActivityClick(activity.id);
                          }
                        }}
                      >
                        <div
                          className={`absolute start-1.5 w-8 h-8 rounded-full flex items-center justify-center ${color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

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

      <ActivityDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        taskId={task.id}
        activityId={selectedActivityId}
      />
    </>
  );
};
