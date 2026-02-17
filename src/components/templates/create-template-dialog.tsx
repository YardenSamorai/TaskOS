"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTemplate } from "@/lib/actions/template";
import { toast } from "sonner";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSuccess: () => void;
}

interface Stage {
  name: string;
  description: string;
  steps: { content: string }[];
}

export const CreateTemplateDialog = ({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: CreateTemplateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [stages, setStages] = useState<Stage[]>([]);
  const [steps, setSteps] = useState<{ content: string }[]>([]);

  const addStage = () => {
    setStages((prev) => [
      ...prev,
      { name: "", description: "", steps: [] },
    ]);
  };

  const updateStage = (index: number, updates: Partial<Stage>) => {
    setStages((prev) =>
      prev.map((stage, i) => (i === index ? { ...stage, ...updates } : stage))
    );
  };

  const removeStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const addStepToStage = (stageIndex: number) => {
    setStages((prev) =>
      prev.map((stage, i) =>
        i === stageIndex
          ? { ...stage, steps: [...stage.steps, { content: "" }] }
          : stage
      )
    );
  };

  const updateStepInStage = (
    stageIndex: number,
    stepIndex: number,
    content: string
  ) => {
    setStages((prev) =>
      prev.map((stage, i) =>
        i === stageIndex
          ? {
              ...stage,
              steps: stage.steps.map((step, j) =>
                j === stepIndex ? { content } : step
              ),
            }
          : stage
      )
    );
  };

  const removeStepFromStage = (stageIndex: number, stepIndex: number) => {
    setStages((prev) =>
      prev.map((stage, i) =>
        i === stageIndex
          ? {
              ...stage,
              steps: stage.steps.filter((_, j) => j !== stepIndex),
            }
          : stage
      )
    );
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { content: "" }]);
  };

  const updateStep = (index: number, content: string) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { content } : step))
    );
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !taskTitle.trim()) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("workspaceId", workspaceId);
      formData.append("name", name);
      formData.append("description", description);
      formData.append(
        "templateData",
        JSON.stringify({
          title: taskTitle,
          description: taskDescription || undefined,
          status,
          priority,
          stages: stages.filter((s) => s.name.trim()),
          steps: steps.filter((s) => s.content.trim()),
        })
      );

      const result = await createTemplate(formData);

      if (result.success) {
        toast.success("Template created");
        onSuccess();
        resetForm();
      } else {
        toast.error(result.error || "Failed to create template");
      }
    } catch (error) {
      toast.error("Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setTaskTitle("");
    setTaskDescription("");
    setStatus("todo");
    setPriority("medium");
    setStages([]);
    setSteps([]);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Create Template</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Create a reusable template for recurring tasks
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-6 py-4">
            {/* Template info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Bug Report, Feature Request"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Template Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="When to use this template..."
                  rows={2}
                />
              </div>
            </div>

            <hr />

            {/* Task defaults */}
            <div className="space-y-4">
              <h4 className="font-medium">Task Defaults</h4>
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Default task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Task Description</Label>
                <Textarea
                  id="taskDescription"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Default task description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Waiting for Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <hr />

            {/* Stages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Stages (Optional)</h4>
                <Button type="button" variant="outline" size="sm" onClick={addStage}>
                  <Plus className="w-4 h-4 me-1" />
                  Add Stage
                </Button>
              </div>
              {stages.map((stage, stageIndex) => (
                <div
                  key={stageIndex}
                  className="p-4 rounded-lg border space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-3">
                      <Input
                        value={stage.name}
                        onChange={(e) =>
                          updateStage(stageIndex, { name: e.target.value })
                        }
                        placeholder="Stage name"
                      />
                      <Input
                        value={stage.description}
                        onChange={(e) =>
                          updateStage(stageIndex, { description: e.target.value })
                        }
                        placeholder="Stage description (optional)"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStage(stageIndex)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  {/* Steps within stage */}
                  <div className="space-y-2 ms-4">
                    {stage.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-center gap-2">
                        <Input
                          value={step.content}
                          onChange={(e) =>
                            updateStepInStage(stageIndex, stepIndex, e.target.value)
                          }
                          placeholder="Checklist item"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                      className="text-xs"
                      onClick={() => addStepToStage(stageIndex)}
                    >
                      <Plus className="w-3 h-3 me-1" />
                      Add Checklist Item
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Standalone steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Checklist (Optional)</h4>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="w-4 h-4 me-1" />
                  Add Item
                </Button>
              </div>
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={step.content}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder="Checklist item"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              Create Template
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
