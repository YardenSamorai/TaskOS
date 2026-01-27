"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Sun,
  Target,
  Clock,
  CheckCircle2,
  Users,
  FolderKanban,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Loader2,
  Sparkles,
  ChevronRight,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";
import { WorkspaceCard } from "@/components/workspaces/workspace-card";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { cn } from "@/lib/utils";
import { getTodos, createTodo, toggleTodo, deleteTodo } from "@/lib/actions/todo";

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", emoji: "☀️" };
  if (hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (hour < 21) return { text: "Good evening", emoji: "🌅" };
  return { text: "Good night", emoji: "🌙" };
};

// Motivational quotes
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Your focus determines your reality.", author: "George Lucas" },
];

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const WorkspacesPage = () => {
  const params = useParams();
  const locale = params.locale as string;
  const { data: session } = useSession();
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const t = useTranslations("workspaces");

  const [createOpen, setCreateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [quote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]);

  // Pomodoro state
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Todos state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loadingTodos, setLoadingTodos] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const result = await getTodos();
      if (result.success && result.todos) {
        setTodos(result.todos);
      }
    } catch (error) {
      console.error("Failed to load todos:", error);
    } finally {
      setLoadingTodos(false);
    }
  };

  // Pomodoro timer logic
  useEffect(() => {
    if (isRunning && pomodoroTime > 0) {
      intervalRef.current = setInterval(() => {
        setPomodoroTime((time) => time - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      setIsRunning(false);
      if (!isBreak) {
        setIsBreak(true);
        setPomodoroTime(5 * 60);
      } else {
        setIsBreak(false);
        setPomodoroTime(25 * 60);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, pomodoroTime, isBreak]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setPomodoroTime(25 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const result = await createTodo(newTodo.trim());
    if (result.success && result.todo) {
      setTodos([result.todo, ...todos]);
      setNewTodo("");
    }
  };

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    await toggleTodo(id, !todo.completed);
  };

  const handleDeleteTodo = async (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
    await deleteTodo(id);
  };

  const greeting = mounted ? getGreeting() : { text: "Hello", emoji: "👋" };
  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const completedTodos = todos.filter((t) => t.completed).length;
  const totalTodos = todos.length;
  const progress = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-violet-500/5 to-background border p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {new Date().toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting.text}, {firstName}! {greeting.emoji}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              &ldquo;{quote.text}&rdquo;
            </p>
          </div>
          
          <Button onClick={() => setCreateOpen(true)} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            {t("create")}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Workspaces - Main Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary" />
              {t("title")}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !workspaces || workspaces.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FolderKanban className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No workspaces yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Create your first workspace to start organizing your tasks and collaborating with your team.
                </p>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Workspace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {workspaces.map((workspace: any) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Focus Tools */}
        <div className="space-y-4">
          {/* Pomodoro Timer */}
          <Card className={cn(
            "transition-all",
            isRunning && !isBreak && "border-primary/50 shadow-lg shadow-primary/10",
            isBreak && "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {isBreak ? (
                  <>
                    <Coffee className="w-4 h-4 text-emerald-500" />
                    Break Time
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 text-primary" />
                    Focus Timer
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={cn(
                  "text-5xl font-bold font-mono mb-4",
                  isBreak ? "text-emerald-500" : "text-foreground"
                )}>
                  {formatTime(pomodoroTime)}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="lg"
                    onClick={toggleTimer}
                    className={cn(
                      "rounded-full w-14 h-14 p-0",
                      isBreak 
                        ? "bg-emerald-500 hover:bg-emerald-600" 
                        : ""
                    )}
                  >
                    {isRunning ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={resetTimer}
                    className="rounded-full w-10 h-10"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {isBreak ? "Take a short break!" : "25 min focus session"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Todos */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Quick Todos
                </CardTitle>
                {totalTodos > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {completedTodos}/{totalTodos}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {totalTodos > 0 && (
                <Progress value={progress} className="h-1.5" />
              )}
              
              <form onSubmit={handleAddTodo} className="flex gap-2">
                <Input
                  placeholder="Add a quick todo..."
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button type="submit" size="sm" className="h-9 px-3">
                  <Plus className="w-4 h-4" />
                </Button>
              </form>

              {loadingTodos ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : todos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No todos yet. Add one above!
                </p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {todos.slice(0, 5).map((todo) => (
                    <div
                      key={todo.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg group hover:bg-muted/50 transition-colors",
                        todo.completed && "opacity-60"
                      )}
                    >
                      <button
                        onClick={() => handleToggleTodo(todo.id)}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                          todo.completed
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-muted-foreground/30 hover:border-primary"
                        )}
                      >
                        {todo.completed && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={cn(
                        "flex-1 text-sm truncate",
                        todo.completed && "line-through text-muted-foreground"
                      )}>
                        {todo.title}
                      </span>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {todos.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{todos.length - 5} more todos
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {workspaces.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">{workspaces.length}</div>
                    <div className="text-xs text-muted-foreground">Workspaces</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-emerald-500">{completedTodos}</div>
                    <div className="text-xs text-muted-foreground">Done Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} locale={locale} />
    </div>
  );
};

export default WorkspacesPage;
