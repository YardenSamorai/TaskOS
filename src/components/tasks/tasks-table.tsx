"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format, parseISO, isPast, isToday } from "date-fns";
import {
  Calendar,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Plus,
  ListTodo,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateTaskDialog } from "./create-task-dialog";
import { cn } from "@/lib/utils";
import type { Task, User, WorkspaceMember } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: User }[];
  steps: { id: string; completed: boolean }[];
}

interface TasksTableProps {
  tasks: TaskWithRelations[];
  locale: string;
  workspaceId: string;
  members: (WorkspaceMember & { user: User })[];
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

export const TasksTable = ({ tasks, locale, workspaceId, members }: TasksTableProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const t = useTranslations("tasks");

  if (tasks.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-lg bg-muted/30">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ListTodo className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t("noTasks")}</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {t("noTasksDescription")}
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {t("create")}
          </Button>
        </div>
        <CreateTaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          workspaceId={workspaceId}
          locale={locale}
          members={members}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("create")}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">{t("taskTitle")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("priority")}</TableHead>
              <TableHead>{t("assignees")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const isOverdue =
                task.dueDate &&
                isPast(parseISO(task.dueDate)) &&
                !isToday(parseISO(task.dueDate)) &&
                task.status !== "done";

              const completedSteps = task.steps.filter((s) => s.completed).length;
              const totalSteps = task.steps.length;

              return (
                <TableRow key={task.id} className="group">
                  <TableCell>
                    <Link
                      href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}
                      className="flex flex-col hover:text-primary transition-colors"
                    >
                      <span className="font-medium">{task.title}</span>
                      {totalSteps > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {completedSteps}/{totalSteps} steps
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", statusColors[task.status])} />
                      <span className="text-sm capitalize">
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.assignees.length > 0 ? (
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee) => (
                          <Avatar
                            key={assignee.id}
                            className="w-7 h-7 border-2 border-background"
                          >
                            <AvatarImage src={assignee.user.imageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {assignee.user.name?.[0] || assignee.user.email[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <span
                        className={cn(
                          "text-sm flex items-center gap-1",
                          isOverdue ? "text-red-500" : "text-muted-foreground"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {isToday(parseISO(task.dueDate))
                          ? "Today"
                          : format(parseISO(task.dueDate), "MMM d")}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}>
                            <ExternalLink className="w-4 h-4 me-2" />
                            Open
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 me-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        locale={locale}
        members={members}
      />
    </>
  );
};
