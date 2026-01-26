"use client";

import { useMemo } from "react";
import { Check, X, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClarityScoreProps {
  title: string;
  description: string;
  hasAcceptanceCriteria?: boolean;
  hasDueDate?: boolean;
  hasAssignee?: boolean;
  hasSteps?: boolean;
  hasPriority?: boolean;
  className?: string;
}

interface CriteriaItem {
  key: string;
  label: string;
  passed: boolean;
  tip?: string;
}

export const ClarityScore = ({
  title,
  description,
  hasAcceptanceCriteria = false,
  hasDueDate = false,
  hasAssignee = false,
  hasSteps = false,
  hasPriority = false,
  className,
}: ClarityScoreProps) => {
  const criteria = useMemo((): CriteriaItem[] => {
    return [
      {
        key: "title",
        label: "Has clear title",
        passed: title.trim().length >= 5,
        tip: "Add a descriptive title (at least 5 characters)",
      },
      {
        key: "description",
        label: "Has description",
        passed: description.trim().length > 0,
        tip: "Add a description to explain the task",
      },
      {
        key: "description_length",
        label: "Detailed description",
        passed: description.trim().length >= 50,
        tip: "Add more details to your description (50+ characters)",
      },
      {
        key: "due_date",
        label: "Has due date",
        passed: hasDueDate,
        tip: "Set a due date to track deadlines",
      },
      {
        key: "assignee",
        label: "Has assignee",
        passed: hasAssignee,
        tip: "Assign someone to take ownership",
      },
      {
        key: "priority",
        label: "Priority set",
        passed: hasPriority,
        tip: "Set priority to help with planning",
      },
      {
        key: "steps",
        label: "Has checklist/steps",
        passed: hasSteps,
        tip: "Break down the task into actionable steps",
      },
      {
        key: "acceptance",
        label: "Has acceptance criteria",
        passed: hasAcceptanceCriteria,
        tip: "Define what 'done' looks like",
      },
    ];
  }, [title, description, hasAcceptanceCriteria, hasDueDate, hasAssignee, hasSteps, hasPriority]);

  const passedCount = criteria.filter((c) => c.passed).length;
  const totalCount = criteria.length;
  const percentage = Math.round((passedCount / totalCount) * 100);

  // Get the first unpassed criteria for the tip
  const firstUnpassed = criteria.find((c) => !c.passed);

  // Score color
  const getScoreColor = () => {
    if (percentage >= 80) return "text-green-600 bg-green-500";
    if (percentage >= 50) return "text-yellow-600 bg-yellow-500";
    return "text-red-600 bg-red-500";
  };

  const getScoreLabel = () => {
    if (percentage >= 80) return "Excellent";
    if (percentage >= 60) return "Good";
    if (percentage >= 40) return "Fair";
    return "Needs work";
  };

  // Only show if there's at least a title
  if (!title.trim()) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border p-3 bg-muted/30", className)}>
      {/* Header with score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Task Clarity</span>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            percentage >= 80 ? "bg-green-100 text-green-700" :
            percentage >= 50 ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          )}>
            {getScoreLabel()}
          </span>
        </div>
        <span className="text-sm font-bold">
          {passedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className={cn("h-full transition-all duration-500", getScoreColor().split(" ")[1])}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Criteria list - compact */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {criteria.map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              item.passed ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {item.passed ? (
              <Check className="w-3 h-3 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Tip */}
      {firstUnpassed && percentage < 100 && (
        <div className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-100">
          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{firstUnpassed.tip}</p>
        </div>
      )}

      {/* Perfect score message */}
      {percentage === 100 && (
        <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-100">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-xs text-green-700">Great job! This task is well-defined.</p>
        </div>
      )}
    </div>
  );
};
