"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Check, ChevronDown, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  getReminders, 
  createReminder, 
  toggleReminder, 
  deleteReminder 
} from "@/lib/actions/reminder";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  completed: boolean;
}

export const RemindersCard = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [todayOpen, setTodayOpen] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const result = await getReminders();
      if (result.success) {
        setReminders(result.reminders as Reminder[]);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    if (!newReminderTitle.trim()) return;

    try {
      const result = await createReminder({ 
        title: newReminderTitle.trim(),
        dueDate: format(new Date(), "yyyy-MM-dd"),
      });
      if (result.success && result.reminder) {
        setReminders([result.reminder, ...reminders]);
        setNewReminderTitle("");
        setIsAdding(false);
        toast.success("Reminder added");
      }
    } catch (error) {
      toast.error("Failed to add reminder");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const result = await toggleReminder(id);
      if (result.success) {
        setReminders(reminders.map(r => 
          r.id === id ? { ...r, completed: !r.completed } : r
        ));
      }
    } catch (error) {
      toast.error("Failed to update reminder");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteReminder(id);
      if (result.success) {
        setReminders(reminders.filter(r => r.id !== id));
        toast.success("Reminder deleted");
      }
    } catch (error) {
      toast.error("Failed to delete reminder");
    }
  };

  // Group reminders by date
  const todayReminders = reminders.filter(r => {
    if (!r.dueDate) return true; // No date = show in today
    return isToday(new Date(r.dueDate));
  });

  const upcomingReminders = reminders.filter(r => {
    if (!r.dueDate) return false;
    const date = new Date(r.dueDate);
    return !isToday(date) && !isPast(startOfDay(date));
  });

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Bell className="w-5 h-5 text-zinc-400" />
            Reminders
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-400 hover:text-white"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add reminder input */}
        {isAdding && (
          <div className="flex items-center gap-2">
            <Input
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              placeholder="Add a reminder..."
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddReminder();
                if (e.key === "Escape") setIsAdding(false);
              }}
            />
            <Button 
              size="sm" 
              onClick={handleAddReminder}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Add
            </Button>
          </div>
        )}

        {/* Today section */}
        <Collapsible open={todayOpen} onOpenChange={setTodayOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              !todayOpen && "-rotate-90"
            )} />
            <span className="text-sm font-medium">Today</span>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
              {todayReminders.filter(r => !r.completed).length}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {todayReminders.length === 0 ? (
              <p className="text-zinc-500 text-sm py-2 pl-6">No reminders for today</p>
            ) : (
              todayReminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onToggle={() => handleToggle(reminder.id)}
                  onDelete={() => handleDelete(reminder.id)}
                />
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Upcoming section */}
        {upcomingReminders.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <ChevronDown className="w-4 h-4" />
              <span className="text-sm font-medium">Upcoming</span>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
                {upcomingReminders.filter(r => !r.completed).length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {upcomingReminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onToggle={() => handleToggle(reminder.id)}
                  onDelete={() => handleDelete(reminder.id)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

interface ReminderItemProps {
  reminder: Reminder;
  onToggle: () => void;
  onDelete: () => void;
}

const ReminderItem = ({ reminder, onToggle, onDelete }: ReminderItemProps) => {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group">
      <button
        onClick={onToggle}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
          reminder.completed
            ? "bg-emerald-500 border-emerald-500"
            : "border-zinc-600 hover:border-amber-500"
        )}
      >
        {reminder.completed && <Check className="w-3 h-3 text-white" />}
      </button>
      <span className={cn(
        "flex-1 text-sm transition-colors",
        reminder.completed ? "text-zinc-500 line-through" : "text-zinc-200"
      )}>
        {reminder.title}
      </span>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-amber-500"
        >
          <Bell className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
        >
          <Clock className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
