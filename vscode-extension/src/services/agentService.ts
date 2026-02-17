import * as vscode from 'vscode';
import { Task } from '../api/client';
import { GitService } from './gitService';

export class AgentService {
  private gitService: GitService;

  constructor() {
    this.gitService = new GitService();
  }

  /**
   * Generate a comprehensive prompt from a task
   */
  generatePrompt(task: Task): string {
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
      
      // Point out incomplete items
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

    // Instructions for the agent
    lines.push('## Instructions');
    lines.push('Please implement this task following these guidelines:');
    lines.push('1. Follow the existing code patterns and conventions in this project');
    lines.push('2. Write clean, well-documented code');
    lines.push('3. Include proper error handling');
    lines.push('4. Add relevant tests if applicable');
    lines.push('5. Make sure all existing tests still pass');
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
          // Stash current changes
          try {
            const gitService = this.gitService;
            await this._runGitCommand('stash push -m "TaskOS: auto-stash before task branch"');
          } catch {
            // Continue anyway
          }
        }
        branchName = await this.gitService.createTaskBranch(task.id, task.title);
        vscode.window.showInformationMessage(`🌿 Created branch: ${branchName}`);
      }
    } catch (error) {
      console.log('TaskOS: Git branch creation failed (non-fatal):', error);
      // Continue without branch - not fatal
    }

    // Step 2: Try to send to Cursor's Composer/Agent
    let method = 'clipboard';

    // Try Cursor Composer (Agent mode) - most common command names
    const composerCommands = [
      'composerMode.agent',
      'cursor.newComposer',
      'aichat.newchataction',
      'workbench.action.chat.newChat',
      'workbench.action.chat.open',
    ];

    for (const cmd of composerCommands) {
      try {
        // First, copy prompt to clipboard
        await vscode.env.clipboard.writeText(prompt);
        
        // Try to execute the command
        await vscode.commands.executeCommand(cmd);
        method = cmd;
        
        // Small delay then paste
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to paste and send
        try {
          await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        } catch {
          // Paste might not work in chat, that's ok
        }
        
        break; // If command executed without error, stop trying
      } catch {
        continue; // Try next command
      }
    }

    // If none of the commands worked, fallback to clipboard
    if (method === 'clipboard') {
      await vscode.env.clipboard.writeText(prompt);
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
