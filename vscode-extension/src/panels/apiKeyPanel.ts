import * as vscode from 'vscode';
import * as path from 'path';
import { TaskOSApiClient } from '../api/client';
import { TaskProvider } from '../providers/taskProvider';

export class ApiKeyPanel {
  public static currentPanel: ApiKeyPanel | undefined;
  public static readonly viewType = 'taskosApiKey';
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private static onApiKeySaved: ((apiKey: string, apiUrl: string) => void) | null = null;

  public static setOnApiKeySaved(callback: (apiKey: string, apiUrl: string) => void) {
    ApiKeyPanel.onApiKeySaved = callback;
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (ApiKeyPanel.currentPanel) {
      ApiKeyPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      ApiKeyPanel.viewType,
      'TaskOS - Configure API Key',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    ApiKeyPanel.currentPanel = new ApiKeyPanel(panel, extensionUri);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'saveApiKey':
            await this._saveApiKey(message.apiKey, message.apiUrl);
            return;
          case 'checkApiKey':
            await this._checkApiKey();
            return;
        }
      },
      null,
      this._disposables
    );
  }

  private async _update() {
    const webview = this._panel.webview;
    
    // Get current config
    const config = vscode.workspace.getConfiguration('taskos');
    const currentApiKey = config.get<string>('apiKey', '');
    const currentApiUrl = config.get<string>('apiUrl', 'https://taskos.com/api/v1');
    const currentWorkspaceId = config.get<string>('defaultWorkspaceId', '');

    this._panel.webview.html = this._getHtmlForWebview(webview, {
      apiKey: currentApiKey ? '•'.repeat(Math.min(currentApiKey.length, 20)) : '',
      apiUrl: currentApiUrl,
      workspaceId: currentWorkspaceId,
      hasApiKey: currentApiKey.length > 0,
    });
  }

  private async _saveApiKey(apiKey: string, apiUrl: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      this._panel.webview.postMessage({
        command: 'error',
        message: 'API key is required',
      });
      return;
    }

    if (!apiKey.startsWith('taskos_')) {
      this._panel.webview.postMessage({
        command: 'error',
        message: 'API key should start with "taskos_"',
      });
      return;
    }

    try {
      const config = vscode.workspace.getConfiguration('taskos');
      await config.update('apiKey', apiKey.trim(), vscode.ConfigurationTarget.Global);
      await config.update('apiUrl', apiUrl.trim() || 'https://taskos.com/api/v1', vscode.ConfigurationTarget.Global);

      this._panel.webview.postMessage({
        command: 'success',
        message: 'API key saved successfully!',
      });

      vscode.window.showInformationMessage('TaskOS: API key configured successfully!');
      
      // Notify extension to update API client
      if (ApiKeyPanel.onApiKeySaved) {
        ApiKeyPanel.onApiKeySaved(apiKey.trim(), apiUrl.trim() || 'https://taskos.com/api/v1');
      }
      
      // Close panel after a short delay
      setTimeout(() => {
        this._panel.dispose();
      }, 1500);
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'error',
        message: `Failed to save API key: ${error}`,
      });
    }
  }

  private async _checkApiKey() {
    const config = vscode.workspace.getConfiguration('taskos');
    const apiKey = config.get<string>('apiKey', '');
    
    this._panel.webview.postMessage({
      command: 'apiKeyStatus',
      hasApiKey: apiKey.length > 0,
      maskedKey: apiKey ? '•'.repeat(Math.min(apiKey.length, 20)) : '',
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview, data: {
    apiKey: string;
    apiUrl: string;
    workspaceId: string;
    hasApiKey: boolean;
  }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskOS - Configure API Key</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 8px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            box-sizing: border-box;
        }
        input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        .help-text {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
        .help-text a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .help-text a:hover {
            text-decoration: underline;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 2px;
            cursor: pointer;
            font-size: var(--vscode-font-size);
            font-weight: 500;
            margin-right: 10px;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .button-secondary {
            background: transparent;
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
        }
        .button-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .status {
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .status.success {
            background: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
        }
        .status.error {
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        .status.info {
            background: var(--vscode-inputValidation-warningBackground);
            color: var(--vscode-inputValidation-warningForeground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
        }
        .current-key {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: var(--vscode-list-inactiveSelectionBackground);
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .key-preview {
            font-family: monospace;
            color: var(--vscode-descriptionForeground);
        }
        .icon {
            width: 16px;
            height: 16px;
        }
    </style>
</head>
<body>
    <h1>🔑 Configure TaskOS API Key</h1>
    
    ${data.hasApiKey ? `
    <div class="status info">
        <strong>✓ API Key Configured</strong><br>
        <span class="key-preview">${data.apiKey}</span>
    </div>
    ` : `
    <div class="status info">
        <strong>Get your API key:</strong><br>
        1. Go to <a href="https://taskos.com/app/account" target="_blank">TaskOS Account Settings</a><br>
        2. Navigate to <strong>Security → API Keys</strong><br>
        3. Click <strong>Create Key</strong> and copy it
    </div>
    `}

    <form id="apiKeyForm">
        <div class="form-group">
            <label for="apiKey">API Key *</label>
            <input 
                type="password" 
                id="apiKey" 
                name="apiKey" 
                placeholder="taskos_..."
                required
                autocomplete="off"
            />
            <div class="help-text">
                Your API key starts with "taskos_". Keep it secure and never share it.
            </div>
        </div>

        <div class="form-group">
            <label for="apiUrl">API URL</label>
            <input 
                type="text" 
                id="apiUrl" 
                name="apiUrl" 
                value="${data.apiUrl}"
                placeholder="https://taskos.com/api/v1"
            />
            <div class="help-text">
                Default: https://taskos.com/api/v1
            </div>
        </div>

        <div class="form-group">
            <label for="workspaceId">Default Workspace ID (Optional)</label>
            <input 
                type="text" 
                id="workspaceId" 
                name="workspaceId" 
                value="${data.workspaceId}"
                placeholder="Workspace UUID"
            />
            <div class="help-text">
                Set a default workspace for creating tasks. You can find it in your workspace settings.
            </div>
        </div>

        <div style="margin-top: 30px;">
            <button type="submit" id="saveButton">Save API Key</button>
            <button type="button" class="button-secondary" onclick="checkStatus()">Check Status</button>
        </div>
    </form>

    <div id="statusMessage"></div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const form = document.getElementById('apiKeyForm');
        const statusMessage = document.getElementById('statusMessage');
        const saveButton = document.getElementById('saveButton');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const apiKey = document.getElementById('apiKey').value;
            const apiUrl = document.getElementById('apiUrl').value;
            
            if (!apiKey || apiKey.trim().length === 0) {
                showMessage('API key is required', 'error');
                return;
            }

            if (!apiKey.startsWith('taskos_')) {
                showMessage('API key should start with "taskos_"', 'error');
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';

            vscode.postMessage({
                command: 'saveApiKey',
                apiKey: apiKey.trim(),
                apiUrl: apiUrl.trim() || 'https://taskos.com/api/v1',
            });
        });

        function checkStatus() {
            vscode.postMessage({ command: 'checkApiKey' });
        }

        function showMessage(message, type) {
            statusMessage.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
            setTimeout(() => {
                statusMessage.innerHTML = '';
            }, 5000);
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'success':
                    showMessage(message.message, 'success');
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save API Key';
                    break;
                case 'error':
                    showMessage(message.message, 'error');
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save API Key';
                    break;
                case 'apiKeyStatus':
                    if (message.hasApiKey) {
                        showMessage(\`API Key configured: \${message.maskedKey}\`, 'success');
                    } else {
                        showMessage('No API key configured', 'info');
                    }
                    break;
            }
        });
    </script>
</body>
</html>`;
  }

  public dispose() {
    ApiKeyPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
