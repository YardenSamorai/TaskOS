"use client";

import { useState } from "react";
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
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GitHubOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkRepository?: () => void;
}

const features = [
  {
    icon: FolderGit2,
    title: "Link Repositories",
    description: "Connect your GitHub repositories to workspaces for seamless integration",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Download,
    title: "Import Issues as Tasks",
    description: "Bring your GitHub issues into TaskOS as actionable tasks",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Upload,
    title: "Create Issues from Tasks",
    description: "Push your tasks to GitHub as issues with one click",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: RefreshCw,
    title: "Two-Way Sync",
    description: "Keep tasks and issues in sync - close one, close both",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: GitCommit,
    title: "Track Commits",
    description: "See related commits directly in your task details",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: GitPullRequest,
    title: "Monitor Pull Requests",
    description: "View linked PRs and their status within tasks",
    color: "from-teal-500 to-green-500",
  },
];

export function GitHubOnboardingDialog({
  open,
  onOpenChange,
  onLinkRepository,
}: GitHubOnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleClose = () => {
    setCurrentStep(0);
    onOpenChange(false);
  };

  const handleGetStarted = () => {
    handleClose();
    onLinkRepository?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-[#24292e] to-[#1a1e22] text-white p-8 pb-12">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
              <Github className="w-10 h-10" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Successfully Connected!</span>
              </div>
              <h2 className="text-2xl font-bold">GitHub Integration Ready</h2>
              <p className="text-white/70 mt-1">
                Supercharge your workflow with powerful GitHub features
              </p>
            </div>
          </div>

          {/* Connection indicator */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="p-6 pt-10 bg-background">
          <h3 className="text-center text-lg font-semibold mb-6">
            What you can do now
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={cn(
                  "group p-4 rounded-xl border-2 border-transparent transition-all duration-300",
                  "hover:border-primary/20 hover:bg-muted/50",
                  "animate-in fade-in-0 slide-in-from-bottom-2",
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    "bg-gradient-to-br",
                    feature.color,
                    "text-white shadow-lg group-hover:scale-110 transition-transform"
                  )}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h4 className="font-medium text-sm mb-1">{feature.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Start Tips */}
          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Quick Start
            </h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Link a repository to your workspace from the dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Import existing issues or create new tasks with GitHub sync</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Changes sync automatically - close a task, close the issue!</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={handleClose}>
              I'll explore later
            </Button>
            <Button onClick={handleGetStarted} className="gap-2">
              <Link2 className="w-4 h-4" />
              Link a Repository
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
