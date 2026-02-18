import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, activityLogs, integrations } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Find task linked to Jira issue
async function findLinkedTask(issueKey: string, cloudId: string | null) {
  
  // Search in activity logs for the imported_from_jira action
  const allActivities = await db.query.activityLogs.findMany({
    where: eq(activityLogs.action, "imported_from_jira"),
    orderBy: [desc(activityLogs.createdAt)],
  });

  for (const activity of allActivities) {
    if (!activity.metadata || !activity.taskId) continue;
    try {
      const metadata = JSON.parse(activity.metadata as string);
      // Match by issueKey, and optionally by cloudId if provided
      if (metadata.jira?.issueKey === issueKey) {
        if (!cloudId || metadata.jira?.cloudId === cloudId) {
          console.log("[Jira Webhook] Found task via activity log:", activity.taskId);
          return activity.taskId;
        }
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
      // Match by issueKey, and optionally by cloudId if provided
      if (metadata.jira?.issueKey === issueKey) {
        if (!cloudId || metadata.jira?.cloudId === cloudId) {
          console.log("[Jira Webhook] Found task via task metadata:", task.id);
          return task.id;
        }
      }
    } catch {
      continue;
    }
  }

  console.log("[Jira Webhook] No linked task found for issueKey:", issueKey);
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.JIRA_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload = await request.json();
    const event = payload.webhookEvent;

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
  
  // Extract cloudId from the issue URL - handle different URL formats
  // Format 1: https://api.atlassian.com/ex/jira/CLOUD_ID/rest/api/3/issue/...
  // Format 2: https://SITE.atlassian.net/rest/api/3/issue/... (no cloudId in URL)
  let cloudId = issue?.self?.match(/ex\/jira\/([^/]+)/)?.[1];
  
  // If cloudId not in URL, try to find it from the stored integration
  if (!cloudId) {
    // Try to extract from different URL patterns
    const altMatch = issue?.self?.match(/https:\/\/([^.]+)\.atlassian\.net/);
    if (altMatch) {
      console.log("[Jira Webhook] Site name from URL:", altMatch[1]);
      // We'll need to look up the cloudId from our integrations table
      const allIntegrations = await db.query.integrations.findMany({
        where: eq(integrations.provider, "jira"),
      });
      for (const integration of allIntegrations) {
        if (integration.providerUsername === altMatch[1]) {
          const metadata = integration.metadata ? JSON.parse(integration.metadata as string) : null;
          cloudId = metadata?.cloudId;
          console.log("[Jira Webhook] Found cloudId from integration:", cloudId);
          break;
        }
      }
    }
  }

  console.log("[Jira Webhook] Issue updated:", issueKey, "cloudId:", cloudId);

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

  // Check for priority changes
  const priorityChange = changelog?.items?.find(
    (item: any) => item.field === "priority"
  );

  if (priorityChange) {
    const jiraPriority = issue?.fields?.priority?.name?.toLowerCase();
    let taskPriority = task.priority;

    // Map Jira priority to TaskOS priority
    if (jiraPriority === "highest" || jiraPriority === "high") {
      taskPriority = "high";
    } else if (jiraPriority === "medium" || jiraPriority === "normal") {
      taskPriority = "medium";
    } else if (jiraPriority === "low" || jiraPriority === "lowest") {
      taskPriority = "low";
    }

    if (taskPriority !== task.priority) {
      await db.update(tasks).set({
        priority: taskPriority as any,
        updatedAt: new Date(),
      }).where(eq(tasks.id, taskId));

      console.log("[Jira Webhook] Task priority updated:", taskId, taskPriority);

      // Log activity
      await db.insert(activityLogs).values({
        workspaceId: task.workspaceId,
        userId: task.createdBy,
        taskId: taskId,
        action: "priority_changed_by_jira",
        entityType: "task",
        entityId: taskId,
        metadata: JSON.stringify({
          from: task.priority,
          to: taskPriority,
          jira: {
            action: "issue_priority_changed",
            issueKey,
            newPriority: issue?.fields?.priority?.name,
          },
        }),
      });
    }
  }

  // Check for description changes
  const descriptionChange = changelog?.items?.find(
    (item: any) => item.field === "description"
  );

  if (descriptionChange) {
    let description = "";
    if (issue?.fields?.description?.content) {
      // Extract text from Atlassian Document Format (ADF)
      description = extractTextFromADF(issue.fields.description);
    } else if (typeof issue?.fields?.description === "string") {
      description = issue.fields.description;
    }

    if (description !== task.description) {
      await db.update(tasks).set({
        description,
        updatedAt: new Date(),
      }).where(eq(tasks.id, taskId));

      console.log("[Jira Webhook] Task description updated:", taskId);
    }
  }

  // Check for due date changes
  const dueDateChange = changelog?.items?.find(
    (item: any) => item.field === "duedate"
  );

  if (dueDateChange) {
    const newDueDate = issue?.fields?.duedate || null;
    
    if (newDueDate !== task.dueDate) {
      await db.update(tasks).set({
        dueDate: newDueDate,
        updatedAt: new Date(),
      }).where(eq(tasks.id, taskId));

      console.log("[Jira Webhook] Task due date updated:", taskId, newDueDate);
    }
  }
}

// Helper function to extract text from Atlassian Document Format
function extractTextFromADF(adf: any): string {
  if (!adf?.content) return "";
  
  let text = "";
  const processNode = (node: any) => {
    if (node.type === "text") {
      text += node.text || "";
    } else if (node.type === "paragraph" || node.type === "heading") {
      if (node.content) {
        node.content.forEach(processNode);
      }
      text += "\n";
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      if (node.content) {
        node.content.forEach((item: any, index: number) => {
          if (node.type === "orderedList") {
            text += `${index + 1}. `;
          } else {
            text += "• ";
          }
          if (item.content) {
            item.content.forEach(processNode);
          }
        });
      }
    } else if (node.content) {
      node.content.forEach(processNode);
    }
  };
  
  adf.content.forEach(processNode);
  return text.trim();
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
