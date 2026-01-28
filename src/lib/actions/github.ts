"use server";

import { db } from "@/lib/db";
import { 
  integrations, 
  linkedRepositories, 
  tasks, 
  workspaceMembers,
  LinkedRepository 
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/permissions";
import {
  getGitHubToken,
  getUserRepositories,
  getRepositoryIssues,
  getRepositoryCommits,
  getRepositoryPullRequests,
  createIssue,
  updateIssue,
  GitHubRepo,
  GitHubIssue,
  GitHubCommit,
  GitHubPullRequest,
} from "@/lib/github";

// ============== REPOSITORIES ==============

export async function fetchUserRepositories() {
  try {
    const user = await getCurrentUser();
    const token = await getGitHubToken(user.id);

    if (!token) {
      return { success: false, error: "GitHub not connected", repositories: [] };
    }

    const repos = await getUserRepositories(token);
    
    return { success: true, repositories: repos };
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return { success: false, error: "Failed to fetch repositories", repositories: [] };
  }
}

export async function getLinkedRepositoriesForWorkspace(workspaceId: string) {
  try {
    const user = await getCurrentUser();

    const repos = await db.query.linkedRepositories.findMany({
      where: eq(linkedRepositories.workspaceId, workspaceId),
      with: {
        integration: true,
      },
      orderBy: [desc(linkedRepositories.createdAt)],
    });

    return { success: true, repositories: repos };
  } catch (error) {
    console.error("Error getting linked repositories:", error);
    return { success: false, repositories: [] };
  }
}

export async function linkRepositoryToWorkspace(data: {
  workspaceId: string;
  repository: GitHubRepo;
}) {
  try {
    const user = await getCurrentUser();
    
    // Get user's GitHub integration
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.userId, user.id),
        eq(integrations.provider, "github"),
        eq(integrations.isActive, true)
      ),
    });

    if (!integration) {
      return { success: false, error: "GitHub not connected" };
    }

    // Check if already linked
    const existing = await db.query.linkedRepositories.findFirst({
      where: and(
        eq(linkedRepositories.workspaceId, data.workspaceId),
        eq(linkedRepositories.externalId, data.repository.id.toString())
      ),
    });

    if (existing) {
      return { success: false, error: "Repository already linked" };
    }

    // Link the repository
    const [repo] = await db.insert(linkedRepositories).values({
      integrationId: integration.id,
      workspaceId: data.workspaceId,
      externalId: data.repository.id.toString(),
      name: data.repository.name,
      fullName: data.repository.full_name,
      url: data.repository.html_url,
      defaultBranch: data.repository.default_branch,
      isPrivate: data.repository.private,
    }).returning();

    revalidatePath(`/app/${data.workspaceId}`);
    return { success: true, repository: repo };
  } catch (error) {
    console.error("Error linking repository:", error);
    return { success: false, error: "Failed to link repository" };
  }
}

export async function unlinkRepository(repositoryId: string) {
  try {
    const user = await getCurrentUser();

    const repo = await db.query.linkedRepositories.findFirst({
      where: eq(linkedRepositories.id, repositoryId),
      with: { integration: true },
    });

    if (!repo || repo.integration.userId !== user.id) {
      return { success: false, error: "Repository not found" };
    }

    await db.delete(linkedRepositories).where(eq(linkedRepositories.id, repositoryId));

    revalidatePath(`/app/${repo.workspaceId}`);
    return { success: true };
  } catch (error) {
    console.error("Error unlinking repository:", error);
    return { success: false, error: "Failed to unlink repository" };
  }
}

// ============== ISSUES ==============

export async function fetchRepositoryIssues(
  workspaceId: string,
  repositoryId: string,
  state: "open" | "closed" | "all" = "open"
) {
  try {
    const user = await getCurrentUser();
    const token = await getGitHubToken(user.id);

    if (!token) {
      return { success: false, error: "GitHub not connected", issues: [] };
    }

    const repo = await db.query.linkedRepositories.findFirst({
      where: eq(linkedRepositories.id, repositoryId),
    });

    if (!repo || !repo.fullName) {
      return { success: false, error: "Repository not found", issues: [] };
    }

    const [owner, repoName] = repo.fullName.split("/");
    const issues = await getRepositoryIssues(token, owner, repoName, state);

    // Filter out pull requests (GitHub API returns PRs as issues too)
    const actualIssues = issues.filter(issue => !("pull_request" in issue));

    return { success: true, issues: actualIssues };
  } catch (error) {
    console.error("Error fetching issues:", error);
    return { success: false, error: "Failed to fetch issues", issues: [] };
  }
}

