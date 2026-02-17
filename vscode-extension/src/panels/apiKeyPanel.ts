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
    const currentApiUrl = config.get<string>('apiUrl', 'https://www.task-os.app/api/v1');
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
      await config.update('apiUrl', apiUrl.trim() || 'https://www.task-os.app/api/v1', vscode.ConfigurationTarget.Global);

      this._panel.webview.postMessage({
        command: 'success',
        message: 'API key saved successfully!',
      });

      vscode.window.showInformationMessage('TaskOS: API key configured successfully!');
      
      // Notify extension to update API client
      if (ApiKeyPanel.onApiKeySaved) {
        ApiKeyPanel.onApiKeySaved(apiKey.trim(), apiUrl.trim() || 'https://www.task-os.app/api/v1');
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
    <title>TaskOS — Connect</title>
    <style>
        :root {
          --bg-primary: #06060a; --bg-secondary: #0c0c14; --bg-card: #0e0e18;
          --bg-input: #0e0e1a; --bg-elevated: #16162a;
          --border-subtle: rgba(255,255,255,0.06); --border-default: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.12); --border-focus: rgba(124,58,237,0.5);
          --border-accent: rgba(124,58,237,0.3);
          --text-primary: #f0f0f5; --text-secondary: rgba(240,240,245,0.65);
          --text-tertiary: rgba(240,240,245,0.4);
          --accent-primary: #7C3AED; --accent-primary-hover: #8B5CF6;
          --accent-primary-subtle: rgba(124,58,237,0.12);
          --accent-gradient: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
          --success: #10B981; --success-subtle: rgba(16,185,129,0.12);
          --danger: #EF4444; --danger-subtle: rgba(239,68,68,0.12);
          --warning-subtle: rgba(245,158,11,0.12);
          --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;
          --font-sans: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
          --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
          --transition-base: 200ms cubic-bezier(0.4,0,0.2,1);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: var(--font-sans); background: var(--bg-primary);
          color: var(--text-primary); min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; -webkit-font-smoothing: antialiased;
        }

        .container { width: 100%; max-width: 440px; }

        .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .brand-icon {
          width: 34px; height: 34px; border-radius: var(--radius-sm);
          background: var(--accent-gradient);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 800; color: #fff;
          box-shadow: 0 0 20px rgba(124,58,237,0.2);
        }
        .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }

        .card {
          background: var(--bg-card); border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg); padding: 24px;
        }

        .card-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
        .card-sub { font-size: 13px; color: var(--text-tertiary); margin-bottom: 20px; line-height: 1.5; }

        .info-box {
          background: var(--accent-primary-subtle); border: 1px solid var(--border-accent);
          border-radius: var(--radius-md); padding: 14px; margin-bottom: 20px;
          font-size: 13px; color: var(--text-secondary); line-height: 1.6;
        }
        .info-box strong { color: var(--accent-primary-hover); }
        .info-box a { color: var(--accent-primary-hover); text-decoration: none; }
        .info-box a:hover { text-decoration: underline; }

        .status-configured {
          display: flex; align-items: center; gap: 8px;
          background: var(--success-subtle); border: 1px solid rgba(16,185,129,0.2);
          border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 20px;
          font-size: 13px; font-weight: 500; color: var(--success);
        }
        .status-configured .key-mask {
          font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary);
          margin-left: auto;
        }

        .form-group { margin-bottom: 16px; }
        .form-label {
          display: block; font-size: 12px; font-weight: 600;
          color: var(--text-secondary); text-transform: uppercase;
          letter-spacing: 0.5px; margin-bottom: 6px;
        }
        .form-input {
          width: 100%; padding: 10px 14px;
          background: var(--bg-input); border: 1px solid var(--border-default);
          border-radius: var(--radius-md); color: var(--text-primary);
          font-size: 13px; font-family: var(--font-sans);
          transition: all var(--transition-base);
        }
        .form-input:focus {
          outline: none; border-color: var(--border-focus);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
        }
        .form-input::placeholder { color: var(--text-tertiary); }
        .form-hint { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }

        .actions { display: flex; gap: 10px; margin-top: 22px; }
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 20px; border-radius: var(--radius-md);
          border: 1px solid transparent; font-weight: 600; font-size: 13px;
          cursor: pointer; transition: all var(--transition-base); font-family: var(--font-sans);
        }
        .btn:active { transform: scale(0.97); }
        .btn-primary {
          background: var(--accent-gradient); color: #fff; flex: 1;
          box-shadow: 0 1px 3px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .btn-primary:hover { box-shadow: 0 4px 16px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.1); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-ghost {
          background: transparent; color: var(--text-secondary); border-color: var(--border-default);
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }

        .toast {
          padding: 12px 14px; border-radius: var(--radius-md);
          margin-top: 16px; font-size: 13px; animation: fadeIn 0.2s ease;
        }
        .toast-success { background: var(--success-subtle); color: var(--success); border: 1px solid rgba(16,185,129,0.2); }
        .toast-error { background: var(--danger-subtle); color: #F87171; border: 1px solid rgba(239,68,68,0.2); }
        .toast-info { background: var(--warning-subtle); color: #FBBF24; border: 1px solid rgba(245,158,11,0.2); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="container">
      <div class="brand">
        <div class="brand-icon">T</div>
        <div class="brand-name">TaskOS</div>
      </div>

      <div class="card">
        <div class="card-title">Connect your account</div>
        <div class="card-sub">Enter your API key to sync tasks and enable AI features</div>

        ${data.hasApiKey ? `
          <div class="status-configured">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
            Connected
            <span class="key-mask">${data.apiKey}</span>
          </div>
        ` : `
          <div class="info-box">
            <strong>How to get your API key:</strong><br>
            1. Open <a href="https://www.task-os.app/en/app/account" target="_blank">Account Settings</a><br>
            2. Go to <strong>Security → API Keys</strong><br>
            3. Create a key and paste it below
          </div>
        `}

        <form id="apiKeyForm">
          <div class="form-group">
            <label class="form-label" for="apiKey">API Key</label>
            <input class="form-input" type="password" id="apiKey" placeholder="taskos_..." autocomplete="off" required />
            <div class="form-hint">Starts with "taskos_" — keep it secure</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="apiUrl">API URL</label>
            <input class="form-input" type="text" id="apiUrl" value="${data.apiUrl}" placeholder="https://www.task-os.app/api/v1" />
          </div>

          <div class="form-group">
            <label class="form-label" for="workspaceId">Workspace ID <span style="color:#EF4444;font-weight:700;">*</span></label>
            <input class="form-input" type="text" id="workspaceId" value="${data.workspaceId}" placeholder="Your workspace UUID" />
            <div class="form-hint">Required — find it in your workspace URL: task-os.app/en/app/<strong>your-id</strong>/dashboard</div>
          </div>

          <div class="actions">
            <button type="submit" class="btn btn-primary" id="saveButton">Save & Connect</button>
            <button type="button" class="btn btn-ghost" onclick="checkStatus()">Check Status</button>
          </div>
        </form>

        <div id="statusMessage"></div>
      </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const form = document.getElementById('apiKeyForm');
        const statusMessage = document.getElementById('statusMessage');
        const saveButton = document.getElementById('saveButton');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const apiKey = document.getElementById('apiKey').value;
            const apiUrl = document.getElementById('apiUrl').value;
            if (!apiKey || apiKey.trim().length === 0) { showMessage('API key is required', 'error'); return; }
            if (!apiKey.startsWith('taskos_')) { showMessage('API key should start with "taskos_"', 'error'); return; }
            saveButton.disabled = true; saveButton.textContent = 'Connecting...';
            vscode.postMessage({ command: 'saveApiKey', apiKey: apiKey.trim(), apiUrl: apiUrl.trim() || 'https://www.task-os.app/api/v1' });
        });

        function checkStatus() { vscode.postMessage({ command: 'checkApiKey' }); }

        function showMessage(message, type) {
            statusMessage.innerHTML = '<div class="toast toast-' + type + '">' + message + '</div>';
            setTimeout(() => { statusMessage.innerHTML = ''; }, 5000);
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            switch (msg.command) {
                case 'success': showMessage(msg.message, 'success'); saveButton.disabled = false; saveButton.textContent = 'Save & Connect'; break;
                case 'error': showMessage(msg.message, 'error'); saveButton.disabled = false; saveButton.textContent = 'Save & Connect'; break;
                case 'apiKeyStatus':
                    showMessage(msg.hasApiKey ? 'Connected: ' + msg.maskedKey : 'No API key configured', msg.hasApiKey ? 'success' : 'info');
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
