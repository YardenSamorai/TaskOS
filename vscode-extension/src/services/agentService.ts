import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Task, TaskOSApiClient } from '../api/client';
import { GitService } from './gitService';
import { CodeStyleProfile, CodeReviewProfile } from '../profiles/types';
import {
  BranchConventionManager,
  renderConvention,
  DEFAULT_BRANCH_CONVENTION,
} from './branchConvention';

export interface TaskContextFile {
  taskId: string;
  workspaceId: string;
  baseUrl: string;
  title: string;
  branchName?: string;
  sentAt: string;
}

export class AgentService {
  private gitService: GitService;
  private conventionManager: BranchConventionManager;

  constructor() {
    this.gitService = new GitService();
    this.conventionManager = new BranchConventionManager(
      () => vscode.workspace.getConfiguration('taskos').get<string>('apiKey') || '',
      () => vscode.workspace.getConfiguration('taskos').get<string>('apiUrl') || '',
    );
  }

  generatePrompt(task: Task): string {
    return this.generateEnhancedPrompt(task);
  }

  generateEnhancedPrompt(
    task: Task,
    styleProfile?: CodeStyleProfile,
    reviewProfile?: CodeReviewProfile
  ): string {
    const lines: string[] = [];

    lines.push(`# Task: ${task.title}`);
    lines.push('');

    if (task.description) {
      lines.push('## Description');
      lines.push(task.description);
      lines.push('');
    }

    lines.push(`## Context`);
    lines.push(`- **Priority:** ${task.priority.toUpperCase()}`);
    lines.push(`- **Status:** ${task.status.replace('_', ' ')}`);
    lines.push(`- **Task ID:** \`${task.id}\``);
    if (task.dueDate) {
      lines.push(`- **Due Date:** ${new Date(task.dueDate).toLocaleDateString()}`);
    }
    lines.push('');

    if (task.steps && task.steps.length > 0) {
      lines.push('## Requirements / Checklist');
      task.steps
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach((step, index) => {
          const checkbox = step.completed ? '✅' : '☐';
          lines.push(`${index + 1}. ${checkbox} ${step.content} (stepId: \`${step.id}\`)`);
        });
      lines.push('');

      const incomplete = task.steps.filter(s => !s.completed);
      if (incomplete.length > 0) {
        lines.push(`> Focus on the ${incomplete.length} incomplete item(s) above.`);
        lines.push('');
      }
    }

    if (task.tags && task.tags.length > 0) {
      lines.push(`## Tags`);
      lines.push(task.tags.map(t => `\`${t.name}\``).join(', '));
      lines.push('');
    }

    if (styleProfile) {
      lines.push('## Code Style Requirements (MANDATORY)');
      lines.push('');

      if (styleProfile.language_stack.length > 0) {
        lines.push(`**Tech Stack:** ${styleProfile.language_stack.join(', ')}`);
        lines.push('');
      }

      if (styleProfile.patterns_preferred.length > 0) {
        lines.push('**Required Design Patterns:**');
        styleProfile.patterns_preferred.forEach(p => lines.push(`- Use ${p}`));
        lines.push('');
      }

      if (styleProfile.patterns_avoid.length > 0) {
        lines.push('**Patterns to AVOID:**');
        styleProfile.patterns_avoid.forEach(p => lines.push(`- DO NOT use ${p}`));
        lines.push('');
      }

      if (styleProfile.architecture_constraints.length > 0) {
        lines.push('**Architecture Constraints:**');
        styleProfile.architecture_constraints.forEach(c => lines.push(`- ${c}`));
        lines.push('');
      }

      if (styleProfile.naming_conventions.length > 0) {
        lines.push('**Naming Conventions:**');
        styleProfile.naming_conventions.forEach(n => lines.push(`- ${n}`));
        lines.push('');
      }

      if (styleProfile.error_handling_policy) {
        lines.push(`**Error Handling:** ${styleProfile.error_handling_policy}`);
        lines.push('');
      }

      const tp = styleProfile.testing_policy;
      if (tp) {
        lines.push('**Testing Requirements:**');
        const conditions: string[] = [];
        if (tp.test_required_when.business_logic_changed) conditions.push('business logic changes');
        if (tp.test_required_when.api_changed) conditions.push('API changes');
        if (tp.test_required_when.db_query_changed) conditions.push('database query changes');
        if (tp.test_required_when.bugfix) conditions.push('bug fixes');

        if (conditions.length > 0) {
          lines.push(`- You MUST write tests when: ${conditions.join(', ')}`);
        }
        if (tp.test_types_required.length > 0) {
          lines.push(`- Required test types: ${tp.test_types_required.join(', ')}`);
        }
        tp.minimum_expectations.forEach((e: string) => lines.push(`- ${e}`));
        if (!tp.allow_skip_with_reason) {
          lines.push('- Tests CANNOT be skipped under any circumstances');
        }
        lines.push('');
      }
    }

    if (reviewProfile) {
      lines.push('## Code Review Standards (your code WILL be reviewed against these)');
      lines.push('');
      lines.push(`**Strictness Level:** ${reviewProfile.strictness.toUpperCase()}`);
      lines.push('');

      if (reviewProfile.required_checks.length > 0) {
        lines.push('**Required Checks (blockers if violated):**');
        reviewProfile.required_checks.forEach(c => lines.push(`- ${c}`));
        lines.push('');
      }

      const blockerRules = reviewProfile.rules.filter(r => r.severity === 'blocker');
      if (blockerRules.length > 0) {
        lines.push('**Blocker Rules:**');
        blockerRules.forEach(r => lines.push(`- ${r.description}`));
        lines.push('');
      }
    }

    lines.push('## Instructions');
    lines.push('Please implement this task following these guidelines:');
    lines.push('1. Follow the existing code patterns and conventions in this project');
    lines.push('2. Write clean, well-documented code');
    lines.push('3. Include proper error handling');

    if (styleProfile?.testing_policy) {
      lines.push('4. Write tests as specified in the Testing Requirements above');
      lines.push('5. Make sure all existing tests still pass');
    } else {
      lines.push('4. Add relevant tests if applicable');
      lines.push('5. Make sure all existing tests still pass');
    }

    lines.push('');
    lines.push('## TaskOS Agent Integration');
    lines.push('');
    lines.push(`Task context is in \`.taskos/task-${task.id}.json\`. Status was set to **in_progress** when this task was dispatched.`);
    lines.push('');
    lines.push('**AFTER completing implementation**, run:');
    lines.push('```bash');
    lines.push(`node taskos-update-task.mjs done "${task.id}" "Brief summary of what was implemented"`);
    lines.push('```');
    lines.push('');
    lines.push('To log progress notes during work:');
    lines.push('```bash');
    lines.push(`node taskos-update-task.mjs log "${task.id}" "Description of progress"`);
    lines.push('```');
    lines.push('');
    if (task.steps && task.steps.length > 0) {
      lines.push('To mark a step as completed:');
      lines.push('```bash');
      lines.push(`node taskos-update-task.mjs step "${task.id}" "<stepId>" completed`);
      lines.push('```');
      lines.push('');
    }
    lines.push('After completing the implementation, provide a summary of all changes made.');

    return lines.join('\n');
  }

