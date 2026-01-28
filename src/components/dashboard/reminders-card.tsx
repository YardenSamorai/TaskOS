"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, Plus, Trash2, Check, ChevronDown, AlertCircle } from "lucide-react";
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
import { 
  format, 
  isToday, 
  isYesterday, 
  isTomorrow, 
  isPast, 
  startOfDay,
  isThisWeek,
  differenceInDays
} from "date-fns";
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

interface GroupedReminders {
  overdue: Reminder[];
  yesterday: Reminder[];
  today: Reminder[];
  tomorrow: Reminder[];
  thisWeek: Reminder[];
  later: Reminder[];
  noDate: Reminder[];
}

export const RemindersCard = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overdue: true,
    today: true,
    yesterday: false,
    tomorrow: true,
    thisWeek: false,
    later: false,
    noDate: false,
  });

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
  const groupedReminders = useMemo((): GroupedReminders => {
    const groups: GroupedReminders = {
      overdue: [],
      yesterday: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      noDate: [],
    };

    reminders.forEach(reminder => {
      if (!reminder.dueDate) {
        groups.noDate.push(reminder);
        return;
      }

      const date = new Date(reminder.dueDate);
      const today = startOfDay(new Date());

      if (isToday(date)) {
        groups.today.push(reminder);
      } else if (isYesterday(date)) {
        groups.yesterday.push(reminder);
      } else if (isTomorrow(date)) {
        groups.tomorrow.push(reminder);
      } else if (isPast(date)) {
        groups.overdue.push(reminder);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(reminder);
      } else {
        groups.later.push(reminder);
      }
    });

    return groups;
  }, [reminders]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const sections = [
    { 
      key: "overdue", 
      label: "Overdue", 
      items: groupedReminders.overdue,
      className: "text-red-500",
      icon: <AlertCircle className="w-4 h-4 text-red-500" />
    },
    { 
      key: "yesterday", 
      label: "Yesterday", 
      items: groupedReminders.yesterday,
      className: "text-orange-500"
    },
    { 
      key: "today", 
      label: "Today", 
      items: groupedReminders.today,
      className: "text-foreground"
    },
    { 
      key: "tomorrow", 
      label: "Tomorrow", 
      items: groupedReminders.tomorrow,
      className: "text-blue-500"
    },
    { 
      key: "thisWeek", 
      label: "This Week", 
      items: groupedReminders.thisWeek,
      className: "text-muted-foreground"
    },
    { 
      key: "later", 
      label: "Later", 
      items: groupedReminders.later,
      className: "text-muted-foreground"
    },
    { 
      key: "noDate", 
      label: "No Date", 
      items: groupedReminders.noDate,
      className: "text-muted-foreground"
    },
  ];

  const totalActive = reminders.filter(r => !r.completed).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-muted-foreground" />
            Reminders
            {totalActive > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {totalActive}
              </Badge>
            )}
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
      <CardContent className="space-y-3">
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

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No reminders yet. Add one above!
          </p>
        ) : (
          sections.map(({ key, label, items, className, icon }) => {
            if (items.length === 0) return null;
            
            const activeCount = items.filter(r => !r.completed).length;
            
            return (
              <Collapsible 
                key={key} 
                open={openSections[key]} 
                onOpenChange={() => toggleSection(key)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1.5 w-full transition-colors">
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform text-muted-foreground",
                    !openSections[key] && "-rotate-90"
                  )} />
                  {icon}
                  <span className={cn("text-sm font-medium", className)}>
                    {label}
                  </span>
                  <Badge 
                    variant={key === "overdue" ? "destructive" : "secondary"} 
                    className="text-xs ml-auto"
                  >
                    {activeCount}/{items.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 pl-2">
                  {items.map((reminder) => (
                    <ReminderItem
                      key={reminder.id}
                      reminder={reminder}
                      onToggle={() => handleToggle(reminder.id)}
                      onDelete={() => handleDelete(reminder.id)}
                      showDate={key !== "today" && key !== "noDate"}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

interface ReminderItemProps {
  reminder: Reminder;
  onToggle: () => void;
  onDelete: () => void;
  showDate?: boolean;
}

const ReminderItem = ({ reminder, onToggle, onDelete, showDate }: ReminderItemProps) => {
  const formatReminderDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const days = differenceInDays(new Date(), date);
    
    if (days === 0) return null;
    if (days === 1) return "Yesterday";
    if (days === -1) return "Tomorrow";
    if (days > 1 && days <= 7) return `${days} days ago`;
    if (days > 7) return format(date, "MMM d");
    if (days < -1 && days >= -7) return format(date, "EEEE");
    return format(date, "MMM d");
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <button
        onClick={onToggle}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
          reminder.completed
            ? "bg-primary border-primary"
            : "border-muted-foreground/30 hover:border-primary"
        )}
      >
        {reminder.completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm transition-colors block truncate",
          reminder.completed ? "text-muted-foreground line-through" : ""
        )}>
          {reminder.title}
        </span>
        {showDate && reminder.dueDate && (
          <span className="text-xs text-muted-foreground">
            {formatReminderDate(reminder.dueDate)}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
