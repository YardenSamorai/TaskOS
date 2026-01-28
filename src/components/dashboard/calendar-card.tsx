"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
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
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            Calendar
          </CardTitle>
          <div className="flex items-center gap-0.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <span className="text-xs sm:text-sm font-medium min-w-[70px] sm:min-w-[90px] text-center">
              {currentMonth}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        {/* Week days grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                  "flex flex-col items-center py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-lg sm:rounded-xl transition-colors min-w-0",
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : isTodayDate
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                )}
              >
                <span className="text-[10px] sm:text-xs uppercase mb-0.5 sm:mb-1 text-muted-foreground">
                  {format(day, "EEE").slice(0, 2)}
                </span>
                <span className={cn(
                  "text-sm sm:text-lg font-semibold",
                  isSelected ? "text-primary-foreground" : ""
                )}>
                  {format(day, "d")}
                </span>
                {hasTasks && !isSelected && (
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mt-0.5 sm:mt-1" style={{ backgroundColor: "var(--accent-color)" }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Events for selected date */}
        <div className="space-y-2">
          {tasksForDate.length === 0 ? (
            <div className="text-center py-3 sm:py-4 text-muted-foreground text-xs sm:text-sm">
              No events for this day
            </div>
          ) : (
            tasksForDate.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`/${locale}/app/${workspaceId}/tasks/${task.id}`}
                className="block p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base truncate">{task.title}</h4>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">
                      {isToday(new Date(task.dueDate!)) ? "Today" : format(new Date(task.dueDate!), "MMM d")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                    <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
                {/* Assignee avatars */}
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 sm:mt-3">
                    <div className="flex -space-x-1.5 sm:-space-x-2">
                      {task.assignees.slice(0, 3).map((assignee, i) => (
                        <Avatar key={i} className="w-5 h-5 sm:w-7 sm:h-7 border-2 border-background">
                          <AvatarImage src={assignee.user.image || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs">
                            {assignee.user.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">+{task.assignees.length - 3}</span>
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