  // --------------- .taskos/ directory management ---------------

  private getTaskosDir(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return null;
    return path.join(folders[0].uri.fsPath, '.taskos');
  }

  private ensureTaskosDir(): string | null {
    const dir = this.getTaskosDir();
    if (!dir) return null;
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch (err) {
      console.error('TaskOS: Failed to create .taskos dir:', err);
      return null;
    }
  }

  private ensureGitignore(): void {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return;

    const gitignorePath = path.join(folders[0].uri.fsPath, '.gitignore');
    const entry = '.taskos/';

    try {
      let content = '';
      if (fs.existsSync(gitignorePath)) {
        content = fs.readFileSync(gitignorePath, 'utf8');
      }
      if (!content.split('\n').some(line => line.trim() === entry)) {
        const sep = content.endsWith('\n') || content.length === 0 ? '' : '\n';
        fs.appendFileSync(gitignorePath, `${sep}\n# TaskOS agent context (contains no secrets)\n${entry}\n`);
      }
    } catch (err) {
      console.error('TaskOS: Failed to update .gitignore:', err);
    }
  }

  private writeTaskContext(task: Task, branchName?: string): void {
    const dir = this.ensureTaskosDir();
    if (!dir) return;

    this.ensureGitignore();

    const config = vscode.workspace.getConfiguration('taskos');
    const apiUrl = config.get<string>('apiUrl') || 'https://www.task-os.app/api/v1';

    const context: TaskContextFile = {
      taskId: task.id,
      workspaceId: task.workspaceId,
      baseUrl: apiUrl,
      title: task.title,
      branchName,
      sentAt: new Date().toISOString(),
    };

    const filePath = path.join(dir, `task-${task.id}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(context, null, 2), 'utf8');
    } catch (err) {
      console.error('TaskOS: Failed to write task context:', err);
    }
  }

  removeTaskContext(taskId: string): void {
    const dir = this.getTaskosDir();
    if (!dir) return;
    const filePath = path.join(dir, `task-${taskId}.json`);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { /* ignore */ }
  }

  // --------------- Send to Agent ---------------

  async sendToAgent(task: Task): Promise<{ success: boolean; method: string; branchName?: string }> {
    const prompt = this.generatePrompt(task);

    // Step 1: Create git branch
    let branchName: string | undefined;
    try {
      const isGit = await this.gitService.isGitRepo();
      if (isGit) {
        const config = vscode.workspace.getConfiguration('taskos');
        const workspaceId = config.get<string>('defaultWorkspaceId', '');
        let suggestedBranch = `taskos/${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}-${task.id.substring(0, 8)}`;

        try {
          const convConfig = await this.conventionManager.getConfig(workspaceId);
          let username = 'user';
          try { username = await this._runGitCommand('config user.name'); } catch {}
          const rendered = renderConvention(convConfig, {
            taskTitle: task.title,
            taskId: task.id,
            taskType: convConfig.defaultTaskType,
            username,
          });
          suggestedBranch = rendered.branchName;
        } catch { /* use fallback */ }

        const userBranch = await vscode.window.showInputBox({
          prompt: 'Branch name for this task',
          value: suggestedBranch,
          placeHolder: suggestedBranch,
          validateInput: (value) => {
            if (!value || !value.trim()) return 'Branch name is required';
            if (/\s/.test(value)) return 'Branch name cannot contain spaces';
            return null;
          },
        });

        if (!userBranch) {
          return { success: false, method: 'cancelled' };
        }

        const hasChanges = await this.gitService.hasUncommittedChanges();
        if (hasChanges) {
          const choice = await vscode.window.showWarningMessage(
            'You have uncommitted changes. Creating a task branch will stash them. Continue?',
            'Yes, stash & continue',
            'Cancel'
          );
          if (choice !== 'Yes, stash & continue') {
            return { success: false, method: 'cancelled' };
          }
          try {
            await this._runGitCommand('stash push -m "TaskOS: auto-stash before task branch"');
          } catch {
            // Continue anyway
          }
        }

        try {
          await this._runGitCommand(`checkout -b ${userBranch}`);
          branchName = userBranch;
        } catch {
          try {
            await this._runGitCommand(`checkout ${userBranch}`);
            branchName = userBranch;
          } catch {
            branchName = await this.gitService.createTaskBranch(task.id, task.title);
          }
        }

        vscode.window.showInformationMessage(`Created branch: ${branchName}`);
      }
    } catch (error) {
      console.log('TaskOS: Git branch creation failed (non-fatal):', error);
    }

    // Step 2: Write .taskos/task-<id>.json (no API key!)
    this.writeTaskContext(task, branchName);

    // Step 3: Set status to in_progress immediately via API
    try {
      const config = vscode.workspace.getConfiguration('taskos');
      const apiKey = config.get<string>('apiKey') || '';
      const apiUrl = config.get<string>('apiUrl') || 'https://www.task-os.app/api/v1';
      const client = new TaskOSApiClient(apiKey, apiUrl);
      await client.updateTask(task.id, { status: 'in_progress' });
    } catch (err) {
      console.error('TaskOS: Failed to set in_progress:', err);
    }

    // Step 4: Send prompt to Cursor's Composer/Agent
    const autoSend = vscode.workspace.getConfiguration('taskos').get<boolean>('autoSendPrompt', true);
    let method = 'clipboard';

    await vscode.env.clipboard.writeText(prompt);

    const composerCommands = [
      'composerMode.agent',
      'cursor.newComposer',
      'aichat.newchataction',
      'workbench.action.chat.newChat',
      'workbench.action.chat.open',
    ];

    for (const cmd of composerCommands) {
      try {
        await vscode.commands.executeCommand(cmd);
        method = cmd;

        await new Promise(resolve => setTimeout(resolve, 600));

        try {
          await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        } catch { /* ignore */ }

        if (autoSend) {
          await new Promise(resolve => setTimeout(resolve, 300));
          try {
            await vscode.commands.executeCommand('workbench.action.chat.submit');
          } catch {
            try {
              await vscode.commands.executeCommand('default:type', { text: '\n' });
            } catch { /* user presses Enter */ }
          }
        }

        break;
      } catch {
        continue;
      }
    }

    return { success: true, method, branchName };
  }

  private async _runGitCommand(command: string): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const folders = vscode.workspace.workspaceFolders;
    const cwd = folders?.[0]?.uri.fsPath || '';

    const { stdout } = await execAsync(`git ${command}`, { cwd, timeout: 15000 });
    return stdout.trim();
  }

  getGitService(): GitService {
    return this.gitService;
  }
}
