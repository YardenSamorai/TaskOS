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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl overflow-hidden">
        <DialogHeader className="text-center pb-2">
          {/* Success Badge */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Successfully Connected!</span>
              <PartyPopper className="w-4 h-4" />
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Github className="w-12 h-12 text-primary" />
            </div>
          </div>

          <DialogTitle className="text-2xl font-bold">
            GitHub Integration Ready
          </DialogTitle>
          <p className="text-muted-foreground mt-2">
            Supercharge your workflow with powerful GitHub features
          </p>
        </DialogHeader>

        {/* Features Grid */}
        <div className="py-4">
          <h3 className="text-center text-sm font-medium text-muted-foreground mb-4">
            What you can do now
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={cn(
                  "group p-3 rounded-xl border bg-card transition-all duration-300",
                  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                  "animate-in fade-in-0 slide-in-from-bottom-2",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center mb-2",
                    "bg-primary/10 text-primary",
                    "group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  )}
                >
                  <feature.icon className="w-4 h-4" />
                </div>
                <h4 className="font-medium text-sm mb-0.5">{feature.title}</h4>
                <p className="text-xs text-muted-foreground leading-snug">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start Tips */}
        <div className="p-4 bg-muted/30 rounded-xl border">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Quick Start
          </h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 font-medium">1</span>
              <span>Link a repository to your workspace from the dashboard</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 font-medium">2</span>
              <span>Import existing issues or create new tasks with GitHub sync</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 font-medium">3</span>
              <span>Changes sync automatically — close a task, close the issue!</span>
            </li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="ghost" onClick={handleClose}>
            I'll explore later
          </Button>
          <Button onClick={handleGetStarted} className="gap-2">
            <Link2 className="w-4 h-4" />
            Link a Repository
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
