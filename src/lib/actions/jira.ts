"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations, tasks, activityLogs, taskAssignees } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  getJiraProjects,
  getJiraIssues,
  getJiraIssue,
  createJiraIssue,
  updateJiraIssue,
  transitionJiraIssue,
  getJiraIssueTransitions,
  mapJiraStatusToTaskStatus,
  mapJiraPriorityToTaskPriority,
  type JiraProject,
  type JiraIssue,
} from "@/lib/jira";

// Refresh Jira access token
async function refreshJiraToken(integration: any): Promise<string | null> {
  if (!integration.refreshToken) {
    console.log("[Jira] No refresh token available");
    return null;
  }

  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[Jira] Missing client credentials for token refresh");
    return null;
  }

  try {
    console.log("[Jira] Refreshing access token...");
    
    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: decrypt(integration.refreshToken),
      }),
    });

    if (!response.ok) {
      console.error("[Jira] Token refresh failed:", response.status);
      return null;
    }

    const tokenData = await response.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Calculate new expiration
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    // Update the integration with new tokens
    await db.update(integrations).set({
      accessToken: encrypt(access_token),
      refreshToken: refresh_token ? encrypt(refresh_token) : integration.refreshToken,
      tokenExpiresAt,
      updatedAt: new Date(),
    }).where(eq(integrations.id, integration.id));

    console.log("[Jira] Token refreshed successfully");
    return access_token;
  } catch (error) {
    console.error("[Jira] Error refreshing token:", error);
    return null;
  }
}

// Get Jira access token for current user
export async function getJiraToken() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, session.user.id),
      eq(integrations.provider, "jira"),
      eq(integrations.isActive, true)
    ),
  });

  if (!integration) {
    return { success: false, error: "Jira not connected" };
  }

  let accessToken = integration.accessToken ? decrypt(integration.accessToken) : null;
  const tokenExpiry = integration.tokenExpiresAt;
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (tokenExpiry && new Date(tokenExpiry) < fiveMinutesFromNow) {
    const newToken = await refreshJiraToken(integration);
    if (newToken) {
      accessToken = newToken;
    } else {
      return { success: false, error: "Token expired. Please reconnect to Jira." };
    }
  }

  let cloudId = integration.providerAccountId;
  if (integration.metadata) {
    try {
      const metadata = JSON.parse(integration.metadata as string);
      cloudId = metadata.cloudId || cloudId;
    } catch {
      // Ignore metadata parse errors
    }
  }

  return {
    success: true,
    accessToken,
    cloudId,
    integration,
  };
}

// Get user's Jira projects
export async function getUserJiraProjects(): Promise<{
  success: boolean;
  projects?: JiraProject[];
  error?: string;
}> {
  try {
    const tokenResult = await getJiraToken();
    if (!tokenResult.success || !tokenResult.accessToken || !tokenResult.cloudId) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    const projects = await getJiraProjects(
      tokenResult.accessToken,
      tokenResult.cloudId
    );

    return { success: true, projects };
  } catch (error) {
    console.error("Error fetching Jira projects:", error);
    return { success: false, error: "Failed to fetch projects" };
  }
}

// Get issues from a Jira project
export async function getProjectIssues(
  projectKey: string,
  options?: { status?: string; maxResults?: number }
): Promise<{
  success: boolean;
  issues?: JiraIssue[];
  total?: number;
  error?: string;
}> {
  try {
    const tokenResult = await getJiraToken();
    if (!tokenResult.success || !tokenResult.accessToken || !tokenResult.cloudId) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    console.log("[Jira Action] Fetching issues for project:", projectKey);
    
    const result = await getJiraIssues(
      tokenResult.accessToken,
      tokenResult.cloudId,
      projectKey,
      options
    );

    console.log("[Jira Action] Got", result.issues.length, "issues");
    return { success: true, issues: result.issues, total: result.total };
  } catch (error: any) {
    console.error("Error fetching Jira issues:", error);
    return { success: false, error: error.message || "Failed to fetch issues" };
  }
}

