import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, activityLogs, linkedRepositories } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// Find task linked to GitHub issue
async function findLinkedTask(repoFullName: string, issueNumber: number) {
  // Search in activity logs for the imported_from_github action
  const activity = await db.query.activityLogs.findFirst({
    where: and(
      eq(activityLogs.action, "imported_from_github"),
    ),
  });

  if (!activity?.metadata || !activity.taskId) return null;

  try {
    const metadata = JSON.parse(activity.metadata as string);
    if (
      metadata.github?.repositoryFullName === repoFullName &&
      metadata.github?.issueNumber === issueNumber
    ) {
      return activity.taskId;
    }
  } catch {
    return null;
  }

  // Search all activity logs if first one doesn't match
  const allActivities = await db.query.activityLogs.findMany({
    where: eq(activityLogs.action, "imported_from_github"),
    orderBy: [desc(activityLogs.createdAt)],
  });

  for (const act of allActivities) {
    if (!act.metadata || !act.taskId) continue;
    try {
      const metadata = JSON.parse(act.metadata as string);
      if (
        metadata.github?.repositoryFullName === repoFullName &&
        metadata.github?.issueNumber === issueNumber
      ) {
        return act.taskId;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");

    console.log("[GitHub Webhook] Received event:", event);

    // Verify webhook secret if configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      if (!verifySignature(payload, signature, webhookSecret)) {
        console.error("[GitHub Webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const data = JSON.parse(payload);

    // Handle different event types
    switch (event) {
      case "issues":
        await handleIssueEvent(data);
        break;
      case "pull_request":
        await handlePullRequestEvent(data);
        break;
      case "push":
        await handlePushEvent(data);
        break;
      case "ping":
        console.log("[GitHub Webhook] Ping received from:", data.repository?.full_name);
        break;
      default:
        console.log("[GitHub Webhook] Unhandled event:", event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GitHub Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleIssueEvent(data: any) {
  const { action, issue, repository } = data;
  const repoFullName = repository?.full_name;
  const issueNumber = issue?.number;

  console.log("[GitHub Webhook] Issue event:", action, repoFullName, "#" + issueNumber);

  if (!repoFullName || !issueNumber) return;

  // Find linked task
  const taskId = await findLinkedTask(repoFullName, issueNumber);

  if (!taskId) {
    console.log("[GitHub Webhook] No linked task found for issue:", repoFullName, "#" + issueNumber);
    return;
  }

  console.log("[GitHub Webhook] Found linked task:", taskId);

  // Get the task
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) return;

  // Update task based on issue action
  switch (action) {
    case "closed":
      // Close the task when issue is closed
      if (task.status !== "done") {
        await db.update(tasks).set({
          status: "done",
          updatedAt: new Date(),
        }).where(eq(tasks.id, taskId));

        console.log("[GitHub Webhook] Task marked as done:", taskId);

        // Log activity
        await db.insert(activityLogs).values({
          workspaceId: task.workspaceId,
          userId: task.createdBy,
          taskId: taskId,
          action: "status_changed_by_github",
          entityType: "task",
          entityId: taskId,
          metadata: JSON.stringify({
            from: task.status,
            to: "done",
            github: { action: "issue_closed", issueNumber, repoFullName },
          }),
        });
      }
      break;

    case "reopened":
      // Reopen the task when issue is reopened
      if (task.status === "done") {
        await db.update(tasks).set({
          status: "todo",
          updatedAt: new Date(),
        }).where(eq(tasks.id, taskId));

        console.log("[GitHub Webhook] Task reopened:", taskId);

        // Log activity
        await db.insert(activityLogs).values({
          workspaceId: task.workspaceId,
          userId: task.createdBy,
          taskId: taskId,
          action: "status_changed_by_github",
          entityType: "task",
          entityId: taskId,
          metadata: JSON.stringify({
            from: "done",
            to: "todo",
            github: { action: "issue_reopened", issueNumber, repoFullName },
          }),
        });
      }
      break;

    case "edited":
      // Update task title/description if issue is edited
      if (issue.title !== task.title || issue.body !== task.description) {
        await db.update(tasks).set({
          title: issue.title,
          description: issue.body || task.description,
          updatedAt: new Date(),
        }).where(eq(tasks.id, taskId));

        console.log("[GitHub Webhook] Task updated from issue edit:", taskId);
      }
      break;
  }
}

async function handlePullRequestEvent(data: any) {
  const { action, pull_request, repository } = data;
  const repoFullName = repository?.full_name;

  console.log("[GitHub Webhook] PR event:", action, repoFullName, "#" + pull_request?.number);

  // Check if PR body references any task
  const prBody = pull_request?.body || "";
  const prTitle = pull_request?.title || "";

  // Look for patterns like "closes #123", "fixes #456", "task-abc123"
  // For now, just log the event
  // Future: Parse PR body to find task references and update them
}

async function handlePushEvent(data: any) {
  const { commits, repository } = data;
  const repoFullName = repository?.full_name;

  console.log("[GitHub Webhook] Push event:", repoFullName, commits?.length, "commits");

  // Check commit messages for task references
  // For now, just log the event
  // Future: Parse commit messages to find task references and link them
}
