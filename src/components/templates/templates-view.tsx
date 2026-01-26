"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  FileText,
  MoreHorizontal,
  Trash2,
  Pencil,
  Copy,
  Play,
  Loader2,
  CheckSquare,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  getWorkspaceTemplates,
  deleteTemplate,
  createTaskFromTemplate,
} from "@/lib/actions/template";
import { CreateTemplateDialog } from "./create-template-dialog";
import { toast } from "sonner";

interface TemplatesViewProps {
  workspaceId: string;
  locale: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  templateData: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  };
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-500",
  medium: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
};

export const TemplatesView = ({ workspaceId, locale }: TemplatesViewProps) => {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const result = await getWorkspaceTemplates(workspaceId);
      if (result.success) {
        setTemplates(result.templates as Template[]);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [workspaceId]);

  const handleCreateTask = async (templateId: string) => {
    setCreatingFromTemplate(templateId);
    try {
      const result = await createTaskFromTemplate(templateId);
      if (result.success && result.task) {
        toast.success("Task created from template");
        router.push(`/${locale}/app/${workspaceId}/tasks/${result.task.id}`);
      } else {
        toast.error(result.error || "Failed to create task");
      }
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setCreatingFromTemplate(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    setDeletingTemplate(templateId);
    try {
      const result = await deleteTemplate(templateId);
      if (result.success) {
        toast.success("Template deleted");
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } else {
        toast.error(result.error || "Failed to delete template");
      }
    } catch (error) {
      toast.error("Failed to delete template");
    } finally {
      setDeletingTemplate(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Create reusable templates for recurring tasks and workflows
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          New Template
        </Button>
      </div>

      {/* Templates grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first template to speed up task creation
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const data = JSON.parse(template.templateData);
            const stageCount = data.stages?.length || 0;
            const stepCount =
              (data.steps?.length || 0) +
              (data.stages?.reduce(
                (acc: number, s: any) => acc + (s.steps?.length || 0),
                0
              ) || 0);

            return (
              <div
                key={template.id}
                className="group p-6 rounded-xl border bg-card hover:shadow-lg hover:border-primary/20 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleCreateTask(template.id)}
                        disabled={creatingFromTemplate === template.id}
                      >
                        {creatingFromTemplate === template.id ? (
                          <Loader2 className="w-4 h-4 me-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 me-2" />
                        )}
                        Use Template
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 me-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pencil className="w-4 h-4 me-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 me-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete template?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{template.name}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(template.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Task preview */}
                <div className="p-3 rounded-lg bg-muted/50 mb-4">
                  <p className="text-sm font-medium truncate mb-2">{data.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={priorityColors[data.priority]}>
                      {data.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {data.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  {stageCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      <span>{stageCount} stages</span>
                    </div>
                  )}
                  {stepCount > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckSquare className="w-4 h-4" />
                      <span>{stepCount} steps</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={template.createdBy.imageUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {template.createdBy.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    Updated{" "}
                    {formatDistanceToNow(new Date(template.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                {/* Quick action */}
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => handleCreateTask(template.id)}
                  disabled={creatingFromTemplate === template.id}
                >
                  {creatingFromTemplate === template.id ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 me-2" />
                  )}
                  Create Task
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        onSuccess={() => {
          fetchTemplates();
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
};
