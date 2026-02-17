import * as vscode from 'vscode';
import { TaskOSApiClient, Task, CreateTaskRequest } from './api/client';
import { TaskProvider } from './providers/taskProvider';
import { TaskPanel } from './panels/taskPanel';
import { ApiKeyPanel } from './panels/apiKeyPanel';
import { AgentService } from './services/agentService';
import { PipelineService } from './services/pipelineService';
import { ProfileManager } from './profiles/profileManager';

let apiClient: TaskOSApiClient | null = null;
let taskProvider: TaskProvider | null = null;
let profileManager: ProfileManager | null = null;
let pipelineService: PipelineService | null = null;
const agentService = new AgentService();

export function activate(context: vscode.ExtensionContext) {
  console.log('TaskOS extension is now active!');
  
  // Get configuration
  const config = vscode.workspace.getConfiguration('taskos');
  const apiKey = config.get<string>('apiKey', '');
  const apiUrl = config.get<string>('apiUrl', 'https://www.task-os.app/api/v1');
  const workspaceId = config.get<string>('defaultWorkspaceId', '');

  // Initialize API client if we have an API key
  if (apiKey) {
    apiClient = new TaskOSApiClient(apiKey, apiUrl);
    profileManager = new ProfileManager(apiClient, workspaceId);
    pipelineService = new PipelineService(apiClient, profileManager);
  }

  // Initialize task provider
  taskProvider = new TaskProvider(apiClient, workspaceId);
  vscode.window.registerTreeDataProvider('taskosTasks', taskProvider);

  // Register configure command
  const configureCommand = vscode.commands.registerCommand('taskos.configure', () => {
    console.log('TaskOS: Configure command called');
    ApiKeyPanel.createOrShow(context.extensionUri);
  });
  context.subscriptions.push(configureCommand);

  // Register open panel command
  const openPanelCommand = vscode.commands.registerCommand('taskos.openPanel', () => {
    console.log('TaskOS: Open panel command called');
    
    const config = vscode.workspace.getConfiguration('taskos');
    const workspaceId = config.get<string>('defaultWorkspaceId', '');
    
    if (!apiClient) {
      vscode.window.showWarningMessage('TaskOS: API key not configured. Opening configuration...');
      ApiKeyPanel.createOrShow(context.extensionUri);
      return;
    }
    
    if (!workspaceId) {
      vscode.window.showWarningMessage('TaskOS: Workspace ID not configured. Opening configuration...');
      ApiKeyPanel.createOrShow(context.extensionUri);
      return;
    }
    
    TaskPanel.render(context.extensionUri, apiClient, workspaceId);
  });
  context.subscriptions.push(openPanelCommand);

  // Register open task in browser command
  const openTaskInBrowserCommand = vscode.commands.registerCommand('taskos.openTaskInBrowser', (taskId: string) => {
    const config = vscode.workspace.getConfiguration('taskos');
    const apiUrl = config.get<string>('apiUrl', '');
    const workspaceId = config.get<string>('defaultWorkspaceId', '');
    
    // Extract base URL from API URL
    const baseUrl = apiUrl.replace('/api/v1', '');
    const taskUrl = `${baseUrl}/en/app/${workspaceId}/tasks/${taskId}`;
    
    vscode.env.openExternal(vscode.Uri.parse(taskUrl));
  });
  context.subscriptions.push(openTaskInBrowserCommand);

  // Set callback for API key panel
  ApiKeyPanel.setOnApiKeySaved((newApiKey, newApiUrl) => {
    console.log('TaskOS: API key saved');
    const config = vscode.workspace.getConfiguration('taskos');
    const workspaceId = config.get<string>('defaultWorkspaceId', '');
    
    // Update or create API client
    if (apiClient) {
      apiClient.updateApiKey(newApiKey);
      apiClient.updateApiUrl(newApiUrl);
    } else {
      apiClient = new TaskOSApiClient(newApiKey, newApiUrl);
    }
    
    // Update task provider
    if (taskProvider) {
      taskProvider.updateClient(apiClient, workspaceId);
    }
  });

  // Register create task command
  const createTaskCommand = vscode.commands.registerCommand('taskos.createTask', async () => {
    if (!apiClient) {
      vscode.window.showErrorMessage('TaskOS: API key not configured. Please set it in settings.');
      ApiKeyPanel.createOrShow(context.extensionUri);
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('TaskOS: No active editor found.');
      return;
    }

    const selection = editor.document.getText(editor.selection);
    if (!selection) {
      vscode.window.showWarningMessage('TaskOS: Please select some text to create a task from.');
      return;
    }

    // Get workspace ID
    const config = vscode.workspace.getConfiguration('taskos');
    let workspaceId = config.get<string>('defaultWorkspaceId', '');
    
    if (!workspaceId) {
      const inputWorkspaceId = await vscode.window.showInputBox({
        prompt: 'Enter workspace ID',
        placeHolder: 'Workspace UUID',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Workspace ID is required';
          }
          return null;
        },
      });

      if (!inputWorkspaceId) {
        return;
      }

      workspaceId = inputWorkspaceId;
      // Save as default
      await config.update('defaultWorkspaceId', workspaceId, vscode.ConfigurationTarget.Global);
    }

    // Get task title
    const title = await vscode.window.showInputBox({
      prompt: 'Enter task title',
      placeHolder: 'Task title',
      value: selection.substring(0, 50) + (selection.length > 50 ? '...' : ''),
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Task title is required';
        }
        if (value.length > 500) {
          return 'Task title must be less than 500 characters';
        }
        return null;
      },
    });

    if (!title) {
      return;
    }

    // Get priority
    const priority = await vscode.window.showQuickPick(
      [
        { label: '🟢 Low', value: 'low' as const },
        { label: '🟡 Medium', value: 'medium' as const },
        { label: '🟠 High', value: 'high' as const },
        { label: '🔴 Urgent', value: 'urgent' as const },
      ],
      {
        placeHolder: 'Select priority',
      }
    );

    if (!priority) {
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Creating task...',
          cancellable: false,
        },
        async () => {
          const taskRequest: CreateTaskRequest = {
            workspaceId,
            title,
            description: selection.length > 50 ? selection : undefined,
            priority: priority.value,
            status: 'todo',
          };

          const task = await apiClient!.createTask(taskRequest);
          vscode.window.showInformationMessage(`✅ Task "${task.title}" created successfully!`);
          
          // Refresh task provider
          if (taskProvider) {
            taskProvider.refresh();
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`TaskOS: Failed to create task. ${error}`);
    }
  });
  context.subscriptions.push(createTaskCommand);

  // Register generate code command
  const generateCodeCommand = vscode.commands.registerCommand('taskos.generateCode', async () => {
    if (!apiClient) {
      vscode.window.showErrorMessage('TaskOS: API key not configured. Please set it in settings.');
      ApiKeyPanel.createOrShow(context.extensionUri);
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('TaskOS: No active editor found.');
      return;
    }

    const selection = editor.document.getText(editor.selection);
    if (!selection) {
      vscode.window.showWarningMessage('TaskOS: Please select some text to generate code for.');
      return;
    }

    // Get task description
    const taskDescription = await vscode.window.showInputBox({
      prompt: 'Describe what code you want to generate',
      placeHolder: 'e.g., Create a function that validates email addresses',
      value: selection,
      validateInput: (value) => {
        if (!value || value.trim().length < 3) {
          return 'Description must be at least 3 characters';
        }
        return null;
      },
    });

    if (!taskDescription) {
      return;
    }

    // Get language (optional)
    const language = await vscode.window.showQuickPick(
      [
        { label: 'Auto-detect', value: undefined },
        { label: 'TypeScript', value: 'typescript' },
        { label: 'JavaScript', value: 'javascript' },
        { label: 'Python', value: 'python' },
        { label: 'Java', value: 'java' },
        { label: 'C#', value: 'csharp' },
        { label: 'Go', value: 'go' },
        { label: 'Rust', value: 'rust' },
      ],
      {
        placeHolder: 'Select programming language (optional)',
      }
    );

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '🤖 Generating code with AI...',
          cancellable: false,
        },
        async () => {
          const filePath = editor.document.fileName;
          const existingCode = editor.document.getText();

          const response = await apiClient!.generateCode({
            taskDescription,
            language: language?.value,
            context: {
              filePath,
              existingCode: existingCode.length > 1000 ? existingCode.substring(0, 1000) : existingCode,
            },
          });

          // Show code in a new document
          const doc = await vscode.workspace.openTextDocument({
            content: response.code,
            language: response.language,
          });
          await vscode.window.showTextDocument(doc);

          // Show explanation
          const viewFilesChoice = await vscode.window.showInformationMessage(
            `✨ Code generated! ${response.explanation}`,
            'View Files'
          );
          
          if (viewFilesChoice === 'View Files' && response.files.length > 1) {
            // Show files in a quick pick
            const selectedPath = await vscode.window.showQuickPick(
              response.files.map((f) => f.path),
              { placeHolder: 'Select file to view' }
            );
            
            if (selectedPath) {
              const file = response.files.find((f) => f.path === selectedPath);
              if (file) {
                const fileDoc = await vscode.workspace.openTextDocument({
                  content: file.content,
                  language: response.language,
                });
                await vscode.window.showTextDocument(fileDoc);
              }
            }
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`TaskOS: Failed to generate code. ${error}`);
    }
  });
  context.subscriptions.push(generateCodeCommand);

  // Register send to agent command
  const sendToAgentCommand = vscode.commands.registerCommand('taskos.sendToAgent', async (taskId?: string) => {
    if (!apiClient) {
      vscode.window.showErrorMessage('TaskOS: API key not configured.');
      ApiKeyPanel.createOrShow(context.extensionUri);
      return;
    }

    // If no taskId provided, ask user to pick a task
    if (!taskId) {
      const config = vscode.workspace.getConfiguration('taskos');
      const workspaceId = config.get<string>('defaultWorkspaceId', '');
      if (!workspaceId) {
        vscode.window.showErrorMessage('TaskOS: Workspace ID not configured.');
        return;
      }

      try {
        const { tasks } = await apiClient.listTasks(workspaceId, { limit: 20 });
        const selected = await vscode.window.showQuickPick(
          tasks.map(t => ({
            label: `${t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : t.priority === 'medium' ? '🟡' : '🟢'} ${t.title}`,
            description: t.status.replace('_', ' '),
            taskId: t.id,
          })),
          { placeHolder: 'Select a task to send to AI Agent' }
        );
        if (!selected) { return; }
        taskId = (selected as any).taskId;
      } catch (error) {
        vscode.window.showErrorMessage(`TaskOS: Failed to load tasks. ${error}`);
        return;
      }
    }

    try {
      const task = await apiClient.getTask(taskId!);
      
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '🤖 Preparing task for AI Agent...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Creating branch...' });
          
          const result = await agentService.sendToAgent(task);
          
          if (!result.success) {
            return;
          }

          progress.report({ message: 'Opening AI Agent...' });

          // Update task status to in_progress
          try {
            await apiClient!.updateTask(task.id, { status: 'in_progress' });
          } catch {
            // Non-fatal
          }

          // Show success with instructions
          const branchMsg = result.branchName ? `\n🌿 Branch: ${result.branchName}` : '';
          
          if (result.method === 'clipboard') {
            const action = await vscode.window.showInformationMessage(
              `🤖 Task prompt copied to clipboard!${branchMsg}\n\nOpen Cursor Composer (Ctrl+I) and paste to start.`,
              'Open Composer (Ctrl+I)',
              'View Prompt'
            );
            
            if (action === 'Open Composer (Ctrl+I)') {
              // Try to open composer
              try {
                await vscode.commands.executeCommand('workbench.action.chat.open');
              } catch {
                try {
                  await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
                } catch {
                  // Just notify
                }
              }
            } else if (action === 'View Prompt') {
              const doc = await vscode.workspace.openTextDocument({
                content: agentService.generatePrompt(task),
                language: 'markdown',
              });
              await vscode.window.showTextDocument(doc);
            }
          } else {
            vscode.window.showInformationMessage(
              `🤖 Task sent to AI Agent!${branchMsg}\n\nThe prompt has been loaded into the chat.`
            );
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`TaskOS: Failed to send task to agent. ${error}`);
    }
  });
  context.subscriptions.push(sendToAgentCommand);

  // Register create PR command
  const createPRCommand = vscode.commands.registerCommand('taskos.createPR', async (taskId?: string, taskTitle?: string) => {
    const gitService = agentService.getGitService();
    
    try {
      const isGit = await gitService.isGitRepo();
      if (!isGit) {
        vscode.window.showErrorMessage('TaskOS: Not a git repository.');
        return;
      }

      const currentBranch = await gitService.getCurrentBranch();
      const defaultBranch = await gitService.getDefaultBranch();
      
      if (currentBranch === defaultBranch) {
        vscode.window.showWarningMessage(`TaskOS: You're on the ${defaultBranch} branch. Please create a task branch first by using "Send to Agent".`);
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '🚀 Creating Pull Request...',
          cancellable: false,
        },
        async (progress) => {
          // Check for uncommitted changes
          const hasChanges = await gitService.hasUncommittedChanges();
          
          if (hasChanges) {
            progress.report({ message: 'Committing changes...' });
            
            const title = taskTitle || currentBranch.replace('taskos/', '').replace(/-[a-f0-9]+$/, '').replace(/-/g, ' ');
            const id = taskId || currentBranch.match(/-([a-f0-9]+)$/)?.[1] || '';
            
            await gitService.commitAndPush(id, title);
          } else {
            // Just push
            progress.report({ message: 'Pushing to remote...' });
            try {
              const { exec } = require('child_process');
              const { promisify } = require('util');
              const execAsync = promisify(exec);
              const folders = vscode.workspace.workspaceFolders;
              await execAsync(`git push -u origin ${currentBranch}`, { 
                cwd: folders?.[0]?.uri.fsPath, 
                timeout: 30000 
              });
            } catch {
              // May already be pushed
            }
          }

          progress.report({ message: 'Opening PR...' });

          // Try to create PR
          const title = taskTitle || currentBranch.replace('taskos/', '').replace(/-[a-f0-9]+$/, '').replace(/-/g, ' ');
          const id = taskId || '';
          const description = 'Implemented via TaskOS AI Agent integration.';
          
          try {
            const prUrl = await gitService.createPullRequest(id, title, description);
            
            const action = await vscode.window.showInformationMessage(
              `✅ Pull Request ready!`,
              'Open in Browser'
            );
            
            if (action === 'Open in Browser') {
              vscode.env.openExternal(vscode.Uri.parse(prUrl));
            }
          } catch (error) {
            // Fallback: open GitHub compare page
            const githubRepo = await gitService.getGitHubRepo();
            if (githubRepo) {
              const url = `https://github.com/${githubRepo.owner}/${githubRepo.repo}/compare/${defaultBranch}...${currentBranch}?expand=1`;
              vscode.env.openExternal(vscode.Uri.parse(url));
            } else {
              vscode.window.showErrorMessage(`TaskOS: Could not create PR. ${error}`);
            }
          }

          // Update task status to review
          if (apiClient && taskId) {
            try {
              await apiClient.updateTask(taskId, { status: 'review' });
            } catch {
              // Non-fatal
            }
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`TaskOS: Failed to create PR. ${error}`);
    }
  });
  context.subscriptions.push(createPRCommand);

  // Register run pipeline command
  const runPipelineCommand = vscode.commands.registerCommand('taskos.runPipeline', async (taskId?: string) => {
    if (!apiClient) {
      vscode.window.showErrorMessage('TaskOS: API key not configured.');
      ApiKeyPanel.createOrShow(context.extensionUri);
      return;
    }

    if (!pipelineService) {
      const config = vscode.workspace.getConfiguration('taskos');
      const workspaceId = config.get<string>('defaultWorkspaceId', '');
      profileManager = new ProfileManager(apiClient, workspaceId);
      pipelineService = new PipelineService(apiClient, profileManager);
    }

    // If no taskId, ask user to pick a task
    if (!taskId) {
      const config = vscode.workspace.getConfiguration('taskos');
      const workspaceId = config.get<string>('defaultWorkspaceId', '');
      if (!workspaceId) {
        vscode.window.showErrorMessage('TaskOS: Workspace ID not configured.');
        return;
      }

      try {
        const { tasks } = await apiClient.listTasks(workspaceId, { limit: 20, status: 'in_progress' });
        if (tasks.length === 0) {
          vscode.window.showWarningMessage('TaskOS: No in-progress tasks found. Send a task to the agent first.');
          return;
        }

        const selected = await vscode.window.showQuickPick(
          tasks.map(t => ({
            label: `${t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : t.priority === 'medium' ? '🟡' : '🟢'} ${t.title}`,
            description: t.status.replace('_', ' '),
            taskId: t.id,
          })),
          { placeHolder: 'Select a task to run pipeline for' }
        );
        if (!selected) { return; }
        taskId = (selected as any).taskId;
      } catch (error) {
        vscode.window.showErrorMessage(`TaskOS: Failed to load tasks. ${error}`);
        return;
      }
    }

    try {
      const task = await apiClient.getTask(taskId!);
      const result = await pipelineService!.runPipeline(task);

      if (result.success) {
        const action = await vscode.window.showInformationMessage(
          `Pipeline completed! ${result.blockers.length > 0 ? `(${result.blockers.length} blockers)` : 'All clear!'}`,
          result.pr_url ? 'Open PR' : 'Done'
        );
        if (action === 'Open PR' && result.pr_url) {
          vscode.env.openExternal(vscode.Uri.parse(result.pr_url));
        }

        // Update task status to review
        try {
          await apiClient!.updateTask(task.id, { status: 'review' });
        } catch {
          // Non-fatal
        }
      } else {
        const completedStages = result.stages_completed.join(' -> ');
        vscode.window.showWarningMessage(
          `Pipeline stopped. Completed: ${completedStages}. ${result.blockers.length} blocker(s) found.`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`TaskOS: Pipeline failed. ${error}`);
    }
  });
  context.subscriptions.push(runPipelineCommand);

  // Register configure profiles command
  const configureProfilesCommand = vscode.commands.registerCommand('taskos.configureProfiles', async () => {
    if (!apiClient) {
      vscode.window.showErrorMessage('TaskOS: API key not configured.');
      ApiKeyPanel.createOrShow(context.extensionUri);
      return;
    }

    const config = vscode.workspace.getConfiguration('taskos');
    const workspaceId = config.get<string>('defaultWorkspaceId', '');
    if (!workspaceId) {
      vscode.window.showErrorMessage('TaskOS: Workspace ID not configured.');
      return;
    }

    // Import ProfilePanel lazily to avoid circular deps
    const { ProfilePanel } = await import('./panels/profilePanel');
    ProfilePanel.render(context.extensionUri, apiClient, workspaceId);
  });
  context.subscriptions.push(configureProfilesCommand);

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('taskos')) {
        const config = vscode.workspace.getConfiguration('taskos');
        const apiKey = config.get<string>('apiKey', '');
        const apiUrl = config.get<string>('apiUrl', 'https://www.task-os.app/api/v1');
        const workspaceId = config.get<string>('defaultWorkspaceId', '');
        
        if (apiKey) {
          if (apiClient) {
            apiClient.updateApiKey(apiKey);
            apiClient.updateApiUrl(apiUrl);
          } else {
            apiClient = new TaskOSApiClient(apiKey, apiUrl);
          }
        }
        
        // Update task provider and profile manager
        if (taskProvider && apiClient) {
          taskProvider.updateClient(apiClient, workspaceId);
        }
        if (apiClient && profileManager) {
          profileManager.updateClient(apiClient, workspaceId);
        }
        if (apiClient && profileManager && !pipelineService) {
          pipelineService = new PipelineService(apiClient, profileManager);
        }
      }
    })
  );
  
  console.log('TaskOS: All commands registered successfully');
  vscode.window.showInformationMessage('✅ TaskOS extension loaded!');
}

export function deactivate() {
  // Cleanup
}
