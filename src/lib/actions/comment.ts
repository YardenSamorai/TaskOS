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
  workspaces,
  taskAssignees,
} from "@/lib/db/schema";
import {
  getCurrentUser,
  requireWorkspaceMember,
  requireWorkspaceEditor,
} from "@/lib/auth/permissions";
import { eq, desc, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { TASKS_TAG, ACTIVITY_TAG } from "@/lib/cache";
import { sendMentionEmail, sendNewCommentEmail } from "@/lib/email";
import { pusherServer, getTaskChannel, getUserChannel, PUSHER_EVENTS } from "@/lib/pusher";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://task-os.app";

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

    // Get task for workspace ID with assignees
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, data.taskId),
      with: {
        assignees: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    await requireWorkspaceMember(task.workspaceId);

    // Get workspace name for emails
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, task.workspaceId),
    });

    // Create comment
    const [comment] = await db
      .insert(taskComments)
      .values({
        taskId: data.taskId,
        userId: user.id,
        content: data.content,
      })
      .returning();

    // Strip HTML and mentions for email preview
    const plainTextContent = data.content
      .replace(/<[^>]*>/g, '')
      .replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');

    // Extract and process mentions
    const mentionedUserIds = extractMentions(data.content);
    const notifiedUserIds = new Set<string>(); // Track who we've notified to avoid duplicates

    if (mentionedUserIds.length > 0) {
      // Verify users are workspace members
      const members = await db.query.workspaceMembers.findMany({
        where: and(
          eq(workspaceMembers.workspaceId, task.workspaceId),
          inArray(workspaceMembers.userId, mentionedUserIds)
        ),
        with: {
          user: true,
        },
      });

      // Create notifications and send emails for mentioned users
      for (const member of members) {
        if (member.userId !== user.id) {
          notifiedUserIds.add(member.userId);
          
          // Create in-app notification
          const [notification] = await db.insert(notifications).values({
            userId: member.userId,
            workspaceId: task.workspaceId,
            taskId: task.id,
            type: "mention",
            title: `${user.name || user.email} mentioned you`,
            message: `In task: ${task.title}`,
          }).returning();

          // Send real-time notification via Pusher
          pusherServer.trigger(getUserChannel(member.userId), PUSHER_EVENTS.NOTIFICATION_NEW, {
            notification,
          }).catch(console.error);

          // Send mention email
          if (member.user?.email) {
            sendMentionEmail({
              userId: member.userId,
              to: member.user.email,
              userName: member.user.name || "there",
              taskTitle: task.title,
              workspaceName: workspace?.name || "Workspace",
              mentionedBy: user.name || user.email || "Someone",
              commentText: plainTextContent,
              taskLink: `${APP_URL}/en/app/${task.workspaceId}/tasks/${task.id}`,
            }).catch(console.error);
          }
        }
      }
    }

    // Notify task assignees about new comment (if not already notified via mention)
    for (const assignee of task.assignees || []) {
      if (assignee.user && assignee.user.id !== user.id && !notifiedUserIds.has(assignee.user.id)) {
        notifiedUserIds.add(assignee.user.id);
        
        // Create in-app notification
        const [notification] = await db.insert(notifications).values({
          userId: assignee.user.id,
          workspaceId: task.workspaceId,
          taskId: task.id,
          type: "comment",
          title: `${user.name || user.email} commented`,
          message: `On task: ${task.title}`,
        }).returning();

        // Send real-time notification via Pusher
        pusherServer.trigger(getUserChannel(assignee.user.id), PUSHER_EVENTS.NOTIFICATION_NEW, {
          notification,
        }).catch(console.error);

        // Send email notification
        if (assignee.user.email) {
          sendNewCommentEmail({
            userId: assignee.user.id,
            to: assignee.user.email,
            userName: assignee.user.name || "there",
            taskTitle: task.title,
            workspaceName: workspace?.name || "Workspace",
            commenterName: user.name || user.email || "Someone",
            commentText: plainTextContent,
            taskLink: `${APP_URL}/en/app/${task.workspaceId}/tasks/${task.id}`,
          }).catch(console.error);
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

    // Broadcast real-time event via Pusher
    const channel = getTaskChannel(data.taskId);
    console.log("[Pusher Server] Triggering event on channel:", channel);
    try {
      await pusherServer.trigger(channel, PUSHER_EVENTS.COMMENT_CREATED, {
        comment: commentWithUser,
      });
      console.log("[Pusher Server] ✅ Event triggered successfully");
    } catch (pusherError) {
      console.error("[Pusher Server] ❌ Error triggering event:", pusherError);
    }

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

    // Broadcast real-time event via Pusher
    await pusherServer.trigger(getTaskChannel(comment.task.id), PUSHER_EVENTS.COMMENT_UPDATED, {
      comment: commentWithUser,
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

    const taskId = comment.task.id;
    
    await db.delete(taskComments).where(eq(taskComments.id, commentId));

    // Broadcast real-time event via Pusher
    await pusherServer.trigger(getTaskChannel(taskId), PUSHER_EVENTS.COMMENT_DELETED, {
      commentId: commentId,
    });

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
      image: m.user.image,
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
