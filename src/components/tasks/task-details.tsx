"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { Calendar, User, Tag, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateTask, addAssignee, removeAssignee } from "@/lib/actions/task";
import type { Task, User as UserType, WorkspaceMember } from "@/lib/db/schema";
import { TaskGitHubActivity } from "@/components/github/task-github-activity";
import { CreateIssueButton } from "@/components/github/create-issue-button";
import { CreateJiraIssueButton } from "@/components/jira/create-jira-issue-button";

interface TaskWithRelations extends Task {
  assignees: { id: string; userId: string; user: UserType }[];
  tags: { tag: { id: string; name: string; color: string } }[];
}

interface TaskDetailsProps {
  task: TaskWithRelations;
  members: (WorkspaceMember & { user: UserType })[];
  workspaceId: string;
}

export const TaskDetails = ({ task, members, workspaceId }: TaskDetailsProps) => {
  const [updating, setUpdating] = useState(false);
  const t = useTranslations("tasks");

  const handleStatusChange = async (status: string) => {
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.set("taskId", task.id);
      formData.set("status", status);
      const result = await updateTask(formData);
      if (!result.success) {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = async (priority: string) => {
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.set("taskId", task.id);
      formData.set("priority", priority);
      const result = await updateTask(formData);
      if (!result.success) {
        toast.error(result.error || "Failed to update priority");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddAssignee = async (userId: string) => {
    setUpdating(true);
    try {
      const result = await addAssignee(task.id, userId);
      if (!result.success) {
        toast.error(result.error || "Failed to add assignee");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    setUpdating(true);
    try {
      const result = await removeAssignee(task.id, userId);
      if (!result.success) {
        toast.error(result.error || "Failed to remove assignee");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const assignedUserIds = task.assignees.map((a) => a.userId);
  const availableMembers = members.filter((m) => !assignedUserIds.includes(m.userId));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        {task.description && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {t("description")}
            </h4>
            <p className="text-sm whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Status & Priority */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {t("status")}
            </h4>
            <Select
              value={task.status}
              onValueChange={handleStatusChange}
              disabled={updating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">{t("statuses.backlog")}</SelectItem>
                <SelectItem value="todo">{t("statuses.todo")}</SelectItem>
                <SelectItem value="in_progress">{t("statuses.in_progress")}</SelectItem>
                <SelectItem value="review">{t("statuses.review")}</SelectItem>
                <SelectItem value="done">{t("statuses.done")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {t("priority")}
            </h4>
            <Select
              value={task.priority}
              onValueChange={handlePriorityChange}
              disabled={updating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("priorities.low")}</SelectItem>
                <SelectItem value="medium">{t("priorities.medium")}</SelectItem>
                <SelectItem value="high">{t("priorities.high")}</SelectItem>
                <SelectItem value="urgent">{t("priorities.urgent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid sm:grid-cols-2 gap-4">
          {task.startDate && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {t("startDate")}
              </h4>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {format(parseISO(task.startDate), "PPP")}
              </div>
            </div>
          )}
          {task.dueDate && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {t("dueDate")}
              </h4>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {format(parseISO(task.dueDate), "PPP")}
              </div>
            </div>
          )}
        </div>

        {/* Assignees */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            {t("assignees")}
          </h4>
          <div className="space-y-2">
            {task.assignees.map((assignee) => (
              <div
                key={assignee.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={assignee.user.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {assignee.user.name?.[0] || assignee.user.email[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {assignee.user.name || assignee.user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAssignee(assignee.userId)}
                  disabled={updating}
                >
                  Remove
                </Button>
              </div>
            ))}
            {availableMembers.length > 0 && (
              <Select onValueChange={handleAddAssignee} disabled={updating}>
                <SelectTrigger>
                  <SelectValue placeholder="Add assignee..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.userId}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={member.user.image || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {member.user.name?.[0] || member.user.email[0]}
                          </AvatarFallback>
                        </Avatar>
                        {member.user.name || member.user.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {t("tags")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {task.tags.map(({ tag }) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    borderColor: `${tag.color}40`,
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Integrations */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Integrations
          </h4>
          <div className="flex flex-wrap gap-2">
            <CreateIssueButton
              taskId={task.id}
              workspaceId={workspaceId}
              taskTitle={task.title}
            />
            <CreateJiraIssueButton
              taskId={task.id}
              taskTitle={task.title}
            />
          </div>
        </div>

        {/* GitHub Activity */}
        <TaskGitHubActivity taskId={task.id} />
      </CardContent>
    </Card>
  );
};
