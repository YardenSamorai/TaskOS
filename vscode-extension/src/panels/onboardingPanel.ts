import * as vscode from 'vscode';

export class OnboardingPanel {
  public static currentPanel: OnboardingPanel | undefined;
  public static readonly viewType = 'taskosOnboarding';
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private static onComplete: ((apiKey: string, apiUrl: string, workspaceId: string) => void) | null = null;

  public static setOnComplete(callback: (apiKey: string, apiUrl: string, workspaceId: string) => void) {
    OnboardingPanel.onComplete = callback;
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    if (OnboardingPanel.currentPanel) {
      OnboardingPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      OnboardingPanel.viewType,
      'Welcome to TaskOS',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    OnboardingPanel.currentPanel = new OnboardingPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._panel.webview.html = this._getHtml();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'complete':
          await this._saveConfig(message.apiKey, message.apiUrl, message.workspaceId);
          return;
        case 'validate':
          await this._validateConnection(message.apiKey, message.apiUrl);
          return;
        case 'openExternal':
          vscode.env.openExternal(vscode.Uri.parse(message.url));
          return;
        case 'skip':
          this._panel.dispose();
          return;
      }
    }, null, this._disposables);
  }

  private async _validateConnection(apiKey: string, apiUrl: string) {
    try {
      // Simple fetch to tasks endpoint — any HTTP response means server is reachable
      const url = `${apiUrl}/tasks?workspaceId=_validate&limit=1`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        this._panel.webview.postMessage({ command: 'validationResult', success: false, error: 'Invalid API key. Please check and try again.' });
      } else {
        // Any other response (200, 400, 403, 500) means server is reachable and key is accepted
        this._panel.webview.postMessage({ command: 'validationResult', success: true });
      }
    } catch {
      // fetch itself threw — network error, DNS failure, etc.
      this._panel.webview.postMessage({ command: 'validationResult', success: false, error: 'Cannot reach server. Check your internet connection.' });
    }
  }

  private async _saveConfig(apiKey: string, apiUrl: string, workspaceId: string) {
    try {
      const config = vscode.workspace.getConfiguration('taskos');
      await config.update('apiKey', apiKey.trim(), vscode.ConfigurationTarget.Global);
      await config.update('apiUrl', apiUrl.trim() || 'https://www.task-os.app/api/v1', vscode.ConfigurationTarget.Global);
      if (workspaceId.trim()) {
        await config.update('defaultWorkspaceId', workspaceId.trim(), vscode.ConfigurationTarget.Global);
      }

      if (OnboardingPanel.onComplete) {
        OnboardingPanel.onComplete(apiKey.trim(), apiUrl.trim() || 'https://www.task-os.app/api/v1', workspaceId.trim());
      }

      vscode.window.showInformationMessage('TaskOS is ready! Click the TaskOS icon in the sidebar to get started.');

      setTimeout(() => this._panel.dispose(), 1200);
    } catch (error) {
      this._panel.webview.postMessage({ command: 'error', message: `Failed to save: ${error}` });
    }
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to TaskOS</title>
<style>
  :root {
    --bg: #06060a; --bg-card: #0e0e18; --bg-input: #0e0e1a;
    --bg-elevated: #16162a; --bg-step: #0a0a12;
    --border: rgba(255,255,255,0.06); --border-hover: rgba(255,255,255,0.12);
    --border-focus: rgba(124,58,237,0.5); --border-accent: rgba(124,58,237,0.3);
    --text: #f0f0f5; --text-secondary: rgba(240,240,245,0.65);
    --text-muted: rgba(240,240,245,0.4);
    --accent: #7C3AED; --accent-hover: #8B5CF6;
    --accent-subtle: rgba(124,58,237,0.12);
    --accent-glow: rgba(124,58,237,0.25);
    --success: #10B981; --success-subtle: rgba(16,185,129,0.12);
    --danger: #EF4444; --danger-subtle: rgba(239,68,68,0.12);
    --radius: 12px; --radius-sm: 8px;
    --font: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    --mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--font); background: var(--bg); color: var(--text);
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px; -webkit-font-smoothing: antialiased;
  }

  .wizard { width: 100%; max-width: 520px; }

  /* Header */
  .header { text-align: center; margin-bottom: 32px; }
  .logo {
    width: 56px; height: 56px; border-radius: 16px;
    background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 16px;
    box-shadow: 0 0 40px var(--accent-glow);
  }
  .header h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 6px; }
  .header p { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }

  /* Progress */
  .progress { display: flex; align-items: center; gap: 0; margin-bottom: 28px; padding: 0 4px; }
  .progress-step {
    display: flex; align-items: center; gap: 8px; flex: 1;
    font-size: 12px; font-weight: 600; color: var(--text-muted);
    transition: color 0.3s;
  }
  .progress-step.active { color: var(--accent-hover); }
  .progress-step.done { color: var(--success); }
  .step-dot {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid var(--border); background: var(--bg-card);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; transition: all 0.3s;
    flex-shrink: 0;
  }
  .progress-step.active .step-dot {
    border-color: var(--accent); background: var(--accent-subtle);
    color: var(--accent-hover); box-shadow: 0 0 12px var(--accent-glow);
  }
  .progress-step.done .step-dot {
    border-color: var(--success); background: var(--success-subtle); color: var(--success);
  }
  .progress-line {
    flex: 1; height: 2px; background: var(--border); margin: 0 6px;
    transition: background 0.3s;
  }
  .progress-line.done { background: var(--success); }

  /* Card */
  .card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 28px; position: relative;
    overflow: hidden;
  }
  .card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity: 0.5;
  }

  /* Steps */
  .step { display: none; animation: fadeIn 0.3s ease; }
  .step.active { display: block; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  .step-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  .step-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.6; }

  /* Info box */
  .info-box {
    background: var(--accent-subtle); border: 1px solid var(--border-accent);
    border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 20px;
    font-size: 13px; color: var(--text-secondary); line-height: 1.7;
  }
  .info-box a { color: var(--accent-hover); text-decoration: none; cursor: pointer; }
  .info-box a:hover { text-decoration: underline; }
  .info-box strong { color: var(--text); }
  .info-box .step-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: 50%; background: var(--accent);
    color: #fff; font-size: 11px; font-weight: 700; margin-right: 6px;
  }

  /* Form */
  .form-group { margin-bottom: 16px; }
  .form-label {
    display: block; font-size: 12px; font-weight: 600;
    color: var(--text-secondary); text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 6px;
  }
  .form-input {
    width: 100%; padding: 11px 14px;
    background: var(--bg-input); border: 1px solid var(--border);
    border-radius: var(--radius-sm); color: var(--text);
    font-size: 13px; font-family: var(--font); transition: all 0.2s;
  }
  .form-input:focus {
    outline: none; border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
  }
  .form-input::placeholder { color: var(--text-muted); }
  .form-input.mono { font-family: var(--mono); font-size: 12px; }
  .form-hint { font-size: 11px; color: var(--text-muted); margin-top: 5px; line-height: 1.5; }
  .form-input.success { border-color: var(--success); }
  .form-input.error { border-color: var(--danger); }

  /* Buttons */
  .actions { display: flex; gap: 10px; margin-top: 24px; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 11px 22px; border-radius: var(--radius-sm);
    border: none; font-weight: 600; font-size: 13px;
    cursor: pointer; transition: all 0.2s; font-family: var(--font);
  }
  .btn:active { transform: scale(0.97); }
  .btn-primary {
    background: linear-gradient(135deg, #7C3AED, #6D28D9); color: #fff; flex: 1;
    box-shadow: 0 2px 8px rgba(124,58,237,0.3);
  }
  .btn-primary:hover { box-shadow: 0 4px 20px rgba(124,58,237,0.4); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .btn-secondary {
    background: rgba(255,255,255,0.04); color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.06); color: var(--text); }
  .btn-text { background: none; border: none; color: var(--text-muted); padding: 8px 12px; font-size: 12px; }
  .btn-text:hover { color: var(--text-secondary); }

  /* Validation */
  .validate-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .validate-status {
    font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px;
  }
  .validate-status.success { color: var(--success); }
  .validate-status.error { color: var(--danger); }
  .validate-status.loading { color: var(--text-muted); }
  .spinner {
    width: 14px; height: 14px; border: 2px solid var(--border);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* URL preset */
  .url-preset {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-sm); font-family: var(--mono);
    font-size: 12px; color: var(--success); margin-bottom: 4px;
    cursor: default;
  }
  .url-preset svg { flex-shrink: 0; }

  /* Success screen */
  .success-screen { text-align: center; padding: 12px 0; }
  .success-icon {
    width: 64px; height: 64px; border-radius: 50%;
    background: var(--success-subtle); border: 2px solid rgba(16,185,129,0.3);
    display: inline-flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
  }
  .success-screen h2 { font-size: 20px; margin-bottom: 8px; }
  .success-screen p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 6px; }

  .tip-cards { display: flex; gap: 8px; margin-top: 20px; text-align: left; }
  .tip-card {
    flex: 1; padding: 12px; border-radius: var(--radius-sm);
    background: var(--bg-elevated); border: 1px solid var(--border);
  }
  .tip-card .tip-icon { font-size: 18px; margin-bottom: 6px; }
  .tip-card .tip-title { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
  .tip-card .tip-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; }

  /* Footer */
  .footer { text-align: center; margin-top: 16px; }
