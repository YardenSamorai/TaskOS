"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Upload,
  RefreshCw,
  FolderKanban,
  Sparkles,
  ArrowRight,
  Check,
  PartyPopper,
  Link2,
  Users,
} from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface JiraOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkProject?: () => void;
}

// Jira icon
const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
  </svg>
);

const features = [
  {
    icon: FolderKanban,
    title: "Link Projects",
    description: "Connect Jira projects to your workspaces",
  },
  {
    icon: Download,
    title: "Import Issues",
    description: "Bring Jira issues into TaskOS as tasks",
  },
  {
    icon: Upload,
    title: "Create Issues",
    description: "Push tasks to Jira as issues with one click",
  },
  {
    icon: RefreshCw,
    title: "Two-Way Sync",
    description: "Status changes sync automatically",
  },
  {
    icon: Users,
    title: "Team Sync",
    description: "Keep assignees in sync across platforms",
  },
  {
    icon: Link2,
    title: "Deep Links",
    description: "Quick links to Jira issues from tasks",
  },
];

export function JiraOnboardingDialog({
  open,
  onOpenChange,
  onLinkProject,
}: JiraOnboardingDialogProps) {
  // Fire confetti when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.1, y: 0.6 },
          colors: ['#0052CC', '#36B37E', '#FF5630', '#6554C0', '#FFAB00'],
        });
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.9, y: 0.6 },
          colors: ['#0052CC', '#36B37E', '#FF5630', '#6554C0', '#FFAB00'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 100,
            origin: { x: 0.5, y: 0.3 },
            colors: ['#0052CC', '#36B37E', '#FF5630', '#6554C0', '#FFAB00'],
          });
        }, 200);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleGetStarted = () => {
    handleClose();
    onLinkProject?.();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-2xl overflow-hidden">
        <ResponsiveDialogHeader className="text-center pb-2">
          {/* Success Badge */}
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#0052CC]/10 text-[#0052CC] border border-[#0052CC]/20">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Connected!</span>
              <PartyPopper className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0052CC]/10 border border-[#0052CC]/20">
              <JiraIcon className="w-10 h-10 sm:w-12 sm:h-12 text-[#0052CC]" />
            </div>
          </div>

          <ResponsiveDialogTitle className="text-xl sm:text-2xl font-bold">
            Jira Integration Ready
          </ResponsiveDialogTitle>
          <p className="text-muted-foreground mt-1.5 sm:mt-2 text-sm sm:text-base">
            Connect your Jira projects with TaskOS
          </p>
        </ResponsiveDialogHeader>

        {/* Features Grid */}
        <div className="py-3 sm:py-4">
          <h3 className="text-center text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
            What you can do now
          </h3>

          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={cn(
                  "group p-2.5 sm:p-3 rounded-lg sm:rounded-xl border bg-card transition-all duration-300",
                  "hover:border-[#0052CC]/30 hover:shadow-md hover:shadow-[#0052CC]/5",
                  "animate-in fade-in-0 slide-in-from-bottom-2",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2",
                    "bg-[#0052CC]/10 text-[#0052CC]",
                    "group-hover:bg-[#0052CC] group-hover:text-white transition-colors"
                  )}
                >
                  <feature.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h4 className="font-medium text-xs sm:text-sm mb-0.5 line-clamp-1">{feature.title}</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug line-clamp-2">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start Tips */}
        <div className="p-3 sm:p-4 bg-muted/30 rounded-lg sm:rounded-xl border">
          <h4 className="font-medium text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0052CC]" />
            Quick Start
          </h4>
          <ol className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0052CC] text-white text-[10px] sm:text-xs flex items-center justify-center flex-shrink-0 font-medium">1</span>
              <span>Link a Jira project from the dashboard</span>
            </li>
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0052CC] text-white text-[10px] sm:text-xs flex items-center justify-center flex-shrink-0 font-medium">2</span>
              <span>Import issues or create tasks with sync</span>
            </li>
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0052CC] text-white text-[10px] sm:text-xs flex items-center justify-center flex-shrink-0 font-medium">3</span>
              <span>Status changes sync automatically!</span>
            </li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse xs:flex-row items-center justify-between gap-2 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
          <Button variant="ghost" onClick={handleClose} size="sm" className="w-full xs:w-auto">
            Explore later
          </Button>
          <Button onClick={handleGetStarted} size="sm" className="gap-1.5 sm:gap-2 w-full xs:w-auto bg-[#0052CC] hover:bg-[#0052CC]/90">
            <FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Link a Project</span>
            <span className="xs:hidden">Link Project</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
