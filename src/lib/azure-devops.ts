// Azure DevOps API utility functions
// Uses Personal Access Token (PAT) with Basic authentication

function buildBasicAuth(pat: string): string {
  return `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
}

async function azureDevOpsFetch(
  organization: string,
  path: string,
  pat: string,
  options?: RequestInit
) {
  const url = `https://dev.azure.com/${organization}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: buildBasicAuth(pat),
      "Content-Type": "application/json",
      ...options?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("[Azure DevOps API] Error:", response.status);
    throw new Error(
      `Azure DevOps API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// Types

export interface AzureDevOpsOrganization {
  id: string;
  name: string;
  uri: string;
}

export interface AzureDevOpsProject {
  id: string;
  name: string;
  description: string;
  url: string;
  state: string;
  visibility: string;
  lastUpdateTime: string;
}

export interface AzureDevOpsWorkItem {
  id: number;
  rev: number;
  url: string;
  fields: {
    "System.Id": number;
    "System.Title": string;
    "System.Description"?: string;
    "System.State": string;
    "System.WorkItemType": string;
    "System.AssignedTo"?: {
      displayName: string;
      uniqueName: string;
      imageUrl: string;
    };
    "System.CreatedDate": string;
    "System.ChangedDate": string;
    "Microsoft.VSTS.Common.Priority"?: number;
    "Microsoft.VSTS.Scheduling.DueDate"?: string;
    "System.Tags"?: string;
    "System.AreaPath"?: string;
    "System.IterationPath"?: string;
    "System.TeamProject"?: string;
    "System.BoardColumn"?: string;
  };
}

export interface AzureDevOpsWorkItemRef {
  id: number;
  url: string;
}

// Get all projects for an organization
export async function getAzureDevOpsProjects(
  accessToken: string,
  organization: string
): Promise<AzureDevOpsProject[]> {
  const data = await azureDevOpsFetch(
    organization,
    "/_apis/projects?api-version=7.1&$top=100",
    accessToken
  );
  return data.value || [];
}

// Get teams for a project
export async function getProjectTeams(
  accessToken: string,
  organization: string,
  project: string
): Promise<{ id: string; name: string }[]> {
  const data = await azureDevOpsFetch(
    organization,
    `/_apis/projects/${project}/teams?api-version=7.1`,
    accessToken
  );
  return (data.value || []).map((t: any) => ({ id: t.id, name: t.name }));
}

// Get iterations (sprints) for a project team
export async function getTeamIterations(
  accessToken: string,
  organization: string,
  project: string,
  team?: string
): Promise<{ id: string; name: string; path: string; startDate?: string; finishDate?: string; timeFrame?: string }[]> {
  const teamSegment = team ? `/${encodeURIComponent(team)}` : "";
  const data = await azureDevOpsFetch(
    organization,
    `/${project}${teamSegment}/_apis/work/teamsettings/iterations?api-version=7.1`,
    accessToken
  );
  return (data.value || []).map((iter: any) => ({
    id: iter.id,
    name: iter.name,
    path: iter.path,
    startDate: iter.attributes?.startDate,
    finishDate: iter.attributes?.finishDate,
    timeFrame: iter.attributes?.timeFrame,
  }));
}

// Get boards for a project team
export async function getTeamBoards(
  accessToken: string,
  organization: string,
  project: string,
  team?: string
): Promise<{ id: string; name: string }[]> {
  const teamSegment = team ? `/${encodeURIComponent(team)}` : "";
  const data = await azureDevOpsFetch(
    organization,
    `/${project}${teamSegment}/_apis/work/boards?api-version=7.1`,
    accessToken
  );
  return (data.value || []).map((b: any) => ({ id: b.id, name: b.name }));
}

// Get board columns for a specific board
export async function getBoardColumns(
  accessToken: string,
  organization: string,
  project: string,
  team: string,
  boardName: string
): Promise<{ id: string; name: string; itemLimit: number; columnType: string }[]> {
  const data = await azureDevOpsFetch(
    organization,
    `/${project}/${encodeURIComponent(team)}/_apis/work/boards/${encodeURIComponent(boardName)}/columns?api-version=7.1`,
    accessToken
  );
  return (data.value || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    itemLimit: c.itemLimit || 0,
    columnType: c.columnType || "inProgress",
  }));
}

// Get team area path (to filter work items by team)
export async function getTeamSettings(
  accessToken: string,
  organization: string,
  project: string,
  team: string
): Promise<{ defaultIteration?: string; backlogIteration?: string; areaPath?: string }> {
  try {
    const data = await azureDevOpsFetch(
      organization,
      `/${project}/${encodeURIComponent(team)}/_apis/work/teamsettings?api-version=7.1`,
      accessToken
    );
    return {
      defaultIteration: data.defaultIteration?.path,
      backlogIteration: data.backlogIteration?.path,
      areaPath: data.defaultIteration?.path,
    };
  } catch {
    return {};
  }
}

// Get team field values (area paths for the team)
export async function getTeamFieldValues(
  accessToken: string,
  organization: string,
  project: string,
  team: string
): Promise<string[]> {
  try {
    const data = await azureDevOpsFetch(
      organization,
      `/${project}/${encodeURIComponent(team)}/_apis/work/teamsettings/teamfieldvalues?api-version=7.1`,
      accessToken
    );
    return (data.values || []).map((v: any) => v.value);
  } catch {
    return [];
  }
}

// Query work items using WIQL
export async function queryWorkItems(
  accessToken: string,
  organization: string,
  project: string,
  options?: {
    states?: string[];
    workItemTypes?: string[];
    assignedTo?: string;
    iterationPath?: string;
    areaPaths?: string[];
    maxResults?: number;
  }
): Promise<{ workItems: AzureDevOpsWorkItem[]; total: number }> {
  const { states, workItemTypes, assignedTo, iterationPath, areaPaths, maxResults = 50 } = options || {};

  // Sanitize WIQL inputs to prevent injection
  const sanitizeWiql = (val: string) => val.replace(/'/g, "''");

  const conditions: string[] = [`[System.TeamProject] = '${sanitizeWiql(project)}'`];

  if (states && states.length > 0) {
    const stateList = states.map((s) => `'${sanitizeWiql(s)}'`).join(", ");
    conditions.push(`[System.State] IN (${stateList})`);
  }

  if (workItemTypes && workItemTypes.length > 0) {
    const typeList = workItemTypes.map((t) => `'${sanitizeWiql(t)}'`).join(", ");
    conditions.push(`[System.WorkItemType] IN (${typeList})`);
  }

  if (assignedTo) {
    conditions.push(`[System.AssignedTo] = '${sanitizeWiql(assignedTo)}'`);
  }

  if (iterationPath) {
    conditions.push(`[System.IterationPath] UNDER '${sanitizeWiql(iterationPath)}'`);
  }

  if (areaPaths && areaPaths.length > 0) {
    const areaConditions = areaPaths.map((a) => `[System.AreaPath] UNDER '${sanitizeWiql(a)}'`);
    conditions.push(`(${areaConditions.join(" OR ")})`);
  }

  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(" AND ")} ORDER BY [System.ChangedDate] DESC`;

  const queryResult = await azureDevOpsFetch(
    organization,
    `/${project}/_apis/wit/wiql?api-version=7.1&$top=${maxResults}`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ query: wiql }),
    }
  );

  const workItemRefs: AzureDevOpsWorkItemRef[] =
    queryResult.workItems || [];
  if (workItemRefs.length === 0) {
    return { workItems: [], total: 0 };
  }

  // Fetch full work item details in batch (max 200 at a time)
  const ids = workItemRefs.slice(0, maxResults).map((wi) => wi.id);
  const workItems = await getWorkItemsByIds(
    accessToken,
    organization,
    project,
    ids
  );

  return { workItems, total: queryResult.workItems?.length || 0 };
}

