"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Calendar, User, Tag, Loader2, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateTask, addAssignee, removeAssignee, updateTaskFields } from "@/lib/actions/task";
import { taskKeys } from "@/lib/hooks/use-tasks";
import type { Task, User as UserType, WorkspaceMember } from "@/lib/db/schema";
import { TaskGitHubActivity } from "@/components/github/task-github-activity";
import { CreateIssueButton } from "@/components/github/create-issue-button";
import { CreateJiraIssueButton } from "@/components/jira/create-jira-issue-button";
import { TaskEnhancer } from "@/components/ai/task-enhancer";

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
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description || "");
  const [savingDescription, setSavingDescription] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("tasks");

  const handleSaveDescription = async () => {
    if (editedDescription === (task.description || "")) {
      setEditingDescription(false);
      return;
    }

    setSavingDescription(true);
    try {
      const result = await updateTaskFields(task.id, { description: editedDescription });
      if (result.success) {
        toast.success("Description updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update description");
        setEditedDescription(task.description || "");
      }
    } catch {
      toast.error("Something went wrong");
      setEditedDescription(task.description || "");
    } finally {
      setSavingDescription(false);
      setEditingDescription(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.set("taskId", task.id);
      formData.set("status", status);
      const result = await updateTask(formData);
      if (result.success) {
        // Invalidate cache so Board updates immediately
        await queryClient.invalidateQueries({ queryKey: taskKeys.all });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch {
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
      if (result.success) {
        // Invalidate cache so Board updates immediately
        await queryClient.invalidateQueries({ queryKey: taskKeys.all });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update priority");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddAssignee = async (userId: string) => {
    setUpdating(true);
    try {
      const result = await addAssignee(task.id, userId);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: taskKeys.all });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add assignee");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    setUpdating(true);
    try {
      const result = await removeAssignee(task.id, userId);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: taskKeys.all });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to remove assignee");
      }
    } catch {
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
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t("description")}
            </h4>
            {!editingDescription && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setEditingDescription(true)}
              >
                <Pencil className="w-3.5 h-3.5 me-1" />
                Edit
              </Button>
            )}
          </div>
          {editingDescription ? (
            <div className="space-y-3">
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Add a description..."
                className="min-h-[120px]"
                disabled={savingDescription}
              />
              
              {/* AI Enhancement */}
              <TaskEnhancer
                taskDescription={editedDescription || task.title}
                onApply={(enhanced) => {
                  setEditedDescription(enhanced.description);
                }}
              />
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveDescription}
                  disabled={savingDescription}
                >
                  {savingDescription ? (
                    <Loader2 className="w-4 h-4 animate-spin me-1" />
                  ) : (
                    <Check className="w-4 h-4 me-1" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingDescription(false);
                    setEditedDescription(task.description || "");
                  }}
                  disabled={savingDescription}
                >
                  <X className="w-4 h-4 me-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : task.description ? (
            <p className="text-sm whitespace-pre-wrap">{task.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description</p>
          )}
        </div>

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
