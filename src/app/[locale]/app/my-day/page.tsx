"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Target,
  Volume2,
  VolumeX,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Check,
  Trash2,
  Sparkles,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getTodos, createTodo, toggleTodo, deleteTodo } from "@/lib/actions/todo";
import confetti from "canvas-confetti";

// Motivational quotes for focus
const focusQuotes = [
  "Deep work is the ability to focus without distraction.",
  "The successful warrior is the average man, with laser-like focus.",
  "Focus on being productive instead of busy.",
  "Concentrate all your thoughts upon the work at hand.",
  "Where focus goes, energy flows.",
];

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const MyDayPage = () => {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { data: session } = useSession();

  // Timer settings
  const FOCUS_TIME = 25 * 60;
  const SHORT_BREAK = 5 * 60;
  const LONG_BREAK = 15 * 60;

  // State
  const [time, setTime] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quote] = useState(() => focusQuotes[Math.floor(Math.random() * focusQuotes.length)]);

  // Todos
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loadingTodos, setLoadingTodos] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load todos
  useEffect(() => {
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

  // Timer logic
  useEffect(() => {
    if (isRunning && time > 0) {
      intervalRef.current = setInterval(() => {
        setTime((t) => t - 1);
      }, 1000);
    } else if (time === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, time]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Play sound
    if (soundEnabled) {
      try {
        const audio = new Audio("/sounds/bell.mp3");
        audio.play().catch(() => {});
      } catch {}
    }

    if (!isBreak) {
      // Completed a focus session
      setSessions((s) => s + 1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      
      // Every 4 sessions, take a long break
      if ((sessions + 1) % 4 === 0) {
        setTime(LONG_BREAK);
      } else {
        setTime(SHORT_BREAK);
      }
      setIsBreak(true);
    } else {
      // Break is over, back to focus
      setTime(FOCUS_TIME);
      setIsBreak(false);
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTime(FOCUS_TIME);
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

    const wasCompleted = todo.completed;
    setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    
    if (!wasCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
    
    await toggleTodo(id, !todo.completed);
  };

  const handleDeleteTodo = async (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
    await deleteTodo(id);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const totalTime = isBreak ? (sessions % 4 === 0 ? LONG_BREAK : SHORT_BREAK) : FOCUS_TIME;
  const progress = ((totalTime - time) / totalTime) * 100;
  const completedTodos = todos.filter((t) => t.completed).length;

  return (
    <div className={cn(
      "min-h-[calc(100vh-8rem)] flex flex-col",
      isBreak 
        ? "bg-gradient-to-br from-emerald-500/5 via-background to-emerald-500/10" 
        : "bg-gradient-to-br from-violet-500/5 via-background to-primary/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/${locale}/app/workspaces`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 p-4 md:p-8">
        {/* Timer Section */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg">
          {/* Session indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  i < sessions % 4 
                    ? "bg-primary" 
                    : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Timer display */}
          <div className="relative mb-8">
            <svg className="w-64 h-64 md:w-80 md:h-80 transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}%`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}%`}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000",
                  isBreak ? "text-emerald-500" : "text-primary"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                "text-6xl md:text-7xl font-bold font-mono",
                isBreak ? "text-emerald-500" : ""
              )}>
                {formatTime(time)}
              </span>
              <span className="text-sm text-muted-foreground mt-2">
                {isBreak ? "Break Time" : "Focus Time"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              size="lg"
              onClick={toggleTimer}
              className={cn(
                "rounded-full w-16 h-16 p-0 shadow-lg",
                isBreak 
                  ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25" 
                  : "shadow-primary/25"
              )}
            >
              {isRunning ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-1" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={resetTimer}
              className="rounded-full w-12 h-12"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isBreak ? (
              <>
                <Coffee className="w-4 h-4" />
                <span>Take a break! You&apos;ve earned it.</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                <span>Session {sessions + 1} • Stay focused!</span>
              </>
            )}
          </div>

          {/* Quote */}
          <p className="text-center text-sm text-muted-foreground mt-8 max-w-sm italic">
            &ldquo;{quote}&rdquo;
          </p>
        </div>

        {/* Todos Section */}
        <div className="w-full max-w-md lg:max-w-sm">
          <div className="bg-card border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Focus Tasks
              </h3>
              {todos.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {completedTodos}/{todos.length}
                </span>
              )}
            </div>

            {todos.length > 0 && (
              <Progress value={(completedTodos / todos.length) * 100} className="h-2 mb-4" />
            )}

            <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
              <Input
                placeholder="What are you working on?"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                className="h-10"
              />
              <Button type="submit" size="icon" className="h-10 w-10">
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {loadingTodos ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : todos.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Add tasks to focus on
                  </p>
                </div>
              ) : (
                todos.map((todo) => (
                  <div
                    key={todo.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl group hover:bg-muted/50 transition-all",
                      todo.completed && "opacity-60"
                    )}
                  >
                    <button
                      onClick={() => handleToggleTodo(todo.id)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        todo.completed
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-muted-foreground/30 hover:border-primary hover:scale-110"
                      )}
                    >
                      {todo.completed && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <span className={cn(
                      "flex-1 truncate",
                      todo.completed && "line-through text-muted-foreground"
                    )}>
                      {todo.title}
                    </span>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyDayPage;
