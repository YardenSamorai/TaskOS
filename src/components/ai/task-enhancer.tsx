"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EnhancedTask {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  suggestedSteps: string[];
  suggestedPriority: string;
  suggestedTags: string[];
}

interface TaskEnhancerProps {
  taskDescription: string;
  workspaceName?: string;
  projectName?: string;
  onApply: (enhancedTask: EnhancedTask) => void;
  onCancel?: () => void;
  className?: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 border-slate-200",
  medium: "bg-blue-500/10 text-blue-600 border-blue-200",
  high: "bg-orange-500/10 text-orange-600 border-orange-200",
  urgent: "bg-red-500/10 text-red-600 border-red-200",
};

export const TaskEnhancer = ({
  taskDescription,
  workspaceName,
  projectName,
  onApply,
  onCancel,
  className,
}: TaskEnhancerProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancedTask, setEnhancedTask] = useState<EnhancedTask | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  const enhance = async () => {
    if (!taskDescription.trim()) {
      setError("Please enter a task description first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/enhance-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskDescription,
          context: { workspaceName, projectName },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to enhance task");
      }

      setEnhancedTask(data.enhancedTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Not enhanced yet - show the button
  if (!enhancedTask && !loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          type="button"
          variant="outline"
          onClick={enhance}
          disabled={!taskDescription.trim() || taskDescription.length < 3}
          className="gap-2 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-200 hover:border-violet-300 hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-purple-500/20"
        >
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-violet-700">Enhance with AI</span>
        </Button>
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
        {taskDescription.length >= 3 && taskDescription.length < 10 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Tip: Add more details for better results
          </p>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={cn("p-4 rounded-xl border bg-gradient-to-r from-violet-500/5 to-purple-500/5 border-violet-200", className)}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
            <Loader2 className="w-5 h-5 text-violet-500 animate-spin absolute inset-0" />
          </div>
          <div>
            <p className="font-medium text-violet-700">AI is enhancing your task...</p>
            <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced task preview
  if (enhancedTask) {
    return (
      <div className={cn("rounded-xl border bg-gradient-to-r from-violet-500/5 to-purple-500/5 border-violet-200 overflow-hidden", className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-violet-100 bg-white/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="font-medium text-violet-700">AI Enhanced Task</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-7 px-2"
          >
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {showDetails && (
          <div className="p-4 space-y-4">
            {/* Title */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Title</p>
              <p className="font-semibold">{enhancedTask.title}</p>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground/80">{enhancedTask.description}</p>
            </div>

            {/* Acceptance Criteria */}
            {enhancedTask.acceptanceCriteria.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Acceptance Criteria
                </p>
                <ul className="space-y-1">
                  {enhancedTask.acceptanceCriteria.map((criteria, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Steps */}
            {enhancedTask.suggestedSteps.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Suggested Steps
                </p>
                <ul className="space-y-1">
                  {enhancedTask.suggestedSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">□</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Priority & Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("capitalize", priorityColors[enhancedTask.suggestedPriority])}
              >
                {enhancedTask.suggestedPriority} priority
              </Badge>
              {enhancedTask.suggestedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 p-3 border-t border-violet-100 bg-white/50">
          <Button
            type="button"
            onClick={() => onApply(enhancedTask)}
            className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700"
          >
            <Check className="w-4 h-4" />
            Apply Enhancement
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEnhancedTask(null);
              onCancel?.();
            }}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Discard
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
