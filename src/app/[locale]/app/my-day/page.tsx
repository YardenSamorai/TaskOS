"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
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
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Flame,
  Trophy,
  Star,
  Rocket,
  Heart,
  Moon,
  Sunrise,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Quote,
  Lightbulb,
  TrendingUp,
  Award,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getTodos,
  getMyDayData,
  createTodo,
  toggleTodo,
  deleteTodo,
  convertTodoToTask,
  clearCompletedTodos,
  TodoWithLinkedTask,
} from "@/lib/actions/todo";
import { getUserWorkspaces } from "@/lib/actions/workspace";

// Motivational quotes
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Small daily improvements lead to stunning results.", author: "Robin Sharma" },
  { text: "Your future is created by what you do today.", author: "Robert Kiyosaki" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Productivity is never an accident.", author: "Paul J. Meyer" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
];

// Energy levels
const energyLevels = [
  { id: "low", icon: BatteryLow, label: "Low Energy", color: "text-orange-500", suggestion: "Start with simple tasks" },
  { id: "medium", icon: BatteryMedium, label: "Medium Energy", color: "text-blue-500", suggestion: "Good for focused work" },
  { id: "high", icon: BatteryFull, label: "High Energy", color: "text-emerald-500", suggestion: "Perfect for challenging tasks" },
  { id: "peak", icon: Flame, label: "Peak Performance", color: "text-violet-500", suggestion: "Tackle your hardest task!" },
];

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

// Pomodoro timer states
type TimerState = "idle" | "focus" | "break";

