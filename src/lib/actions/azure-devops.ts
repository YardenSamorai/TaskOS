"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations, tasks, activityLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  getAzureDevOpsProjects,
  queryWorkItems,
  getWorkItem,
  createWorkItem,
  updateWorkItem,
  mapAzureStateToTaskStatus,
  mapAzurePriorityToTaskPriority,
  mapTaskPriorityToAzure,
  stripHtml,
  type AzureDevOpsProject,
  type AzureDevOpsWorkItem,
} from "@/lib/azure-devops";

// Refresh Azure DevOps access token
async function refreshAzureToken(integration: any): Promise<string | null> {
  if (!integration.refreshToken) {
    console.log("[Azure DevOps] No refresh token available");
    return null;
  }

  const clientSecret = process.env.AZURE_DEVOPS_CLIENT_SECRET;
  if (!clientSecret) {
    console.error("[Azure DevOps] Missing client secret for token refresh");
    return null;
  }

  try {
    console.log("[Azure DevOps] Refreshing access token...");

    const response = await fetch(
      "https://app.vssps.visualstudio.com/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_assertion: clientSecret,
          grant_type: "refresh_token",
          assertion: integration.refreshToken,
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/azure-devops/callback`,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Azure DevOps] Token refresh failed:", response.status, errorText);
      return null;
    }

    const tokenData = await response.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    await db.update(integrations).set({
      accessToken: access_token,
      refreshToken: refresh_token || integration.refreshToken,
      tokenExpiresAt,
      updatedAt: new Date(),
    }).where(eq(integrations.id, integration.id));

    console.log("[Azure DevOps] Token refreshed successfully");
    return access_token;
  } catch (error) {
    console.error("[Azure DevOps] Error refreshing token:", error);
    return null;
  }
}

// Get Azure DevOps access token for current user
export async function getAzureDevOpsToken() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" };
  }

  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, session.user.id),
      eq(integrations.provider, "azure_devops"),
      eq(integrations.isActive, true)
    ),
  });

  if (!integration) {
    return { success: false as const, error: "Azure DevOps not connected" };
  }

  let accessToken = integration.accessToken;
  const tokenExpiry = integration.tokenExpiresAt;
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (tokenExpiry && new Date(tokenExpiry) < fiveMinutesFromNow) {
    console.log("[Azure DevOps] Token expired or expiring soon, refreshing...");
    const newToken = await refreshAzureToken(integration);
    if (newToken) {
      accessToken = newToken;
    } else {
      return { success: false as const, error: "Token expired. Please reconnect to Azure DevOps." };
    }
  }

  // Parse organizations from metadata
  let organizations: { id: string; name: string; uri: string }[] = [];
  if (integration.metadata) {
    try {
      const metadata = JSON.parse(integration.metadata as string);
      organizations = metadata.organizations || [];
    } catch (e) {
      console.error("[Azure DevOps] Error parsing metadata:", e);
    }
  }

  return {
    success: true as const,
    accessToken,
    organizations,
    integration,
  };
}

// Get projects for an organization
export async function getUserAzureDevOpsProjects(
  organization: string
): Promise<{
  success: boolean;
  projects?: AzureDevOpsProject[];
  error?: string;
}> {
  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    const projects = await getAzureDevOpsProjects(
      tokenResult.accessToken,
      organization
    );

    return { success: true, projects };
  } catch (error) {
    console.error("Error fetching Azure DevOps projects:", error);
    return { success: false, error: "Failed to fetch projects" };
  }
}

// Get work items for a project
export async function getProjectWorkItems(
  organization: string,
  project: string,
  options?: { states?: string[]; maxResults?: number }
): Promise<{
  success: boolean;
  workItems?: AzureDevOpsWorkItem[];
  total?: number;
  error?: string;
}> {
  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    const result = await queryWorkItems(
      tokenResult.accessToken,
      organization,
      project,
      options
    );

    return { success: true, workItems: result.workItems, total: result.total };
  } catch (error: any) {
    console.error("Error fetching work items:", error);
    return { success: false, error: error.message || "Failed to fetch work items" };
  }
}

// Import Azure DevOps work items as TaskOS tasks
export async function importAzureWorkItemsAsTasks(data: {
  workspaceId: string;
  organization: string;
  project: string;
  workItemIds: number[];
}): Promise<{ success: boolean; imported?: number; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    let imported = 0;

    for (const workItemId of data.workItemIds) {
      let workItem;
      try {
        workItem = await getWorkItem(
          tokenResult.accessToken,
          data.organization,
          data.project,
          workItemId
        );
      } catch (e) {
        console.error(`Failed to fetch work item ${workItemId}:`, e);
        continue;
      }
      if (!workItem) continue;

      const fields = workItem.fields;
      const status = mapAzureStateToTaskStatus(fields["System.State"]);
      const priority = mapAzurePriorityToTaskPriority(
        fields["Microsoft.VSTS.Common.Priority"]
      );

      let description = fields["System.Description"] || "";
      if (description) {
        description = stripHtml(description);
      }

      const workItemUrl = `https://dev.azure.com/${data.organization}/${data.project}/_workitems/edit/${workItemId}`;

      const [newTask] = await db
        .insert(tasks)
        .values({
          workspaceId: data.workspaceId,
          title: fields["System.Title"],
          description: description || null,
          status: status as any,
          priority: priority as any,
          dueDate: fields["Microsoft.VSTS.Scheduling.DueDate"] || null,
          createdBy: session.user.id,
          metadata: JSON.stringify({
            azure_devops: {
              workItemId: workItem.id,
              workItemType: fields["System.WorkItemType"],
              organization: data.organization,
              project: data.project,
              url: workItemUrl,
              areaPath: fields["System.AreaPath"],
              iterationPath: fields["System.IterationPath"],
            },
          }),
        })
        .returning();

      await db.insert(activityLogs).values({
        workspaceId: data.workspaceId,
        userId: session.user.id,
        taskId: newTask.id,
        action: "imported_from_azure_devops",
        entityType: "task",
        entityId: newTask.id,
        metadata: JSON.stringify({
          azure_devops: {
            workItemId: workItem.id,
            organization: data.organization,
            project: data.project,
          },
        }),
      });

      imported++;
    }

    revalidatePath(`/app/${data.workspaceId}`);
    revalidatePath(`/app/${data.workspaceId}/tasks`);
    revalidatePath(`/app/${data.workspaceId}/board`);
    revalidatePath(`/app/${data.workspaceId}/dashboard`);

    return { success: true, imported };
  } catch (error) {
    console.error("Error importing work items:", error);
    return { success: false, error: "Failed to import work items" };
  }
}

