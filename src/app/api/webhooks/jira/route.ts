import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, activityLogs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Find task linked to Jira issue
async function findLinkedTask(issueKey: string, cloudId: string) {
  // Search in activity logs for the imported_from_jira action
  const allActivities = await db.query.activityLogs.findMany({
    where: eq(activityLogs.action, "imported_from_jira"),
    orderBy: [desc(activityLogs.createdAt)],
  });

  for (const activity of allActivities) {
    if (!activity.metadata || !activity.taskId) continue;
    try {
      const metadata = JSON.parse(activity.metadata as string);
      if (
        metadata.jira?.issueKey === issueKey &&
        metadata.jira?.cloudId === cloudId
      ) {
        return activity.taskId;
      }
    } catch {
      continue;
    }
  }

  // Also check tasks with jira metadata
  const allTasks = await db.query.tasks.findMany();
  for (const task of allTasks) {
    if (!task.metadata) continue;
    try {
      const metadata = JSON.parse(task.metadata as string);
      if (
        metadata.jira?.issueKey === issueKey &&
        metadata.jira?.cloudId === cloudId
      ) {
        return task.id;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const event = payload.webhookEvent;

    console.log("[Jira Webhook] Received event:", event);

    // Handle different event types
    switch (event) {
      case "jira:issue_updated":
        await handleIssueUpdated(payload);
        break;
      case "jira:issue_deleted":
        await handleIssueDeleted(payload);
        break;
      default:
        console.log("[Jira Webhook] Unhandled event:", event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Jira Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleIssueUpdated(payload: any) {
  const { issue, changelog } = payload;
  const issueKey = issue?.key;
  const cloudId = payload.issue?.self?.match(/ex\/jira\/([^/]+)/)?.[1];

  console.log("[Jira Webhook] Issue updated:", issueKey);

  if (!issueKey) return;

  // Find linked task
  const taskId = await findLinkedTask(issueKey, cloudId);

  if (!taskId) {
    console.log("[Jira Webhook] No linked task found for issue:", issueKey);
    return;
  }

  console.log("[Jira Webhook] Found linked task:", taskId);

  // Get the task
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) return;

  // Check for status changes in changelog
  const statusChange = changelog?.items?.find(
    (item: any) => item.field === "status"
  );

  if (statusChange) {
    const newStatus = statusChange.toString?.toLowerCase();
    const statusCategory = issue?.fields?.status?.statusCategory?.key;

    let taskStatus = task.status;

    // Map Jira status category to TaskOS status
    if (statusCategory === "done") {
      taskStatus = "done";
    } else if (statusCategory === "indeterminate") {
      taskStatus = "in_progress";
    } else if (statusCategory === "new") {
      taskStatus = "todo";
    }

    if (taskStatus !== task.status) {
      await db.update(tasks).set({
        status: taskStatus as any,
        updatedAt: new Date(),
      }).where(eq(tasks.id, taskId));

      console.log("[Jira Webhook] Task status updated:", taskId, taskStatus);

      // Log activity
      await db.insert(activityLogs).values({
        workspaceId: task.workspaceId,
        userId: task.createdBy,
        taskId: taskId,
        action: "status_changed_by_jira",
        entityType: "task",
        entityId: taskId,
        metadata: JSON.stringify({
          from: task.status,
          to: taskStatus,
          jira: {
            action: "issue_status_changed",
            issueKey,
            newStatus: issue?.fields?.status?.name,
          },
        }),
      });
    }
  }

  // Check for summary/title changes
  const summaryChange = changelog?.items?.find(
    (item: any) => item.field === "summary"
  );

  if (summaryChange && summaryChange.toString !== task.title) {
    await db.update(tasks).set({
      title: issue?.fields?.summary || task.title,
      updatedAt: new Date(),
    }).where(eq(tasks.id, taskId));

    console.log("[Jira Webhook] Task title updated:", taskId);
  }
}

async function handleIssueDeleted(payload: any) {
  const { issue } = payload;
  const issueKey = issue?.key;
  const cloudId = payload.issue?.self?.match(/ex\/jira\/([^/]+)/)?.[1];

  console.log("[Jira Webhook] Issue deleted:", issueKey);

  if (!issueKey) return;

  // Find linked task
  const taskId = await findLinkedTask(issueKey, cloudId);

  if (!taskId) {
    console.log("[Jira Webhook] No linked task found for deleted issue:", issueKey);
    return;
  }

  // Get the task
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) return;

  // Remove Jira metadata from task (don't delete the task)
  await db.update(tasks).set({
    metadata: null,
    updatedAt: new Date(),
  }).where(eq(tasks.id, taskId));

  // Log activity
  await db.insert(activityLogs).values({
    workspaceId: task.workspaceId,
    userId: task.createdBy,
    taskId: taskId,
    action: "jira_issue_deleted",
    entityType: "task",
    entityId: taskId,
    metadata: JSON.stringify({
      jira: { issueKey },
    }),
  });

  console.log("[Jira Webhook] Jira link removed from task:", taskId);
}
