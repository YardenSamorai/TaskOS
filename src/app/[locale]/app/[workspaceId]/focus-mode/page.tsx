"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  Brain,
  Volume2,
  VolumeX,
  ArrowLeft,
  Settings,
  Sparkles,
  Timer,
  Music,
  Headphones
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

type TimerMode = "work" | "break";

interface SoundOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  url: string;
}

const WORK_TIME = 25 * 60; // 25 minutes
const BREAK_TIME = 5 * 60; // 5 minutes

const soundOptions: SoundOption[] = [
  { 
    id: "lofi", 
    name: "Lo-Fi Beats", 
    icon: <Headphones className="w-4 h-4" />,
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3"
  },
  { 
    id: "rain", 
    name: "Rain Sounds", 
    icon: <Music className="w-4 h-4" />,
    url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_2c4bfca957.mp3"
  },
  { 
    id: "nature", 
    name: "Forest Ambience", 
    icon: <Music className="w-4 h-4" />,
    url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_e4d5c72e5f.mp3"
  },
  { 
    id: "piano", 
    name: "Soft Piano", 
    icon: <Music className="w-4 h-4" />,
    url: "https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3"
  },
];

const motivationalMessages = [
  "You've got this! 💪",
  "Stay focused, stay strong! 🎯",
  "Great things take time! ⏰",
  "One step at a time! 👣",
  "You're making progress! 🚀",
  "Keep pushing forward! 🔥",
  "Excellence is a habit! ⭐",
  "Focus is your superpower! 🦸",
];

const FocusModePage = () => {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string>("lofi");
  const [volume, setVolume] = useState(50);
  const [message, setMessage] = useState(motivationalMessages[0]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progress = mode === "work" 
    ? ((WORK_TIME - timeLeft) / WORK_TIME) * 100
    : ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100;

  // Play completion sound
  const playCompletionSound = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, []);

  // Celebrate completion
  const celebrate = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#8b5cf6", "#6366f1", "#ec4899", "#f59e0b"],
    });
  }, []);

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    playCompletionSound();
    
    if (mode === "work") {
      setCompletedSessions(prev => prev + 1);
      celebrate();
      setMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
      setMode("break");
      setTimeLeft(BREAK_TIME);
    } else {
      setMode("work");
      setTimeLeft(WORK_TIME);
    }
    
    setIsRunning(false);
  }, [mode, playCompletionSound, celebrate]);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, timeLeft, handleTimerComplete]);

  // Audio management
  useEffect(() => {
    if (soundEnabled && isRunning) {
      const sound = soundOptions.find(s => s.id === selectedSound);
      if (sound && audioRef.current) {
        audioRef.current.src = sound.url;
        audioRef.current.loop = true;
        audioRef.current.volume = volume / 100;
        audioRef.current.play().catch(() => {});
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [soundEnabled, isRunning, selectedSound, volume]);

  // Toggle timer
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? WORK_TIME : BREAK_TIME);
  };

  // Switch mode manually
  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === "work" ? WORK_TIME : BREAK_TIME);
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          className="gap-2"
          onClick={() => router.push(`/${locale}/app/${workspaceId}/dashboard`)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-2">
          {/* Sound controls */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Background Sound</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Sound</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? "On" : "Off"}
                  </Button>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={(v) => setVolume(v[0])}
                  max={100}
                  step={1}
                  className="mb-4"
                />
              </div>
              <DropdownMenuSeparator />
              {soundOptions.map((sound) => (
                <DropdownMenuItem
                  key={sound.id}
                  onClick={() => setSelectedSound(sound.id)}
                  className={cn(
                    "gap-2",
                    selectedSound === sound.id && "bg-primary/10"
                  )}
                >
                  {sound.icon}
                  {sound.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Timer Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => switchMode("work")}>
                <Brain className="w-4 h-4 mr-2" />
                Start Work Session (25 min)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchMode("break")}>
                <Coffee className="w-4 h-4 mr-2" />
                Start Break (5 min)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main timer area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Mode indicator */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant={mode === "work" ? "default" : "outline"}
            className="gap-2"
            onClick={() => switchMode("work")}
          >
            <Brain className="w-4 h-4" />
            Work
          </Button>
          <Button
            variant={mode === "break" ? "default" : "outline"}
            className="gap-2"
            onClick={() => switchMode("break")}
          >
            <Coffee className="w-4 h-4" />
            Break
          </Button>
        </div>

        {/* Timer circle */}
        <div className="relative mb-8">
          {/* Background circle */}
          <svg className="w-72 h-72 md:w-80 md:h-80 transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/30"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={mode === "work" ? "#8b5cf6" : "#10b981"} />
                <stop offset="100%" stopColor={mode === "work" ? "#6366f1" : "#14b8a6"} />
              </linearGradient>
            </defs>
          </svg>

          {/* Timer display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl md:text-7xl font-bold font-mono tracking-tight">
              {formatTime(timeLeft)}
            </div>
            <div className="text-muted-foreground mt-2 flex items-center gap-2">
              {mode === "work" ? (
                <>
                  <Brain className="w-4 h-4" />
                  Focus Time
                </>
              ) : (
                <>
                  <Coffee className="w-4 h-4" />
                  Break Time
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={resetTimer}
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          
          <Button
            size="lg"
            className={cn(
              "w-20 h-20 rounded-full text-lg font-semibold shadow-lg transition-all",
              isRunning 
                ? "bg-red-500 hover:bg-red-600" 
                : mode === "work"
                  ? "bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            )}
            onClick={toggleTimer}
          >
            {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </Button>

          <div className="w-12 h-12" /> {/* Spacer for symmetry */}
        </div>

        {/* Session counter */}
        <Card className="w-full max-w-md">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Timer className="w-5 h-5" style={{ color: "var(--accent-color)" }} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed Sessions</p>
                  <p className="text-2xl font-bold">{completedSessions}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Focus Time</p>
                <p className="text-lg font-semibold">{Math.floor(completedSessions * 25)} min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Motivational message */}
        {completedSessions > 0 && (
          <div className="mt-6 flex items-center gap-2 text-muted-foreground animate-fade-in">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusModePage;