// Import Jira issues as TaskOS tasks
export async function importJiraIssuesAsTasks(data: {
  workspaceId: string;
  projectKey: string;
  issueKeys: string[];
}): Promise<{ success: boolean; imported?: number; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const tokenResult = await getJiraToken();
    if (!tokenResult.success || !tokenResult.accessToken || !tokenResult.cloudId) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    let imported = 0;

    for (const issueKey of data.issueKeys) {
      // Fetch full issue details using getJiraIssue (gets ALL fields)
      let issue;
      try {
        issue = await getJiraIssue(
          tokenResult.accessToken,
          tokenResult.cloudId,
          issueKey
        );
      } catch (e) {
        console.error(`Failed to fetch issue ${issueKey}:`, e);
        continue;
      }
      if (!issue) continue;

      // Map Jira status to TaskOS status
      const status = mapJiraStatusToTaskStatus(
        issue.fields.status.name,
        issue.fields.status.statusCategory.key
      );

      // Map priority
      const priority = mapJiraPriorityToTaskPriority(issue.fields.priority?.name);
      

      // Extract description text
      let description = "";
      if (issue.fields.description) {
        if (typeof issue.fields.description === "string") {
          description = issue.fields.description;
        } else if (issue.fields.description.content) {
          description = extractTextFromADF(issue.fields.description);
        }
      }
      
      // Create task
      const [newTask] = await db.insert(tasks).values({
        workspaceId: data.workspaceId,
        title: issue.fields.summary,
        description: description || null,
        status: status as any,
        priority: priority as any,
        dueDate: issue.fields.duedate || null,
        createdBy: session.user.id,
        metadata: JSON.stringify({
          jira: {
            issueId: issue.id,
            issueKey: issue.key,
            projectKey: data.projectKey,
            cloudId: tokenResult.cloudId,
            url: `https://${tokenResult.integration?.providerUsername}.atlassian.net/browse/${issue.key}`,
          },
        }),
      }).returning();

      try {
        await db.insert(taskAssignees).values({
          taskId: newTask.id,
          userId: session.user.id,
          assignedBy: session.user.id,
        });
      } catch (e) {
        console.error("Failed to auto-assign task:", e);
      }

      await db.insert(activityLogs).values({
        workspaceId: data.workspaceId,
        userId: session.user.id,
        taskId: newTask.id,
        action: "imported_from_jira",
        entityType: "task",
        entityId: newTask.id,
        metadata: JSON.stringify({
          jira: {
            issueKey: issue.key,
            projectKey: data.projectKey,
            cloudId: tokenResult.cloudId,
          },
        }),
      });

      imported++;
    }

    // Revalidate all relevant paths to ensure UI updates
    revalidatePath(`/app/${data.workspaceId}`);
    revalidatePath(`/app/${data.workspaceId}/tasks`);
    revalidatePath(`/app/${data.workspaceId}/board`);
    revalidatePath(`/app/${data.workspaceId}/dashboard`);
    
    return { success: true, imported };
  } catch (error) {
    console.error("Error importing Jira issues:", error);
    return { success: false, error: "Failed to import issues" };
  }
}

// Create a Jira issue from a TaskOS task
export async function createJiraIssueFromTask(data: {
  taskId: string;
  projectKey: string;
}): Promise<{
  success: boolean;
  issue?: { key: string; url: string };
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const tokenResult = await getJiraToken();
    if (!tokenResult.success || !tokenResult.accessToken || !tokenResult.cloudId) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, data.taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // Map TaskOS priority to Jira priority
    const priorityMap: Record<string, string> = {
      urgent: "Highest",
      high: "High",
      medium: "Medium",
      low: "Low",
    };

    // Create the issue
    const result = await createJiraIssue(
      tokenResult.accessToken,
      tokenResult.cloudId,
      data.projectKey,
      {
        summary: task.title,
        description: task.description || undefined,
        priority: priorityMap[task.priority] || "Medium",
        issueType: "Task",
      }
    );

    const issueUrl = `https://${tokenResult.integration?.providerUsername}.atlassian.net/browse/${result.key}`;

    // Update task with Jira metadata
    await db.update(tasks).set({
      metadata: JSON.stringify({
        jira: {
          issueId: result.id,
          issueKey: result.key,
          projectKey: data.projectKey,
          cloudId: tokenResult.cloudId,
          url: issueUrl,
        },
      }),
      updatedAt: new Date(),
    }).where(eq(tasks.id, data.taskId));

    // Log activity
    await db.insert(activityLogs).values({
      workspaceId: task.workspaceId,
      userId: session.user.id,
      taskId: task.id,
      action: "created_jira_issue",
      entityType: "task",
      entityId: task.id,
      metadata: JSON.stringify({
        jira: {
          issueKey: result.key,
          projectKey: data.projectKey,
          url: issueUrl,
        },
      }),
    });

    revalidatePath(`/app/${task.workspaceId}`);
    return {
      success: true,
      issue: { key: result.key, url: issueUrl },
    };
  } catch (error) {
    console.error("Error creating Jira issue:", error);
    return { success: false, error: "Failed to create Jira issue" };
  }
}