// Get work items by IDs
export async function getWorkItemsByIds(
  accessToken: string,
  organization: string,
  project: string,
  ids: number[]
): Promise<AzureDevOpsWorkItem[]> {
  if (ids.length === 0) return [];

  const fields = [
    "System.Id",
    "System.Title",
    "System.Description",
    "System.State",
    "System.WorkItemType",
    "System.AssignedTo",
    "System.CreatedDate",
    "System.ChangedDate",
    "Microsoft.VSTS.Common.Priority",
    "Microsoft.VSTS.Scheduling.DueDate",
    "System.Tags",
    "System.AreaPath",
    "System.IterationPath",
    "System.TeamProject",
    "System.BoardColumn",
  ];

  const data = await azureDevOpsFetch(
    organization,
    `/${project}/_apis/wit/workitems?ids=${ids.join(",")}&fields=${fields.join(",")}&api-version=7.1`,
    accessToken
  );

  return data.value || [];
}

// Get a single work item
export async function getWorkItem(
  accessToken: string,
  organization: string,
  project: string,
  id: number
): Promise<AzureDevOpsWorkItem> {
  const data = await azureDevOpsFetch(
    organization,
    `/${project}/_apis/wit/workitems/${id}?api-version=7.1&$expand=all`,
    accessToken
  );
  return data;
}

// Create a work item
export async function createWorkItem(
  accessToken: string,
  organization: string,
  project: string,
  workItemType: string,
  fields: {
    title: string;
    description?: string;
    state?: string;
    priority?: number;
    assignedTo?: string;
    tags?: string;
    dueDate?: string;
  }
): Promise<AzureDevOpsWorkItem> {
  const patchDocument: any[] = [];

  patchDocument.push({
    op: "add",
    path: "/fields/System.Title",
    value: fields.title,
  });

  if (fields.description) {
    patchDocument.push({
      op: "add",
      path: "/fields/System.Description",
      value: fields.description,
    });
  }

  if (fields.state) {
    patchDocument.push({
      op: "add",
      path: "/fields/System.State",
      value: fields.state,
    });
  }

  if (fields.priority) {
    patchDocument.push({
      op: "add",
      path: "/fields/Microsoft.VSTS.Common.Priority",
      value: fields.priority,
    });
  }

  if (fields.assignedTo) {
    patchDocument.push({
      op: "add",
      path: "/fields/System.AssignedTo",
      value: fields.assignedTo,
    });
  }

  if (fields.tags) {
    patchDocument.push({
      op: "add",
      path: "/fields/System.Tags",
      value: fields.tags,
    });
  }

  if (fields.dueDate) {
    patchDocument.push({
      op: "add",
      path: "/fields/Microsoft.VSTS.Scheduling.DueDate",
      value: fields.dueDate,
    });
  }

  const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=7.1`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuth(accessToken),
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(patchDocument),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create work item: ${errorText}`);
  }

  return response.json();
}

