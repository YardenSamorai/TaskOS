"use client";

import Link from "next/link";
import { ListTodo, Plus, Maximize2, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  workspaceId: string;
  assignees?: { user: { id: string; name: string | null; image: string | null } }[];
}

interface MyTasksCardProps {
  locale: string;
  workspaceId: string;
  tasks: Task[];
  onCreateTask?: () => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { 
    label: "Low", 
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
  },
  medium: { 
    label: "Medium", 
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30" 
  },
  high: { 
    label: "High", 
    className: "bg-rose-500/20 text-rose-400 border-rose-500/30" 
  },
  urgent: { 
    label: "Urgent", 
    className: "bg-red-500/20 text-red-400 border-red-500/30" 
  },
};

export const MyTasksCard = ({ locale, workspaceId, tasks, onCreateTask }: MyTasksCardProps) => {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <ListTodo className="w-5 h-5 text-zinc-400" />
            My tasks
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={onCreateTask}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Link href={`/${locale}/app/${workspaceId}/tasks`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tasks assigned to you</p>
          </div>
        ) : (
          tasks.slice(0, 5).map((task) => (
            <Link
              key={task.id}
              href={`/${locale}/app/${task.workspaceId}/tasks/${task.id}`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{task.title}</h4>
                <p className="text-zinc-500 text-sm mt-0.5">
                  {task.dueDate 
                    ? format(new Date(task.dueDate), "d MMM") + " · " + format(new Date(task.dueDate), "hh:mm a")
                    : "No due date"
                  }
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-medium border",
                    priorityConfig[task.priority]?.className || priorityConfig.low.className
                  )}
                >
                  {priorityConfig[task.priority]?.label || "Low"}
                </Badge>
                {/* Assignee avatars stack */}
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex -space-x-2">
                    {task.assignees.slice(0, 3).map((assignee, i) => (
                      <Avatar key={i} className="w-7 h-7 border-2 border-zinc-900">
                        <AvatarImage src={assignee.user.image || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white text-xs">
                          {assignee.user.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {task.assignees.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center">
                        <span className="text-xs text-zinc-300">+{task.assignees.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
};
