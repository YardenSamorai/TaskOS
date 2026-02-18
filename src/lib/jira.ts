// Jira API utility functions

const JIRA_API_BASE = "https://api.atlassian.com/ex/jira";

// Helper to make authenticated Jira API requests
async function jiraFetch(cloudId: string, path: string, accessToken: string, options?: RequestInit) {
  const url = `${JIRA_API_BASE}/${cloudId}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options?.headers,
    },
    cache: "no-store",
  });
  
  if (!response.ok) {
    console.error("[Jira API] Error:", response.status);
    throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrls: {
    "48x48": string;
    "32x32": string;
    "24x24": string;
    "16x16": string;
  };
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: any;
    status: {
      name: string;
      statusCategory: {
        key: string;
        name: string;
      };
    };
    priority?: {
      name: string;
      iconUrl: string;
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      avatarUrls: {
        "48x48": string;
      };
    };
    reporter?: {
      accountId: string;
      displayName: string;
      avatarUrls: {
        "48x48": string;
      };
    };
    created: string;
    updated: string;
    duedate?: string;
    labels: string[];
  };
}

export interface JiraUser {
  accountId: string;
  accountType: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls: {
    "48x48": string;
    "32x32": string;
    "24x24": string;
    "16x16": string;
  };
  active: boolean;
}

// Get all projects for a Jira site
export async function getJiraProjects(
  accessToken: string,
  cloudId: string
): Promise<JiraProject[]> {
  const data = await jiraFetch(cloudId, "/rest/api/3/project/search", accessToken);
  
  return data.values || [];
}

// Get issues for a project
export async function getJiraIssues(
  accessToken: string,
  cloudId: string,
  projectKey: string,
  options?: {
    maxResults?: number;
    startAt?: number;
    status?: string;
    jql?: string;
  }
): Promise<{ issues: JiraIssue[]; total: number }> {
  const { maxResults = 50, startAt = 0, status, jql } = options || {};

  // Build JQL query
  const sanitizeJql = (val: string) => val.replace(/["\\]/g, "");
  let query = jql || `project = ${sanitizeJql(projectKey)}`;
  if (status && !jql) {
    query += ` AND status = "${sanitizeJql(status)}"`;
  }
  
  const url = `${JIRA_API_BASE}/${cloudId}/rest/api/3/search/jql`;
  
  const requestBody: Record<string, unknown> = {
    jql: query,
    maxResults,
    fields: ["summary", "status", "issuetype"],
  };
  
  if (startAt > 0) {
    requestBody.startAt = startAt;
  }
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    cache: "no-store", // Ensure fresh data from Jira
  });

  if (!response.ok) {
    console.error("[Jira API] Error:", response.status);
    throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    issues: data.issues || [],
    total: data.total || 0,
  };
}

// Get a single issue
export async function getJiraIssue(
  accessToken: string,
  cloudId: string,
  issueKey: string
): Promise<JiraIssue> {
  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/issue/${issueKey}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch issue: ${response.statusText}`);
  }

  return response.json();
}

// Create a new issue
export async function createJiraIssue(
  accessToken: string,
  cloudId: string,
  projectKey: string,
  data: {
    summary: string;
    description?: string;
    issueType?: string;
    priority?: string;
    assigneeAccountId?: string;
    labels?: string[];
    duedate?: string;
  }
): Promise<{ id: string; key: string; self: string }> {
  const issueData: any = {
    fields: {
      project: { key: projectKey },
      summary: data.summary,
      issuetype: { name: data.issueType || "Task" },
    },
  };

  if (data.description) {
    // Jira uses Atlassian Document Format (ADF)
    issueData.fields.description = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: data.description }],
        },
      ],
    };
  }

  if (data.priority) {
    issueData.fields.priority = { name: data.priority };
  }

  if (data.assigneeAccountId) {
    issueData.fields.assignee = { accountId: data.assigneeAccountId };
  }

  if (data.labels && data.labels.length > 0) {
    issueData.fields.labels = data.labels;
  }

  if (data.duedate) {
    issueData.fields.duedate = data.duedate;
  }

  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/issue`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(issueData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create issue: ${errorText}`);
  }

  return response.json();
}

// Update an issue
export async function updateJiraIssue(
  accessToken: string,
  cloudId: string,
  issueKey: string,
  data: {
    summary?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeAccountId?: string;
    labels?: string[];
    duedate?: string;
  }
): Promise<void> {
  const updateData: any = { fields: {} };

  if (data.summary) {
    updateData.fields.summary = data.summary;
  }

  if (data.description) {
    updateData.fields.description = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: data.description }],
        },
      ],
    };
  }

  if (data.priority) {
    updateData.fields.priority = { name: data.priority };
  }

  if (data.assigneeAccountId) {
    updateData.fields.assignee = { accountId: data.assigneeAccountId };
  }

  if (data.labels) {
    updateData.fields.labels = data.labels;
  }

  if (data.duedate) {
    updateData.fields.duedate = data.duedate;
  }

  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/issue/${issueKey}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update issue: ${errorText}`);
  }
}

// Transition an issue (change status)
export async function transitionJiraIssue(
  accessToken: string,
  cloudId: string,
  issueKey: string,
  transitionId: string
): Promise<void> {
  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transition: { id: transitionId },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to transition issue: ${errorText}`);
  }
}

// Get available transitions for an issue
export async function getJiraIssueTransitions(
  accessToken: string,
  cloudId: string,
  issueKey: string
): Promise<{ id: string; name: string; to: { name: string } }[]> {
  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/issue/${issueKey}/transitions`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch transitions: ${response.statusText}`);
  }

  const data = await response.json();
  return data.transitions || [];
}

// Get current user
export async function getJiraCurrentUser(
  accessToken: string,
  cloudId: string
): Promise<JiraUser> {
  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/myself`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

// Search users in a project
export async function searchJiraUsers(
  accessToken: string,
  cloudId: string,
  query: string,
  projectKey?: string
): Promise<JiraUser[]> {
  const params = new URLSearchParams({
    query,
    maxResults: "50",
  });

  if (projectKey) {
    params.set("project", projectKey);
  }

  const response = await fetch(
    `${JIRA_API_BASE}/${cloudId}/rest/api/3/user/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to search users: ${response.statusText}`);
  }

  return response.json();
}

// Map Jira status to TaskOS status
export function mapJiraStatusToTaskStatus(jiraStatus: string, categoryKey: string): string {
  // Use status category for mapping
  switch (categoryKey) {
    case "new":
      return "todo";
    case "indeterminate":
      return "in_progress";
    case "done":
      return "done";
    default:
      // Fallback to status name
      const statusLower = jiraStatus.toLowerCase();
      if (statusLower.includes("done") || statusLower.includes("closed") || statusLower.includes("resolved")) {
        return "done";
      }
      if (statusLower.includes("progress") || statusLower.includes("review")) {
        return "in_progress";
      }
      if (statusLower.includes("backlog")) {
        return "backlog";
      }
      return "todo";
  }
}

// Map Jira priority to TaskOS priority
export function mapJiraPriorityToTaskPriority(jiraPriority?: string): string {
  if (!jiraPriority) return "medium";
  
  const priorityLower = jiraPriority.toLowerCase();
  if (priorityLower.includes("highest") || priorityLower.includes("blocker")) {
    return "urgent";
  }
  if (priorityLower.includes("high")) {
    return "high";
  }
  if (priorityLower.includes("low") || priorityLower.includes("lowest")) {
    return "low";
  }
  return "medium";
}
