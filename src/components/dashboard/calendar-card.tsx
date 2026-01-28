"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MoreHorizontal, Video, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday, 
  isSameDay,
  addWeeks,
  subWeeks,
} from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  assignees?: { user: { id: string; name: string | null; image: string | null } }[];
}

interface CalendarCardProps {
  locale: string;
  workspaceId: string;
  tasks: Task[];
}

export const CalendarCard = ({ locale, workspaceId, tasks }: CalendarCardProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 5 }); // Start from Friday like in the image
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 5 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const currentMonth = format(currentDate, "MMMM");

  // Get tasks for selected date
  const tasksForDate = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      return isSameDay(new Date(task.dueDate), selectedDate);
    });
  }, [tasks, selectedDate]);

  // Get all tasks for the week with their dates
  const weekTasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), "yyyy-MM-dd");
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    });
    return map;
  }, [tasks]);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <CalendarIcon className="w-5 h-5 text-zinc-400" />
            Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-white text-sm font-medium min-w-[90px] text-center">
              {currentMonth}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week days grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const hasTasks = weekTasksMap[dayKey]?.length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center py-2 px-1 rounded-xl transition-colors",
                  isSelected 
                    ? "bg-amber-500 text-white" 
                    : isTodayDate
                      ? "bg-zinc-800 text-white"
                      : "hover:bg-zinc-800/50 text-zinc-400"
                )}
              >
                <span className="text-xs uppercase mb-1">
                  {format(day, "EEE")}
                </span>
                <span className={cn(
                  "text-lg font-semibold",
                  isSelected ? "text-white" : isTodayDate ? "text-white" : "text-zinc-200"
                )}>
                  {format(day, "d")}
                </span>
                {hasTasks && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Events for selected date */}
        <div className="space-y-2">
          {tasksForDate.length === 0 ? (
            <div className="text-center py-4 text-zinc-500 text-sm">
              No events for this day
            </div>
          ) : (
            tasksForDate.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}
                className="block p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{task.title}</h4>
                    <p className="text-zinc-500 text-sm mt-1">
                      {isToday(new Date(task.dueDate!)) ? "Today" : format(new Date(task.dueDate!), "MMM d")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                {/* Assignee avatars */}
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex -space-x-2">
                      {task.assignees.slice(0, 3).map((assignee, i) => (
                        <Avatar key={i} className="w-7 h-7 border-2 border-zinc-900">
                          <AvatarImage src={assignee.user.image || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs">
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
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
