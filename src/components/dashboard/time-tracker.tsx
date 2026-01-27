"use client";

import { useState, useEffect, useCallback } from "react";
import { Pause, Play, Square, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const TimeTracker = () => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Time Tracker</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold tracking-tight font-mono">
            {formatTime(seconds)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant={isRunning ? "secondary" : "default"}
            className={`rounded-full w-14 h-14 ${
              isRunning 
                ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" 
                : ""
            }`}
            style={!isRunning ? { 
              backgroundColor: 'var(--accent-color)',
              boxShadow: '0 10px 25px -5px rgba(var(--accent-color-rgb), 0.4)'
            } : undefined}
            onClick={handlePlayPause}
          >
            {isRunning ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ms-0.5" />
            )}
          </Button>
          
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-14 h-14 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            onClick={handleStop}
            disabled={seconds === 0}
          >
            <Square className="w-5 h-5" />
          </Button>
        </div>

        {/* Session Info */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today's total</span>
            <span className="font-medium">{formatTime(seconds)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