// Update a work item
export async function updateWorkItem(
  accessToken: string,
  organization: string,
  project: string,
  id: number,
  fields: {
    title?: string;
    description?: string;
    state?: string;
    priority?: number;
    assignedTo?: string;
    tags?: string;
    dueDate?: string;
  }
): Promise<AzureDevOpsWorkItem> {
  const patchDocument: any[] = [];

  if (fields.title) {
    patchDocument.push({
      op: "replace",
      path: "/fields/System.Title",
      value: fields.title,
    });
  }

  if (fields.description !== undefined) {
    patchDocument.push({
      op: "replace",
      path: "/fields/System.Description",
      value: fields.description,
    });
  }

  if (fields.state) {
    patchDocument.push({
      op: "replace",
      path: "/fields/System.State",
      value: fields.state,
    });
  }

  if (fields.priority) {
    patchDocument.push({
      op: "replace",
      path: "/fields/Microsoft.VSTS.Common.Priority",
      value: fields.priority,
    });
  }

  if (fields.assignedTo) {
    patchDocument.push({
      op: "replace",
      path: "/fields/System.AssignedTo",
      value: fields.assignedTo,
    });
  }

  if (fields.tags) {
    patchDocument.push({
      op: "replace",
      path: "/fields/System.Tags",
      value: fields.tags,
    });
  }

  const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${id}?api-version=7.1`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: buildBasicAuth(accessToken),
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(patchDocument),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update work item: ${errorText}`);
  }

  return response.json();
}

// Map Azure DevOps state to TaskOS status
export function mapAzureStateToTaskStatus(state: string): string {
  const stateLower = state.toLowerCase();
  if (stateLower === "new" || stateLower === "proposed") return "todo";
  if (stateLower === "active" || stateLower === "committed" || stateLower === "in progress")
    return "in_progress";
  if (stateLower === "resolved" || stateLower === "review") return "review";
  if (stateLower === "closed" || stateLower === "done" || stateLower === "completed" || stateLower === "removed")
    return "done";
  return "backlog";
}

// Map Azure DevOps priority to TaskOS priority
export function mapAzurePriorityToTaskPriority(priority?: number): string {
  if (!priority) return "medium";
  switch (priority) {
    case 1:
      return "urgent";
    case 2:
      return "high";
    case 3:
      return "medium";
    case 4:
      return "low";
    default:
      return "medium";
  }
}

// Map TaskOS priority to Azure DevOps priority (1-4)
export function mapTaskPriorityToAzure(priority: string): number {
  switch (priority) {
    case "urgent":
      return 1;
    case "high":
      return 2;
    case "medium":
      return 3;
    case "low":
      return 4;
    default:
      return 3;
  }
}

// Validate PAT by fetching user profile
export async function validatePat(
  pat: string,
  organization: string
): Promise<{ valid: boolean; displayName?: string; email?: string }> {
  const authHeader = buildBasicAuth(pat);

  // Try projects endpoint first (most reliable)
  try {
    const projectsResponse = await fetch(
      `https://dev.azure.com/${organization}/_apis/projects?api-version=7.1&$top=1`,
      {
        headers: { Authorization: authHeader },
        cache: "no-store",
      }
    );

    if (projectsResponse.status === 401 || projectsResponse.status === 403) {
      return { valid: false };
    }

    if (projectsResponse.status === 404) {
      return { valid: false };
    }

    // Try to get user profile for display name
    let displayName: string | undefined;
    let email: string | undefined;

    try {
      const profileResponse = await fetch(
        `https://dev.azure.com/${organization}/_apis/connectiondata?api-version=7.1`,
        {
          headers: { Authorization: authHeader },
          cache: "no-store",
        }
      );

      if (profileResponse.ok) {
        const data = await profileResponse.json();
        displayName = data.authenticatedUser?.providerDisplayName;
        email = data.authenticatedUser?.properties?.Account?.$value;
      }
    } catch {
      // Profile fetch is non-critical
    }

    if (projectsResponse.ok) {
      return { valid: true, displayName, email };
    }

    // If projects returned something unexpected but not auth error, still valid
    const text = await projectsResponse.text();
    console.log("[Azure DevOps] Unexpected response:", projectsResponse.status, text.substring(0, 200));
    return { valid: projectsResponse.status < 400, displayName, email };
  } catch (err) {
    console.error("[Azure DevOps] Validation error:", err);
    return { valid: false };
  }
}

// Strip HTML tags from description
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
