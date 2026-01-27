"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek,
  isPast,
  isTomorrow,
  addDays,
  isYesterday,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { cn } from "@/lib/utils";
import type { Task, User } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: User }[];
  tags: { tag: { id: string; name: string; color: string } }[];
  steps: { id: string; completed: boolean }[];
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  backlog: { color: "bg-slate-500", bg: "bg-slate-500/10", label: "Backlog" },
  todo: { color: "bg-blue-500", bg: "bg-blue-500/10", label: "To Do" },
  in_progress: { color: "bg-orange-500", bg: "bg-orange-500/10", label: "In Progress" },
  review: { color: "bg-purple-500", bg: "bg-purple-500/10", label: "Review" },
  done: { color: "bg-emerald-500", bg: "bg-emerald-500/10", label: "Done" },
};

const priorityConfig: Record<string, { color: string; bg: string }> = {
  low: { color: "text-slate-500", bg: "bg-slate-500/10" },
  medium: { color: "text-blue-500", bg: "bg-blue-500/10" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10" },
  urgent: { color: "text-red-500", bg: "bg-red-500/10" },
};

type ViewMode = "grid" | "agenda";

const CalendarPage = () => {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogDate, setCreateDialogDate] = useState<Date | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { data: tasks = [], isLoading } = useTasks(workspaceId);
  const { data: workspaceData } = useWorkspace(workspaceId);
  const members = workspaceData?.members || [];

  // Get tasks with due dates
  const tasksWithDates = useMemo(() => {
    return (tasks as TaskWithRelations[]).filter((t) => t.dueDate);
  }, [tasks]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return tasksWithDates.filter((task) => 
      task.dueDate && isSameDay(parseISO(task.dueDate), date)
    );
  };

  // Get selected date tasks
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = useMemo(() => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    return tasksWithDates
      .filter((task) => {
        const dueDate = parseISO(task.dueDate!);
        return dueDate >= today && dueDate <= nextWeek && task.status !== "done";
      })
      .sort((a, b) => parseISO(a.dueDate!).getTime() - parseISO(b.dueDate!).getTime())
      .slice(0, 5);
  }, [tasksWithDates]);

  // Get agenda items grouped by date (for agenda view)
  const agendaItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tasks for the next 30 days + overdue
    const futureDate = addDays(today, 30);
    
    const grouped: { date: Date; tasks: TaskWithRelations[]; isOverdue?: boolean }[] = [];
    
    // Add overdue tasks first
    const overdueTasks = tasksWithDates.filter((t) => {
      const dueDate = parseISO(t.dueDate!);
      return isPast(dueDate) && !isToday(dueDate) && t.status !== "done";
    }).sort((a, b) => parseISO(a.dueDate!).getTime() - parseISO(b.dueDate!).getTime());
    
    if (overdueTasks.length > 0) {
      grouped.push({ date: new Date(0), tasks: overdueTasks, isOverdue: true });
    }
    
    // Group future tasks by date
    const futureTasks = tasksWithDates.filter((t) => {
      const dueDate = parseISO(t.dueDate!);
      return (isToday(dueDate) || dueDate > today) && dueDate <= futureDate;
    }).sort((a, b) => parseISO(a.dueDate!).getTime() - parseISO(b.dueDate!).getTime());
    
    const dateMap = new Map<string, TaskWithRelations[]>();
    futureTasks.forEach((task) => {
      const dateKey = format(parseISO(task.dueDate!), "yyyy-MM-dd");
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(task);
    });
    
    dateMap.forEach((tasks, dateKey) => {
      grouped.push({ date: parseISO(dateKey), tasks });
    });
    
    return grouped;
  }, [tasksWithDates]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: tasksWithDates.length,
      overdue: tasksWithDates.filter((t) => 
        isPast(parseISO(t.dueDate!)) && !isToday(parseISO(t.dueDate!)) && t.status !== "done"
      ).length,
      today: tasksWithDates.filter((t) => isToday(parseISO(t.dueDate!))).length,
      thisMonth: tasksWithDates.filter((t) => isSameMonth(parseISO(t.dueDate!), currentMonth)).length,
    };
  }, [tasksWithDates, currentMonth]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateTask = (date?: Date) => {
    setCreateDialogDate(date);
    setCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 md:w-6 md:h-6" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(currentMonth, "MMMM yyyy")} • {stats.thisMonth} tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 gap-1.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === "agenda" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 gap-1.5"
              onClick={() => setViewMode("agenda")}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Agenda</span>
            </Button>
          </div>
          <Button onClick={() => handleCreateTask(selectedDate || undefined)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
        </div>
      </div>

      {/* Stats - Compact on mobile */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <StatsCard icon={CalendarIcon} label="Total" fullLabel="Total Scheduled" value={stats.total} color="blue" />
        <StatsCard icon={AlertCircle} label="Overdue" fullLabel="Overdue" value={stats.overdue} color="red" />
        <StatsCard icon={Clock} label="Today" fullLabel="Due Today" value={stats.today} color="orange" />
        <StatsCard icon={CheckCircle2} label="Month" fullLabel="This Month" value={stats.thisMonth} color="emerald" />
      </div>

      {viewMode === "agenda" ? (
        /* Agenda View */
        <AgendaView
          agendaItems={agendaItems}
          locale={locale}
          workspaceId={workspaceId}
          onCreateTask={handleCreateTask}
        />
      ) : (
        /* Grid View */
        <div className="grid lg:grid-cols-4 gap-4 md:gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2 md:pb-4 px-3 md:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 md:gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <h2 className="text-base md:text-xl font-semibold ms-1 md:ms-2">
                    {format(currentMonth, "MMMM yyyy")}
                  </h2>
                </div>
                <Button variant="outline" size="sm" className="h-8" onClick={handleToday}>
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-1 md:mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                  <div key={idx} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-1 md:py-2">
                    <span className="md:hidden">{day}</span>
                    <span className="hidden md:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx]}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Grid - Compact on mobile */}
              <div className="grid grid-cols-7 gap-0.5 md:gap-1">
                {calendarDays.map((day, index) => {
                  const dayTasks = getTasksForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const hasOverdue = dayTasks.some((t) => 
                    isPast(parseISO(t.dueDate!)) && !isToday(parseISO(t.dueDate!)) && t.status !== "done"
                  );

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "relative aspect-square md:min-h-[100px] md:aspect-auto p-1 md:p-2 rounded-md md:rounded-lg border transition-all text-left flex flex-col",
                        isCurrentMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                        isSelected && "ring-2 ring-primary border-primary",
                        isTodayDate && !isSelected && "border-primary/50 bg-primary/5",
                        "hover:border-primary/50 hover:bg-accent/50"
                      )}
                    >
                      {/* Date Number */}
                      <div className={cn(
                        "text-xs md:text-sm font-medium w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full mx-auto md:mx-0",
                        isTodayDate && "bg-primary text-primary-foreground"
                      )}>
                        {format(day, "d")}
                      </div>

                      {/* Mobile: Task Dots */}
                      <div className="flex-1 flex items-center justify-center md:hidden">
                        {dayTasks.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 justify-center max-w-full">
                            {dayTasks.slice(0, 4).map((task, i) => (
                              <div
                                key={i}
                                className={cn("w-1.5 h-1.5 rounded-full", statusConfig[task.status]?.color)}
                              />
                            ))}
                            {dayTasks.length > 4 && (
                              <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Desktop: Task Labels */}
                      <div className="hidden md:block space-y-1 mt-1">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded truncate",
                              statusConfig[task.status]?.bg
                            )}
                            title={task.title}
                          >
                            <span className={cn("inline-block w-1.5 h-1.5 rounded-full me-1", statusConfig[task.status]?.color)} />
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1.5">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>

                      {/* Overdue indicator */}
                      {hasOverdue && (
                        <div className="absolute top-0.5 right-0.5 md:top-2 md:right-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend - Hidden on mobile */}
              <div className="hidden md:flex flex-wrap gap-4 mt-4 pt-4 border-t">
                {Object.entries(statusConfig).map(([status, config]) => (
                  <div key={status} className="flex items-center gap-2 text-xs">
                    <div className={cn("w-2.5 h-2.5 rounded-full", config.color)} />
                    <span className="text-muted-foreground">{config.label}</span>
                  </div>
                ))}
              </div>

              {/* Mobile Legend - Compact */}
              <div className="flex md:hidden flex-wrap gap-2 mt-2 pt-2 border-t justify-center">
                {Object.entries(statusConfig).map(([status, config]) => (
                  <div key={status} className="flex items-center gap-1 text-[10px]">
                    <div className={cn("w-2 h-2 rounded-full", config.color)} />
                    <span className="text-muted-foreground">{config.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar - Show selected date tasks on mobile below calendar */}
          <div className="space-y-4 md:space-y-6">
            {/* Selected Date Tasks */}
            <Card>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-sm md:text-base flex items-center justify-between">
                  <span>
                    {selectedDate ? (
                      isToday(selectedDate) ? "Today" : format(selectedDate, "EEE, MMM d")
                    ) : "Select a date"}
                  </span>
                  {selectedDate && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2"
                      onClick={() => handleCreateTask(selectedDate)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateTasks.length === 0 ? (
                  <div className="text-center py-4 md:py-6 text-muted-foreground">
                    <CalendarIcon className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs md:text-sm">No tasks scheduled</p>
                    {selectedDate && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-2 text-xs md:text-sm"
                        onClick={() => handleCreateTask(selectedDate)}
                      >
                        Add a task
                      </Button>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] md:h-[300px]">
                    <div className="space-y-2 md:space-y-3 pr-4">
                      {selectedDateTasks.map((task) => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          locale={locale} 
                          workspaceId={workspaceId}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks - Hidden on mobile in grid view, shown in agenda */}
            <Card className="hidden lg:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Upcoming Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">All clear!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <UpcomingTaskItem 
                        key={task.id} 
                        task={task} 
                        locale={locale} 
                        workspaceId={workspaceId}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        locale={locale}
        members={members}
        defaultDueDate={createDialogDate}
      />
    </div>
  );
};

// Agenda View Component
const AgendaView = ({
  agendaItems,
  locale,
  workspaceId,
  onCreateTask,
}: {
  agendaItems: { date: Date; tasks: TaskWithRelations[]; isOverdue?: boolean }[];
  locale: string;
  workspaceId: string;
  onCreateTask: (date?: Date) => void;
}) => {
  const router = useRouter();

  const getDateLabel = (date: Date, isOverdue?: boolean) => {
    if (isOverdue) return "Overdue";
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d");
  };

  if (agendaItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-medium mb-2">No scheduled tasks</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Tasks with due dates will appear here
          </p>
          <Button onClick={() => onCreateTask()} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Task
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {agendaItems.map((group, groupIndex) => (
        <Card key={groupIndex} className={cn(group.isOverdue && "border-red-500/50")}>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {group.isOverdue ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : isToday(group.date) ? (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                ) : null}
                <CardTitle className={cn(
                  "text-sm md:text-base font-semibold",
                  group.isOverdue && "text-red-500"
                )}>
                  {getDateLabel(group.date, group.isOverdue)}
                </CardTitle>
                {!group.isOverdue && (
                  <span className="text-xs text-muted-foreground">
                    {format(group.date, "MMM d")}
                  </span>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {group.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => router.push(`/${locale}/app/${workspaceId}/tasks/${task.id}`)}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all group flex items-center gap-3"
                >
                  <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", statusConfig[task.status]?.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </h4>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-[10px] flex-shrink-0", priorityConfig[task.priority]?.bg, priorityConfig[task.priority]?.color)}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    {task.assignees?.length > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex -space-x-1">
                          {task.assignees.slice(0, 3).map((assignee) => (
                            <Avatar key={assignee.id} className="w-5 h-5 border border-background">
                              <AvatarImage src={assignee.user.image || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {assignee.user.name?.[0] || assignee.user.email[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {task.assignees.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{task.assignees.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {statusConfig[task.status]?.label}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ 
  icon: Icon, 
  label,
  fullLabel,
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string;
  fullLabel: string;
  value: number; 
  color: "blue" | "red" | "orange" | "emerald";
}) => {
  const colorClasses = {
    blue: "text-blue-500 bg-blue-500/10",
    red: "text-red-500 bg-red-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
  };

  return (
    <Card>
      <CardContent className="p-2 md:p-4">
        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
          <div className={cn("p-1.5 md:p-2 rounded-lg", colorClasses[color])}>
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="text-center md:text-left">
            <p className="text-lg md:text-2xl font-bold">{value}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              <span className="md:hidden">{label}</span>
              <span className="hidden md:inline">{fullLabel}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Task Item for Selected Date
const TaskItem = ({ 
  task, 
  locale, 
  workspaceId 
}: { 
  task: TaskWithRelations;
  locale: string;
  workspaceId: string;
}) => {
  const router = useRouter();
  const completedSteps = task.steps?.filter((s) => s.completed).length || 0;
  const totalSteps = task.steps?.length || 0;

  return (
    <button
      onClick={() => router.push(`/${locale}/app/${workspaceId}/tasks/${task.id}`)}
      className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", statusConfig[task.status]?.color)} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {task.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant="secondary" 
              className={cn("text-[10px]", priorityConfig[task.priority]?.bg, priorityConfig[task.priority]?.color)}
            >
              {task.priority}
            </Badge>
            {totalSteps > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {completedSteps}/{totalSteps} steps
              </span>
            )}
          </div>
          {task.assignees?.length > 0 && (
            <div className="flex -space-x-1 mt-2">
              {task.assignees.slice(0, 3).map((assignee) => (
                <Avatar key={assignee.id} className="w-5 h-5 border border-background">
                  <AvatarImage src={assignee.user.image || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {assignee.user.name?.[0] || assignee.user.email[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
};

// Upcoming Task Item
const UpcomingTaskItem = ({ 
  task, 
  locale, 
  workspaceId 
}: { 
  task: TaskWithRelations;
  locale: string;
  workspaceId: string;
}) => {
  const router = useRouter();
  const dueDate = parseISO(task.dueDate!);
  
  const getDueDateLabel = () => {
    if (isToday(dueDate)) return "Today";
    if (isTomorrow(dueDate)) return "Tomorrow";
    return format(dueDate, "EEE, MMM d");
  };

  return (
    <button
      onClick={() => router.push(`/${locale}/app/${workspaceId}/tasks/${task.id}`)}
      className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
    >
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusConfig[task.status]?.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate group-hover:text-primary transition-colors">{task.title}</p>
        <p className={cn(
          "text-[10px]",
          isToday(dueDate) ? "text-orange-500" : "text-muted-foreground"
        )}>
          {getDueDateLabel()}
        </p>
      </div>
    </button>
  );
};

export default CalendarPage;
