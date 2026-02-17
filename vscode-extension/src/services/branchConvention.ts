/**
 * Branch Convention – Extension-side copy.
 *
 * IMPORTANT: This file mirrors src/lib/branch-convention.ts on the server.
 * Keep both files in sync when changing core logic.
 * It is intentionally dependency-free so it can run in the extension host.
 */

import * as vscode from 'vscode';

// ─── Types (shared) ─────────────────────────────────────────────────────────

export interface TaskTypeMapping {
  taskType: string;
  gitPrefix: string;
  branchPrefix: string;
}

export interface BranchConventionConfig {
  taskTypeMappings: TaskTypeMapping[];
  branchPattern: string;
  prTitlePattern: string;
  commitPattern: string;
  defaultBaseBranch: string;
  defaultTaskType: string;
}

export interface RenderContext {
  taskTitle: string;
  taskId: string;
  taskType?: string;
  username?: string;
}

export interface RenderedConvention {
  branchName: string;
  prTitle: string;
  commitMessage: string;
  baseBranch: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_BRANCH_CONVENTION: BranchConventionConfig = {
  taskTypeMappings: [
    { taskType: 'feature', gitPrefix: 'feat', branchPrefix: 'feature' },
    { taskType: 'bug', gitPrefix: 'fix', branchPrefix: 'bugfix' },
    { taskType: 'task', gitPrefix: 'chore', branchPrefix: 'task' },
    { taskType: 'hotfix', gitPrefix: 'hotfix', branchPrefix: 'hotfix' },
    { taskType: 'docs', gitPrefix: 'docs', branchPrefix: 'docs' },
    { taskType: 'refactor', gitPrefix: 'refactor', branchPrefix: 'refactor' },
  ],
  branchPattern: '{branchPrefix}/{title}-{id}',
  prTitlePattern: '{gitPrefix}: {title}',
  commitPattern: '{gitPrefix}: {title}',
  defaultBaseBranch: 'main',
  defaultTaskType: 'task',
};

// ─── Core logic (mirrors server) ─────────────────────────────────────────────

export function sanitizeBranchSegment(raw: string, maxLength = 50): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, maxLength);
}

export function resolveMapping(
  config: BranchConventionConfig,
  taskType?: string,
): TaskTypeMapping {
  const key = (taskType || config.defaultTaskType).toLowerCase();
  const found = config.taskTypeMappings.find(m => m.taskType.toLowerCase() === key);
  if (found) { return found; }
  const fallback = config.taskTypeMappings.find(
    m => m.taskType.toLowerCase() === config.defaultTaskType.toLowerCase(),
  );
  return fallback || config.taskTypeMappings[0] || DEFAULT_BRANCH_CONVENTION.taskTypeMappings[2];
}

export function renderPattern(pattern: string, vars: Record<string, string>): string {
  let result = pattern;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(value);
  }
  return result;
}

export function renderConvention(
  config: BranchConventionConfig,
  ctx: RenderContext,
): RenderedConvention {
  const mapping = resolveMapping(config, ctx.taskType);
  const sanitizedTitle = sanitizeBranchSegment(ctx.taskTitle);
  const shortId = ctx.taskId.substring(0, 8);
  const username = ctx.username ? sanitizeBranchSegment(ctx.username, 20) : 'user';

  const vars: Record<string, string> = {
    branchPrefix: mapping.branchPrefix,
    gitPrefix: mapping.gitPrefix,
    title: sanitizedTitle,
    id: shortId,
    taskType: mapping.taskType,
    username,
  };

  return {
    branchName: renderPattern(config.branchPattern, vars),
    prTitle: renderPattern(config.prTitlePattern, vars),
    commitMessage: renderPattern(config.commitPattern, vars),
    baseBranch: config.defaultBaseBranch,
  };
}

// ─── Convention Manager (cache + fetch + fallback) ───────────────────────────

export class BranchConventionManager {
  private cache: Map<string, { config: BranchConventionConfig; fetchedAt: number }> = new Map();
  private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private getApiKey: () => string,
    private getApiUrl: () => string,
  ) {}

  /**
   * Get the convention config for a workspace.
   * 1. Return from cache if fresh.
   * 2. Try fetching from API.
   * 3. Fallback to defaults if API is down.
   */
  async getConfig(workspaceId: string): Promise<BranchConventionConfig> {
    // Check cache
    const cached = this.cache.get(workspaceId);
    if (cached && Date.now() - cached.fetchedAt < BranchConventionManager.CACHE_TTL_MS) {
      return cached.config;
    }

    // Try API
    try {
      const apiKey = this.getApiKey();
      const apiUrl = this.getApiUrl();

      if (!apiKey || !apiUrl) {
        return cached?.config || DEFAULT_BRANCH_CONVENTION;
      }

      const response = await fetch(
        `${apiUrl}/workspaces/${workspaceId}/branch-convention`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (response.ok) {
        const data: any = await response.json();
        const config = data.config as BranchConventionConfig;
        this.cache.set(workspaceId, { config, fetchedAt: Date.now() });
        return config;
      }
    } catch {
      // API unreachable – use stale cache or defaults
    }

    return cached?.config || DEFAULT_BRANCH_CONVENTION;
  }

  /**
   * Render convention for a task. Full flow: fetch config → render.
   */
  async render(
    workspaceId: string,
    ctx: RenderContext,
  ): Promise<RenderedConvention> {
    const config = await this.getConfig(workspaceId);
    return renderConvention(config, ctx);
  }

  /** Clear cached config (e.g. after user changes settings). */
  invalidate(workspaceId?: string) {
    if (workspaceId) {
      this.cache.delete(workspaceId);
    } else {
      this.cache.clear();
    }
  }
}
