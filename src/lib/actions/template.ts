"use server";

import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { templates, tasks, taskStages, taskSteps, activityLogs } from "@/lib/db/schema";
import {
  getCurrentUser,
  requireWorkspaceMember,
  requireWorkspaceEditor,
} from "@/lib/auth/permissions";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { TASKS_TAG, ACTIVITY_TAG } from "@/lib/cache";

const TEMPLATES_TAG = "templates";

// Template data structure
interface TemplateData {
  title: string;
  description?: string;
  status: string;
  priority: string;
  stages: {
    name: string;
    description?: string;
    steps: {
      content: string;
    }[];
  }[];
  steps: {
    content: string;
  }[];
}

// Schemas
const createTemplateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  templateData: z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.string(),
    priority: z.string(),
    stages: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        steps: z.array(
          z.object({
            content: z.string(),
          })
        ),
      })
    ),
    steps: z.array(
      z.object({
        content: z.string(),
      })
    ),
  }),
});

const updateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  templateData: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      status: z.string(),
      priority: z.string(),
      stages: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          steps: z.array(
            z.object({
              content: z.string(),
            })
          ),
        })
      ),
      steps: z.array(
        z.object({
          content: z.string(),
        })
      ),
    })
    .optional(),
});

// Create template
export const createTemplate = async (formData: FormData) => {
  try {
    const workspaceId = formData.get("workspaceId") as string;
    const { user } = await requireWorkspaceEditor(workspaceId);

    const templateDataStr = formData.get("templateData") as string;
    const templateData = JSON.parse(templateDataStr);

    const data = createTemplateSchema.parse({
      workspaceId,
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      templateData,
    });

    const [template] = await db
      .insert(templates)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        templateData: JSON.stringify(data.templateData),
        createdBy: user.id,
      })
      .returning();

    revalidateTag(TEMPLATES_TAG);

    return { success: true, template };
  } catch (error) {
    console.error("Error creating template:", error);
    return { success: false, error: "Failed to create template" };
  }
};

// Create template from existing task
export const createTemplateFromTask = async (
  taskId: string,
  name: string,
  description?: string
) => {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        stages: {
          with: {
            steps: true,
          },
        },
        steps: {
          where: (steps, { isNull }) => isNull(steps.stageId),
        },
      },
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const { user } = await requireWorkspaceEditor(task.workspaceId);

    const templateData: TemplateData = {
      title: task.title,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      stages: task.stages.map((stage) => ({
        name: stage.name,
        description: stage.description || undefined,
        steps: stage.steps.map((step) => ({
          content: step.content,
        })),
      })),
      steps: task.steps.map((step) => ({
        content: step.content,
      })),
    };

    const [template] = await db
      .insert(templates)
      .values({
        workspaceId: task.workspaceId,
        name,
        description,
        templateData: JSON.stringify(templateData),
        createdBy: user.id,
      })
      .returning();

    revalidateTag(TEMPLATES_TAG);

    return { success: true, template };
  } catch (error) {
    console.error("Error creating template from task:", error);
    return { success: false, error: "Failed to create template" };
  }
};

// Get workspace templates
export const getWorkspaceTemplates = async (workspaceId: string) => {
  try {
    await requireWorkspaceMember(workspaceId);

    const workspaceTemplates = await db.query.templates.findMany({
      where: eq(templates.workspaceId, workspaceId),
      with: {
        createdBy: true,
      },
      orderBy: [desc(templates.updatedAt)],
    });

    return { success: true, templates: workspaceTemplates };
  } catch (error) {
    console.error("Error getting templates:", error);
    return { success: false, templates: [] };
  }
};

// Get single template
export const getTemplate = async (templateId: string) => {
  try {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
      with: {
        workspace: true,
        createdBy: true,
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    await requireWorkspaceMember(template.workspaceId);

    return { success: true, template };
  } catch (error) {
    console.error("Error getting template:", error);
    return { success: false, error: "Failed to get template" };
  }
};

// Update template
export const updateTemplate = async (formData: FormData) => {
  try {
    const templateId = formData.get("templateId") as string;

    const existingTemplate = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!existingTemplate) {
      return { success: false, error: "Template not found" };
    }

    await requireWorkspaceEditor(existingTemplate.workspaceId);

    const templateDataStr = formData.get("templateData") as string;
    const templateData = templateDataStr ? JSON.parse(templateDataStr) : undefined;

    const data = updateTemplateSchema.parse({
      templateId,
      name: formData.get("name") || undefined,
      description: formData.get("description") || undefined,
      templateData,
    });

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.templateData) {
      updateData.templateData = JSON.stringify(data.templateData);
    }

    const [template] = await db
      .update(templates)
      .set(updateData)
      .where(eq(templates.id, templateId))
      .returning();

    revalidateTag(TEMPLATES_TAG);

    return { success: true, template };
  } catch (error) {
    console.error("Error updating template:", error);
    return { success: false, error: "Failed to update template" };
  }
};

// Delete template
export const deleteTemplate = async (templateId: string) => {
  try {
    const existingTemplate = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!existingTemplate) {
      return { success: false, error: "Template not found" };
    }

    await requireWorkspaceEditor(existingTemplate.workspaceId);

    await db.delete(templates).where(eq(templates.id, templateId));

    revalidateTag(TEMPLATES_TAG);

    return { success: true };
  } catch (error) {
    console.error("Error deleting template:", error);
    return { success: false, error: "Failed to delete template" };
  }
};

// Create task from template
export const createTaskFromTemplate = async (
  templateId: string,
  overrides?: {
    title?: string;
    dueDate?: string;
    assigneeIds?: string[];
  }
) => {
  try {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    const { user } = await requireWorkspaceEditor(template.workspaceId);

    const templateData: TemplateData = JSON.parse(template.templateData);

    // Get max order index
    const maxOrder = await db
      .select({ max: sql<number>`COALESCE(MAX(${tasks.orderIndex}), 0)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, template.workspaceId),
          eq(tasks.status, templateData.status as any)
        )
      );

    // Create task
    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId: template.workspaceId,
        title: overrides?.title || templateData.title,
        description: templateData.description,
        status: templateData.status as any,
        priority: templateData.priority as any,
        dueDate: overrides?.dueDate,
        orderIndex: (maxOrder[0]?.max || 0) + 1,
        createdBy: user.id,
      })
      .returning();

    // Create stages
    for (let i = 0; i < templateData.stages.length; i++) {
      const stageData = templateData.stages[i];
      const [stage] = await db
        .insert(taskStages)
        .values({
          taskId: task.id,
          name: stageData.name,
          description: stageData.description,
          orderIndex: i,
        })
        .returning();

      // Create steps within stage
      for (let j = 0; j < stageData.steps.length; j++) {
        const stepData = stageData.steps[j];
        await db.insert(taskSteps).values({
          taskId: task.id,
          stageId: stage.id,
          content: stepData.content,
          orderIndex: j,
        });
      }
    }

    // Create standalone steps
    for (let i = 0; i < templateData.steps.length; i++) {
      const stepData = templateData.steps[i];
      await db.insert(taskSteps).values({
        taskId: task.id,
        content: stepData.content,
        orderIndex: i,
      });
    }

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId: template.workspaceId,
      taskId: task.id,
      userId: user.id,
      action: "created_from_template",
      entityType: "task",
      entityId: task.id,
      metadata: JSON.stringify({ templateName: template.name }),
    });

    revalidateTag(TASKS_TAG);
    revalidateTag(ACTIVITY_TAG);

    return { success: true, task };
  } catch (error) {
    console.error("Error creating task from template:", error);
    return { success: false, error: "Failed to create task from template" };
  }
};
