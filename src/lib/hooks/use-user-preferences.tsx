"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

// Types
export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskDueSoon: boolean;
  mentions: boolean;
  comments: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

export interface AppearancePreferences {
  theme: "light" | "dark" | "system";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  reducedMotion: boolean;
  compactMode: boolean;
  sidebarPosition: "left" | "right";
}

export interface LanguagePreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  weekStart: "sunday" | "monday";
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  appearance: AppearancePreferences;
  language: LanguagePreferences;
}

// Defaults
const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  taskAssigned: true,
  taskCompleted: true,
  taskDueSoon: true,
  mentions: true,
  comments: true,
  weeklyDigest: true,
  marketingEmails: false,
  soundEnabled: true,
  desktopNotifications: true,
};

const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "system",
  accentColor: "#6366f1",
  fontSize: "medium",
  reducedMotion: false,
  compactMode: false,
  sidebarPosition: "left",
};

const DEFAULT_LANGUAGE: LanguagePreferences = {
  language: "en",
  timezone: typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  weekStart: "sunday",
};

// Storage keys
const STORAGE_KEYS = {
  notifications: "taskos-notifications",
  appearance: "taskos-appearance",
  language: "taskos-language",
};

// Context
interface PreferencesContextType {
  preferences: UserPreferences;
  updateNotifications: (prefs: Partial<NotificationPreferences>) => void;
  updateAppearance: (prefs: Partial<AppearancePreferences>) => void;
  updateLanguage: (prefs: Partial<LanguagePreferences>) => void;
  formatDate: (date: Date | string | null | undefined) => string;
  formatTime: (date: Date | string | null | undefined) => string;
  formatDateTime: (date: Date | string | null | undefined) => string;
  formatRelativeDate: (date: Date | string | null | undefined) => string;
  requestNotificationPermission: () => Promise<boolean>;
  sendDesktopNotification: (title: string, options?: NotificationOptions) => void;
  playNotificationSound: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

// Helper to safely parse JSON
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// Provider
export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: DEFAULT_NOTIFICATIONS,
    appearance: DEFAULT_APPEARANCE,
    language: DEFAULT_LANGUAGE,
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const notifications = safeJsonParse(
      localStorage.getItem(STORAGE_KEYS.notifications),
      DEFAULT_NOTIFICATIONS
    );
    const appearance = safeJsonParse(
      localStorage.getItem(STORAGE_KEYS.appearance),
      DEFAULT_APPEARANCE
    );
    const language = safeJsonParse(
      localStorage.getItem(STORAGE_KEYS.language),
      DEFAULT_LANGUAGE
    );

    setPreferences({ notifications, appearance, language });

