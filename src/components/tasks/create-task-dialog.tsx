"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { createTask } from "@/lib/actions/task";
import { taskKeys } from "@/lib/hooks/use-tasks";
import { useWorkspace } from "@/lib/hooks/use-workspaces";
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

export const CreateTaskDialog = ({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  locale,
  defaultStatus = "todo",
  members: propMembers,
  onSuccess,
}: CreateTaskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<string>("low");
  const [dueDate, setDueDate] = useState<Date>();
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [steps, setSteps] = useState<string[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  
  // Fetch members if not provided
  const { data: workspaceData } = useWorkspace(workspaceId);
  const members = propMembers || workspaceData?.members || [];

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority("low");
      setDueDate(undefined);
      setAssigneeId("");
      setSteps([]);
      setAcceptanceCriteria([]);
    }
  }, [open, defaultStatus]);

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
      // Send steps as JSON array
      if (steps.length > 0) {
        formData.set("steps", JSON.stringify(steps.filter(s => s.trim())));
      }

      const result = await createTask(formData);

      if (result.success && result.task) {
        toast.success("Task created successfully!");
        
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>
            Add a new task to your workspace. Use AI to enhance your task description!
          </DialogDescription>
        </DialogHeader>
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
              hasSteps={steps.length > 0}
              hasPriority={!!priority}
              hasAcceptanceCriteria={acceptanceCriteria.length > 0}
            />

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Steps/Checklist (if AI added them) */}
            {steps.length > 0 && (
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
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
