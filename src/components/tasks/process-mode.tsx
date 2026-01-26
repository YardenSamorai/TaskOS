"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createStage, createStep, toggleStep, deleteStep, deleteStage } from "@/lib/actions/task";
import type { Task, TaskStage, TaskStep } from "@/lib/db/schema";

interface StageWithSteps extends TaskStage {
  steps: TaskStep[];
  attachments: { id: string; name: string; url: string }[];
}

interface TaskWithStages extends Task {
  stages: StageWithSteps[];
  steps: TaskStep[];
}

interface ProcessModeProps {
  task: TaskWithStages;
  locale: string;
  workspaceId: string;
}

const stageStatusColors: Record<string, string> = {
  pending: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900",
  active: "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950",
  completed: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950",
};

const stageStatusIcons: Record<string, React.ReactNode> = {
  pending: <Circle className="w-5 h-5 text-slate-400" />,
  active: <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />,
  completed: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
};

export const ProcessMode = ({ task, locale, workspaceId }: ProcessModeProps) => {
  const router = useRouter();
  const [expandedStages, setExpandedStages] = useState<string[]>(
    task.stages.filter((s) => s.status === "active").map((s) => s.id)
  );
  const [addingStep, setAddingStep] = useState<string | null>(null);
  const [newStepContent, setNewStepContent] = useState("");
  const [addingDirectStep, setAddingDirectStep] = useState(false);
  const [newDirectStepContent, setNewDirectStepContent] = useState("");
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageDescription, setNewStageDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [togglingStep, setTogglingStep] = useState<string | null>(null);
  const t = useTranslations("process");

  // Calculate overall progress
  const allSteps = [
    ...task.steps,
    ...task.stages.flatMap((s) => s.steps),
  ];
  const completedSteps = allSteps.filter((s) => s.completed).length;
  const totalSteps = allSteps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    );
  };

  const handleToggleStep = async (stepId: string) => {
    setTogglingStep(stepId);
    try {
      const result = await toggleStep(stepId);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error || "Failed to toggle step");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setTogglingStep(null);
    }
  };

  const handleAddStep = async (stageId?: string) => {
    const content = stageId ? newStepContent : newDirectStepContent;
    if (!content.trim()) return;
    
    setLoading(true);
    try {
      const result = await createStep(task.id, content.trim(), stageId);
      if (result.success) {
        toast.success("Step added");
        if (stageId) {
          setNewStepContent("");
          setAddingStep(null);
        } else {
          setNewDirectStepContent("");
          setAddingDirectStep(false);
        }
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add step");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    
    setLoading(true);
    try {
      const result = await createStage(task.id, newStageName.trim(), newStageDescription.trim() || undefined);
      if (result.success) {
        toast.success("Stage added");
        setNewStageName("");
        setNewStageDescription("");
        setStageDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add stage");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      const result = await deleteStep(stepId);
      if (result.success) {
        toast.success("Step deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete step");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      const result = await deleteStage(stageId);
      if (result.success) {
        toast.success("Stage deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete stage");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              {t("title")}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setStageDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              {t("addStage")}
            </Button>
          </div>
          {/* Progress bar */}
          {totalSteps > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("progress")}</span>
                <span className="font-medium">
                  {completedSteps}/{totalSteps} {t("steps").toLowerCase()}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Direct steps (not in a stage) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("checklist")}
              </h4>
            </div>
            {task.steps.map((step) => (
              <StepItem
                key={step.id}
                step={step}
                onToggle={handleToggleStep}
                onDelete={handleDeleteStep}
                isToggling={togglingStep === step.id}
              />
            ))}
            
            {/* Add direct step */}
            {addingDirectStep ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newDirectStepContent}
                  onChange={(e) => setNewDirectStepContent(e.target.value)}
                  placeholder="Enter step..."
                  className="flex-1"
                  autoFocus
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddStep();
                    if (e.key === "Escape") setAddingDirectStep(false);
                  }}
                />
                <Button size="sm" onClick={() => handleAddStep()} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingDirectStep(false)}
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setAddingDirectStep(true)}
              >
                <Plus className="w-4 h-4 me-2" />
                {t("addStep")}
              </Button>
            )}
          </div>

          {/* Stages */}
          {task.stages.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("stages")}
              </h4>
              {task.stages.map((stage, index) => (
                <Collapsible
                  key={stage.id}
                  open={expandedStages.includes(stage.id)}
                  onOpenChange={() => toggleStage(stage.id)}
                >
                  <div
                    className={cn(
                      "rounded-xl border-2 transition-colors",
                      stageStatusColors[stage.status]
                    )}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-start">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-background border text-xs font-medium">
                          {index + 1}
                        </span>
                        {stageStatusIcons[stage.status]}
                        <div>
                          <h4 className="font-medium">{stage.name}</h4>
                          {stage.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {stage.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {stage.steps.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {stage.steps.filter((s) => s.completed).length}/
                            {stage.steps.length}
                          </span>
                        )}
                        {stage.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="w-3 h-3" />
                            {stage.attachments.length}
                          </span>
                        )}
                        {expandedStages.includes(stage.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3">
                        {/* Steps */}
                        {stage.steps.length > 0 && (
                          <div className="space-y-2">
                            {stage.steps.map((step) => (
                              <StepItem
                                key={step.id}
                                step={step}
                                onToggle={handleToggleStep}
                                onDelete={handleDeleteStep}
                                isToggling={togglingStep === step.id}
                              />
                            ))}
                          </div>
                        )}

                        {/* Attachments */}
                        {stage.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            {stage.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-background rounded border hover:bg-muted transition-colors"
                              >
                                <Paperclip className="w-3 h-3" />
                                {attachment.name}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Add step */}
                        {addingStep === stage.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={newStepContent}
                              onChange={(e) => setNewStepContent(e.target.value)}
                              placeholder="Enter step..."
                              className="flex-1"
                              autoFocus
                              disabled={loading}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddStep(stage.id);
                                if (e.key === "Escape") setAddingStep(null);
                              }}
                            />
                            <Button size="sm" onClick={() => handleAddStep(stage.id)} disabled={loading}>
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAddingStep(null)}
                              disabled={loading}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start text-muted-foreground"
                              onClick={() => setAddingStep(stage.id)}
                            >
                              <Plus className="w-4 h-4 me-2" />
                              {t("addStep")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteStage(stage.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Empty state for stages */}
          {task.stages.length === 0 && task.steps.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="mb-2">No stages or steps defined yet</p>
              <p className="text-sm">
                Break down this task into stages and steps to track progress better
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Stage Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addStage")}</DialogTitle>
            <DialogDescription>
              Add a new stage to break down this task into manageable parts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stageName">Stage Name</Label>
              <Input
                id="stageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="e.g., Research, Design, Development"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stageDescription">Description (optional)</Label>
              <Textarea
                id="stageDescription"
                value={newStageDescription}
                onChange={(e) => setNewStageDescription(e.target.value)}
                placeholder="What needs to be done in this stage?"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAddStage} disabled={loading || !newStageName.trim()}>
              {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              Add Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface StepItemProps {
  step: TaskStep;
  onToggle: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  isToggling?: boolean;
}

const StepItem = ({ step, onToggle, onDelete, isToggling }: StepItemProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg transition-colors group",
        step.completed && "opacity-60"
      )}
    >
      <button
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center",
          step.completed
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-muted-foreground/30 hover:border-primary"
        )}
        onClick={() => onToggle(step.id)}
        disabled={isToggling}
      >
        {isToggling ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : step.completed ? (
          <CheckCircle2 className="w-full h-full p-0.5" />
        ) : null}
      </button>
      <span className={cn("flex-1 text-sm", step.completed && "line-through")}>
        {step.content}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(step.id)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
