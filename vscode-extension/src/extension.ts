import * as vscode from 'vscode';
import { TaskOSApiClient, Task, CreateTaskRequest } from './api/client';
import { TaskProvider } from './providers/taskProvider';
import { TaskPanel } from './panels/taskPanel';
import { ApiKeyPanel } from './panels/apiKeyPanel';

let apiClient: TaskOSApiClient | null = null;
let taskProvider: TaskProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('TaskOS extension is now active!');
  
  // Get configuration
  const config = vscode.workspace.getConfiguration('taskos');
  const apiKey = config.get<string>('apiKey', '');
  const apiUrl = config.get<string>('apiUrl', 'https://taskos.vercel.app/api/v1');
  const workspaceId = config.get<string>('defaultWorkspaceId', '');

  // Initialize API client if we have an API key
  if (apiKey) {
    apiClient = new TaskOSApiClient(apiKey, apiUrl);
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

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('taskos')) {
        const config = vscode.workspace.getConfiguration('taskos');
        const apiKey = config.get<string>('apiKey', '');
        const apiUrl = config.get<string>('apiUrl', 'https://taskos.vercel.app/api/v1');
        const workspaceId = config.get<string>('defaultWorkspaceId', '');
        
        if (apiKey) {
          if (apiClient) {
            apiClient.updateApiKey(apiKey);
            apiClient.updateApiUrl(apiUrl);
          } else {
            apiClient = new TaskOSApiClient(apiKey, apiUrl);
          }
        }
        
        // Update task provider
        if (taskProvider && apiClient) {
          taskProvider.updateClient(apiClient, workspaceId);
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
