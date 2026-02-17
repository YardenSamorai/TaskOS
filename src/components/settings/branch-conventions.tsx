"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  GitBranch,
  ChevronDown,
  Loader2,
  Save,
  RotateCcw,
  Settings2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  type BranchConventionConfig,
  type TaskTypeMapping,
  DEFAULT_BRANCH_CONVENTION,
  CONVENTION_PRESETS,
  validateConfig,
  renderConvention,
} from "@/lib/branch-convention";
import {
  getBranchConvention,
  upsertBranchConvention,
  resetBranchConvention,
} from "@/lib/actions/branch-convention";

interface BranchConventionsProps {
  workspaceId: string;
  canEdit: boolean;
}

export function BranchConventions({
  workspaceId,
  canEdit,
}: BranchConventionsProps) {
  const [config, setConfig] = useState<BranchConventionConfig>(
    DEFAULT_BRANCH_CONVENTION
  );
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // User inputs for preview
  const [taskType, setTaskType] = useState("feature");
  const [taskTitle, setTaskTitle] = useState("Add user authentication");
  const [taskId, setTaskId] = useState("a1b2c3d4");

  // Manual overrides
  const [useManual, setUseManual] = useState(false);
  const [manualBranch, setManualBranch] = useState("");
  const [manualPR, setManualPR] = useState("");
  const [manualCommit, setManualCommit] = useState("");

  // Load config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getBranchConvention(workspaceId);
        if (!cancelled && result.success && result.config) {
          setConfig(result.config);
          setIsCustom(result.isCustom ?? false);
        }
      } catch {
        // use defaults
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Compute preview locally (instant, no server call)
  const preview = renderConvention(config, {
    taskTitle: taskTitle || "My task",
    taskId: taskId ? `${taskId}-0000-0000-0000-000000000000` : "a1b2c3d4-0000-0000-0000-000000000000",
    taskType: taskType || config.defaultTaskType,
    username: "john.doe",
  });

  // Update manual fields when preview changes (if not in manual mode)
  useEffect(() => {
    if (!useManual) {
      setManualBranch(preview.branchName);
      setManualPR(preview.prTitle);
      setManualCommit(preview.commitMessage);
    }
  }, [preview.branchName, preview.prTitle, preview.commitMessage, useManual]);

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleSave = async () => {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      toast.error(errors[0].message);
      return;
    }

    setIsSaving(true);
    try {
      const result = await upsertBranchConvention(workspaceId, config);
      if (result.success) {
        toast.success("Branch conventions saved");
        setIsCustom(true);
        setIsDirty(false);
      } else {
        toast.error(result.error || "Failed to save");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetBranchConvention(workspaceId);
      if (result.success) {
        setConfig(DEFAULT_BRANCH_CONVENTION);
        setIsCustom(false);
        setIsDirty(false);
        toast.success("Reset to defaults");
      } else {
        toast.error(result.error || "Failed to reset");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsResetting(false);
    }
  };

  const handlePatternChange = (
    field: keyof BranchConventionConfig,
    value: string
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleMappingChange = (
    index: number,
    field: keyof TaskTypeMapping,
    value: string
  ) => {
    setConfig((prev) => {
      const mappings = [...prev.taskTypeMappings];
      mappings[index] = { ...mappings[index], [field]: value };
      return { ...prev, taskTypeMappings: mappings };
    });
    setIsDirty(true);
  };

  const addMapping = () => {
    setConfig((prev) => ({
      ...prev,
      taskTypeMappings: [
        ...prev.taskTypeMappings,
        { taskType: "", gitPrefix: "", branchPrefix: "" },
      ],
    }));
    setIsDirty(true);
  };

  const removeMapping = (index: number) => {
    if (config.taskTypeMappings.length <= 1) {
      toast.error("At least one type mapping is required");
      return;
    }
    setConfig((prev) => ({
      ...prev,
      taskTypeMappings: prev.taskTypeMappings.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  // ─── Render ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Branch Conventions</CardTitle>
              <CardDescription>
                Define how branch names, PR titles, and commits are generated
              </CardDescription>
            </div>
          </div>
          {isCustom && (
            <Badge variant="secondary" className="text-xs">
              Custom
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Step 1: Choose a Preset ─────────────────────────────── */}
        {canEdit && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Choose a Preset</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CONVENTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setConfig(structuredClone(preset.config));
                    setIsDirty(true);
                    toast.info(`Applied "${preset.name}" preset`);
                  }}
                  className="group relative rounded-lg border p-3 text-start transition-colors hover:border-primary/50 hover:bg-accent/50"
                >
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Enter Your Task Info ────────────────────────── */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Try It Out</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="taskType" className="text-xs text-muted-foreground">
                Task Type
              </Label>
              <select
                id="taskType"
                value={taskType}
                onChange={(e) => {
                  setTaskType(e.target.value);
                  setUseManual(false);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {config.taskTypeMappings.map((m) => (
                  <option key={m.taskType} value={m.taskType}>
                    {m.taskType.charAt(0).toUpperCase() + m.taskType.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskTitle" className="text-xs text-muted-foreground">
                Task Title
              </Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => {
                  setTaskTitle(e.target.value);
                  setUseManual(false);
                }}
                placeholder="Add user authentication"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskId" className="text-xs text-muted-foreground">
                Task ID
              </Label>
              <Input
                id="taskId"
                value={taskId}
                onChange={(e) => {
                  setTaskId(e.target.value);
                  setUseManual(false);
                }}
                placeholder="a1b2c3d4"
                className="font-mono h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* ── Step 3: See the Result ──────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Result</Label>
            <button
              type="button"
              onClick={() => {
                setUseManual(!useManual);
                if (!useManual) {
                  setManualBranch(preview.branchName);
                  setManualPR(preview.prTitle);
                  setManualCommit(preview.commitMessage);
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {useManual ? "Use auto-generated" : "Edit manually"}
            </button>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Branch Name</span>
              {useManual ? (
                <Input
                  value={manualBranch}
                  onChange={(e) => setManualBranch(e.target.value)}
                  className="font-mono text-sm h-8"
                />
              ) : (
                <div className="font-mono text-sm bg-background border rounded-md px-3 py-1.5 break-all">
                  {preview.branchName}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">PR Title</span>
              {useManual ? (
                <Input
                  value={manualPR}
                  onChange={(e) => setManualPR(e.target.value)}
                  className="text-sm h-8"
                />
              ) : (
                <div className="text-sm bg-background border rounded-md px-3 py-1.5 break-all">
                  {preview.prTitle}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Commit Message</span>
              {useManual ? (
                <Input
                  value={manualCommit}
                  onChange={(e) => setManualCommit(e.target.value)}
                  className="text-sm h-8"
                />
              ) : (
                <div className="text-sm bg-background border rounded-md px-3 py-1.5 break-all">
                  {preview.commitMessage}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Base Branch</span>
              <div className="font-mono text-sm bg-background border rounded-md px-3 py-1.5">
                {preview.baseBranch}
              </div>
            </div>
          </div>
        </div>

        {/* ── Advanced Settings (collapsible) ─────────────────────── */}
        {canEdit && (
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full p-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                <span>Advanced Settings</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              />
            </button>

            {showAdvanced && (
              <div className="border-t p-4 space-y-5">
                {/* Patterns */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="branchPattern" className="text-xs">
                      Branch Pattern
                    </Label>
                    <Input
                      id="branchPattern"
                      value={config.branchPattern}
                      onChange={(e) =>
                        handlePatternChange("branchPattern", e.target.value)
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prTitlePattern" className="text-xs">
                      PR Title Pattern
                    </Label>
                    <Input
                      id="prTitlePattern"
                      value={config.prTitlePattern}
                      onChange={(e) =>
                        handlePatternChange("prTitlePattern", e.target.value)
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commitPattern" className="text-xs">
                      Commit Message Pattern
                    </Label>
                    <Input
                      id="commitPattern"
                      value={config.commitPattern}
                      onChange={(e) =>
                        handlePatternChange("commitPattern", e.target.value)
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultBaseBranch" className="text-xs">
                      Default Base Branch
                    </Label>
                    <Input
                      id="defaultBaseBranch"
                      value={config.defaultBaseBranch}
                      onChange={(e) =>
                        handlePatternChange("defaultBaseBranch", e.target.value)
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Placeholders help */}
                <div className="flex flex-wrap gap-1.5">
                  {["{title}", "{id}", "{branchPrefix}", "{gitPrefix}", "{taskType}", "{username}"].map(
                    (p) => (
                      <Badge
                        key={p}
                        variant="outline"
                        className="font-mono text-xs"
                      >
                        {p}
                      </Badge>
                    )
                  )}
                </div>

                {/* Task Type Mappings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Task Type Mappings</Label>
                    <Button variant="outline" size="sm" onClick={addMapping}>
                      <Plus className="w-3 h-3 me-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1">
                      <span className="text-[11px] text-muted-foreground">Type</span>
                      <span className="text-[11px] text-muted-foreground">Git Prefix</span>
                      <span className="text-[11px] text-muted-foreground">Branch Prefix</span>
                      <span />
                    </div>
                    {config.taskTypeMappings.map((mapping, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center"
                      >
                        <Input
                          value={mapping.taskType}
                          onChange={(e) =>
                            handleMappingChange(i, "taskType", e.target.value)
                          }
                          className="font-mono text-xs h-8"
                        />
                        <Input
                          value={mapping.gitPrefix}
                          onChange={(e) =>
                            handleMappingChange(i, "gitPrefix", e.target.value)
                          }
                          className="font-mono text-xs h-8"
                        />
                        <Input
                          value={mapping.branchPrefix}
                          onChange={(e) =>
                            handleMappingChange(i, "branchPrefix", e.target.value)
                          }
                          className="font-mono text-xs h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMapping(i)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Default Task Type */}
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="defaultTaskType" className="text-xs">
                    Default Task Type
                  </Label>
                  <Input
                    id="defaultTaskType"
                    value={config.defaultTaskType}
                    onChange={(e) =>
                      handlePatternChange("defaultTaskType", e.target.value)
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Save / Reset ────────────────────────────────────────── */}
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 me-2" />
              )}
              Save Conventions
            </Button>
            {isCustom && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 me-2" />
                )}
                Reset to Defaults
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
