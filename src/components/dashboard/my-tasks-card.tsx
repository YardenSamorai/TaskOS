"use client";

import { useState } from "react";
import Link from "next/link";
import { ListTodo, Plus, Maximize2, MoreHorizontal, Check, RefreshCw, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  workspaceId: string;
  createdAt?: string;
  assignees?: { user: { id: string; name: string | null; image: string | null } }[];
}

interface MyTasksCardProps {
  locale: string;
  workspaceId: string;
  tasks: Task[];
  onCreateTask?: () => void;
  onRefresh?: () => void;
}

const priorityConfig: Record<string, { label: string; className: string; order: number }> = {
  urgent: { 
    label: "Urgent", 
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    order: 0
  },
  high: { 
    label: "High", 
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    order: 1
  },
  medium: { 
    label: "Medium", 
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    order: 2
  },
  low: { 
    label: "Low", 
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    order: 3
  },
};

type SortOption = "dueDate" | "priority" | "recent";

export const MyTasksCard = ({ locale, workspaceId, tasks, onCreateTask, onRefresh }: MyTasksCardProps) => {
  const [sortBy, setSortBy] = useState<SortOption>("dueDate");
  const [showCompleted, setShowCompleted] = useState(false);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (!showCompleted && task.status === "done") return false;
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "dueDate":
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      
      case "priority":
        const priorityA = priorityConfig[a.priority]?.order ?? 3;
        const priorityB = priorityConfig[b.priority]?.order ?? 3;
        return priorityA - priorityB;
      
      case "recent":
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      
      default:
        return 0;
    }
  });

  const sortLabels: Record<SortOption, string> = {
    dueDate: "Due Date",
    priority: "Priority",
    recent: "Recently Added",
  };

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <span className="truncate">My tasks</span>
            {filteredTasks.length > 0 && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs ml-1 shrink-0">
                {filteredTasks.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={onCreateTask}
              title="Create task"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Link href={`/${locale}/app/${workspaceId}/tasks`}>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" title="View all tasks">
                <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                  <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort by
                </DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => setSortBy("dueDate")}
                  className="flex items-center justify-between"
                >
                  Due Date
                  {sortBy === "dueDate" && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy("priority")}
                  className="flex items-center justify-between"
                >
                  Priority
                  {sortBy === "priority" && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy("recent")}
                  className="flex items-center justify-between"
                >
                  Recently Added
                  {sortBy === "recent" && <Check className="w-4 h-4 text-primary" />}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuCheckboxItem
                  checked={showCompleted}
                  onCheckedChange={setShowCompleted}
                >
                  Show completed
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={onRefresh} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* Sort indicator */}
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
          Sorted by {sortLabels[sortBy].toLowerCase()}
        </p>
      </CardHeader>
      <CardContent className="space-y-1.5 sm:space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <ListTodo className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
            <p className="text-xs sm:text-sm">
              {showCompleted ? "No tasks found" : "No active tasks"}
            </p>
            {!showCompleted && tasks.some(t => t.status === "done") && (
              <button 
                onClick={() => setShowCompleted(true)}
                className="text-xs text-primary hover:underline mt-2"
              >
                Show completed
              </button>
            )}
          </div>
        ) : (
          sortedTasks.slice(0, 5).map((task) => (
            <Link
              key={task.id}
              href={`/${locale}/app/${task.workspaceId}/tasks/${task.id}`}
              className={cn(
                "flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl hover:bg-muted/50 transition-colors group gap-2",
                task.status === "done" && "opacity-60"
              )}
            >
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-medium text-sm sm:text-base truncate",
                  task.status === "done" && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </h4>
                <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                  {task.dueDate 
                    ? format(parseISO(task.dueDate), "d MMM")
                    : "No due date"
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] sm:text-xs font-medium border px-1.5 sm:px-2",
                    priorityConfig[task.priority]?.className || priorityConfig.low.className
                  )}
                >
                  <span className="hidden sm:inline">{priorityConfig[task.priority]?.label || "Low"}</span>
                  <span className="sm:hidden">{(priorityConfig[task.priority]?.label || "Low").slice(0, 1)}</span>
                </Badge>
                {/* Assignee avatars stack - hidden on very small screens */}
                {task.assignees && task.assignees.length > 0 && (
                  <div className="hidden xs:flex -space-x-1.5 sm:-space-x-2">
                    {task.assignees.slice(0, 2).map((assignee, i) => (
                      <Avatar key={i} className="w-5 h-5 sm:w-7 sm:h-7 border-2 border-background">
                        <AvatarImage src={assignee.user.image || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs">
                          {assignee.user.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {task.assignees.length > 2 && (
                      <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">+{task.assignees.length - 2}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
        
        {/* Show more link if there are more tasks */}
        {sortedTasks.length > 5 && (
          <Link 
            href={`/${locale}/app/${workspaceId}/tasks`}
            className="block text-center text-sm text-primary hover:underline pt-2"
          >
            View all {sortedTasks.length} tasks
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
