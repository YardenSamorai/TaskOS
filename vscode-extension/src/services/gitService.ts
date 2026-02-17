import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitService {
  private workspacePath: string;

  constructor() {
    const folders = vscode.workspace.workspaceFolders;
    this.workspacePath = folders?.[0]?.uri.fsPath || '';
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
   * Create a new branch for a task
   */
  async createTaskBranch(taskId: string, taskTitle: string): Promise<string> {
    // Sanitize branch name
    const sanitized = taskTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    const branchName = `taskos/${sanitized}-${taskId.substring(0, 8)}`;

    // Check if branch already exists
    try {
      const branches = await this.runGit('branch --list');
      if (branches.includes(branchName)) {
        // Switch to existing branch
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
   * Stage all changes, commit, and push
   */
  async commitAndPush(taskId: string, taskTitle: string, message?: string): Promise<{ branch: string; commitHash: string }> {
    const commitMsg = message || `feat: ${taskTitle}\n\nTaskOS Task: ${taskId}`;
    
    await this.runGit('add -A');
    await this.runGit(`commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    
    const branch = await this.getCurrentBranch();
    
    // Push to remote (set upstream if needed)
    try {
      await this.runGit(`push -u origin ${branch}`);
    } catch {
      // Try without -u flag
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
   * Create a PR using gh CLI or generate a URL
   */
  async createPullRequest(taskId: string, taskTitle: string, description: string, customBody?: string): Promise<string> {
    const githubRepo = await this.getGitHubRepo();
    const currentBranch = await this.getCurrentBranch();
    const defaultBranch = await this.getDefaultBranch();
    
    if (!githubRepo) {
      throw new Error('Could not detect GitHub repository from remote URL');
    }
    
    const prTitle = `feat: ${taskTitle}`;
    const prBody = customBody || `## TaskOS Task\n\n**Task:** ${taskTitle}\n**Task ID:** ${taskId}\n\n---\n\n${description}\n\n---\n*Created via [TaskOS](https://www.task-os.app) VS Code Extension* 🤖`;
    
    // Try gh CLI first
    try {
      const result = await this.runGit(`-c core.editor=true`); // just check git works
      const prUrl = await execAsync(
        `gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body "${prBody.replace(/"/g, '\\"')}" --base ${defaultBranch}`,
        { cwd: this.workspacePath, timeout: 30000 }
      );
      return prUrl.stdout.trim();
    } catch {
      // Fallback: Generate GitHub PR URL
      const prUrl = `https://github.com/${githubRepo.owner}/${githubRepo.repo}/compare/${defaultBranch}...${currentBranch}?expand=1&title=${encodeURIComponent(prTitle)}&body=${encodeURIComponent(prBody)}`;
      return prUrl;
    }
  }
}
