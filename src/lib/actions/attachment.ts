"use server";

import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { attachments, tasks, taskStages, activityLogs } from "@/lib/db/schema";
import { getCurrentUser, requireWorkspaceEditor } from "@/lib/auth/permissions";
import { checkCanUploadFile, PlanLimitError } from "@/lib/auth/plan-check";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { TASKS_TAG, ACTIVITY_TAG } from "@/lib/cache";

// Schema for creating attachment
const createAttachmentSchema = z.object({
  taskId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
});

// Create attachment
export const createAttachment = async (formData: FormData) => {
  try {
    const user = await getCurrentUser();

    const data = createAttachmentSchema.parse({
      taskId: formData.get("taskId") || undefined,
      stageId: formData.get("stageId") || undefined,
      name: formData.get("name"),
      url: formData.get("url"),
      fileType: formData.get("fileType") || undefined,
      fileSize: formData.get("fileSize")
        ? parseInt(formData.get("fileSize") as string)
        : undefined,
    });

    // Get workspace ID for permission check
    let workspaceId: string | undefined;

    if (data.taskId) {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, data.taskId),
      });
      if (!task) {
        return { success: false, error: "Task not found" };
      }
      workspaceId = task.workspaceId;
    } else if (data.stageId) {
      const stage = await db.query.taskStages.findFirst({
        where: eq(taskStages.id, data.stageId),
        with: {
          task: true,
        },
      });
      if (!stage) {
        return { success: false, error: "Stage not found" };
      }
      workspaceId = stage.task.workspaceId;
    }

    if (!workspaceId) {
      return { success: false, error: "Task or stage required" };
    }

    await requireWorkspaceEditor(workspaceId);

    // Check plan limits for file uploads
    if (data.taskId) {
      await checkCanUploadFile(data.taskId);
    }

    const [attachment] = await db
      .insert(attachments)
      .values({
        taskId: data.taskId!,
        stageId: data.stageId,
        name: data.name,
        url: data.url,
        type: data.fileType,
        size: data.fileSize,
        uploadedBy: user.id,
      })
      .returning();

    // Log activity
    if (data.taskId) {
      await db.insert(activityLogs).values({
        workspaceId,
        taskId: data.taskId,
        userId: user.id,
        action: "uploaded_file",
        entityType: "attachment",
        entityId: attachment.id,
        metadata: JSON.stringify({ fileName: data.name }),
      });
    }

    revalidateTag(TASKS_TAG);
    revalidateTag(ACTIVITY_TAG);

    return { success: true, attachment };
  } catch (error) {
    console.error("Error creating attachment:", error);
    if (error instanceof PlanLimitError) {
      return { success: false, error: error.message, code: error.code, plan: error.currentPlan };
    }
    return { success: false, error: "Failed to upload file" };
  }
};

// Get attachments for a task
export const getTaskAttachments = async (taskId: string) => {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found", attachments: [] };
    }

    await requireWorkspaceEditor(task.workspaceId);

    const taskAttachments = await db.query.attachments.findMany({
      where: eq(attachments.taskId, taskId),
      with: {
        uploader: true,
      },
      orderBy: (attachments, { desc }) => [desc(attachments.createdAt)],
    });

    return { success: true, attachments: taskAttachments };
  } catch (error) {
    console.error("Error getting attachments:", error);
    return { success: false, attachments: [] };
  }
};

// Delete attachment
export const deleteAttachment = async (attachmentId: string) => {
  try {
    const user = await getCurrentUser();

    const attachment = await db.query.attachments.findFirst({
      where: eq(attachments.id, attachmentId),
      with: {
        task: true,
      },
    });

    if (!attachment) {
      return { success: false, error: "Attachment not found" };
    }

    const workspaceId = attachment.task?.workspaceId;
    if (!workspaceId) {
      return { success: false, error: "Invalid attachment" };
    }

    await requireWorkspaceEditor(workspaceId);

    await db.delete(attachments).where(eq(attachments.id, attachmentId));

    // Log activity
    if (attachment.taskId) {
      await db.insert(activityLogs).values({
        workspaceId,
        taskId: attachment.taskId,
        userId: user.id,
        action: "deleted_file",
        entityType: "attachment",
        entityId: attachmentId,
        metadata: JSON.stringify({ fileName: attachment.name }),
      });
    }

    revalidateTag(TASKS_TAG);
    revalidateTag(ACTIVITY_TAG);

    return { success: true };
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return { success: false, error: "Failed to delete file" };
  }
};