export default function MyDayPage() {
  const params = useParams();
  const locale = params.locale as string;

  // Data state
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
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);

  // UI state
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingTodo, setConvertingTodo] = useState<TodoWithLinkedTask | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("today");

  // Energy level
  const [energyLevel, setEnergyLevel] = useState<string>("medium");
  const [showEnergySelector, setShowEnergySelector] = useState(false);

  // Focus Timer (Pomodoro)
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [focusSessions, setFocusSessions] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Daily Goal
  const [dailyGoal, setDailyGoal] = useState(5);
  const [todayCompleted, setTodayCompleted] = useState(0);

  // Quote
  const [quote, setQuote] = useState(quotes[0]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dayData, allTodos, ws] = await Promise.all([
        getMyDayData(),
        getTodos(),
        getUserWorkspaces(),
      ]);

      const incompleteTodos = allTodos.filter((t) => !t.completed);
      const completedTodosData = allTodos.filter((t) => t.completed);
      
      setQuickTodos(incompleteTodos);
      setCompletedTodos(completedTodosData);
      setMyTasks(dayData.tasks);
      setWorkspaces(ws.workspaces?.map((w) => ({ id: w.id, name: w.name })) || []);
      setTodayCompleted(completedTodosData.length);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Random quote on load
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, [fetchData]);

  // Timer logic
  useEffect(() => {
    if (timerState !== "idle" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer finished
      if (timerState === "focus") {
        setFocusSessions((prev) => prev + 1);
        if (soundEnabled) playSound("complete");
        toast.success("🎉 Focus session complete! Time for a break.");
        setTimerState("break");
        setTimeLeft(5 * 60); // 5 minute break
      } else if (timerState === "break") {
        if (soundEnabled) playSound("start");
        toast.info("Break's over! Ready for another focus session?");
        setTimerState("idle");
        setTimeLeft(25 * 60);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerState, timeLeft, soundEnabled]);

  const playSound = (type: "start" | "complete" | "tick") => {
    // Simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = type === "complete" ? 800 : type === "start" ? 600 : 400;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio not available
    }
  };

  const startFocus = () => {
    setTimerState("focus");
    setTimeLeft(25 * 60);
    if (soundEnabled) playSound("start");
    toast.success("🎯 Focus session started! Stay focused for 25 minutes.");
  };

  const pauseTimer = () => {
    setTimerState("idle");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resetTimer = () => {
    setTimerState("idle");
    setTimeLeft(25 * 60);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Celebration confetti
  const celebrate = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef"],
    });
  };

  // Quick add todo
  const handleQuickAdd = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      await createTodo({ title: newTodoTitle.trim() });
      setNewTodoTitle("");
      setShowAddTodo(false);
      toast.success("✨ To-do added!");
      fetchData();
    } catch (error) {
      toast.error("Failed to add to-do");
    }
  };

  // Toggle todo with celebration
  const handleToggle = async (todoId: string, wasCompleted: boolean) => {
    try {
      await toggleTodo(todoId);
      if (!wasCompleted) {
        celebrate();
        setTodayCompleted((prev) => prev + 1);
        toast.success("🎉 Great job!");
      }
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
    if (hour < 12) return { text: "Good morning", icon: Sunrise, emoji: "☀️" };
    if (hour < 17) return { text: "Good afternoon", icon: Sun, emoji: "🌤️" };
    return { text: "Good evening", icon: Moon, emoji: "🌙" };
  };

  const greeting = getGreeting();
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const currentEnergy = energyLevels.find((e) => e.id === energyLevel)!;
  const goalProgress = Math.min((todayCompleted / dailyGoal) * 100, 100);

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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with Greeting */}
      <div className="relative overflow-hidden rounded-3xl p-8"
        style={{
          background: `linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.15), rgba(var(--accent-color-rgb), 0.05))`,
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className="p-4 rounded-2xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, #000))",
                boxShadow: "0 10px 30px rgba(var(--accent-color-rgb), 0.3)",
              }}
            >
              <greeting.icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {greeting.text}! {greeting.emoji}
              </h1>
              <p className="text-muted-foreground mt-1">{formattedDate}</p>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-background/50 backdrop-blur-sm"
                  onClick={() => setShowEnergySelector(!showEnergySelector)}
                >
                  <currentEnergy.icon className={`w-4 h-4 ${currentEnergy.color}`} />
                  {currentEnergy.label}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Daily Goal Progress */}
          <div className="lg:text-right">
            <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-background/60 backdrop-blur-sm">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="text-2xl font-bold">{todayCompleted}/{dailyGoal}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Daily Goal</p>
              </div>
              <div className="w-24">
                <Progress value={goalProgress} className="h-2" />
                {goalProgress >= 100 && (
                  <p className="text-xs text-emerald-500 font-medium mt-1">🎉 Goal reached!</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Energy Level Selector */}
        <AnimatePresence>
          {showEnergySelector && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {energyLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => {
                      setEnergyLevel(level.id);
                      setShowEnergySelector(false);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      energyLevel === level.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-background/50 hover:bg-background/80"
                    }`}
                  >
                    <level.icon className={`w-6 h-6 ${level.color} mx-auto mb-2`} />
                    <p className="font-medium text-sm">{level.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{level.suggestion}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quote Card */}
      <Card className="border-none bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Quote className="w-5 h-5 text-violet-500 flex-shrink-0 mt-1" />
            <div>
              <p className="italic text-foreground/80">{quote.text}</p>
              <p className="text-sm text-muted-foreground mt-1">— {quote.author}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setQuote(quotes[Math.floor(Math.random() * quotes.length)])}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Focus Timer & Quick To-Dos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Focus Timer */}
          <Card className="overflow-hidden">
            <div className={`p-6 ${
              timerState === "focus" 
                ? "bg-gradient-to-br from-violet-500/20 to-purple-500/20" 
                : timerState === "break"
                  ? "bg-gradient-to-br from-emerald-500/20 to-green-500/20"
                  : ""
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    timerState === "focus" ? "bg-violet-500" : 
                    timerState === "break" ? "bg-emerald-500" : "bg-muted"
                  }`}>
                    {timerState === "break" ? (
                      <Coffee className="w-5 h-5 text-white" />
                    ) : (
                      <Brain className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">Focus Timer</h3>
                    <p className="text-sm text-muted-foreground">
                      {timerState === "idle" && "Ready to focus?"}
                      {timerState === "focus" && "Stay focused! You got this."}
                      {timerState === "break" && "Take a short break."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600">
                    <Flame className="w-4 h-4" />
                    <span className="font-medium">{focusSessions}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className={`text-6xl font-mono font-bold ${
                    timerState === "focus" ? "text-violet-500" :
                    timerState === "break" ? "text-emerald-500" : ""
                  }`}>
                    {formatTime(timeLeft)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {timerState === "focus" && "Focus Session"}
                    {timerState === "break" && "Break Time"}
                    {timerState === "idle" && "25:00 Focus / 5:00 Break"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 mt-6">
                {timerState === "idle" ? (
                  <Button
                    size="lg"
                    className="gap-2 px-8"
                    style={{
                      background: "linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, #8b5cf6))",
                    }}
                    onClick={startFocus}
                  >
                    <Play className="w-5 h-5" />
                    Start Focus Session
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="lg" onClick={pauseTimer}>
                      <Pause className="w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="lg" onClick={resetTimer}>
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Quick To-Dos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                  Quick To-Dos
                  <Badge variant="secondary" className="ml-2">{quickTodos.length}</Badge>
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
                    className="border-b px-4 py-3"
                  >
                    <div className="flex gap-2">
                      <Input
                        placeholder="What do you need to do?"
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                        autoFocus
                        className="flex-1"
                      />
                      <Button onClick={handleQuickAdd}>
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Todo List */}
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {quickTodos.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Rocket className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm">Add a quick to-do to get started</p>
                  </div>
                ) : (
                  quickTodos.map((todo, index) => (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <TodoItem
                        todo={todo}
                        locale={locale}
                        onToggle={() => handleToggle(todo.id, todo.completed)}
                        onDelete={() => handleDelete(todo.id)}
                        onConvert={() => {
                          setConvertingTodo(todo);
                          setShowConvertDialog(true);
                        }}
                      />
                    </motion.div>
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
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Completed ({completedTodos.length})
                    </span>
                    {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                          {completedTodos.slice(0, 5).map((todo) => (
                            <TodoItem
                              key={todo.id}
                              todo={todo}
                              locale={locale}
                              onToggle={() => handleToggle(todo.id, todo.completed)}
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
          {/* Smart Suggestion based on energy */}
          <Card className="border-2 border-dashed" style={{ borderColor: "rgba(var(--accent-color-rgb), 0.3)" }}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Smart Suggestion</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {energyLevel === "low" && "Start with a simple task to build momentum."}
                    {energyLevel === "medium" && "Good time for focused, medium-complexity work."}
                    {energyLevel === "high" && "Perfect time to tackle important tasks!"}
                    {energyLevel === "peak" && "Now's the time for your most challenging task!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overdue Tasks */}
          {myTasks.overdue.length > 0 && (
            <TaskSection
              title="Overdue"
              icon={AlertCircle}
              iconColor="text-red-500"
              tasks={myTasks.overdue}
              locale={locale}
              expanded={expandedSection === "overdue"}
              onToggle={() => setExpandedSection(expandedSection === "overdue" ? null : "overdue")}
              urgent
            />
          )}

          {/* Today's Tasks */}
          <TaskSection
            title="Due Today"
            icon={Calendar}
            iconColor="text-amber-500"
            tasks={myTasks.today}
            locale={locale}
            expanded={expandedSection === "today"}
            onToggle={() => setExpandedSection(expandedSection === "today" ? null : "today")}
          />

          {/* Upcoming Tasks */}
          {myTasks.upcoming.length > 0 && (
            <TaskSection
              title="This Week"
              icon={CalendarDays}
              iconColor="text-blue-500"
              tasks={myTasks.upcoming}
              locale={locale}
              expanded={expandedSection === "upcoming"}
              onToggle={() => setExpandedSection(expandedSection === "upcoming" ? null : "upcoming")}
            />
          )}

          {/* No Due Date */}
          {myTasks.noDueDate.length > 0 && (
            <TaskSection
              title="No Due Date"
              icon={ListTodo}
              iconColor="text-slate-500"
              tasks={myTasks.noDueDate.slice(0, 5)}
              locale={locale}
              expanded={expandedSection === "noDueDate"}
              onToggle={() => setExpandedSection(expandedSection === "noDueDate" ? null : "noDueDate")}
            />
          )}

          {/* Empty State */}
          {myTasks.total === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="w-16 h-16 mx-auto mb-4 text-amber-500/20" />
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
  const config = priorityConfig[priority as keyof typeof priorityConfig];

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors group">
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          todo.completed
            ? "bg-emerald-500 border-emerald-500 text-white scale-110"
            : "border-muted-foreground/30 hover:border-primary hover:scale-105"
        }`}
      >
        {todo.completed && <Check className="w-4 h-4" />}
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

      {!todo.completed && config && (
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

// Task Section Component
function TaskSection({
  title,
  icon: Icon,
  iconColor,
  tasks,
  locale,
  expanded,
  onToggle,
  urgent = false,
}: {
  title: string;
  icon: any;
  iconColor: string;
  tasks: any[];
  locale: string;
  expanded: boolean;
  onToggle: () => void;
  urgent?: boolean;
}) {
  return (
    <Card className={urgent ? "border-red-200 dark:border-red-900/50" : ""}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="font-medium">{title}</span>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks here
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(({ task, workspace }: any) => (
                    <Link
                      key={task.id}
                      href={`/${locale}/app/${workspace.id}/tasks/${task.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "var(--accent-color)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{workspace.name}</p>
                      </div>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