</style>
</head>
<body>
<div class="wizard">
  <!-- Header -->
  <div class="header">
    <div class="logo">T</div>
    <h1>Welcome to TaskOS</h1>
    <p>Let's connect your account in under a minute</p>
  </div>

  <!-- Progress -->
  <div class="progress">
    <div class="progress-step active" id="prog-1">
      <div class="step-dot">1</div>
      <span class="step-label">API Key</span>
    </div>
    <div class="progress-line" id="line-1"></div>
    <div class="progress-step" id="prog-2">
      <div class="step-dot">2</div>
      <span class="step-label">Workspace</span>
    </div>
    <div class="progress-line" id="line-2"></div>
    <div class="progress-step" id="prog-3">
      <div class="step-dot">3</div>
      <span class="step-label">Done</span>
    </div>
  </div>

  <!-- Card -->
  <div class="card">

    <!-- Step 1: API Key -->
    <div class="step active" id="step-1">
      <div class="step-title">Connect your API Key</div>
      <div class="step-desc">This lets TaskOS sync your tasks and use AI features securely.</div>

      <div class="info-box">
        <span class="step-num">1</span> Go to <a onclick="openLink('https://www.task-os.app/en/app/account')">Account Settings</a><br>
        <span class="step-num">2</span> Navigate to <strong>Security → API Keys</strong><br>
        <span class="step-num">3</span> Click <strong>Create Key</strong> and paste it below
      </div>

      <div class="form-group">
        <label class="form-label">API Key</label>
        <input class="form-input mono" type="password" id="apiKey" placeholder="taskos_..." autocomplete="off" />
        <div class="form-hint">Starts with <strong>taskos_</strong> — keep it safe, you can't see it again</div>
      </div>

      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">API URL</label>
        <div class="url-preset">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
          https://www.task-os.app/api/v1
        </div>
        <div class="form-hint">Auto-configured — no changes needed</div>
        <input type="hidden" id="apiUrl" value="https://www.task-os.app/api/v1" />
      </div>

      <div class="validate-row">
        <div class="validate-status" id="validateStatus"></div>
      </div>

      <div class="actions">
        <button class="btn btn-primary" id="nextBtn1" onclick="validateAndNext()" disabled>
          Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>

    <!-- Step 2: Workspace -->
    <div class="step" id="step-2">
      <div class="step-title">Connect your Workspace</div>
      <div class="step-desc">TaskOS needs your workspace ID to load your tasks and projects. Without it, the extension can't work.</div>

      <div class="info-box">
        <strong>How to find your Workspace ID:</strong><br><br>
        <span class="step-num">1</span> Open <a onclick="openLink('https://www.task-os.app')">task-os.app</a> and sign in<br>
        <span class="step-num">2</span> Enter any workspace<br>
        <span class="step-num">3</span> Copy the ID from the URL:<br><br>
        <code style="background:rgba(255,255,255,0.06);padding:8px 12px;border-radius:6px;font-family:var(--mono);font-size:12px;display:block;line-height:1.6;">
          task-os.app/en/app/<strong style="color:#7C3AED;text-decoration:underline;text-underline-offset:3px;">this-part-is-your-id</strong>/dashboard
        </code>
      </div>

      <div class="form-group">
        <label class="form-label">Workspace ID <span style="color:#EF4444;font-weight:700;">*</span></label>
        <input class="form-input mono" type="text" id="workspaceId" placeholder="e.g. c8f52856-6ee7-4dad-a4e1-12e4f9243c6f" />
        <div class="form-hint">Required — paste the UUID from your browser address bar</div>
      </div>

      <div id="wsError" style="display:none; font-size:12px; color:var(--danger); margin-top:-8px; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span>Workspace ID is required</span>
      </div>

      <div class="actions">
        <button class="btn btn-secondary" onclick="goToStep(1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
          Back
        </button>
        <button class="btn btn-primary" id="finishBtn" onclick="finishSetup()" disabled>
          Finish Setup
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
        </button>
      </div>
    </div>

    <!-- Step 3: Done -->
    <div class="step" id="step-3">
      <div class="success-screen">
        <div class="success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <h2>You're all set!</h2>
        <p>TaskOS is connected and ready to go.</p>
        <p style="color:var(--text-muted);font-size:12px;">Look for the <strong style="color:var(--text);">TaskOS icon</strong> in your sidebar to start managing tasks.</p>

        <div class="tip-cards">
          <div class="tip-card">
            <div class="tip-icon">📋</div>
            <div class="tip-title">View Tasks</div>
            <div class="tip-desc">Click TaskOS in the sidebar to see your tasks</div>
          </div>
          <div class="tip-card">
            <div class="tip-icon">🤖</div>
            <div class="tip-title">AI Pipeline</div>
            <div class="tip-desc">Ctrl+Shift+P → "TaskOS: Run Pipeline"</div>
          </div>
          <div class="tip-card">
            <div class="tip-icon">⚙️</div>
            <div class="tip-title">Profiles</div>
            <div class="tip-desc">Set code style & review standards</div>
          </div>
        </div>
      </div>

      <div class="actions" style="justify-content:center; margin-top:24px;">
        <button class="btn btn-primary" onclick="vscode.postMessage({command:'skip'})" style="max-width:220px;">
          Open TaskOS
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>

  </div>

  <!-- Skip -->
  <div class="footer" id="skipFooter">
    <button class="btn btn-text" onclick="vscode.postMessage({command:'skip'})">Skip for now — I'll configure later</button>
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();
  let currentStep = 1;

  const apiKeyInput = document.getElementById('apiKey');

  // Enable/disable continue button based on input
  apiKeyInput.addEventListener('input', () => {
    const val = apiKeyInput.value.trim();
    document.getElementById('nextBtn1').disabled = val.length < 8;
    // Clear validation when typing
    document.getElementById('validateStatus').innerHTML = '';
    apiKeyInput.classList.remove('success', 'error');
  });

  function openLink(url) {
    vscode.postMessage({ command: 'openExternal', url });
  }

  function goToStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-' + step).classList.add('active');

    // Update progress
    for (let i = 1; i <= 3; i++) {
      const prog = document.getElementById('prog-' + i);
      prog.classList.remove('active', 'done');
      if (i < step) prog.classList.add('done');
      else if (i === step) prog.classList.add('active');
    }
    for (let i = 1; i <= 2; i++) {
      const line = document.getElementById('line-' + i);
      line.classList.toggle('done', i < step);
    }

    // Hide skip on success screen
    document.getElementById('skipFooter').style.display = step === 3 ? 'none' : 'block';

    currentStep = step;
  }

  function validateAndNext() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) return;

    if (!apiKey.startsWith('taskos_')) {
      document.getElementById('validateStatus').innerHTML =
        '<div class="validate-status error"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Key must start with taskos_</div>';
      apiKeyInput.classList.add('error');
      return;
    }

    // Show loading
    document.getElementById('validateStatus').innerHTML =
      '<div class="validate-status loading"><div class="spinner"></div> Verifying connection...</div>';
    document.getElementById('nextBtn1').disabled = true;

    const apiUrl = document.getElementById('apiUrl').value;
    vscode.postMessage({ command: 'validate', apiKey, apiUrl });
  }

  // Workspace ID input validation
  const wsInput = document.getElementById('workspaceId');
  const wsError = document.getElementById('wsError');
  const finishBtn = document.getElementById('finishBtn');

  wsInput.addEventListener('input', () => {
    const val = wsInput.value.trim();
    finishBtn.disabled = val.length < 5;
    wsError.style.display = 'none';
    wsInput.classList.remove('error');
  });

  function finishSetup() {
    const apiKey = apiKeyInput.value.trim();
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const workspaceId = wsInput.value.trim();

    if (!workspaceId || workspaceId.length < 5) {
      wsError.style.display = 'flex';
      wsInput.classList.add('error');
      wsInput.focus();
      return;
    }

    vscode.postMessage({ command: 'complete', apiKey, apiUrl, workspaceId });
    goToStep(3);
  }

  // Listen for messages from extension
  window.addEventListener('message', event => {
    const msg = event.data;
    switch (msg.command) {
      case 'validationResult':
        if (msg.success) {
          document.getElementById('validateStatus').innerHTML =
            '<div class="validate-status success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg> Connected successfully</div>';
          apiKeyInput.classList.remove('error');
          apiKeyInput.classList.add('success');
          setTimeout(() => goToStep(2), 600);
        } else {
          document.getElementById('validateStatus').innerHTML =
            '<div class="validate-status error"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + (msg.error || 'Connection failed') + '</div>';
          apiKeyInput.classList.add('error');
          document.getElementById('nextBtn1').disabled = false;
        }
        break;
      case 'error':
        document.getElementById('validateStatus').innerHTML =
          '<div class="validate-status error">' + msg.message + '</div>';
        document.getElementById('nextBtn1').disabled = false;
        break;
    }
  });

  // Auto-focus
  apiKeyInput.focus();
</script>
</body>
</html>`;
  }

  public dispose() {
    OnboardingPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
