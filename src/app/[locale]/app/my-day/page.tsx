"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Check,
  Circle,
  Calendar,
  Clock,
  AlertCircle,
  Trash2,
  Link2,
  ExternalLink,
  ChevronRight,
  Sun,
  Sparkles,
  ListTodo,
  Target,
  Zap,
  MoreHorizontal,
  CalendarDays,
  Flag,
  ArrowRight,
  CheckCircle2,
  Timer,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getTodos,
  getMyDayData,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
  convertTodoToTask,
  clearCompletedTodos,
  TodoWithLinkedTask,
} from "@/lib/actions/todo";
import { getUserWorkspaces } from "@/lib/actions/workspace";

// Priority config
const priorityConfig = {
  low: { label: "Low", color: "text-slate-500", bg: "bg-slate-500/10" },
  medium: { label: "Medium", color: "text-blue-500", bg: "bg-blue-500/10" },
  high: { label: "High", color: "text-orange-500", bg: "bg-orange-500/10" },
  urgent: { label: "Urgent", color: "text-red-500", bg: "bg-red-500/10" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  backlog: { label: "Backlog", color: "text-slate-500" },
  todo: { label: "To Do", color: "text-blue-500" },
  in_progress: { label: "In Progress", color: "text-amber-500" },
  review: { label: "Review", color: "text-violet-500" },
  done: { label: "Done", color: "text-emerald-500" },
};

export default function MyDayPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [isLoading, setIsLoading] = useState(true);
  const [quickTodos, setQuickTodos] = useState<TodoWithLinkedTask[]>([]);
  const [completedTodos, setCompletedTodos] = useState<TodoWithLinkedTask[]>([]);
  const [myTasks, setMyTasks] = useState<{
    overdue: any[];
    today: any[];
    upcoming: any[];
    noDueDate: any[];
    total: number;
  }>({ overdue: [], today: [], upcoming: [], noDueDate: [], total: 0 });

  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoWithLinkedTask | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingTodo, setConvertingTodo] = useState<TodoWithLinkedTask | null>(null);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [showCompleted, setShowCompleted] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dayData, allTodos, ws] = await Promise.all([
        getMyDayData(),
        getTodos(),
        getUserWorkspaces(),
      ]);

      setQuickTodos(allTodos.filter((t) => !t.completed));
      setCompletedTodos(allTodos.filter((t) => t.completed));
      setMyTasks(dayData.tasks);
      setWorkspaces(ws.workspaces?.map((w) => ({ id: w.id, name: w.name })) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick add todo
  const handleQuickAdd = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      await createTodo({ title: newTodoTitle.trim() });
      setNewTodoTitle("");
      setShowAddTodo(false);
      toast.success("To-do added!");
      fetchData();
    } catch (error) {
      toast.error("Failed to add to-do");
    }
  };

  // Toggle todo
  const handleToggle = async (todoId: string) => {
    try {
      await toggleTodo(todoId);
      fetchData();
    } catch (error) {
      toast.error("Failed to update to-do");
    }
  };

  // Delete todo
  const handleDelete = async (todoId: string) => {
    try {
      await deleteTodo(todoId);
      toast.success("To-do deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete to-do");
    }
  };

  // Convert to task
  const handleConvert = async () => {
    if (!convertingTodo || !selectedWorkspace) return;

    try {
      await convertTodoToTask(convertingTodo.id, selectedWorkspace);
      toast.success("Converted to task!");
      setShowConvertDialog(false);
      setConvertingTodo(null);
      setSelectedWorkspace("");
      fetchData();
    } catch (error) {
      toast.error("Failed to convert");
    }
  };

  // Clear completed
  const handleClearCompleted = async () => {
    try {
      await clearCompletedTodos();
      toast.success("Cleared completed to-dos");
      fetchData();
    } catch (error) {
      toast.error("Failed to clear");
    }
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your day...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-3 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, #000))",
                boxShadow: "0 8px 24px rgba(var(--accent-color-rgb), 0.3)",
              }}
            >
              <Sun className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{getGreeting()}!</h1>
              <p className="text-muted-foreground">{formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-3xl font-bold" style={{ color: "var(--accent-color)" }}>
              {quickTodos.length}
            </p>
            <p className="text-xs text-muted-foreground">To-Dos</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-3xl font-bold text-orange-500">{myTasks.total}</p>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Quick To-Dos */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                  Quick To-Dos
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddTodo(true)}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Quick Add Input */}
              <AnimatePresence>
                {showAddTodo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b"
                  >
                    <div className="p-4 flex gap-2">
                      <Input
                        placeholder="What do you need to do?"
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                        autoFocus
                      />
                      <Button onClick={handleQuickAdd} size="icon">
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Todo List */}
              <div className="divide-y">
                {quickTodos.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm">Add a quick to-do to get started</p>
                  </div>
                ) : (
                  quickTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      locale={locale}
                      onToggle={() => handleToggle(todo.id)}
                      onDelete={() => handleDelete(todo.id)}
                      onConvert={() => {
                        setConvertingTodo(todo);
                        setShowConvertDialog(true);
                      }}
                    />
                  ))
                )}
              </div>

              {/* Completed Section */}
              {completedTodos.length > 0 && (
                <div className="border-t">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      Completed ({completedTodos.length})
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${showCompleted ? "rotate-90" : ""}`}
                    />
                  </button>
                  <AnimatePresence>
                    {showCompleted && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y opacity-60">
                          {completedTodos.map((todo) => (
                            <TodoItem
                              key={todo.id}
                              todo={todo}
                              locale={locale}
                              onToggle={() => handleToggle(todo.id)}
                              onDelete={() => handleDelete(todo.id)}
                              onConvert={() => {}}
                            />
                          ))}
                        </div>
                        <div className="p-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={handleClearCompleted}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear Completed
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - My Tasks */}
        <div className="space-y-4">
          {/* Overdue Tasks */}
          {myTasks.overdue.length > 0 && (
            <Card className="border-red-200 dark:border-red-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  Overdue ({myTasks.overdue.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {myTasks.overdue.map(({ task, workspace }) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      workspace={workspace}
                      locale={locale}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                Due Today ({myTasks.today.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {myTasks.today.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No tasks due today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myTasks.today.map(({ task, workspace }) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      workspace={workspace}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          {myTasks.upcoming.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-500">
                  <CalendarDays className="w-5 h-5" />
                  This Week ({myTasks.upcoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {myTasks.upcoming.map(({ task, workspace }) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      workspace={workspace}
                      locale={locale}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Due Date */}
          {myTasks.noDueDate.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-500">
                  <ListTodo className="w-5 h-5" />
                  No Due Date ({myTasks.noDueDate.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {myTasks.noDueDate.slice(0, 5).map(({ task, workspace }) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      workspace={workspace}
                      locale={locale}
                    />
                  ))}
                  {myTasks.noDueDate.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      +{myTasks.noDueDate.length - 5} more tasks
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {myTasks.total === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                <h3 className="font-semibold mb-1">No tasks assigned</h3>
                <p className="text-sm text-muted-foreground">
                  Tasks assigned to you will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Convert to Task Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a workspace to create this task in:
            </p>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">{convertingTodo?.title}</p>
            </div>
            <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
              <SelectTrigger>
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={!selectedWorkspace}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Todo Item Component
function TodoItem({
  todo,
  locale,
  onToggle,
  onDelete,
  onConvert,
}: {
  todo: TodoWithLinkedTask;
  locale: string;
  onToggle: () => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const priority = todo.priority || "medium";
  const config = priorityConfig[priority];

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors group">
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          todo.completed
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-muted-foreground/30 hover:border-primary"
        }`}
      >
        {todo.completed && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {todo.dueDate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {todo.dueDate}
            </span>
          )}
          {todo.linkedTask && (
            <Link
              href={`/${locale}/app/${todo.linkedTask.workspaceId}/tasks/${todo.linkedTask.id}`}
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <Link2 className="w-3 h-3" />
              Linked
            </Link>
          )}
        </div>
      </div>

      {!todo.completed && (
        <Badge variant="outline" className={`${config.color} ${config.bg} text-xs`}>
          {config.label}
        </Badge>
      )}

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
          {!todo.completed && (
            <>
              <DropdownMenuItem onClick={onConvert}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Convert to Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-red-500">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Task Item Component
function TaskItem({
  task,
  workspace,
  locale,
}: {
  task: any;
  workspace: { id: string; name: string };
  locale: string;
}) {
  const priority = task.priority || "medium";
  const status = task.status || "todo";
  const priorityConf = priorityConfig[priority as keyof typeof priorityConfig];
  const statusConf = statusConfig[status];

  return (
    <Link
      href={`/${locale}/app/${workspace.id}/tasks/${task.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: "var(--accent-color)" }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            <FolderOpen className="w-3 h-3 mr-1" />
            {workspace.name}
          </Badge>
          <span className={`text-xs ${statusConf.color}`}>{statusConf.label}</span>
        </div>
      </div>
      {task.dueDate && (
        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
