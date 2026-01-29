"use client";

import { useState, useEffect } from "react";
import {
  Github,
  Download,
  Upload,
  RefreshCw,
  GitCommit,
  GitPullRequest,
  Link2,
  FolderGit2,
  Sparkles,
  ArrowRight,
  Check,
  PartyPopper,
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

interface GitHubOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkRepository?: () => void;
}

const features = [
  {
    icon: FolderGit2,
    title: "Link Repositories",
    description: "Connect your GitHub repositories to workspaces",
  },
  {
    icon: Download,
    title: "Import Issues",
    description: "Bring GitHub issues into TaskOS as tasks",
  },
  {
    icon: Upload,
    title: "Create Issues",
    description: "Push tasks to GitHub as issues with one click",
  },
  {
    icon: RefreshCw,
    title: "Two-Way Sync",
    description: "Close a task, close the issue automatically",
  },
  {
    icon: GitCommit,
    title: "Track Commits",
    description: "See related commits in your task details",
  },
  {
    icon: GitPullRequest,
    title: "Monitor PRs",
    description: "View linked pull requests within tasks",
  },
];

export function GitHubOnboardingDialog({
  open,
  onOpenChange,
  onLinkRepository,
}: GitHubOnboardingDialogProps) {
  // Fire confetti when dialog opens
  useEffect(() => {
    if (open) {
      // Short delay for the dialog to appear first
      const timer = setTimeout(() => {
        // Fire from left
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.1, y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
        });
        // Fire from right
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.9, y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
        });
        // Fire from center top
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 100,
            origin: { x: 0.5, y: 0.3 },
            colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
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
    onLinkRepository?.();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-2xl overflow-hidden">
        <ResponsiveDialogHeader className="text-center pb-2">
          {/* Success Badge */}
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">Connected!</span>
              <PartyPopper className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20">
              <Github className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
            </div>
          </div>

          <ResponsiveDialogTitle className="text-xl sm:text-2xl font-bold">
            GitHub Integration Ready
          </ResponsiveDialogTitle>
          <p className="text-muted-foreground mt-1.5 sm:mt-2 text-sm sm:text-base">
            Supercharge your workflow with GitHub
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
                  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                  "animate-in fade-in-0 slide-in-from-bottom-2",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2",
                    "bg-primary/10 text-primary",
                    "group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
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
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            Quick Start
          </h4>
          <ol className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs flex items-center justify-center flex-shrink-0 font-medium">1</span>
              <span>Link a repository from the dashboard</span>
            </li>
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs flex items-center justify-center flex-shrink-0 font-medium">2</span>
              <span>Import issues or create tasks with sync</span>
            </li>
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs flex items-center justify-center flex-shrink-0 font-medium">3</span>
              <span>Changes sync automatically!</span>
            </li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse xs:flex-row items-center justify-between gap-2 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
          <Button variant="ghost" onClick={handleClose} size="sm" className="w-full xs:w-auto">
            Explore later
          </Button>
          <Button onClick={handleGetStarted} size="sm" className="gap-1.5 sm:gap-2 w-full xs:w-auto">
            <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Link a Repository</span>
            <span className="xs:hidden">Link Repository</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