    // Apply appearance settings immediately
    applyAppearanceSettings(appearance);
  }, []);

  // Apply appearance settings to document
  const applyAppearanceSettings = useCallback((appearance: AppearancePreferences) => {
    const root = document.documentElement;

    // Accent color - set CSS variables
    root.style.setProperty("--accent-color", appearance.accentColor);
    root.style.setProperty("--accent-color-rgb", hexToRgb(appearance.accentColor));

    // Font size
    const fontSizes = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    root.style.setProperty("--base-font-size", fontSizes[appearance.fontSize]);
    root.style.fontSize = fontSizes[appearance.fontSize];

    // Compact mode
    if (appearance.compactMode) {
      root.classList.add("compact-mode");
    } else {
      root.classList.remove("compact-mode");
    }

    // Reduced motion
    if (appearance.reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  }, []);

  // Update notification preferences
  const updateNotifications = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev.notifications, ...prefs };
      localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(updated));
      return { ...prev, notifications: updated };
    });
  }, []);

  // Update appearance preferences
  const updateAppearance = useCallback((prefs: Partial<AppearancePreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev.appearance, ...prefs };
      localStorage.setItem(STORAGE_KEYS.appearance, JSON.stringify(updated));
      applyAppearanceSettings(updated);
      return { ...prev, appearance: updated };
    });
  }, [applyAppearanceSettings]);

  // Update language preferences
  const updateLanguage = useCallback((prefs: Partial<LanguagePreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev.language, ...prefs };
      localStorage.setItem(STORAGE_KEYS.language, JSON.stringify(updated));
      return { ...prev, language: updated };
    });
  }, []);

  // Format date according to user preferences
  const formatDate = useCallback((date: Date | string | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    const { dateFormat, timezone } = preferences.language;
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };

    switch (dateFormat) {
      case "DD/MM/YYYY":
        options.day = "2-digit";
        options.month = "2-digit";
        options.year = "numeric";
        return d.toLocaleDateString("en-GB", options);
      case "YYYY-MM-DD":
        options.year = "numeric";
        options.month = "2-digit";
        options.day = "2-digit";
        return d.toLocaleDateString("en-CA", options);
      case "MM/DD/YYYY":
      default:
        options.month = "2-digit";
        options.day = "2-digit";
        options.year = "numeric";
        return d.toLocaleDateString("en-US", options);
    }
  }, [preferences.language]);

  // Format time according to user preferences
  const formatTime = useCallback((date: Date | string | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    const { timeFormat, timezone } = preferences.language;
    
    return d.toLocaleTimeString(timeFormat === "24h" ? "en-GB" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat === "12h",
      timeZone: timezone,
    });
  }, [preferences.language]);

  // Format date and time together
  const formatDateTime = useCallback((date: Date | string | null | undefined): string => {
    if (!date) return "";
    return `${formatDate(date)} ${formatTime(date)}`;
  }, [formatDate, formatTime]);

  // Format relative date (e.g., "2 days ago", "in 3 hours")
  const formatRelativeDate = useCallback((date: Date | string | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const absDiff = Math.abs(diff);
    const isPast = diff < 0;

    const minutes = Math.floor(absDiff / 60000);
    const hours = Math.floor(absDiff / 3600000);
    const days = Math.floor(absDiff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return isPast ? `${minutes}m ago` : `in ${minutes}m`;
    if (hours < 24) return isPast ? `${hours}h ago` : `in ${hours}h`;
    if (days < 7) return isPast ? `${days}d ago` : `in ${days}d`;
    
    return formatDate(d);
  }, [formatDate]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // Send desktop notification
  const sendDesktopNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!preferences.notifications.desktopNotifications) return;
    if (!preferences.notifications.pushNotifications) return;
    if (Notification.permission !== "granted") return;

    new Notification(title, {
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      ...options,
    });

    if (preferences.notifications.soundEnabled) {
      playNotificationSound();
    }
  }, [preferences.notifications]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!preferences.notifications.soundEnabled) return;
    
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn("Could not play notification sound", error);
    }
  }, [preferences.notifications.soundEnabled]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updateNotifications,
        updateAppearance,
        updateLanguage,
        formatDate,
        formatTime,
        formatDateTime,
        formatRelativeDate,
        requestNotificationPermission,
        sendDesktopNotification,
        playNotificationSound,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

// Hook
export function useUserPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("useUserPreferences must be used within a UserPreferencesProvider");
  }
  return context;
}

// Utility to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "99, 102, 241"; // Default indigo
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

// Standalone hook for simple usage (when no context needed)
export function useFormattedDate() {
  const [preferences, setPreferences] = useState<LanguagePreferences>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.language);
    if (saved) {
      setPreferences(safeJsonParse(saved, DEFAULT_LANGUAGE));
    }
  }, []);

  const formatDate = useCallback((date: Date | string | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    const { dateFormat, timezone } = preferences;
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };

    switch (dateFormat) {
      case "DD/MM/YYYY":
        options.day = "2-digit";
        options.month = "2-digit";
        options.year = "numeric";
        return d.toLocaleDateString("en-GB", options);
      case "YYYY-MM-DD":
        options.year = "numeric";
        options.month = "2-digit";
        options.day = "2-digit";
        return d.toLocaleDateString("en-CA", options);
      case "MM/DD/YYYY":
      default:
        options.month = "2-digit";
        options.day = "2-digit";
        options.year = "numeric";
        return d.toLocaleDateString("en-US", options);
    }
  }, [preferences]);

  const formatTime = useCallback((date: Date | string | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    const { timeFormat, timezone } = preferences;
    
    return d.toLocaleTimeString(timeFormat === "24h" ? "en-GB" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat === "12h",
      timeZone: timezone,
    });
  }, [preferences]);

  return { formatDate, formatTime, preferences };
}
