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
  Target,
  Plus,
  Users,
  ChevronRight,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { CommandPalette } from "@/components/search/command-palette";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { useWorkspace } from "@/lib/hooks/use-workspaces";

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
  // No separate home item - dashboard is the main landing page
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
      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
      active
        ? "text-white shadow-lg"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )}
    style={active ? { 
      backgroundColor: 'var(--accent-color)', 
      boxShadow: '0 10px 25px -5px rgba(var(--accent-color-rgb), 0.4)' 
    } : undefined}
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
  
  const { sidebarOpen, setSidebarOpen, isNavigating, setIsNavigating } = useAppStore();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const workspaceId = params.workspaceId as string | undefined;
  const isInWorkspace = !!workspaceId;
  
  // Fetch workspace details when inside a workspace
  const { data: workspaceData } = useWorkspace(workspaceId || "");
  const workspaceName = workspaceData?.workspace?.name;

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
    router.prefetch(`/${locale}/app/dashboard`);
    router.prefetch(`/${locale}/app/account`);
  }, [workspaceId, locale, router]);

  const navLabels = useMemo(() => ({
    home: "Home",
    myDay: "My Day",
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

  // Compute breadcrumbs based on current path
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; href: string; icon?: React.ElementType }[] = [];
    
    // Always start with Home
    crumbs.push({
      label: "Home",
      href: `/${locale}/app/dashboard`,
      icon: Home,
    });

    // If in a workspace, add the workspace name
    if (isInWorkspace && workspaceName) {
      // Find current page
      const pathSegments = pathname.split("/");
      const lastSegment = pathSegments[pathSegments.length - 1];
      
      // Map segment to label
      const pageLabels: Record<string, { label: string; icon?: React.ElementType }> = {
        dashboard: { label: navLabels.dashboard, icon: LayoutDashboard },
        board: { label: navLabels.board, icon: Kanban },
        tasks: { label: navLabels.tasks, icon: ListTodo },
        calendar: { label: navLabels.calendar, icon: Calendar },
        focus: { label: navLabels.focus, icon: Target },
        members: { label: navLabels.members, icon: Users },
        settings: { label: navLabels.settings, icon: Settings },
      };

      // Add workspace name - clicking goes to dashboard
      crumbs.push({
        label: workspaceName,
        href: `/${locale}/app/${workspaceId}/dashboard`,
      });

      // Add current page (but skip if we're already on dashboard to avoid duplicate)
      if (pageLabels[lastSegment] && lastSegment !== "dashboard") {
        crumbs.push({
          label: pageLabels[lastSegment].label,
          href: `/${locale}/app/${workspaceId}/${lastSegment}`,
          icon: pageLabels[lastSegment].icon,
        });
      }
    } else if (pathname.includes("/account")) {
      crumbs.push({
        label: t("common.profile"),
        href: `/${locale}/app/account`,
      });
    }

    return crumbs;
  }, [pathname, locale, isInWorkspace, workspaceName, workspaceId, navLabels, t]);

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
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300"
                style={{ 
                  background: `linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 60%, #000))`,
                  boxShadow: `0 10px 20px -5px rgba(var(--accent-color-rgb), 0.4)`
                }}
              >
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
              <div className="space-y-2">
                {/* Workspace Header Card */}
                <Link
                  href={`/${locale}/app/${workspaceId}/dashboard`}
                  className="block mx-1 p-3 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 hover:border-border hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md transition-transform group-hover:scale-105"
                      style={{ 
                        background: `linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 60%, #6366f1))`,
                      }}
                    >
                      {workspaceName?.charAt(0).toUpperCase() || "W"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Current Workspace</p>
                      <p className="font-semibold text-foreground truncate" title={workspaceName}>
                        {workspaceName || "Loading..."}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Navigation Items */}
                <div className="space-y-1 pt-1">
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
              </div>
            )}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-border space-y-4">
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

              {/* Breadcrumbs */}
              <nav className="hidden md:flex items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <div key={`${index}-${crumb.label}`} className="flex items-center gap-1">
                    {index > 0 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    )}
                    <Link
                      href={crumb.href}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                        index === breadcrumbs.length - 1
                          ? "text-foreground font-medium bg-muted/50"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {crumb.icon && <crumb.icon className="w-3.5 h-3.5" />}
                      <span className="max-w-[120px] truncate">{crumb.label}</span>
                    </Link>
                  </div>
                ))}
              </nav>
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
