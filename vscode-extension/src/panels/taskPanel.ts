import * as vscode from 'vscode';
import { TaskOSApiClient, Task, TaskStep } from '../api/client';
import { AgentService } from '../services/agentService';

export class TaskPanel {
  public static currentPanel: TaskPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _apiClient: TaskOSApiClient;
  private _workspaceId: string;
  private _currentView: 'list' | 'detail' = 'list';
  private _selectedTaskId: string | null = null;
  private _autoRefreshInterval: NodeJS.Timeout | null = null;
  private _lastTasksHash: string = '';

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    apiClient: TaskOSApiClient,
    workspaceId: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._apiClient = apiClient;
    this._workspaceId = workspaceId;

    this._update();
    this._startAutoRefresh();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('taskos.autoRefresh') || e.affectsConfiguration('taskos.autoRefreshInterval')) {
        this._restartAutoRefresh();
      }
    }, null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'refresh':
            await this._update();
            break;
          case 'updateStatus':
            await this._updateTaskStatus(message.taskId, message.status);
            break;
          case 'updatePriority':
            await this._updateTaskPriority(message.taskId, message.priority);
            break;
          case 'openTask':
            this._selectedTaskId = message.taskId;
            this._currentView = 'detail';
            await this._showTaskDetail(message.taskId);
            break;
          case 'backToList':
            this._currentView = 'list';
            this._selectedTaskId = null;
            await this._update();
            break;
          case 'createTask':
            await this._createTask(message.title, message.description, message.priority);
            break;
          case 'filter':
            await this._update(message.status, message.priority, message.search);
            break;
          case 'updateTask':
            await this._updateTaskDetails(message.taskId, message.updates);
            break;
          case 'addStep':
            await this._addStep(message.taskId, message.content);
            break;
          case 'toggleStep':
            await this._toggleStep(message.taskId, message.stepId, message.completed);
            break;
          case 'deleteStep':
            await this._deleteStep(message.taskId, message.stepId);
            break;
          case 'deleteTask':
            await this._deleteTask(message.taskId);
            break;
          case 'openInBrowser':
            const config = vscode.workspace.getConfiguration('taskos');
            const apiUrl = config.get<string>('apiUrl', '');
            const baseUrl = apiUrl.replace('/api/v1', '');
            vscode.env.openExternal(vscode.Uri.parse(`${baseUrl}/en/app/${this._workspaceId}/tasks/${message.taskId}`));
            break;
          case 'sendToAgent':
            await vscode.commands.executeCommand('taskos.sendToAgent', message.taskId);
            break;
          case 'createPR':
            await vscode.commands.executeCommand('taskos.createPR', message.taskId, message.taskTitle);
            break;
          case 'runPipeline':
            await vscode.commands.executeCommand('taskos.runPipeline', message.taskId);
            break;
          case 'configureProfiles':
            await vscode.commands.executeCommand('taskos.configureProfiles');
            break;
          case 'viewPrompt':
            await this._viewPrompt(message.taskId);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static render(extensionUri: vscode.Uri, apiClient: TaskOSApiClient, workspaceId: string) {
    if (TaskPanel.currentPanel) {
      TaskPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'taskosPanel',
      'TaskOS',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    TaskPanel.currentPanel = new TaskPanel(panel, extensionUri, apiClient, workspaceId);
  }

  private async _updateTaskStatus(taskId: string, status: string) {
    try {
      await this._apiClient.updateTask(taskId, { status: status as any });
      if (this._currentView === 'detail') {
        await this._showTaskDetail(taskId);
      } else {
        await this._update();
      }
    } catch (error) {
      vscode.window.showErrorMessage('Failed to update task status');
    }
  }

  private async _updateTaskPriority(taskId: string, priority: string) {
    try {
      await this._apiClient.updateTask(taskId, { priority: priority as any });
      if (this._currentView === 'detail') {
        await this._showTaskDetail(taskId);
      } else {
        await this._update();
      }
    } catch (error) {
      vscode.window.showErrorMessage('Failed to update task priority');
    }
  }

  private async _updateTaskDetails(taskId: string, updates: any) {
    try {
      await this._apiClient.updateTask(taskId, updates);
      await this._showTaskDetail(taskId);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to update task');
    }
  }

  private async _addStep(taskId: string, content: string) {
    try {
      vscode.window.showInformationMessage('To add steps, please use the web app.');
      await this._showTaskDetail(taskId);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to add step');
    }
  }

  private async _toggleStep(taskId: string, stepId: string, completed: boolean) {
    try {
      vscode.window.showInformationMessage('To update steps, please use the web app.');
      await this._showTaskDetail(taskId);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to update step');
    }
  }

  private async _deleteStep(taskId: string, stepId: string) {
    try {
      vscode.window.showInformationMessage('To delete steps, please use the web app.');
      await this._showTaskDetail(taskId);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to delete step');
    }
  }

  private async _viewPrompt(taskId: string) {
    try {
      const task = await this._apiClient.getTask(taskId);
      const agentService = new AgentService();
      const prompt = agentService.generatePrompt(task);
      const doc = await vscode.workspace.openTextDocument({
        content: prompt,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to generate prompt');
    }
  }

  private async _deleteTask(taskId: string) {
    try {
      await this._apiClient.deleteTask(taskId);
      this._currentView = 'list';
      this._selectedTaskId = null;
      await this._update();
      vscode.window.showInformationMessage('Task deleted successfully!');
    } catch (error) {
      vscode.window.showErrorMessage('Failed to delete task');
    }
  }

  private async _createTask(title: string, description: string, priority: string) {
    try {
      await this._apiClient.createTask({
        workspaceId: this._workspaceId,
        title,
        description,
        priority: priority as any,
        status: 'todo'
      });
      await this._update();
    } catch (error) {
      vscode.window.showErrorMessage('Failed to create task');
    }
  }

  private async _showTaskDetail(taskId: string) {
    try {
      const task = await this._apiClient.getTask(taskId);
      this._panel.webview.html = this._getTaskDetailContent(task);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to load task details');
    }
  }

  private async _update(statusFilter?: string, priorityFilter?: string, searchQuery?: string) {
    try {
      const filters: any = {};
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter && priorityFilter !== 'all') filters.priority = priorityFilter;
      
      const { tasks } = await this._apiClient.listTasks(this._workspaceId, { ...filters, limit: 50 });
      
      let filteredTasks = tasks;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredTasks = tasks.filter(t => 
          t.title.toLowerCase().includes(query) || 
          (t.description && t.description.toLowerCase().includes(query))
        );
      }
      
      this._panel.webview.html = this._getListContent(filteredTasks);
    } catch (error) {
      this._panel.webview.html = this._getErrorContent(error);
    }
  }

  // ===================== DESIGN SYSTEM =====================

  private _getDesignTokens(): string {
    return `
      :root {
        --bg-primary: #06060a;
        --bg-secondary: #0c0c14;
        --bg-tertiary: #12121e;
        --bg-card: #0e0e18;
        --bg-card-hover: #141422;
        --bg-elevated: #16162a;
        --bg-input: #0e0e1a;

        --border-subtle: rgba(255,255,255,0.06);
        --border-default: rgba(255,255,255,0.08);
        --border-hover: rgba(255,255,255,0.12);
        --border-focus: rgba(124,58,237,0.5);
        --border-accent: rgba(124,58,237,0.3);

        --text-primary: #f0f0f5;
        --text-secondary: rgba(240,240,245,0.65);
        --text-tertiary: rgba(240,240,245,0.4);
        --text-inverse: #06060a;

        --accent-primary: #7C3AED;
        --accent-primary-hover: #8B5CF6;
        --accent-primary-subtle: rgba(124,58,237,0.12);
        --accent-gradient: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
        --accent-gradient-vivid: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%);

        --success: #10B981;
        --success-subtle: rgba(16,185,129,0.12);
        --warning: #F59E0B;
        --warning-subtle: rgba(245,158,11,0.12);
        --danger: #EF4444;
        --danger-subtle: rgba(239,68,68,0.12);
        --info: #3B82F6;
        --info-subtle: rgba(59,130,246,0.12);

        --radius-sm: 6px;
        --radius-md: 10px;
        --radius-lg: 14px;
        --radius-xl: 18px;
        --radius-full: 100px;

        --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
        --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
        --shadow-lg: 0 8px 30px rgba(0,0,0,0.5);
        --shadow-glow: 0 0 20px rgba(124,58,237,0.15);

        --font-sans: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;

        --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
        --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
        --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
      }
    `;
  }

  private _getBaseStyles(): string {
    return `
      ${this._getDesignTokens()}

      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: var(--font-sans);
        background: var(--bg-primary);
        color: var(--text-primary);
        min-height: 100vh;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }

      /* ---- Buttons ---- */
      .btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        padding: 9px 18px;
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        font-weight: 500; font-size: 13px; font-family: var(--font-sans);
        cursor: pointer;
        transition: all var(--transition-base);
        white-space: nowrap;
        line-height: 1.4;
      }
      .btn:active { transform: scale(0.97); }

      .btn-primary {
        background: var(--accent-gradient);
        color: #fff; border-color: transparent;
        box-shadow: 0 1px 3px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
      }
      .btn-primary:hover { box-shadow: 0 4px 16px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.1); }

      .btn-ghost {
        background: transparent;
        color: var(--text-secondary); border-color: var(--border-default);
      }
      .btn-ghost:hover { background: rgba(255,255,255,0.04); border-color: var(--border-hover); color: var(--text-primary); }

      .btn-success {
        background: var(--success); color: #fff;
        box-shadow: 0 1px 3px rgba(16,185,129,0.3);
      }
      .btn-success:hover { box-shadow: 0 4px 16px rgba(16,185,129,0.4); }

      .btn-warning {
        background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        color: var(--text-inverse); font-weight: 600;
        box-shadow: 0 1px 3px rgba(245,158,11,0.3);
      }
      .btn-warning:hover { box-shadow: 0 4px 16px rgba(245,158,11,0.4); }

      .btn-danger-ghost {
        background: var(--danger-subtle); color: #F87171; border-color: rgba(239,68,68,0.2);
      }
      .btn-danger-ghost:hover { background: rgba(239,68,68,0.2); }

      .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: var(--radius-sm); }
      .btn-lg { padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: var(--radius-lg); }
      .btn-icon { padding: 8px; min-width: 34px; }

      /* ---- Badges ---- */
      .badge {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 3px 10px; border-radius: var(--radius-full);
        font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
        text-transform: uppercase; line-height: 1.5;
      }

      .status-backlog  { background: rgba(107,114,128,0.15); color: #9CA3AF; }
      .status-todo     { background: var(--info-subtle);      color: #60A5FA; }
      .status-in_progress { background: var(--warning-subtle); color: #FBBF24; }
      .status-review   { background: var(--accent-primary-subtle); color: #C084FC; }
      .status-done     { background: var(--success-subtle);   color: #34D399; }

      .priority-urgent { background: var(--danger-subtle);  color: #F87171; }
      .priority-high   { background: rgba(249,115,22,0.12); color: #FB923C; }
      .priority-medium { background: var(--warning-subtle); color: #FBBF24; }
      .priority-low    { background: var(--success-subtle); color: #34D399; }

      /* ---- Forms ---- */
      .form-group { margin-bottom: 20px; }

      .form-label {
        display: block; font-size: 12px; font-weight: 600;
        color: var(--text-secondary); text-transform: uppercase;
        letter-spacing: 0.5px; margin-bottom: 8px;
      }

      .form-input, .form-select {
        width: 100%; padding: 11px 14px;
        background: var(--bg-input);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        color: var(--text-primary); font-size: 14px;
        font-family: var(--font-sans);
        transition: all var(--transition-base);
      }
      .form-input:focus, .form-select:focus {
        outline: none; border-color: var(--border-focus);
        box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
      }
      .form-input::placeholder { color: var(--text-tertiary); }
      .form-textarea { min-height: 100px; resize: vertical; font-family: var(--font-sans); }
      .form-select { cursor: pointer; appearance: none; }
      .form-select option { background: var(--bg-secondary); }

      /* ---- Cards ---- */
      .card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        transition: all var(--transition-base);
      }
      .card:hover { border-color: var(--border-hover); }
      .card-body { padding: 20px; }

      /* ---- Scrollbar ---- */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

      /* ---- Animations ---- */
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    `;
  }

  // ===================== TASK LIST VIEW =====================

  private _getListContent(tasks: Task[]): string {
    const stats = {
      total: tasks.length,
      done: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo' || t.status === 'backlog').length,
    };

    const taskCards = tasks.map((task, i) => this._renderTaskCard(task, i)).join('');

    return `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      ${this._getBaseStyles()}

      .shell { display: flex; flex-direction: column; min-height: 100vh; }

      /* ---- Top Bar ---- */
      .topbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 24px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border-subtle);
        position: sticky; top: 0; z-index: 100;
        backdrop-filter: blur(12px);
      }
      .topbar-brand { display: flex; align-items: center; gap: 10px; }
      .topbar-logo {
        width: 30px; height: 30px; border-radius: var(--radius-sm);
        background: var(--accent-gradient);
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 800; color: #fff;
        box-shadow: var(--shadow-glow);
      }
      .topbar-title { font-size: 15px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px; }
      .topbar-actions { display: flex; align-items: center; gap: 8px; }
      .live-dot {
        display: flex; align-items: center; gap: 6px;
        font-size: 11px; font-weight: 600; color: var(--success);
        padding: 4px 10px; border-radius: var(--radius-full);
        background: var(--success-subtle);
      }
      .live-dot::before {
        content: ''; width: 6px; height: 6px; border-radius: 50%;
        background: var(--success); animation: pulse 2s infinite;
      }

      /* ---- Stats ---- */
      .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 20px 24px 0; }
      .stat {
        background: var(--bg-card); border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg); padding: 16px;
        transition: all var(--transition-base);
      }
      .stat:hover { border-color: var(--border-hover); transform: translateY(-1px); }
      .stat-val { font-size: 26px; font-weight: 700; letter-spacing: -1px; margin-bottom: 2px; }
      .stat-lbl { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }

      .stat-total .stat-val { color: var(--accent-primary-hover); }
      .stat-prog  .stat-val { color: var(--warning); }
      .stat-done  .stat-val { color: var(--success); }
      .stat-todo  .stat-val { color: var(--info); }

      /* ---- Filters ---- */
      .filters {
        display: flex; gap: 10px; align-items: center; padding: 16px 24px;
        border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap;
      }
      .search-wrap { flex: 1; min-width: 200px; position: relative; }
      .search-wrap input {
        width: 100%; padding: 9px 14px 9px 38px;
        background: var(--bg-input); border: 1px solid var(--border-default);
        border-radius: var(--radius-md); color: var(--text-primary); font-size: 13px;
        transition: all var(--transition-base);
      }
      .search-wrap input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
      .search-wrap input::placeholder { color: var(--text-tertiary); }
      .search-wrap svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); }

      .filter-sel {
        padding: 9px 14px; background: var(--bg-input); border: 1px solid var(--border-default);
        border-radius: var(--radius-md); color: var(--text-secondary); font-size: 13px;
        cursor: pointer; transition: all var(--transition-base); appearance: none;
        font-family: var(--font-sans);
      }
      .filter-sel:focus { outline: none; border-color: var(--border-focus); }
      .filter-sel option { background: var(--bg-secondary); color: var(--text-primary); }

      /* ---- Task List ---- */
      .task-list { padding: 16px 24px; display: grid; gap: 8px; }
      .task-row {
        display: flex; align-items: center; gap: 14px;
        padding: 14px 16px; border-radius: var(--radius-md);
        background: var(--bg-card); border: 1px solid var(--border-subtle);
        cursor: pointer; transition: all var(--transition-base);
        animation: fadeIn var(--transition-slow) ease both;
      }
      .task-row:hover { background: var(--bg-card-hover); border-color: var(--border-hover); }
      .task-row:hover .task-agent-btn { opacity: 1; }

      .task-priority-dot {
        width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      }
      .dot-urgent, .dot-high { background: var(--danger); box-shadow: 0 0 6px rgba(239,68,68,0.4); }
      .dot-medium { background: var(--warning); box-shadow: 0 0 6px rgba(245,158,11,0.3); }
      .dot-low { background: var(--success); box-shadow: 0 0 6px rgba(16,185,129,0.3); }

      .task-info { flex: 1; min-width: 0; }
      .task-name { font-size: 14px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .task-sub { display: flex; gap: 8px; margin-top: 4px; align-items: center; }

      .task-agent-btn {
        opacity: 0; flex-shrink: 0;
        background: var(--accent-gradient); border: none; border-radius: var(--radius-sm);
        padding: 6px 10px; cursor: pointer; font-size: 12px; color: #fff;
        transition: all var(--transition-base); font-weight: 600;
      }
      .task-agent-btn:hover { box-shadow: var(--shadow-glow); transform: scale(1.05); }

      .task-steps-count {
        font-size: 11px; color: var(--text-tertiary); background: rgba(255,255,255,0.04);
        padding: 2px 8px; border-radius: var(--radius-full);
      }

      /* ---- Empty ---- */
      .empty { text-align: center; padding: 80px 24px; }
      .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; }
      .empty-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
      .empty-text { font-size: 13px; color: var(--text-tertiary); }

      /* ---- Modal ---- */
      .modal-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        display: none; align-items: center; justify-content: center; z-index: 200;
      }
      .modal-overlay.active { display: flex; }
      .modal {
        background: var(--bg-elevated); border: 1px solid var(--border-default);
        border-radius: var(--radius-xl); padding: 28px; width: 92%; max-width: 480px;
        box-shadow: var(--shadow-lg);
        animation: fadeIn var(--transition-slow) ease;
      }
      .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
      .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    </style>
    </head>
    <body>
      <div class="shell">
        <div class="topbar">
          <div class="topbar-brand">
            <div class="topbar-logo">T</div>
            <span class="topbar-title">TaskOS</span>
          </div>
          <div class="topbar-actions">
            <span class="live-dot">Live</span>
            <button class="btn btn-ghost btn-sm" onclick="refresh()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button class="btn btn-primary btn-sm" onclick="showCreateModal()">+ New Task</button>
          </div>
        </div>

        <div class="stats">
          <div class="stat stat-total"><div class="stat-val">${stats.total}</div><div class="stat-lbl">Total</div></div>
          <div class="stat stat-prog"><div class="stat-val">${stats.inProgress}</div><div class="stat-lbl">In Progress</div></div>
          <div class="stat stat-done"><div class="stat-val">${stats.done}</div><div class="stat-lbl">Done</div></div>
          <div class="stat stat-todo"><div class="stat-val">${stats.todo}</div><div class="stat-lbl">To Do</div></div>
        </div>

        <div class="filters">
          <div class="search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="searchInput" placeholder="Search tasks..." onkeyup="handleSearch()">
          </div>
          <select class="filter-sel" id="statusFilter" onchange="applyFilters()">
            <option value="all">All Status</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
          <select class="filter-sel" id="priorityFilter" onchange="applyFilters()">
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        ${tasks.length === 0 ? `
          <div class="empty">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No tasks found</div>
            <div class="empty-text">Create your first task to get started</div>
          </div>
        ` : `
          <div class="task-list">${taskCards}</div>
        `}
      </div>

      <div class="modal-overlay" id="createModal">
        <div class="modal">
          <div class="modal-title">Create Task</div>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="newTaskTitle" placeholder="What needs to be done?">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input form-textarea" id="newTaskDescription" placeholder="Add details..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-input" id="newTaskPriority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" onclick="hideCreateModal()">Cancel</button>
            <button class="btn btn-primary" onclick="createTask()">Create</button>
          </div>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        let searchTimeout;
        function refresh() { vscode.postMessage({ command: 'refresh' }); }
        function handleSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => applyFilters(), 250); }
        function applyFilters() {
          vscode.postMessage({ command: 'filter', status: document.getElementById('statusFilter').value, priority: document.getElementById('priorityFilter').value, search: document.getElementById('searchInput').value });
        }
        function openTask(id) { vscode.postMessage({ command: 'openTask', taskId: id }); }
        function quickAgent(e, id) { e.stopPropagation(); vscode.postMessage({ command: 'sendToAgent', taskId: id }); }
        function showCreateModal() { document.getElementById('createModal').classList.add('active'); document.getElementById('newTaskTitle').focus(); }
        function hideCreateModal() { document.getElementById('createModal').classList.remove('active'); }
        function createTask() {
          const t = document.getElementById('newTaskTitle').value;
          if (!t.trim()) return;
          vscode.postMessage({ command: 'createTask', title: t, description: document.getElementById('newTaskDescription').value, priority: document.getElementById('newTaskPriority').value });
          hideCreateModal(); document.getElementById('newTaskTitle').value = ''; document.getElementById('newTaskDescription').value = '';
        }
        document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCreateModal(); });
        document.getElementById('createModal').addEventListener('click', e => { if (e.target.id === 'createModal') hideCreateModal(); });
      </script>
    </body></html>`;
  }

  private _renderTaskCard(task: Task, index: number): string {
    const steps = task.steps || [];
    const done = steps.filter(s => s.completed).length;
    const delay = Math.min(index * 30, 200);

    return `
      <div class="task-row" onclick="openTask('${task.id}')" style="animation-delay:${delay}ms">
        <div class="task-priority-dot dot-${task.priority}"></div>
        <div class="task-info">
          <div class="task-name">${this._escapeHtml(task.title)}</div>
          <div class="task-sub">
            <span class="badge status-${task.status}">${this._getStatusLabel(task.status)}</span>
            ${steps.length > 0 ? `<span class="task-steps-count">${done}/${steps.length}</span>` : ''}
            ${task.dueDate ? `<span style="font-size:11px;color:var(--text-tertiary);">${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : ''}
          </div>
        </div>
        <button class="task-agent-btn" onclick="quickAgent(event,'${task.id}')">AI Agent</button>
      </div>
    `;
  }

  // ===================== TASK DETAIL VIEW =====================

  private _getTaskDetailContent(task: Task): string {
    const steps = task.steps || [];
    const completedSteps = steps.filter(s => s.completed).length;
    const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

    const stepsHtml = steps.map(step => `
      <div class="step ${step.completed ? 'step-done' : ''}">
        <div class="step-check ${step.completed ? 'checked' : ''}" onclick="toggleStep('${step.id}', ${!step.completed})">
          ${step.completed ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>' : ''}
        </div>
        <span class="step-text">${this._escapeHtml(step.content)}</span>
      </div>
    `).join('');

    return `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      ${this._getBaseStyles()}

      .detail { max-width: 720px; margin: 0 auto; padding: 24px; }

      .detail-topbar {
        display: flex; align-items: center; gap: 12px; margin-bottom: 28px;
        padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle);
      }
      .back-btn {
        background: transparent; border: 1px solid var(--border-default);
        border-radius: var(--radius-sm); padding: 8px 10px;
        color: var(--text-secondary); cursor: pointer;
        transition: all var(--transition-base); display: flex;
      }
      .back-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
      .back-btn svg { width: 16px; height: 16px; }

      .detail-heading { flex: 1; }
      .detail-title { font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1.3; letter-spacing: -0.3px; margin-bottom: 8px; }
      .detail-badges { display: flex; gap: 8px; flex-wrap: wrap; }

      /* ---- Sections ---- */
      .section { margin-bottom: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); overflow: hidden; animation: fadeIn var(--transition-slow) ease both; }
      .section:nth-child(2) { animation-delay: 50ms; }
      .section:nth-child(3) { animation-delay: 100ms; }
      .section:nth-child(4) { animation-delay: 150ms; }
      .section-head { display: flex; align-items: center; gap: 8px; padding: 14px 18px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-subtle); }
      .section-icon { font-size: 14px; }
      .section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
      .section-body { padding: 18px; }

      /* ---- AI Pipeline Section ---- */
      .ai-section { border-color: var(--border-accent); }
      .ai-section .section-head { background: var(--accent-primary-subtle); }
      .ai-section .section-title { color: var(--accent-primary-hover); }
      .ai-desc { font-size: 13px; color: var(--text-tertiary); line-height: 1.6; margin-bottom: 16px; }
      .ai-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .ai-divider { border-top: 1px solid var(--border-subtle); margin: 14px 0; }
      .ai-label { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }

      /* ---- Inline grid ---- */
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

      .sel-wrap { position: relative; }
      .sel-wrap select {
        width: 100%; padding: 10px 14px;
        background: var(--bg-input); border: 1px solid var(--border-default);
        border-radius: var(--radius-md); color: var(--text-primary);
        font-size: 13px; cursor: pointer; appearance: none; font-family: var(--font-sans);
        transition: all var(--transition-base);
      }
      .sel-wrap select:focus { outline: none; border-color: var(--border-focus); }
      .sel-wrap select option { background: var(--bg-secondary); }
      .sel-wrap::after {
        content: ''; position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
        border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid var(--text-tertiary);
        pointer-events: none;
      }

      /* ---- Steps ---- */
      .progress-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; margin-bottom: 14px; }
      .progress-fill { height: 100%; border-radius: 2px; background: var(--accent-gradient); transition: width 0.4s ease; }
      .progress-label { font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px; }

      .step {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px; border-radius: var(--radius-sm);
        margin-bottom: 4px; transition: background var(--transition-fast);
      }
      .step:hover { background: rgba(255,255,255,0.03); }
      .step-check {
        width: 20px; height: 20px; border-radius: 5px;
        border: 2px solid var(--border-default);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all var(--transition-base); flex-shrink: 0;
      }
      .step-check.checked { background: var(--accent-primary); border-color: var(--accent-primary); }
      .step-check.checked svg { color: #fff; }
      .step-text { font-size: 13px; color: var(--text-primary); }
      .step-done .step-text { text-decoration: line-through; color: var(--text-tertiary); }

      .empty-steps { text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 13px; }

      /* ---- Danger ---- */
      .danger-section { border-color: rgba(239,68,68,0.15); }
      .danger-section .section-head { background: rgba(239,68,68,0.05); }
      .danger-section .section-title { color: #F87171; }

      /* ---- Date input ---- */
      input[type="date"] { color-scheme: dark; }
    </style>
    </head>
    <body>
      <div class="detail">
        <div class="detail-topbar">
          <button class="back-btn" onclick="backToList()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div class="detail-heading">
            <div class="detail-title" id="taskTitleDisplay">${this._escapeHtml(task.title)}</div>
            <div class="detail-badges">
              <span class="badge status-${task.status}">${this._getStatusLabel(task.status)}</span>
              <span class="badge priority-${task.priority}">${task.priority}</span>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openInBrowser()" title="Open in browser">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>

        <!-- AI Pipeline -->
        <div class="section ai-section">
          <div class="section-head">
            <span class="section-icon">⚡</span>
            <span class="section-title">AI Pipeline</span>
          </div>
          <div class="section-body">
            <div class="ai-desc">Send to AI for implementation, then run the automated pipeline to test, review, and ship.</div>
            <div class="ai-actions">
              <button class="btn btn-primary" onclick="sendToAgent()">Send to AI Agent</button>
              <button class="btn btn-ghost btn-sm" onclick="viewPrompt()">View Prompt</button>
            </div>
            <div class="ai-divider"></div>
            <div class="ai-label">After implementation</div>
            <div class="ai-actions">
              <button class="btn btn-warning" onclick="runPipeline()">Run Pipeline & Create PR</button>
              <button class="btn btn-success btn-sm" onclick="createPR()">Quick PR</button>
              <button class="btn btn-ghost btn-sm" onclick="configureProfiles()">Profiles</button>
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="section">
          <div class="section-head">
            <span class="section-icon">📝</span>
            <span class="section-title">Details</span>
          </div>
          <div class="section-body">
            <div class="form-group">
              <label class="form-label">Title</label>
              <input class="form-input" id="editTitle" value="${this._escapeHtml(task.title)}" onchange="saveTitle()">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Description</label>
              <textarea class="form-input form-textarea" id="editDescription" placeholder="Add a description..." onchange="saveDescription()">${task.description ? this._escapeHtml(task.description) : ''}</textarea>
            </div>
          </div>
        </div>

        <!-- Status & Priority -->
        <div class="section">
          <div class="section-head">
            <span class="section-icon">🎯</span>
            <span class="section-title">Status & Priority</span>
          </div>
          <div class="section-body">
            <div class="grid-2">
              <div>
                <label class="form-label">Status</label>
                <div class="sel-wrap">
                  <select onchange="updateStatus(this.value)">
                    <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                    <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                    <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="review" ${task.status === 'review' ? 'selected' : ''}>Review</option>
                    <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="form-label">Priority</label>
                <div class="sel-wrap">
                  <select onchange="updatePriority(this.value)">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Dates -->
        <div class="section">
          <div class="section-head">
            <span class="section-icon">📅</span>
            <span class="section-title">Dates</span>
          </div>
          <div class="section-body">
            <div class="grid-2">
              <div>
                <label class="form-label">Start Date</label>
                <input type="date" class="form-input" id="startDate" value="${task.startDate ? task.startDate.split('T')[0] : ''}" onchange="saveDate('startDate', this.value)">
              </div>
              <div>
                <label class="form-label">Due Date</label>
                <input type="date" class="form-input" id="dueDate" value="${task.dueDate ? task.dueDate.split('T')[0] : ''}" onchange="saveDate('dueDate', this.value)">
              </div>
            </div>
          </div>
        </div>

        <!-- Checklist -->
        <div class="section">
          <div class="section-head">
            <span class="section-icon">✅</span>
            <span class="section-title">Checklist</span>
            <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary);">${completedSteps}/${steps.length}</span>
          </div>
          <div class="section-body">
            ${steps.length > 0 ? `
              <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
              ${stepsHtml}
            ` : `
              <div class="empty-steps">No checklist items yet</div>
            `}
          </div>
        </div>

        <!-- Danger -->
        <div class="section danger-section">
          <div class="section-head">
            <span class="section-icon">⚠️</span>
            <span class="section-title">Danger Zone</span>
          </div>
          <div class="section-body">
            <p style="font-size:13px;color:var(--text-tertiary);margin-bottom:12px;">This action cannot be undone.</p>
            <button class="btn btn-danger-ghost btn-sm" onclick="confirmDelete()">Delete Task</button>
          </div>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        const taskId = '${task.id}';
        function backToList() { vscode.postMessage({ command: 'backToList' }); }
        function openInBrowser() { vscode.postMessage({ command: 'openInBrowser', taskId }); }
        function updateStatus(s) { vscode.postMessage({ command: 'updateStatus', taskId, status: s }); }
        function updatePriority(p) { vscode.postMessage({ command: 'updatePriority', taskId, priority: p }); }
        function saveTitle() { const t = document.getElementById('editTitle').value.trim(); if (t) vscode.postMessage({ command: 'updateTask', taskId, updates: { title: t } }); }
        function saveDescription() { vscode.postMessage({ command: 'updateTask', taskId, updates: { description: document.getElementById('editDescription').value } }); }
        function saveDate(f, v) { const u = {}; u[f] = v || null; vscode.postMessage({ command: 'updateTask', taskId, updates: u }); }
        function toggleStep(sid, c) { vscode.postMessage({ command: 'toggleStep', taskId, stepId: sid, completed: c }); }
        function sendToAgent() { vscode.postMessage({ command: 'sendToAgent', taskId }); }
        function viewPrompt() { vscode.postMessage({ command: 'viewPrompt', taskId }); }
        function createPR() { vscode.postMessage({ command: 'createPR', taskId, taskTitle: document.getElementById('editTitle')?.value || '' }); }
        function runPipeline() { vscode.postMessage({ command: 'runPipeline', taskId }); }
        function configureProfiles() { vscode.postMessage({ command: 'configureProfiles' }); }
        function confirmDelete() { if (confirm('Delete this task permanently?')) vscode.postMessage({ command: 'deleteTask', taskId }); }
      </script>
    </body></html>`;
  }

  // ===================== ERROR VIEW =====================

  private _getErrorContent(error: any): string {
    return `<!DOCTYPE html><html><head><style>${this._getBaseStyles()}
      .err { text-align: center; padding: 80px 24px; max-width: 400px; margin: 0 auto; }
      .err-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
      .err-title { font-size: 18px; font-weight: 600; color: #F87171; margin-bottom: 8px; }
      .err-msg { font-size: 13px; color: var(--text-tertiary); margin-bottom: 24px; }
    </style></head>
    <body>
      <div class="err">
        <div class="err-icon">⚠️</div>
        <div class="err-title">Connection Failed</div>
        <div class="err-msg">${error?.message || 'Unable to connect to TaskOS'}</div>
        <button class="btn btn-primary" onclick="vscode.postMessage({command:'refresh'})">Retry</button>
      </div>
      <script>const vscode = acquireVsCodeApi();</script>
    </body></html>`;
  }

  // ===================== HELPERS =====================

  private _getStatusLabel(status: string): string {
    const labels: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
    return labels[status] || status;
  }

  private _escapeHtml(text: string): string {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // ===================== AUTO REFRESH =====================

  private _startAutoRefresh() {
    const config = vscode.workspace.getConfiguration('taskos');
    const autoRefresh = config.get<boolean>('autoRefresh', true);
    const intervalSeconds = config.get<number>('autoRefreshInterval', 15);
    if (autoRefresh) {
      this._autoRefreshInterval = setInterval(async () => { await this._checkForUpdates(); }, intervalSeconds * 1000);
    }
  }

  private _stopAutoRefresh() {
    if (this._autoRefreshInterval) { clearInterval(this._autoRefreshInterval); this._autoRefreshInterval = null; }
  }

  private _restartAutoRefresh() { this._stopAutoRefresh(); this._startAutoRefresh(); }

  private async _checkForUpdates() {
    if (this._currentView !== 'list') return;
    try {
      const { tasks } = await this._apiClient.listTasks(this._workspaceId, { limit: 50 });
      const newHash = tasks.map(t => `${t.id}:${t.status}:${t.priority}:${t.title}:${t.updatedAt}`).join('|');
      if (newHash !== this._lastTasksHash) {
        this._lastTasksHash = newHash;
        this._panel.webview.html = this._getListContent(tasks);
      }
    } catch { /* silent */ }
  }

  public dispose() {
    TaskPanel.currentPanel = undefined;
    this._stopAutoRefresh();
    this._panel.dispose();
    while (this._disposables.length) { const x = this._disposables.pop(); if (x) x.dispose(); }
  }
}