export async function importIssuesAsTasks(data: {
  workspaceId: string;
  repositoryId: string;
  issueIds: number[];
}) {
  try {
    const user = await getCurrentUser();
    const token = await getGitHubToken(user.id);

    if (!token) {
      return { success: false, error: "GitHub not connected" };
    }

    const repo = await db.query.linkedRepositories.findFirst({
      where: eq(linkedRepositories.id, data.repositoryId),
    });

    if (!repo || !repo.fullName) {
      return { success: false, error: "Repository not found" };
    }

    const [owner, repoName] = repo.fullName.split("/");
    const allIssues = await getRepositoryIssues(token, owner, repoName, "all");
    const selectedIssues = allIssues.filter(issue => data.issueIds.includes(issue.id));

    const createdTasks = [];

    for (const issue of selectedIssues) {
      // Map GitHub issue state to task status
      const status = issue.state === "closed" ? "done" : "todo";
      
      // Map labels to priority
      let priority: "low" | "medium" | "high" | "urgent" = "medium";
      const priorityLabel = issue.labels.find(l => 
        ["urgent", "high", "medium", "low"].includes(l.name.toLowerCase())
      );
      if (priorityLabel) {
        priority = priorityLabel.name.toLowerCase() as typeof priority;
      }

      const [task] = await db.insert(tasks).values({
        workspaceId: data.workspaceId,
        title: issue.title,
        description: issue.body || "",
        status,
        priority,
        creatorId: user.id,
        dueDate: issue.milestone?.due_on ? new Date(issue.milestone.due_on) : null,
        // Store GitHub reference in metadata
        metadata: JSON.stringify({
          github: {
            issueId: issue.id,
            issueNumber: issue.number,
            issueUrl: issue.html_url,
            repositoryId: data.repositoryId,
            repositoryFullName: repo.fullName,
          }
        }),
      }).returning();

      createdTasks.push(task);
    }

    revalidatePath(`/app/${data.workspaceId}`);
    return { success: true, tasks: createdTasks, count: createdTasks.length };
  } catch (error) {
    console.error("Error importing issues:", error);
    return { success: false, error: "Failed to import issues" };
  }
}

export async function createTaskFromIssue(data: {
  workspaceId: string;
  repositoryId: string;
  issue: GitHubIssue;
}) {
  return importIssuesAsTasks({
    workspaceId: data.workspaceId,
    repositoryId: data.repositoryId,
    issueIds: [data.issue.id],
  });
}

