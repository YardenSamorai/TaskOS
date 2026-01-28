"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Check, ChevronDown } from "lucide-react";
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
import { format, isToday, isPast, startOfDay } from "date-fns";
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
    if (!r.dueDate) return true;
    return isToday(new Date(r.dueDate));
  });

  const upcomingReminders = reminders.filter(r => {
    if (!r.dueDate) return false;
    const date = new Date(r.dueDate);
    return !isToday(date) && !isPast(startOfDay(date));
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-muted-foreground" />
            Reminders
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
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
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddReminder();
                if (e.key === "Escape") setIsAdding(false);
              }}
            />
            <Button size="sm" onClick={handleAddReminder}>
              Add
            </Button>
          </div>
        )}

        {/* Today section */}
        <Collapsible open={todayOpen} onOpenChange={setTodayOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              !todayOpen && "-rotate-90"
            )} />
            <span className="text-sm font-medium">Today</span>
            <Badge variant="secondary" className="text-xs">
              {todayReminders.filter(r => !r.completed).length}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {todayReminders.length === 0 ? (
              <p className="text-muted-foreground text-sm py-2 pl-6">No reminders for today</p>
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
            <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className="w-4 h-4" />
              <span className="text-sm font-medium">Upcoming</span>
              <Badge variant="secondary" className="text-xs">
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
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <button
        onClick={onToggle}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
          reminder.completed
            ? "bg-primary border-primary"
            : "border-muted-foreground/30 hover:border-primary"
        )}
      >
        {reminder.completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>
      <span className={cn(
        "flex-1 text-sm transition-colors",
        reminder.completed ? "text-muted-foreground line-through" : ""
      )}>
        {reminder.title}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
