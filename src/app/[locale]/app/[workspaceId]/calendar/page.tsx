"use client";

import { useParams } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useTasks } from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/db/schema";

interface TaskWithRelations extends Task {
  assignees: { id: string; user: { name: string | null; email: string } }[];
}

const priorityColors: Record<string, string> = {
  low: "#64748b",
  medium: "#3b82f6",
  high: "#f97316",
  urgent: "#ef4444",
};

const statusColors: Record<string, string> = {
  backlog: "#64748b",
  todo: "#3b82f6",
  in_progress: "#f97316",
  review: "#a855f7",
  done: "#22c55e",
};

const CalendarPage = () => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const locale = params.locale as string;
  
  // Use React Query for caching
  const { data: tasks = [], isLoading: loading } = useTasks(workspaceId);

  const events = tasks
    .filter((task) => task.dueDate)
    .map((task) => ({
      id: task.id,
      title: task.title,
      date: task.dueDate,
      backgroundColor: statusColors[task.status],
      borderColor: statusColors[task.status],
      extendedProps: {
        task,
      },
    }));

  const handleEventClick = (info: any) => {
    window.location.href = `/${locale}/app/${workspaceId}/tasks/${info.event.id}`;
  };

  const handleDateClick = (info: any) => {
    // TODO: Open create task dialog with selected date
    console.log("Date clicked:", info.dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            Calendar
          </h1>
          <p className="text-muted-foreground">
            View and manage tasks by due date
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{status.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            eventContent={(eventInfo) => (
              <div className="p-1 text-xs truncate">
                {eventInfo.event.title}
              </div>
            )}
            height="auto"
            aspectRatio={1.8}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