export async function syncTaskToGitHub(taskId: string) {
  try {
    const user = await getCurrentUser();
    const token = await getGitHubToken(user.id);

    if (!token) {
      return { success: false, error: "GitHub not connected" };
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // Parse metadata to get GitHub info
    const metadata = task.metadata ? JSON.parse(task.metadata as string) : {};
    
    if (!metadata.github?.issueNumber || !metadata.github?.repositoryFullName) {
      return { success: false, error: "Task is not linked to a GitHub issue" };
    }

    const [owner, repoName] = metadata.github.repositoryFullName.split("/");
    
    // Update the GitHub issue
    await updateIssue(token, owner, repoName, metadata.github.issueNumber, {
      title: task.title,
      body: task.description || undefined,
      state: task.status === "done" ? "closed" : "open",
    });

    return { success: true };
  } catch (error) {
    console.error("Error syncing task to GitHub:", error);
    return { success: false, error: "Failed to sync task to GitHub" };
  }
}

export async function createGitHubIssueFromTask(data: {
  taskId: string;
  repositoryId: string;
}) {
  try {
    const user = await getCurrentUser();
    const token = await getGitHubToken(user.id);

    if (!token) {
      return { success: false, error: "GitHub not connected" };
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, data.taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const repo = await db.query.linkedRepositories.findFirst({
      where: eq(linkedRepositories.id, data.repositoryId),
    });

    if (!repo || !repo.fullName) {
      return { success: false, error: "Repository not found" };
    }

    const [owner, repoName] = repo.fullName.split("/");

    // Create issue on GitHub
    const issue = await createIssue(token, owner, repoName, {
      title: task.title,
      body: task.description || `Created from TaskOS task: ${task.id}`,
      labels: [task.priority],
    });

    // Update task metadata with GitHub reference
    const existingMetadata = task.metadata ? JSON.parse(task.metadata as string) : {};
    await db.update(tasks).set({
      metadata: JSON.stringify({
        ...existingMetadata,
        github: {
          issueId: issue.id,
          issueNumber: issue.number,
          issueUrl: issue.html_url,
          repositoryId: data.repositoryId,
          repositoryFullName: repo.fullName,
        }
      }),
      updatedAt: new Date(),
    }).where(eq(tasks.id, data.taskId));

    revalidatePath(`/app/${task.workspaceId}`);
    return { success: true, issue };
  } catch (error) {
    console.error("Error creating GitHub issue:", error);
    return { success: false, error: "Failed to create GitHub issue" };
  }
}

// ============== COMMITS & PRs ==============

export async function fetchCommitsForTask(taskId: string) {
  try {
    const user = await getCurrentUser();
    const token = await getGitHubToken(user.id);

    if (!token) {
      return { success: false, error: "GitHub not connected", commits: [] };
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found", commits: [] };
    }

    const metadata = task.metadata ? JSON.parse(task.metadata as string) : {};
    
    if (!metadata.github?.repositoryFullName) {
      // If task is not linked, try to find commits mentioning the task ID
      return { success: true, commits: [] };
    }

    const [owner, repoName] = metadata.github.repositoryFullName.split("/");
    
    // Get recent commits and filter for ones mentioning this task
    const allCommits = await getRepositoryCommits(token, owner, repoName, { per_page: 100 });
    
    // Search for commits mentioning the task ID or issue number
    const relevantCommits = allCommits.filter(commit => {
      const message = commit.commit.message.toLowerCase();
      const taskIdShort = taskId.slice(0, 8).toLowerCase();
      const issueNumber = metadata.github?.issueNumber;
      
      return message.includes(taskIdShort) || 
             message.includes(`#${issueNumber}`) ||
             message.includes(`task-${taskIdShort}`);
    });

    return { success: true, commits: relevantCommits };
  } catch (error) {
    console.error("Error fetching commits:", error);
    return { success: false, error: "Failed to fetch commits", commits: [] };
  }
}

export async function fetchPullRequestsForTask(taskId: string) {
  try {
    const user = await getCurrentUser();
    const token = await getGitHubToken(user.id);

    if (!token) {
      return { success: false, error: "GitHub not connected", pullRequests: [] };
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return { success: false, error: "Task not found", pullRequests: [] };
    }

    const metadata = task.metadata ? JSON.parse(task.metadata as string) : {};
    
    if (!metadata.github?.repositoryFullName) {
      return { success: true, pullRequests: [] };
    }

    const [owner, repoName] = metadata.github.repositoryFullName.split("/");
    
    // Get PRs and filter for ones related to this task
    const allPRs = await getRepositoryPullRequests(token, owner, repoName, "all");
    
    const relevantPRs = allPRs.filter(pr => {
      const title = pr.title.toLowerCase();
      const body = (pr.body || "").toLowerCase();
      const branch = pr.head.ref.toLowerCase();
      const taskIdShort = taskId.slice(0, 8).toLowerCase();
      const issueNumber = metadata.github?.issueNumber;
      
      return title.includes(taskIdShort) ||
             body.includes(taskIdShort) ||
             branch.includes(taskIdShort) ||
             title.includes(`#${issueNumber}`) ||
             body.includes(`#${issueNumber}`) ||
             body.includes(`closes #${issueNumber}`) ||
             body.includes(`fixes #${issueNumber}`);
    });

    return { success: true, pullRequests: relevantPRs };
  } catch (error) {
    console.error("Error fetching pull requests:", error);
    return { success: false, error: "Failed to fetch pull requests", pullRequests: [] };
  }
}

export async function fetchRecentActivityForWorkspace(workspaceId: string) {
  try {
    const user = await getCurrentUser();
    const token = await getGitHubToken(user.id);

    if (!token) {
      return { success: false, error: "GitHub not connected", activity: [] };
    }

    // Get linked repositories for this workspace
    const repos = await db.query.linkedRepositories.findMany({
      where: eq(linkedRepositories.workspaceId, workspaceId),
    });

    if (repos.length === 0) {
      return { success: true, activity: [] };
    }

    const activity: Array<{
      type: "commit" | "pr" | "issue";
      repo: string;
      data: GitHubCommit | GitHubPullRequest | GitHubIssue;
      timestamp: string;
    }> = [];

    // Fetch recent activity from each repo
    for (const repo of repos.slice(0, 5)) { // Limit to 5 repos to avoid rate limits
      if (!repo.fullName) continue;
      
      const [owner, repoName] = repo.fullName.split("/");
      
      try {
        // Get recent commits
        const commits = await getRepositoryCommits(token, owner, repoName, { per_page: 5 });
        commits.forEach(commit => {
          activity.push({
            type: "commit",
            repo: repo.fullName!,
            data: commit,
            timestamp: commit.commit.author.date,
          });
        });

        // Get recent PRs
        const prs = await getRepositoryPullRequests(token, owner, repoName, "all");
        prs.slice(0, 5).forEach(pr => {
          activity.push({
            type: "pr",
            repo: repo.fullName!,
            data: pr,
            timestamp: pr.updated_at,
          });
        });
      } catch (error) {
        console.error(`Error fetching activity for ${repo.fullName}:`, error);
      }
    }

    // Sort by timestamp
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { success: true, activity: activity.slice(0, 20) };
  } catch (error) {
    console.error("Error fetching workspace activity:", error);
    return { success: false, error: "Failed to fetch activity", activity: [] };
  }
}
