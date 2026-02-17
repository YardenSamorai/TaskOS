import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  BranchConventionManager,
  renderConvention,
  DEFAULT_BRANCH_CONVENTION,
  type BranchConventionConfig,
  type RenderContext,
  type RenderedConvention,
} from './branchConvention';

const execAsync = promisify(exec);

export class GitService {
  private workspacePath: string;
  private conventionManager: BranchConventionManager;

  constructor() {
    const folders = vscode.workspace.workspaceFolders;
    this.workspacePath = folders?.[0]?.uri.fsPath || '';

    this.conventionManager = new BranchConventionManager(
      () => vscode.workspace.getConfiguration('taskos').get<string>('apiKey') || '',
      () => vscode.workspace.getConfiguration('taskos').get<string>('apiUrl') || '',
    );
  }

  private async runGit(command: string): Promise<string> {
    if (!this.workspacePath) {
      throw new Error('No workspace folder found');
    }
    try {
      const { stdout } = await execAsync(`git ${command}`, { 
        cwd: this.workspacePath,
        timeout: 30000 
      });
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`Git error: ${error.stderr || error.message}`);
    }
  }

  /** Public wrapper around runGit for commands called from outside. */
  async runGitPublic(command: string): Promise<string> {
    return this.runGit(command);
  }

  /**
   * Check if we're in a git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.runGit('rev-parse --is-inside-work-tree');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  async getCurrentBranch(): Promise<string> {
    return await this.runGit('branch --show-current');
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.runGit('status --porcelain');
    return status.length > 0;
  }

  /**
   * Create a new branch for a task using the workspace convention.
   */
  async createTaskBranch(
    taskId: string,
    taskTitle: string,
    workspaceId?: string,
    taskType?: string,
  ): Promise<string> {
    const rendered = await this.renderForTask(workspaceId, {
      taskTitle,
      taskId,
      taskType,
    });

    const branchName = rendered.branchName;

    // Check if branch already exists
    try {
      const branches = await this.runGit('branch --list');
      if (branches.includes(branchName)) {
        await this.runGit(`checkout ${branchName}`);
        return branchName;
      }
    } catch {
      // ignore
    }

    // Create and checkout new branch
    await this.runGit(`checkout -b ${branchName}`);
    return branchName;
  }

  /**
   * Get a diff summary of changes
   */
  async getDiffSummary(): Promise<string> {
    try {
      const staged = await this.runGit('diff --cached --stat');
      const unstaged = await this.runGit('diff --stat');
      const untracked = await this.runGit('ls-files --others --exclude-standard');
      
      let summary = '';
      if (staged) { summary += `Staged:\n${staged}\n`; }
      if (unstaged) { summary += `Modified:\n${unstaged}\n`; }
      if (untracked) { summary += `New files:\n${untracked}\n`; }
      
      return summary || 'No changes detected.';
    } catch {
      return 'Unable to get diff summary.';
    }
  }

  /**
   * Get full diff against the default branch (for pipeline review)
   */
  async getFullDiff(): Promise<string> {
    try {
      const defaultBranch = await this.getDefaultBranch();
      // First try: diff against default branch
      try {
        return await this.runGit(`diff ${defaultBranch}...HEAD`);
      } catch {
        // Fallback: diff of all uncommitted + staged changes
        const staged = await this.runGit('diff --cached');
        const unstaged = await this.runGit('diff');
        return [staged, unstaged].filter(Boolean).join('\n');
      }
    } catch {
      return '';
    }
  }

  /**
   * Get list of changed files (relative to default branch)
   */
  async getChangedFiles(): Promise<string[]> {
    try {
      const defaultBranch = await this.getDefaultBranch();
      try {
        const output = await this.runGit(`diff --name-only ${defaultBranch}...HEAD`);
        return output.split('\n').filter(Boolean);
      } catch {
        const staged = await this.runGit('diff --cached --name-only');
        const unstaged = await this.runGit('diff --name-only');
        const untracked = await this.runGit('ls-files --others --exclude-standard');
        const all = [staged, unstaged, untracked].join('\n');
        return [...new Set(all.split('\n').filter(Boolean))];
      }
    } catch {
      return [];
    }
  }

  /**
   * Stage all changes, commit, and push.
   * Uses the workspace convention for the commit message if no custom message given.
   */
  async commitAndPush(
    taskId: string,
    taskTitle: string,
    message?: string,
    workspaceId?: string,
    taskType?: string,
  ): Promise<{ branch: string; commitHash: string }> {
    let commitMsg = message;
    if (!commitMsg) {
      const rendered = await this.renderForTask(workspaceId, {
        taskTitle,
        taskId,
        taskType,
      });
      commitMsg = `${rendered.commitMessage}\n\nTaskOS Task: ${taskId}`;
    }

    await this.runGit('add -A');
    await this.runGit(`commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    
    const branch = await this.getCurrentBranch();
    
    try {
      await this.runGit(`push -u origin ${branch}`);
    } catch {
      await this.runGit(`push origin ${branch}`);
    }
    
    const commitHash = await this.runGit('rev-parse --short HEAD');
    
    return { branch, commitHash };
  }

  /**
   * Get the GitHub remote URL
   */
  async getRemoteUrl(): Promise<string | null> {
    try {
      const url = await this.runGit('remote get-url origin');
      return url;
    } catch {
      return null;
    }
  }

  /**
   * Parse GitHub owner/repo from remote URL
   */
  async getGitHubRepo(): Promise<{ owner: string; repo: string } | null> {
    const url = await this.getRemoteUrl();
    if (!url) { return null; }
    
    // Handle HTTPS: https://github.com/owner/repo.git
    let match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    
    return null;
  }

  /**
   * Get the default branch (main or master)
   */
  async getDefaultBranch(): Promise<string> {
    try {
      // Try to detect from remote
      const output = await this.runGit('remote show origin');
      const match = output.match(/HEAD branch:\s*(\S+)/);
      if (match) { return match[1]; }
    } catch {
      // ignore
    }
    
    // Fallback: check if main or master exists
    try {
      await this.runGit('rev-parse --verify main');
      return 'main';
    } catch {
      return 'master';
    }
  }

  /**
   * Create a PR using gh CLI or generate a URL.
   * Uses the workspace convention for the PR title and base branch.
   */
  async createPullRequest(
    taskId: string,
    taskTitle: string,
    description: string,
    customBody?: string,
    workspaceId?: string,
    taskType?: string,
  ): Promise<string> {
    const githubRepo = await this.getGitHubRepo();
    const currentBranch = await this.getCurrentBranch();

    if (!githubRepo) {
      throw new Error('Could not detect GitHub repository from remote URL');
    }

    const rendered = await this.renderForTask(workspaceId, {
      taskTitle,
      taskId,
      taskType,
    });

    const prTitle = rendered.prTitle;
    const baseBranch = rendered.baseBranch || await this.getDefaultBranch();
    const prBody = customBody || `## TaskOS Task\n\n**Task:** ${taskTitle}\n**Task ID:** ${taskId}\n\n---\n\n${description}\n\n---\n*Created via [TaskOS](https://www.task-os.app) VS Code Extension*`;

    // Try gh CLI first
    try {
      await this.runGit(`-c core.editor=true`);
      const prUrl = await execAsync(
        `gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body "${prBody.replace(/"/g, '\\"')}" --base ${baseBranch}`,
        { cwd: this.workspacePath, timeout: 30000 }
      );
      return prUrl.stdout.trim();
    } catch {
      // Fallback: Generate GitHub PR URL
      const prUrl = `https://github.com/${githubRepo.owner}/${githubRepo.repo}/compare/${baseBranch}...${currentBranch}?expand=1&title=${encodeURIComponent(prTitle)}&body=${encodeURIComponent(prBody)}`;
      return prUrl;
    }
  }

  // ─── Convention helpers ──────────────────────────────────────────────────

  /**
   * Render convention for a task. Fetches config from API (with cache + fallback).
   */
  async renderForTask(
    workspaceId: string | undefined,
    ctx: Omit<RenderContext, 'username'>,
  ): Promise<RenderedConvention> {
    const username = await this.getGitUsername();

    if (workspaceId) {
      return this.conventionManager.render(workspaceId, { ...ctx, username });
    }

    // No workspace ID – use defaults
    return renderConvention(DEFAULT_BRANCH_CONVENTION, { ...ctx, username });
  }

  /** Get the git user.name for placeholder rendering. */
  private async getGitUsername(): Promise<string> {
    try {
      return await this.runGit('config user.name');
    } catch {
      return 'user';
    }
  }
}
