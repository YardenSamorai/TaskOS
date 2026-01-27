"use client";

import { useCallback, useEffect, useMemo, memo, useState } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/components/auth/user-menu";
import {
  LayoutDashboard,
  Kanban,
  ListTodo,
  Calendar,
  FileStack,
  Settings,
  FolderKanban,
  Menu,
  X,
  Zap,
  Search,
  Sun,
  Moon,
  Target,
  Plus,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { CommandPalette } from "@/components/search/command-palette";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { InstallPrompt } from "@/components/pwa/install-prompt";

interface AppShellProps {
  children: React.ReactNode;
  locale: string;
}

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  href: string;
  requiresWorkspace?: boolean;
}

const mainNavItems: NavItem[] = [
  { icon: FolderKanban, labelKey: "workspaces", href: "/app/workspaces" },
];

const workspaceNavItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "dashboard", href: "/dashboard", requiresWorkspace: true },
  { icon: Kanban, labelKey: "board", href: "/board", requiresWorkspace: true },
  { icon: ListTodo, labelKey: "tasks", href: "/tasks", requiresWorkspace: true },
  { icon: Calendar, labelKey: "calendar", href: "/calendar", requiresWorkspace: true },
  { icon: Target, labelKey: "focus", href: "/focus", requiresWorkspace: true },
  { icon: Users, labelKey: "members", href: "/members", requiresWorkspace: true },
  { icon: Settings, labelKey: "settings", href: "/settings", requiresWorkspace: true },
];

const mobileNavItems = [
  { icon: LayoutDashboard, labelKey: "dashboard", href: "/dashboard" },
  { icon: Kanban, labelKey: "board", href: "/board" },
  { icon: ListTodo, labelKey: "tasks", href: "/tasks" },
  { icon: Calendar, labelKey: "calendar", href: "/calendar" },
  { icon: Target, labelKey: "focus", href: "/focus" },
];

// Memoized NavLink for performance
const NavLink = memo(({ 
  item, 
  active, 
  href, 
  label, 
  onClick 
}: { 
  item: NavItem; 
  active: boolean; 
  href: string; 
  label: string;
  onClick: () => void;
}) => (
  <Link
    href={href}
    prefetch={true}
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )}
  >
    <item.icon className="w-5 h-5 flex-shrink-0" />
    <span>{label}</span>
  </Link>
));
NavLink.displayName = "NavLink";

// Memoized MobileNavLink for performance
const MobileNavLink = memo(({
  item,
  active,
  href,
  label,
  onClick,
}: {
  item: { icon: React.ElementType; labelKey: string; href: string };
  active: boolean;
  href: string;
  label: string;
  onClick: () => void;
}) => (
  <Link
    href={href}
    prefetch={true}
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={cn(
      "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
      active ? "text-primary" : "text-muted-foreground"
    )}
  >
    <item.icon className="w-5 h-5" />
    <span className="text-[10px] font-medium">{label}</span>
  </Link>
));
MobileNavLink.displayName = "MobileNavLink";