// Create Azure DevOps work item from TaskOS task
export async function createAzureWorkItemFromTask(data: {
  taskId: string;
  organization: string;
  project: string;
  workItemType?: string;
}): Promise<{
  success: boolean;
  workItem?: { id: number; url: string };
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, data.taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const result = await createWorkItem(
      tokenResult.accessToken,
      data.organization,
      data.project,
      data.workItemType || "Task",
      {
        title: task.title,
        description: task.description || undefined,
        priority: mapTaskPriorityToAzure(task.priority),
        dueDate: task.dueDate || undefined,
      }
    );

    const workItemUrl = `https://dev.azure.com/${data.organization}/${data.project}/_workitems/edit/${result.id}`;

    await db
      .update(tasks)
      .set({
        metadata: JSON.stringify({
          azure_devops: {
            workItemId: result.id,
            workItemType: data.workItemType || "Task",
            organization: data.organization,
            project: data.project,
            url: workItemUrl,
          },
        }),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, data.taskId));

    await db.insert(activityLogs).values({
      workspaceId: task.workspaceId,
      userId: session.user.id,
      taskId: task.id,
      action: "created_azure_devops_work_item",
      entityType: "task",
      entityId: task.id,
      metadata: JSON.stringify({
        azure_devops: {
          workItemId: result.id,
          organization: data.organization,
          project: data.project,
          url: workItemUrl,
        },
      }),
    });

    revalidatePath(`/app/${task.workspaceId}`);
    return { success: true, workItem: { id: result.id, url: workItemUrl } };
  } catch (error) {
    console.error("Error creating work item:", error);
    return { success: false, error: "Failed to create work item" };
  }
}

// Sync task to Azure DevOps
export async function syncTaskToAzureDevOps(taskId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task || !task.metadata) {
      return {
        success: false,
        error: "Task not found or not linked to Azure DevOps",
      };
    }

    let azureInfo;
    try {
      const metadata = JSON.parse(task.metadata as string);
      azureInfo = metadata.azure_devops;
    } catch {
      return { success: false, error: "Invalid task metadata" };
    }

    if (!azureInfo?.workItemId) {
      return { success: false, error: "Task not linked to Azure DevOps" };
    }

    // Map TaskOS status to Azure DevOps state
    const stateMap: Record<string, string> = {
      backlog: "New",
      todo: "New",
      in_progress: "Active",
      review: "Resolved",
      done: "Closed",
    };

    await updateWorkItem(
      tokenResult.accessToken,
      azureInfo.organization,
      azureInfo.project,
      azureInfo.workItemId,
      {
        title: task.title,
        description: task.description || undefined,
        state: stateMap[task.status] || "Active",
        priority: mapTaskPriorityToAzure(task.priority),
      }
    );

    return { success: true };
  } catch (error) {
    console.error("Error syncing to Azure DevOps:", error);
    return { success: false, error: "Failed to sync to Azure DevOps" };
  }
}

// Get Azure DevOps info for a task
export async function getTaskAzureDevOpsInfo(taskId: string): Promise<{
  success: boolean;
  azureInfo?: {
    workItemId: number;
    workItemUrl: string;
    organization: string;
    project: string;
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
      if (metadata.azure_devops) {
        return {
          success: true,
          azureInfo: {
            workItemId: metadata.azure_devops.workItemId,
            workItemUrl: metadata.azure_devops.url,
            organization: metadata.azure_devops.organization,
            project: metadata.azure_devops.project,
          },
        };
      }
    } catch {}

    return { success: false };
  } catch (error) {
    console.error("Error getting Azure DevOps info:", error);
    return { success: false, error: "Failed to get Azure DevOps info" };
  }
}

// Get organizations list for current user
export async function getUserAzureOrganizations(): Promise<{
  success: boolean;
  organizations?: { id: string; name: string; uri: string }[];
  error?: string;
}> {
  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    return { success: true, organizations: tokenResult.organizations };
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return { success: false, error: "Failed to fetch organizations" };
  }
}
