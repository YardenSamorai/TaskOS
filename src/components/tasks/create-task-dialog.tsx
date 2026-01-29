"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Calendar as CalendarIcon, Plus, Trash2, ChevronDown, ChevronRight, Layers, Github } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { createTask } from "@/lib/actions/task";
import { taskKeys } from "@/lib/hooks/use-tasks";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
import { getLinkedRepositoriesForWorkspace, createGitHubIssueFromTask } from "@/lib/actions/github";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { TaskEnhancer } from "@/components/ai/task-enhancer";
import { ClarityScore } from "@/components/ai/clarity-score";
import type { TaskStatus, User, WorkspaceMember } from "@/lib/db/schema";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName?: string;
  locale: string;
  defaultStatus?: TaskStatus;
  defaultDueDate?: Date;
  members?: (WorkspaceMember & { user: User })[];
  onSuccess?: (task: any) => void;
}

interface EnhancedTask {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  suggestedSteps: string[];
  suggestedPriority: string;
  suggestedTags: string[];
}

interface Stage {
  name: string;
  description: string;
  steps: string[];
  isExpanded: boolean;
}

export const CreateTaskDialog = ({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  locale,
  defaultStatus = "todo",
  defaultDueDate,
  members: propMembers,
  onSuccess,
}: CreateTaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<string>("low");
  const [dueDate, setDueDate] = useState<Date | undefined>(defaultDueDate);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [steps, setSteps] = useState<string[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [useProcessMode, setUseProcessMode] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  
  // GitHub integration
  const [createGitHubIssue, setCreateGitHubIssue] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [linkedRepos, setLinkedRepos] = useState<{id: string; name: string; fullName: string}[]>([]);
  
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  
  // Fetch members if not provided
  const { data: workspaceData } = useWorkspace(workspaceId);
  const members = propMembers || workspaceData?.members || [];

  // Fetch linked repositories
  useEffect(() => {
    if (open) {
      getLinkedRepositoriesForWorkspace(workspaceId).then(result => {
        if (result.repositories) {
          const repos = result.repositories.map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.fullName,
          }));
          setLinkedRepos(repos);
        }
      });
    }
  }, [open, workspaceId]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Set default values when opening
      setDueDate(defaultDueDate);
    } else {
      // Reset form when closing
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority("low");
      setDueDate(undefined);
      setAssigneeId("");
      setSteps([]);
      setAcceptanceCriteria([]);
      setUseProcessMode(false);
      setStages([]);
      setCreateGitHubIssue(false);
      setSelectedRepoId("");
    }
  }, [open, defaultStatus, defaultDueDate]);

  const handleApplyEnhancement = (enhanced: EnhancedTask) => {
    setTitle(enhanced.title);
    setDescription(enhanced.description);
    if (enhanced.suggestedPriority) {
      setPriority(enhanced.suggestedPriority);
    }
    if (enhanced.suggestedSteps.length > 0) {
      setSteps(enhanced.suggestedSteps);
    }
    if (enhanced.acceptanceCriteria.length > 0) {
      setAcceptanceCriteria(enhanced.acceptanceCriteria);
    }
    toast.success("AI enhancement applied!");
  };

  const addStep = () => {
    setSteps([...steps, ""]);
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // Stage management
  const addStage = () => {
    setStages([...stages, { name: "", description: "", steps: [], isExpanded: true }]);
  };

  const updateStage = (index: number, updates: Partial<Stage>) => {
    setStages(stages.map((stage, i) => (i === index ? { ...stage, ...updates } : stage)));
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const addStepToStage = (stageIndex: number) => {
    setStages(stages.map((stage, i) => 
      i === stageIndex ? { ...stage, steps: [...stage.steps, ""] } : stage
    ));
  };

  const updateStepInStage = (stageIndex: number, stepIndex: number, value: string) => {
    setStages(stages.map((stage, i) => 
      i === stageIndex 
        ? { ...stage, steps: stage.steps.map((s, j) => j === stepIndex ? value : s) }
        : stage
    ));
  };

  const removeStepFromStage = (stageIndex: number, stepIndex: number) => {
    setStages(stages.map((stage, i) => 
      i === stageIndex 
        ? { ...stage, steps: stage.steps.filter((_, j) => j !== stepIndex) }
        : stage
    ));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build full description with acceptance criteria
      let fullDescription = description;
      if (acceptanceCriteria.length > 0) {
        fullDescription += "\n\n## Acceptance Criteria\n" + 
          acceptanceCriteria.map(c => `- ${c}`).join("\n");
      }

      const formData = new FormData();
      formData.set("workspaceId", workspaceId);
      formData.set("title", title);
      formData.set("description", fullDescription);
      formData.set("status", status);
      formData.set("priority", priority);
      if (dueDate) {
        formData.set("dueDate", format(dueDate, "yyyy-MM-dd"));
      }
      if (assigneeId) {
        formData.append("assigneeIds", assigneeId);
      }
      // Send steps as JSON array (only if not using process mode)
      if (!useProcessMode && steps.length > 0) {
        formData.set("steps", JSON.stringify(steps.filter(s => s.trim())));
      }

      // Send stages for process mode
      if (useProcessMode && stages.length > 0) {
        const validStages = stages
          .filter(s => s.name.trim())
          .map(s => ({
            name: s.name.trim(),
            description: s.description.trim() || undefined,
            steps: s.steps.filter(step => step.trim()),
          }));
        if (validStages.length > 0) {
          formData.set("stages", JSON.stringify(validStages));
        }
      }

      const result = await createTask(formData);

      if (result.success && result.task) {
        // Create GitHub issue if selected
        if (createGitHubIssue && selectedRepoId) {
          try {
            const ghResult = await createGitHubIssueFromTask({
              taskId: result.task.id,
              repositoryId: selectedRepoId,
            });
            if (ghResult.success) {
              toast.success("Task created and linked to GitHub issue!");
            } else {
              toast.success("Task created, but GitHub issue creation failed");
            }
          } catch {
            toast.success("Task created, but GitHub issue creation failed");
          }
        } else {
          toast.success("Task created successfully!");
        }
        
        // Invalidate ALL task-related queries to ensure fresh data
        await queryClient.invalidateQueries({ queryKey: taskKeys.all });
        await queryClient.invalidateQueries({ queryKey: taskKeys.stats(workspaceId) });
        await queryClient.invalidateQueries({ queryKey: taskKeys.activity(workspaceId) });
        
        // Reset and close
        onOpenChange(false);
        onSuccess?.(result.task);
      } else {
        toast.error(result.error || "Failed to create task");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("createTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Add a new task to your workspace. Use AI to enhance your task description!
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("taskTitle")} *</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be done..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* AI Task Enhancer */}
            <TaskEnhancer
              taskDescription={title + (description ? ": " + description : "")}
              workspaceName={workspaceName}
              onApply={handleApplyEnhancement}
            />

            {/* Clarity Score */}
            <ClarityScore
              title={title}
              description={description}
              hasDueDate={!!dueDate}
              hasAssignee={!!assigneeId}
              hasSteps={steps.length > 0 || stages.some(s => s.steps.length > 0)}
              hasPriority={!!priority}
              hasAcceptanceCriteria={acceptanceCriteria.length > 0}
            />

            {/* Status & Priority */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("status")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">{t("statuses.backlog")}</SelectItem>
                    <SelectItem value="todo">{t("statuses.todo")}</SelectItem>
                    <SelectItem value="in_progress">{t("statuses.in_progress")}</SelectItem>
                    <SelectItem value="review">{t("statuses.review")}</SelectItem>
                    <SelectItem value="done">{t("statuses.done")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("priority")}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("priorities.low")}</SelectItem>
                    <SelectItem value="medium">{t("priorities.medium")}</SelectItem>
                    <SelectItem value="high">{t("priorities.high")}</SelectItem>
                    <SelectItem value="urgent">{t("priorities.urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>{t("dueDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-start font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                    type="button"
                  >
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Assignees */}
            {members.length > 0 && (
              <div className="space-y-2">
                <Label>{t("assignees")}</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.userId}>
                        {member.user.name || member.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* GitHub Integration */}
            {linkedRepos.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    <Label className="cursor-pointer">Create GitHub Issue</Label>
                  </div>
                  <Switch
                    checked={createGitHubIssue}
                    onCheckedChange={setCreateGitHubIssue}
                  />
                </div>
                
                {createGitHubIssue && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Select Repository</Label>
                    <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select repository" />
                      </SelectTrigger>
                      <SelectContent>
                        {linkedRepos.map((repo) => (
                          <SelectItem key={repo.id} value={repo.id}>
                            {repo.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      A new issue will be created in the selected repository with this task's details
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Process Mode Toggle */}
            <div className="pt-4 border-t">
              <button
                type="button"
                onClick={() => setUseProcessMode(!useProcessMode)}
                className={cn(
                  "flex items-center justify-between w-full p-3 rounded-lg border-2 transition-all",
                  useProcessMode 
                    ? "border-primary bg-primary/5" 
                    : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    useProcessMode ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-start">
                    <p className="font-medium text-sm">Process Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Break down into stages with steps
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  useProcessMode ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}>
                  {useProcessMode && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            </div>

            {/* Process Mode Stages */}
            {useProcessMode && (
              <div className="space-y-3">
                {stages.map((stage, stageIndex) => (
                  <Collapsible
                    key={stageIndex}
                    open={stage.isExpanded}
                    onOpenChange={(open) => updateStage(stageIndex, { isExpanded: open })}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted cursor-pointer">
                          <div className="flex items-center gap-2">
                            {stage.isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {stageIndex + 1}
                            </span>
                            <span className="font-medium text-sm">
                              {stage.name || `Stage ${stageIndex + 1}`}
                            </span>
                            {stage.steps.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({stage.steps.filter(s => s.trim()).length} steps)
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStage(stageIndex);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 space-y-3 border-t">
                          <div className="space-y-2">
                            <Label className="text-xs">Stage Name</Label>
                            <Input
                              value={stage.name}
                              onChange={(e) => updateStage(stageIndex, { name: e.target.value })}
                              placeholder="e.g., Research, Design, Development"
                              disabled={loading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Description (optional)</Label>
                            <Input
                              value={stage.description}
                              onChange={(e) => updateStage(stageIndex, { description: e.target.value })}
                              placeholder="What needs to happen in this stage?"
                              disabled={loading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Steps</Label>
                            <div className="space-y-2">
                              {stage.steps.map((step, stepIndex) => (
                                <div key={stepIndex} className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-sm w-6">□</span>
                                  <Input
                                    value={step}
                                    onChange={(e) => updateStepInStage(stageIndex, stepIndex, e.target.value)}
                                    placeholder="Step description"
                                    className="flex-1"
                                    disabled={loading}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => removeStepFromStage(stageIndex, stepIndex)}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addStepToStage(stageIndex)}
                                className="text-xs"
                              >
                                <Plus className="w-3 h-3 me-1" />
                                Add step
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addStage}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 me-2" />
                  Add Stage
                </Button>
              </div>
            )}

            {/* Steps/Checklist (if AI added them) - hide when process mode is on */}
            {!useProcessMode && steps.length > 0 && (
              <div className="space-y-2">
                <Label>Checklist</Label>
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-6">□</span>
                      <Input
                        value={step}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder="Step description"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addStep}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 me-1" />
                    Add step
                  </Button>
                </div>
              </div>
            )}

            {/* Acceptance Criteria (if AI added them) */}
            {acceptanceCriteria.length > 0 && (
              <div className="space-y-2">
                <Label>Acceptance Criteria</Label>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <ul className="space-y-1">
                    {acceptanceCriteria.map((criteria, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{criteria}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {tc("create")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