// Sync task status to Jira
// Map TaskOS priority to Jira priority
function mapTaskPriorityToJira(priority: string): string {
  const mapping: Record<string, string> = {
    urgent: "Highest",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return mapping[priority] || "Medium";
}

export async function syncTaskToJira(taskId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const tokenResult = await getJiraToken();
    if (!tokenResult.success || !tokenResult.accessToken || !tokenResult.cloudId) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task || !task.metadata) {
      return { success: false, error: "Task not found or not linked to Jira" };
    }

    let jiraInfo;
    try {
      const metadata = JSON.parse(task.metadata as string);
      jiraInfo = metadata.jira;
    } catch {
      return { success: false, error: "Invalid task metadata" };
    }

    if (!jiraInfo?.issueKey) {
      return { success: false, error: "Task not linked to Jira" };
    }

    // 1. Update fields (Title, Description, Priority, Due Date)
    await updateJiraIssue(
      tokenResult.accessToken,
      tokenResult.cloudId,
      jiraInfo.issueKey,
      {
        summary: task.title,
        description: task.description || undefined,
        priority: mapTaskPriorityToJira(task.priority),
        duedate: task.dueDate || undefined,
      }
    );

    // 2. Handle status transition
    const transitions = await getJiraIssueTransitions(
      tokenResult.accessToken,
      tokenResult.cloudId,
      jiraInfo.issueKey
    );

    // Find the appropriate transition based on task status
    let targetTransition;
    if (task.status === "done") {
      targetTransition = transitions.find(
        (t) =>
          t.to.name.toLowerCase().includes("done") ||
          t.to.name.toLowerCase().includes("closed") ||
          t.to.name.toLowerCase().includes("resolved")
      );
    } else if (task.status === "in_progress" || task.status === "review") {
      targetTransition = transitions.find(
        (t) =>
          t.to.name.toLowerCase().includes("progress") ||
          t.to.name.toLowerCase().includes("start")
      );
    } else if (task.status === "todo" || task.status === "backlog") {
      targetTransition = transitions.find(
        (t) =>
          t.to.name.toLowerCase().includes("to do") ||
          t.to.name.toLowerCase().includes("open") ||
          t.to.name.toLowerCase().includes("reopen")
      );
    }

    if (targetTransition) {
      await transitionJiraIssue(
        tokenResult.accessToken,
        tokenResult.cloudId,
        jiraInfo.issueKey,
        targetTransition.id
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing to Jira:", error);
    return { success: false, error: "Failed to sync to Jira" };
  }
}

// Get Jira info for a task
export async function getTaskJiraInfo(taskId: string): Promise<{
  success: boolean;
  jiraInfo?: {
    issueKey: string;
    issueUrl: string;
    projectKey: string;
  };
  error?: string;
}> {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task?.metadata) {
      return { success: false };
    }

    try {
      const metadata = JSON.parse(task.metadata as string);
      if (metadata.jira) {
        return {
          success: true,
          jiraInfo: {
            issueKey: metadata.jira.issueKey,
            issueUrl: metadata.jira.url,
            projectKey: metadata.jira.projectKey,
          },
        };
      }
    } catch {}

    return { success: false };
  } catch (error) {
    console.error("Error getting Jira info:", error);
    return { success: false, error: "Failed to get Jira info" };
  }
}

// Helper to extract text from Atlassian Document Format
function extractTextFromADF(adf: any): string {
  if (!adf?.content) return "";

  let text = "";

  function traverse(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === "text") {
        text += node.text;
      } else if (node.type === "hardBreak") {
        text += "\n";
      } else if (node.content) {
        traverse(node.content);
      }
      if (node.type === "paragraph") {
        text += "\n";
      }
    }
  }

  traverse(adf.content);
  return text.trim();
}
