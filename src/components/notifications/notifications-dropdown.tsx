"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  UserPlus,
  FileText,
  MessageSquare,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/lib/actions/notification";

const notificationIcons: Record<string, React.ElementType> = {
  task_assigned: UserPlus,
  task_updated: FileText,
  task_commented: MessageSquare,
  mention: MessageSquare,
  due_reminder: AlertCircle,
  default: Bell,
};

const notificationColors: Record<string, string> = {
  task_assigned: "text-blue-500 bg-blue-500/10",
  task_updated: "text-orange-500 bg-orange-500/10",
  task_commented: "text-violet-500 bg-violet-500/10",
  mention: "text-emerald-500 bg-emerald-500/10",
  due_reminder: "text-red-500 bg-red-500/10",
  default: "text-muted-foreground bg-muted",
};

interface Notification {
  id: string;
  userId: string;
  workspaceId: string | null;
  taskId: string | null;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: Date;
}

export const NotificationsDropdown = () => {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const [notifResult, countResult] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ]);
      
      if (notifResult.success) {
        setNotifications(notifResult.notifications as Notification[]);
      }
      if (countResult.success) {
        setUnreadCount(countResult.count);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getUnreadCount();
      if (result.success) {
        setUnreadCount(result.count);
      }
    }, 30000);

    // Initial fetch
    getUnreadCount().then((result) => {
      if (result.success) {
        setUnreadCount(result.count);
      }
    });

    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await markAsRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const handleDelete = async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    const result = await deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    setOpen(false);
    
    if (notification.taskId && notification.workspaceId) {
      router.push(`/${locale}/app/${notification.workspaceId}/tasks/${notification.taskId}`);
    } else if (notification.workspaceId) {
      router.push(`/${locale}/app/${notification.workspaceId}/dashboard`);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="w-3 h-3 me-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || notificationIcons.default;
                const colorClass = notificationColors[notification.type] || notificationColors.default;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => handleClick(notification)}
                  >
                    <div className={cn("p-2 rounded-lg mt-0.5", colorClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm truncate",
                        !notification.read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
