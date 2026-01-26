"use server";

import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import {
  taskComments,
  tasks,
  users,
  activityLogs,
  notifications,
  workspaceMembers,
} from "@/lib/db/schema";
import {
  getCurrentUser,
  requireWorkspaceMember,
  requireWorkspaceEditor,
} from "@/lib/auth/permissions";
import { eq, desc, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { TASKS_TAG, ACTIVITY_TAG } from "@/lib/cache";

// Schema
const createCommentSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(5000000), // Allow large content for embedded images
});

const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().min(1).max(5000000), // Allow large content for embedded images
});

// Extract @mentions from content
const extractMentions = (content: string): string[] => {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]); // Extract user ID from (userId)
  }
  return mentions;
};

// Create comment
export const createComment = async (formData: FormData) => {
  try {
    const user = await getCurrentUser();

    const data = createCommentSchema.parse({
      taskId: formData.get("taskId"),
      content: formData.get("content"),
    });

    // Get task for workspace ID
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, data.taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    await requireWorkspaceMember(task.workspaceId);

    // Create comment
    const [comment] = await db
      .insert(taskComments)
      .values({
        taskId: data.taskId,
        userId: user.id,
        content: data.content,
      })
      .returning();

    // Extract and process mentions
    const mentionedUserIds = extractMentions(data.content);
    if (mentionedUserIds.length > 0) {
      // Verify users are workspace members
      const members = await db.query.workspaceMembers.findMany({
        where: and(
          eq(workspaceMembers.workspaceId, task.workspaceId),
          inArray(workspaceMembers.userId, mentionedUserIds)
        ),
      });

      const validUserIds = members.map((m) => m.userId);

      // Create notifications for mentioned users
      for (const userId of validUserIds) {
        if (userId !== user.id) {
          // Don't notify self
          await db.insert(notifications).values({
            userId,
            workspaceId: task.workspaceId,
            taskId: task.id,
            type: "mention",
            title: `${user.name || user.email} mentioned you`,
            message: `In task: ${task.title}`,
          });
        }
      }
    }

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId: task.workspaceId,
      taskId: task.id,
      userId: user.id,
      action: "commented",
      entityType: "comment",
      entityId: comment.id,
    });

    revalidateTag(TASKS_TAG);
    revalidateTag(ACTIVITY_TAG);

    // Fetch comment with user info
    const commentWithUser = await db.query.taskComments.findFirst({
      where: eq(taskComments.id, comment.id),
      with: {
        user: true,
      },
    });

    return { success: true, comment: commentWithUser };
  } catch (error) {
    console.error("Error creating comment:", error);
    return { success: false, error: "Failed to create comment" };
  }
};

// Get comments for task
export const getTaskComments = async (taskId: string) => {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found", comments: [] };
    }

    await requireWorkspaceMember(task.workspaceId);

    const comments = await db.query.taskComments.findMany({
      where: eq(taskComments.taskId, taskId),
      with: {
        user: true,
      },
      orderBy: [desc(taskComments.createdAt)],
    });

    return { success: true, comments };
  } catch (error) {
    console.error("Error getting comments:", error);
    return { success: false, comments: [] };
  }
};

// Update comment
export const updateComment = async (formData: FormData) => {
  try {
    const user = await getCurrentUser();

    const data = updateCommentSchema.parse({
      commentId: formData.get("commentId"),
      content: formData.get("content"),
    });

    // Get comment
    const comment = await db.query.taskComments.findFirst({
      where: eq(taskComments.id, data.commentId),
      with: {
        task: true,
      },
    });

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    // Only author can edit
    if (comment.userId !== user.id) {
      return { success: false, error: "Not authorized to edit this comment" };
    }

    await requireWorkspaceMember(comment.task.workspaceId);

    const [updatedComment] = await db
      .update(taskComments)
      .set({
        content: data.content,
        updatedAt: new Date(),
      })
      .where(eq(taskComments.id, data.commentId))
      .returning();

    // Fetch with user info
    const commentWithUser = await db.query.taskComments.findFirst({
      where: eq(taskComments.id, updatedComment.id),
      with: {
        user: true,
      },
    });

    revalidateTag(TASKS_TAG);

    return { success: true, comment: commentWithUser };
  } catch (error) {
    console.error("Error updating comment:", error);
    return { success: false, error: "Failed to update comment" };
  }
};

// Delete comment
export const deleteComment = async (commentId: string) => {
  try {
    const user = await getCurrentUser();

    const comment = await db.query.taskComments.findFirst({
      where: eq(taskComments.id, commentId),
      with: {
        task: true,
      },
    });

    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    // Check if user is author or admin/owner
    const { member } = await requireWorkspaceMember(comment.task.workspaceId);

    if (comment.userId !== user.id && !["owner", "admin"].includes(member.role)) {
      return { success: false, error: "Not authorized to delete this comment" };
    }

    await db.delete(taskComments).where(eq(taskComments.id, commentId));

    revalidateTag(TASKS_TAG);
    revalidateTag(ACTIVITY_TAG);

    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: "Failed to delete comment" };
  }
};

// Get workspace members for @mention suggestions
export const getMentionSuggestions = async (workspaceId: string, search?: string) => {
  try {
    await requireWorkspaceMember(workspaceId);

    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.workspaceId, workspaceId),
      with: {
        user: true,
      },
    });

    let suggestions = members.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email,
      email: m.user.email,
      imageUrl: m.user.imageUrl,
    }));

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      suggestions = suggestions.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.email.toLowerCase().includes(searchLower)
      );
    }

    return { success: true, suggestions };
  } catch (error) {
    console.error("Error getting mention suggestions:", error);
    return { success: false, suggestions: [] };
  }
};
