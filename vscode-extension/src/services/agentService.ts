import * as vscode from 'vscode';
import { Task } from '../api/client';
import { GitService } from './gitService';
import { CodeStyleProfile, CodeReviewProfile } from '../profiles/types';
import {
  BranchConventionManager,
  renderConvention,
  DEFAULT_BRANCH_CONVENTION,
} from './branchConvention';

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

  /**
   * Generate a comprehensive prompt from a task (basic, backward-compatible)
   */
  generatePrompt(task: Task): string {
    return this.generateEnhancedPrompt(task);
  }

  /**
   * Generate an enhanced prompt with profile-driven instructions
   */
  generateEnhancedPrompt(
    task: Task,
    styleProfile?: CodeStyleProfile,
    reviewProfile?: CodeReviewProfile
  ): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Task: ${task.title}`);
    lines.push('');

    // Description
    if (task.description) {
      lines.push('## Description');
      lines.push(task.description);
      lines.push('');
    }

    // Priority & Status context
    lines.push(`## Context`);
    lines.push(`- **Priority:** ${task.priority.toUpperCase()}`);
    lines.push(`- **Status:** ${task.status.replace('_', ' ')}`);
    if (task.dueDate) {
      lines.push(`- **Due Date:** ${new Date(task.dueDate).toLocaleDateString()}`);
    }
    lines.push('');

    // Subtasks / Steps as requirements
    if (task.steps && task.steps.length > 0) {
      lines.push('## Requirements / Checklist');
      task.steps
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach((step, index) => {
          const checkbox = step.completed ? '✅' : '☐';
          lines.push(`${index + 1}. ${checkbox} ${step.content}`);
        });
      lines.push('');

      const incomplete = task.steps.filter(s => !s.completed);
      if (incomplete.length > 0) {
        lines.push(`> Focus on the ${incomplete.length} incomplete item(s) above.`);
        lines.push('');
      }
    }

    // Tags as context
    if (task.tags && task.tags.length > 0) {
      lines.push(`## Tags`);
      lines.push(task.tags.map(t => `\`${t.name}\``).join(', '));
      lines.push('');
    }

    // Code Style Profile instructions
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

      // Testing requirements from profile
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
        tp.minimum_expectations.forEach(e => lines.push(`- ${e}`));
        if (!tp.allow_skip_with_reason) {
          lines.push('- Tests CANNOT be skipped under any circumstances');
        }
        lines.push('');
      }
    }

    // Review awareness (so AI knows what will be checked)
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

    // Base instructions
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
    lines.push('After completing the implementation, provide a summary of all changes made.');

    return lines.join('\n');
  }

  /**
   * Send a task to Cursor's AI agent
   */
  async sendToAgent(task: Task): Promise<{ success: boolean; method: string; branchName?: string }> {
    const prompt = this.generatePrompt(task);
    
    // Step 1: Create a git branch for this task
    let branchName: string | undefined;
    try {
      const isGit = await this.gitService.isGitRepo();
      if (isGit) {
        // Generate suggested branch name from convention
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

        // Let user edit the branch name
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

        // Create branch with user's chosen name
        try {
          await this._runGitCommand(`checkout -b ${userBranch}`);
          branchName = userBranch;
        } catch {
          // Branch might already exist — try switching to it
          try {
            await this._runGitCommand(`checkout ${userBranch}`);
            branchName = userBranch;
          } catch {
            // Fall back to auto-generated
            branchName = await this.gitService.createTaskBranch(task.id, task.title);
          }
        }

        vscode.window.showInformationMessage(`Created branch: ${branchName}`);
      }
    } catch (error) {
      console.log('TaskOS: Git branch creation failed (non-fatal):', error);
    }

    // Step 2: Send prompt to Cursor's Composer/Agent
    const autoSend = vscode.workspace.getConfiguration('taskos').get<boolean>('autoSendPrompt', true);
    let method = 'clipboard';

    // Copy prompt to clipboard first
    await vscode.env.clipboard.writeText(prompt);

    // Try to open Cursor Composer and paste
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

        // Wait for composer to open
        await new Promise(resolve => setTimeout(resolve, 600));

        // Paste the prompt
        try {
          await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        } catch {
          // Paste might not work in some chat UIs
        }

        // Auto-send: simulate Enter to submit the prompt
        if (autoSend) {
          await new Promise(resolve => setTimeout(resolve, 300));
          try {
            await vscode.commands.executeCommand('workbench.action.chat.submit');
          } catch {
            // Fallback: try to simulate Enter key
            try {
              await vscode.commands.executeCommand('default:type', { text: '\n' });
            } catch {
              // User will need to press Enter manually
            }
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

  /**
   * Get the git service instance
   */
  getGitService(): GitService {
    return this.gitService;
  }
}
