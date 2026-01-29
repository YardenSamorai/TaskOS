"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteTask, updateTaskFields } from "@/lib/actions/task";
import { taskKeys } from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  creator: { name: string | null; email: string };
}

interface TaskHeaderProps {
  task: TaskWithRelations;
  locale: string;
  workspaceId: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-500",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
};

const statusColors: Record<string, string> = {
  backlog: "bg-slate-500",
  todo: "bg-blue-500",
  in_progress: "bg-orange-500",
  review: "bg-purple-500",
  done: "bg-emerald-500",
};

export const TaskHeader = ({ task, locale, workspaceId }: TaskHeaderProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("tasks");

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === task.title) {
      setEditingTitle(false);
      setEditedTitle(task.title);
      return;
    }

    setSavingTitle(true);
    try {
      const result = await updateTaskFields(task.id, { title: editedTitle.trim() });
      if (result.success) {
        toast.success("Title updated");
        await queryClient.invalidateQueries({ queryKey: taskKeys.all });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update title");
        setEditedTitle(task.title);
      }
    } catch {
      toast.error("Something went wrong");
      setEditedTitle(task.title);
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setEditingTitle(false);
      setEditedTitle(task.title);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteTask(task.id);
      if (result.success) {
        toast.success("Task deleted");
        
        // Invalidate all task-related queries to refresh the lists
        await queryClient.invalidateQueries({ queryKey: taskKeys.all });
        await queryClient.invalidateQueries({ queryKey: taskKeys.stats(workspaceId) });
        await queryClient.invalidateQueries({ queryKey: taskKeys.activity(workspaceId) });
        
        router.push(`/${locale}/app/${workspaceId}/tasks`);
      } else {
        toast.error(result.error || "Failed to delete task");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-4 min-w-0 flex-1">
          {/* Back link */}
          <Link
            href={`/${locale}/app/${workspaceId}/board`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back to Board</span>
            <span className="xs:hidden">Back</span>
          </Link>

          {/* Title & badges */}
          <div className="space-y-3">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleSaveTitle}
                  disabled={savingTitle}
                  className="text-xl sm:text-2xl md:text-3xl font-bold h-auto py-1 px-2 flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  className="shrink-0"
                >
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingTitle(false);
                    setEditedTitle(task.title);
                  }}
                  disabled={savingTitle}
                  className="shrink-0"
                >
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="group flex items-start gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{task.title}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => setEditingTitle(true)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${statusColors[task.status]}`} />
                <span className="text-sm font-medium capitalize">
                  {task.status.replace("_", " ")}
                </span>
              </div>
              <Badge variant="secondary" className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                Created by {task.creator.name || task.creator.email}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyLink}>
              <Copy className="w-4 h-4 me-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ExternalLink className="w-4 h-4 me-2" />
              Open in New Tab
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 me-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task
              and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
