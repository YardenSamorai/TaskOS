// GitHub API utility functions

import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const GITHUB_API_BASE = "https://api.github.com";

// Types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  milestone: {
    title: string;
    due_on: string | null;
  } | null;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  draft: boolean;
  mergeable_state?: string;
}

// Get user's GitHub access token
export async function getGitHubToken(userId: string): Promise<string | null> {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, userId),
      eq(integrations.provider, "github"),
      eq(integrations.isActive, true)
    ),
  });

  return integration?.accessToken || null;
}

// GitHub API request helper
async function githubRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  return response.json();
}

// ============== REPOSITORIES ==============

export async function getUserRepositories(token: string): Promise<GitHubRepo[]> {
  // Get all repos the user has access to (including org repos)
  const repos = await githubRequest<GitHubRepo[]>(
    "/user/repos?per_page=100&sort=pushed&direction=desc",
    token
  );
  return repos;
}

export async function getRepository(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubRepo> {
  return githubRequest<GitHubRepo>(`/repos/${owner}/${repo}`, token);
}

// ============== ISSUES ==============

export async function getRepositoryIssues(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<GitHubIssue[]> {
  return githubRequest<GitHubIssue[]>(
    `/repos/${owner}/${repo}/issues?state=${state}&per_page=100&sort=updated&direction=desc`,
    token
  );
}

export async function getIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return githubRequest<GitHubIssue>(
    `/repos/${owner}/${repo}/issues/${issueNumber}`,
    token
  );
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  data: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }
): Promise<GitHubIssue> {
  return githubRequest<GitHubIssue>(
    `/repos/${owner}/${repo}/issues`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
}

export async function updateIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  data: {
    title?: string;
    body?: string;
    state?: "open" | "closed";
    labels?: string[];
    assignees?: string[];
  }
): Promise<GitHubIssue> {
  return githubRequest<GitHubIssue>(
    `/repos/${owner}/${repo}/issues/${issueNumber}`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
}

// ============== COMMITS ==============

export async function getRepositoryCommits(
  token: string,
  owner: string,
  repo: string,
  options: {
    sha?: string;
    path?: string;
    since?: string;
    until?: string;
    per_page?: number;
  } = {}
): Promise<GitHubCommit[]> {
  const params = new URLSearchParams();
  if (options.sha) params.set("sha", options.sha);
  if (options.path) params.set("path", options.path);
  if (options.since) params.set("since", options.since);
  if (options.until) params.set("until", options.until);
  params.set("per_page", String(options.per_page || 30));

  return githubRequest<GitHubCommit[]>(
    `/repos/${owner}/${repo}/commits?${params.toString()}`,
    token
  );
}

// Search commits by message (to find task references)
export async function searchCommitsByMessage(
  token: string,
  owner: string,
  repo: string,
  query: string
): Promise<GitHubCommit[]> {
  // GitHub doesn't have a direct commit message search, so we fetch recent commits
  // and filter client-side
  const commits = await getRepositoryCommits(token, owner, repo, { per_page: 100 });
  return commits.filter(c => 
    c.commit.message.toLowerCase().includes(query.toLowerCase())
  );
}

// ============== PULL REQUESTS ==============

export async function getRepositoryPullRequests(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<GitHubPullRequest[]> {
  return githubRequest<GitHubPullRequest[]>(
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=100&sort=updated&direction=desc`,
    token
  );
}

export async function getPullRequest(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPullRequest> {
  return githubRequest<GitHubPullRequest>(
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
    token
  );
}

export async function getPullRequestCommits(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubCommit[]> {
  return githubRequest<GitHubCommit[]>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/commits`,
    token
  );
}

// ============== BRANCHES ==============

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export async function getRepositoryBranches(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  return githubRequest<GitHubBranch[]>(
    `/repos/${owner}/${repo}/branches?per_page=100`,
    token
  );
}

// ============== LABELS ==============

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export async function getRepositoryLabels(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubLabel[]> {
  return githubRequest<GitHubLabel[]>(
    `/repos/${owner}/${repo}/labels?per_page=100`,
    token
  );
}

// ============== WEBHOOKS ==============

export interface GitHubWebhook {
  id: number;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url: string;
    content_type: string;
  };
}

export async function createWebhook(
  token: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  events: string[] = ["issues", "pull_request", "push"]
): Promise<GitHubWebhook> {
  return githubRequest<GitHubWebhook>(
    `/repos/${owner}/${repo}/hooks`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "web",
        active: true,
        events,
        config: {
          url: webhookUrl,
          content_type: "json",
        },
      }),
    }
  );
}

export async function deleteWebhook(
  token: string,
  owner: string,
  repo: string,
  hookId: number
): Promise<void> {
  await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/hooks/${hookId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
    },
  });
}