export const AppShell = ({ children, locale }: AppShellProps) => {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  
  const { sidebarOpen, setSidebarOpen, isNavigating, setIsNavigating } = useAppStore();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const workspaceId = params.workspaceId as string | undefined;
  const isInWorkspace = !!workspaceId;

  // Fast navigation - use replace for same-workspace navigation
  const navigateTo = useCallback((href: string) => {
    setSidebarOpen(false);
    setIsNavigating(true);
    
    // Use shallow routing where possible
    router.push(href, { scroll: false });
    
    // Reset navigation state after a short delay
    setTimeout(() => setIsNavigating(false), 100);
  }, [router, setSidebarOpen, setIsNavigating]);

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, setIsNavigating]);

  // Prefetch all workspace routes on mount
  useEffect(() => {
    if (workspaceId) {
      workspaceNavItems.forEach((item) => {
        const href = `/${locale}/app/${workspaceId}${item.href}`;
        router.prefetch(href);
      });
    }
    // Prefetch workspaces and account
    router.prefetch(`/${locale}/app/workspaces`);
    router.prefetch(`/${locale}/app/account`);
  }, [workspaceId, locale, router]);

  const navLabels = useMemo(() => ({
    workspaces: t("workspaces.title"),
    dashboard: t("dashboard.title"),
    board: t("board.title"),
    tasks: t("tasks.title"),
    calendar: t("calendar.title"),
    focus: t("focus.title"),
    templates: t("templates.title"),
    settings: t("settings.title"),
    members: t("common.members") || "Members",
  }), [t]);

  const getHref = useCallback((item: NavItem) => {
    if (item.requiresWorkspace && workspaceId) {
      return `/${locale}/app/${workspaceId}${item.href}`;
    }
    return `/${locale}${item.href}`;
  }, [locale, workspaceId]);

  const isActive = useCallback((href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 start-0 z-50 w-64 bg-card border-e border-border transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full rtl:lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">
                Task<span className="text-primary">OS</span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {/* Main nav */}
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const href = getHref(item);
                return (
                  <NavLink
                    key={item.labelKey}
                    item={item}
                    active={isActive(href)}
                    href={href}
                    label={navLabels[item.labelKey as keyof typeof navLabels]}
                    onClick={() => navigateTo(href)}
                  />
                );
              })}
            </div>

            {/* Workspace nav */}
            {isInWorkspace && (
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Workspace
                </p>
                {workspaceNavItems.map((item) => {
                  const href = getHref(item);
                  return (
                    <NavLink
                      key={item.labelKey}
                      item={item}
                      active={isActive(href)}
                      href={href}
                      label={navLabels[item.labelKey as keyof typeof navLabels]}
                      onClick={() => navigateTo(href)}
                    />
                  );
                })}
              </div>
            )}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-border space-y-4">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </Button>

            {/* User */}
            <div className="flex items-center gap-3 px-2 rounded-lg hover:bg-muted transition-colors py-2">
              <UserMenu locale={locale} />
              <Link href={`/${locale}/app/account`} className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t("common.profile")}</p>
                <p className="text-xs text-muted-foreground">Account Settings</p>
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ps-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border pt-[env(safe-area-inset-top)]">
          {/* Loading indicator */}
          {isNavigating && (
            <div className="absolute top-[env(safe-area-inset-top)] left-0 right-0 h-0.5 bg-primary/20 overflow-hidden">
              <div className="h-full bg-primary animate-pulse w-full" />
            </div>
          )}
          <div className="flex items-center justify-between h-14 px-4">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Search - opens command palette */}
              <button
                onClick={() => {
                  // Trigger Cmd+K
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    metaKey: true,
                    ctrlKey: true,
                    bubbles: true,
                  });
                  document.dispatchEvent(event);
                }}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border w-64 hover:bg-muted/80 transition-colors"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground flex-1 text-start">
                  {t("common.search")}
                </span>
                <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {isInWorkspace && (
                <Button size="sm" className="gap-2" onClick={() => setCreateTaskOpen(true)}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("tasks.create")}</span>
                </Button>
              )}

              <NotificationsDropdown />

              <div className="lg:hidden">
                <UserMenu locale={locale} size="sm" />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isInWorkspace && (
        <nav className="fixed bottom-0 start-0 end-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border lg:hidden pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-14">
            {mobileNavItems.map((item) => {
              const href = `/${locale}/app/${workspaceId}${item.href}`;
              return (
                <MobileNavLink
                  key={item.labelKey}
                  item={item}
                  active={isActive(href)}
                  href={href}
                  label={navLabels[item.labelKey as keyof typeof navLabels]}
                  onClick={() => navigateTo(href)}
                />
              );
            })}
          </div>
        </nav>
      )}

      {/* Create Task Dialog */}
      {isInWorkspace && workspaceId && (
        <CreateTaskDialog
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          workspaceId={workspaceId}
          locale={locale}
        />
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
};
