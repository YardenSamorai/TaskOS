"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrations, tasks, activityLogs, taskAssignees } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { decrypt } from "@/lib/encryption";
import {
  getAzureDevOpsProjects,
  getProjectTeams,
  getTeamIterations,
  getTeamBoards,
  getBoardColumns,
  getTeamFieldValues,
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

// Get Azure DevOps PAT and organization for current user
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

  const pat = integration.accessToken ? decrypt(integration.accessToken) : null;
  if (!pat) {
    return { success: false as const, error: "No PAT found. Please reconnect." };
  }

  // Organization is stored in providerAccountId
  const organization = integration.providerAccountId || "";

  return {
    success: true as const,
    accessToken: pat,
    organizations: [{ id: organization, name: organization, uri: `https://dev.azure.com/${organization}` }],
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

// Get teams for a project
export async function getProjectTeamsList(
  organization: string,
  project: string
): Promise<{
  success: boolean;
  teams?: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }
    const teams = await getProjectTeams(tokenResult.accessToken, organization, project);
    return { success: true, teams };
  } catch (error: any) {
    console.error("Error fetching teams:", error);
    return { success: false, error: error.message || "Failed to fetch teams" };
  }
}

// Get boards for a team
export async function getTeamBoardsList(
  organization: string,
  project: string,
  team: string
): Promise<{
  success: boolean;
  boards?: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }
    const boards = await getTeamBoards(tokenResult.accessToken, organization, project, team);
    return { success: true, boards };
  } catch (error: any) {
    console.error("Error fetching boards:", error);
    return { success: false, error: error.message || "Failed to fetch boards" };
  }
}

// Get board columns + work items for a team board
export async function getTeamBoardWorkItems(
  organization: string,
  project: string,
  team: string,
  boardName: string
): Promise<{
  success: boolean;
  columns?: { name: string; columnType: string; items: AzureDevOpsWorkItem[] }[];
  error?: string;
}> {
  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    // Get board columns
    const columns = await getBoardColumns(
      tokenResult.accessToken, organization, project, team, boardName
    );

    // Get team area paths to filter work items
    const areaPaths = await getTeamFieldValues(
      tokenResult.accessToken, organization, project, team
    );

    // Fetch work items for this team's area
    const result = await queryWorkItems(
      tokenResult.accessToken, organization, project, {
        areaPaths: areaPaths.length > 0 ? areaPaths : undefined,
        maxResults: 200,
      }
    );

    // Group by board column
    const columnMap = new Map<string, AzureDevOpsWorkItem[]>();
    for (const col of columns) {
      columnMap.set(col.name, []);
    }

    for (const item of result.workItems) {
      const col = item.fields["System.BoardColumn"] || item.fields["System.State"] || "New";
      if (columnMap.has(col)) {
        columnMap.get(col)!.push(item);
      } else {
        // Put in first matching column by state
        const stateColumnMap: Record<string, string[]> = {
          New: ["New", "To Do", "Backlog"],
          Active: ["Active", "In Progress", "Doing"],
          Resolved: ["Resolved", "In Review", "In PR"],
          Closed: ["Closed", "Done"],
        };
        const state = item.fields["System.State"];
        let placed = false;
        for (const [, aliases] of Object.entries(stateColumnMap)) {
          if (aliases.includes(state)) {
            for (const alias of aliases) {
              if (columnMap.has(alias)) {
                columnMap.get(alias)!.push(item);
                placed = true;
                break;
              }
            }
          }
          if (placed) break;
        }
        if (!placed) {
          // Add to first non-incoming column
          const firstCol = columns.find(c => c.columnType !== "incoming");
          if (firstCol) {
            columnMap.get(firstCol.name)?.push(item);
          }
        }
      }
    }

    return {
      success: true,
      columns: columns.map(col => ({
        name: col.name,
        columnType: col.columnType,
        items: columnMap.get(col.name) || [],
      })),
    };
  } catch (error: any) {
    console.error("Error fetching board work items:", error);
    return { success: false, error: error.message || "Failed to fetch board data" };
  }
}

// Get iterations (sprints/boards) for a project
export async function getProjectIterations(
  organization: string,
  project: string
): Promise<{
  success: boolean;
  iterations?: { id: string; name: string; path: string; timeFrame?: string }[];
  error?: string;
}> {
  try {
    const tokenResult = await getAzureDevOpsToken();
    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error || "Not connected" };
    }

    const iterations = await getTeamIterations(
      tokenResult.accessToken,
      organization,
      project
    );

    return { success: true, iterations };
  } catch (error: any) {
    console.error("Error fetching iterations:", error);
    return { success: false, error: error.message || "Failed to fetch iterations" };
  }
}

// Get work items for a project
export async function getProjectWorkItems(
  organization: string,
  project: string,
  options?: { states?: string[]; iterationPath?: string; maxResults?: number }
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

      const rawDueDate = fields["Microsoft.VSTS.Scheduling.DueDate"];
      const dueDate = rawDueDate ? rawDueDate.split("T")[0] : null;

      const [newTask] = await db
        .insert(tasks)
        .values({
          workspaceId: data.workspaceId,
          title: fields["System.Title"],
          description: description || null,
          status: status as any,
          priority: priority as any,
          dueDate,
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
  } catch (error: any) {
    console.error("Error importing work items:", error?.message || error);
    return { success: false, error: error?.message || "Failed to import work items" };
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
