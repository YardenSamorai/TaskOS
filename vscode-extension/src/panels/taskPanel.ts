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
    
    // Listen for configuration changes
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
      vscode.window.showInformationMessage(`Task status updated to ${status}`);
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
      vscode.window.showInformationMessage(`Task priority updated to ${priority}`);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to update task priority');
    }
  }

  private async _updateTaskDetails(taskId: string, updates: any) {
    try {
      await this._apiClient.updateTask(taskId, updates);
      await this._showTaskDetail(taskId);
      vscode.window.showInformationMessage('Task updated successfully!');
    } catch (error) {
      vscode.window.showErrorMessage('Failed to update task');
    }
  }

  private async _addStep(taskId: string, content: string) {
    try {
      // Steps are managed server-side - show message
      vscode.window.showInformationMessage('To add steps, please use the web app.');
      await this._showTaskDetail(taskId);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to add step');
    }
  }

  private async _toggleStep(taskId: string, stepId: string, completed: boolean) {
    try {
      // Steps are managed server-side - show message
      vscode.window.showInformationMessage('To update steps, please use the web app.');
      await this._showTaskDetail(taskId);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to update step');
    }
  }

  private async _deleteStep(taskId: string, stepId: string) {
    try {
      // Steps are managed server-side - show message
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
      vscode.window.showInformationMessage('Task created successfully!');
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

  private _getBaseStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
        color: #e4e4e7;
        min-height: 100vh;
        padding: 0;
      }

      .btn {
        padding: 10px 20px;
        border-radius: 10px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
      }

      .btn-secondary {
        background: rgba(255,255,255,0.1);
        color: #e4e4e7;
        border: 1px solid rgba(255,255,255,0.2);
      }

      .btn-secondary:hover {
        background: rgba(255,255,255,0.15);
        border-color: rgba(255,255,255,0.3);
      }

      .btn-danger {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .btn-danger:hover {
        background: rgba(239, 68, 68, 0.3);
      }

      .btn-icon {
        padding: 8px;
        min-width: 36px;
        justify-content: center;
      }

      .badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .status-backlog { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
      .status-todo { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
      .status-in_progress { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      .status-review { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
      .status-done { background: rgba(16, 185, 129, 0.2); color: #34d399; }

      .priority-urgent { background: rgba(239, 68, 68, 0.2); color: #f87171; }
      .priority-high { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
      .priority-medium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      .priority-low { background: rgba(16, 185, 129, 0.2); color: #34d399; }

      .form-group {
        margin-bottom: 20px;
      }

      .form-label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
        color: rgba(255,255,255,0.8);
      }

      .form-input, .form-select {
        width: 100%;
        padding: 14px 16px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        color: #e4e4e7;
        font-size: 14px;
        transition: all 0.3s ease;
      }

      .form-input:focus, .form-select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
      }

      .form-textarea {
        min-height: 120px;
        resize: vertical;
        font-family: inherit;
      }

      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.05);
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.3);
      }
    `;
  }

  private _getTaskDetailContent(task: Task): string {
    const steps = task.steps || [];
    const completedSteps = steps.filter(st => st.completed).length;
    const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

    const stepsHtml = steps.map(step => `
      <div class="step-item ${step.completed ? 'completed' : ''}">
        <label class="step-checkbox">
          <input type="checkbox" ${step.completed ? 'checked' : ''} 
            onchange="toggleStep('${step.id}', this.checked)">
          <span class="checkmark"></span>
        </label>
        <span class="step-content">${this._escapeHtml(step.content)}</span>
      </div>
    `).join('');

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${this._getBaseStyles()}

        .detail-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        .detail-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .back-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          padding: 10px 12px;
          border-radius: 10px;
          color: #e4e4e7;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 18px;
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .detail-title-section {
          flex: 1;
        }

        .detail-title {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }

        .detail-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .section {
          background: rgba(255,255,255,0.03);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-priority-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .select-wrapper {
          position: relative;
        }

        .select-wrapper select {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: #e4e4e7;
          font-size: 14px;
          cursor: pointer;
          appearance: none;
        }

        .select-wrapper::after {
          content: "▼";
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 10px;
          color: rgba(255,255,255,0.5);
          pointer-events: none;
        }

        .select-wrapper select option {
          background: #1a1a2e;
        }

        /* Checklist Steps */
        .steps-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .progress-bar {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          margin-bottom: 12px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .step-item:hover {
          background: rgba(255,255,255,0.08);
        }

        .step-item.completed .step-content {
          text-decoration: line-through;
          color: rgba(255,255,255,0.4);
        }

        .step-checkbox {
          position: relative;
          width: 22px;
          height: 22px;
          cursor: pointer;
        }

        .step-checkbox input {
          opacity: 0;
          position: absolute;
        }

        .checkmark {
          position: absolute;
          top: 0;
          left: 0;
          width: 22px;
          height: 22px;
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 6px;
          transition: all 0.2s;
        }

        .step-checkbox input:checked ~ .checkmark {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
        }

        .checkmark::after {
          content: "✓";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .step-checkbox input:checked ~ .checkmark::after {
          opacity: 1;
        }

        .step-content {
          flex: 1;
          font-size: 14px;
          color: #e4e4e7;
        }

        .empty-steps {
          text-align: center;
          padding: 32px;
          color: rgba(255,255,255,0.4);
        }

        .empty-steps-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        /* AI Agent Button */
        .btn-agent {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .btn-agent:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
        }

        .btn-pr {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 700;
        }

        .btn-pr:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5);
        }

        /* Actions */
        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        /* Date inputs */
        input[type="date"] {
          color-scheme: dark;
        }

        /* Animations */
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section {
          animation: slideIn 0.3s ease forwards;
        }

        .section:nth-child(2) { animation-delay: 0.1s; }
        .section:nth-child(3) { animation-delay: 0.2s; }
        .section:nth-child(4) { animation-delay: 0.3s; }
      </style>
    </head>
    <body>
      <div class="detail-container">
        <div class="detail-header">
          <button class="back-btn" onclick="backToList()">←</button>
          <div class="detail-title-section">
            <div class="detail-title" id="taskTitle">${this._escapeHtml(task.title)}</div>
            <div class="detail-meta">
              <span class="badge status-${task.status}">${this._getStatusIcon(task.status)} ${this._getStatusLabel(task.status)}</span>
              <span class="badge priority-${task.priority}">${this._getPriorityIcon(task.priority)} ${task.priority}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" onclick="openInBrowser()" title="Open in Browser">🌐</button>
          </div>
        </div>

        <!-- 🤖 AI Agent Section -->
        <div class="section" style="border-color: rgba(102, 126, 234, 0.3); background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);">
          <div class="section-title" style="color: #a78bfa;">🤖 AI Agent</div>
          <p style="color: rgba(255,255,255,0.6); margin-bottom: 16px; font-size: 14px; line-height: 1.6;">
            Send this task to Cursor's AI Agent. It will create a branch, generate a detailed prompt from the task details, and open the AI Composer to start working.
          </p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-agent" onclick="sendToAgent()">
              🤖 Send to AI Agent
            </button>
            <button class="btn btn-secondary" onclick="viewPrompt()">
              📋 View Prompt
            </button>
            <button class="btn btn-pr" onclick="createPR()">
              🚀 Create PR
            </button>
          </div>
        </div>

        <!-- Edit Title & Description -->
        <div class="section">
          <div class="section-title">📝 Details</div>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" class="form-input" id="editTitle" value="${this._escapeHtml(task.title)}" onchange="saveTitle()">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input form-textarea" id="editDescription" placeholder="Add a description..." onchange="saveDescription()">${task.description ? this._escapeHtml(task.description) : ''}</textarea>
          </div>
        </div>

        <!-- Status & Priority -->
        <div class="section">
          <div class="section-title">🎯 Status & Priority</div>
          <div class="status-priority-row">
            <div>
              <label class="form-label">Status</label>
              <div class="select-wrapper">
                <select onchange="updateStatus(this.value)">
                  <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>📋 Backlog</option>
                  <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>📝 To Do</option>
                  <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>🔄 In Progress</option>
                  <option value="review" ${task.status === 'review' ? 'selected' : ''}>👁️ Review</option>
                  <option value="done" ${task.status === 'done' ? 'selected' : ''}>✅ Done</option>
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">Priority</label>
              <div class="select-wrapper">
                <select onchange="updatePriority(this.value)">
                  <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                  <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                  <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🟠 High</option>
                  <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>🔴 Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Dates -->
        <div class="section">
          <div class="section-title">📅 Dates</div>
          <div class="status-priority-row">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Start Date</label>
              <input type="date" class="form-input" id="startDate" 
                value="${task.startDate ? task.startDate.split('T')[0] : ''}" 
                onchange="saveDate('startDate', this.value)">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Due Date</label>
              <input type="date" class="form-input" id="dueDate" 
                value="${task.dueDate ? task.dueDate.split('T')[0] : ''}" 
                onchange="saveDate('dueDate', this.value)">
            </div>
          </div>
        </div>

        <!-- Checklist -->
        <div class="section">
          <div class="steps-header">
            <div class="section-title" style="margin-bottom: 0;">📋 Checklist</div>
            <span class="progress-text">${completedSteps}/${steps.length} completed</span>
          </div>
          ${steps.length > 0 ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="steps-list">
              ${stepsHtml}
            </div>
          ` : `
            <div class="empty-steps">
              <div class="empty-steps-icon">✅</div>
              <div>No checklist items yet</div>
              <div style="font-size: 12px; margin-top: 8px; opacity: 0.6;">Add items via the web app</div>
            </div>
          `}
        </div>

        <!-- Danger Zone -->
        <div class="section" style="border-color: rgba(239, 68, 68, 0.2);">
          <div class="section-title" style="color: #f87171;">⚠️ Danger Zone</div>
          <p style="color: rgba(255,255,255,0.5); margin-bottom: 16px; font-size: 14px;">
            Once you delete a task, there is no going back. Please be certain.
          </p>
          <button class="btn btn-danger" onclick="confirmDelete()">🗑️ Delete Task</button>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        const taskId = '${task.id}';

        function backToList() {
          vscode.postMessage({ command: 'backToList' });
        }

        function openInBrowser() {
          vscode.postMessage({ command: 'openInBrowser', taskId });
        }

        function updateStatus(status) {
          vscode.postMessage({ command: 'updateStatus', taskId, status });
        }

        function updatePriority(priority) {
          vscode.postMessage({ command: 'updatePriority', taskId, priority });
        }

        function saveTitle() {
          const title = document.getElementById('editTitle').value.trim();
          if (title) {
            vscode.postMessage({ command: 'updateTask', taskId, updates: { title } });
          }
        }

        function saveDescription() {
          const description = document.getElementById('editDescription').value;
          vscode.postMessage({ command: 'updateTask', taskId, updates: { description } });
        }

        function saveDate(field, value) {
          const updates = {};
          updates[field] = value || null;
          vscode.postMessage({ command: 'updateTask', taskId, updates });
        }

        function toggleStep(stepId, completed) {
          vscode.postMessage({ command: 'toggleStep', taskId, stepId, completed });
        }

        function sendToAgent() {
          vscode.postMessage({ command: 'sendToAgent', taskId });
        }

        function viewPrompt() {
          vscode.postMessage({ command: 'viewPrompt', taskId });
        }

        function createPR() {
          const title = document.getElementById('editTitle')?.value || '';
          vscode.postMessage({ command: 'createPR', taskId, taskTitle: title });
        }

        function confirmDelete() {
          if (confirm('Are you sure you want to delete this task?')) {
            vscode.postMessage({ command: 'deleteTask', taskId });
          }
        }
      </script>
    </body>
    </html>`;
  }

  private _getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      backlog: '📋',
      todo: '📝',
      in_progress: '🔄',
      review: '👁️',
      done: '✅'
    };
    return icons[status] || '📋';
  }

  private _getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      backlog: 'Backlog',
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done'
    };
    return labels[status] || status;
  }

  private _getPriorityIcon(priority: string): string {
    const icons: { [key: string]: string } = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[priority] || '🟡';
  }

  private _getErrorContent(error: any): string {
    return `<!DOCTYPE html>
    <html>
    <head>
      <style>
        ${this._getBaseStyles()}
        .error-container {
          text-align: center;
          padding: 60px 20px;
          max-width: 400px;
          margin: 100px auto;
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .error-icon { font-size: 64px; margin-bottom: 20px; }
        .error-title { font-size: 24px; font-weight: 600; margin-bottom: 10px; color: #ff6b6b; }
        .error-message { color: rgba(255,255,255,0.6); margin-bottom: 24px; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <div class="error-icon">😵</div>
        <div class="error-title">Connection Failed</div>
        <div class="error-message">${error?.message || 'Unable to connect to TaskOS'}</div>
        <button class="btn btn-primary" onclick="refresh()">Try Again</button>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        function refresh() { vscode.postMessage({ command: 'refresh' }); }
      </script>
    </body>
    </html>`;
  }

  private _getListContent(tasks: Task[]): string {
    const taskCards = tasks.map(task => this._renderTaskCard(task)).join('');
    
    const stats = {
      total: tasks.length,
      done: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo' || t.status === 'backlog').length,
      high: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length
    };

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${this._getBaseStyles()}

        .header {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 24px 32px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .auto-refresh-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #34d399;
          cursor: default;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #34d399;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }

        .update-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
          display: none;
          animation: slideUp 0.3s ease;
          z-index: 1000;
        }

        .update-toast.show {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .stat-card {
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 16px 20px;
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-2px);
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .stat-total .stat-value { color: #667eea; }
        .stat-progress .stat-value { color: #f59e0b; }
        .stat-done .stat-value { color: #10b981; }
        .stat-high .stat-value { color: #ef4444; }

        .filters-bar {
          padding: 20px 32px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-box input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #e4e4e7;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .search-box input:focus {
          outline: none;
          border-color: #667eea;
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        .search-box::before {
          content: "🔍";
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
        }

        .filter-select {
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #e4e4e7;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
        }

        .filter-select option {
          background: #1a1a2e;
          color: #e4e4e7;
        }

        .tasks-container {
          padding: 24px 32px;
        }

        .tasks-grid {
          display: grid;
          gap: 16px;
        }

        .task-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border-radius: 16px;
          padding: 20px 24px;
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .task-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          border-radius: 4px 0 0 4px;
        }

        .task-card.priority-urgent::before,
        .task-card.priority-high::before { background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%); }
        .task-card.priority-medium::before { background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%); }
        .task-card.priority-low::before { background: linear-gradient(180deg, #10b981 0%, #059669 100%); }

        .task-card:hover {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
          transform: translateX(4px);
          border-color: rgba(255,255,255,0.15);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .task-card:hover .agent-quick-btn {
          opacity: 1;
          transform: scale(1);
        }

        .agent-quick-btn {
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          flex-shrink: 0;
        }

        .agent-quick-btn:hover {
          transform: scale(1.1) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .task-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .task-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .task-description {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          line-height: 1.5;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .task-steps {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.05);
          padding: 4px 10px;
          border-radius: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon { font-size: 64px; margin-bottom: 20px; }
        .empty-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
        .empty-text { color: rgba(255,255,255,0.5); }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(5px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-overlay.active {
          display: flex;
        }

        .modal {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 20px;
          padding: 32px;
          width: 90%;
          max-width: 500px;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .task-card {
          animation: fadeIn 0.3s ease forwards;
        }

        .task-card:nth-child(1) { animation-delay: 0.05s; }
        .task-card:nth-child(2) { animation-delay: 0.1s; }
        .task-card:nth-child(3) { animation-delay: 0.15s; }
        .task-card:nth-child(4) { animation-delay: 0.2s; }
        .task-card:nth-child(5) { animation-delay: 0.25s; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-top">
          <div class="logo">
            <div class="logo-icon">✓</div>
            <span class="logo-text">TaskOS</span>
          </div>
          <div class="header-actions">
            <div class="auto-refresh-indicator" id="autoRefreshIndicator" title="Auto-refresh enabled">
              <span class="pulse-dot"></span>
              <span>Live</span>
            </div>
            <button class="btn btn-secondary" onclick="refresh()">
              <span>↻</span> Refresh
            </button>
            <button class="btn btn-primary" onclick="showCreateModal()">
              <span>+</span> New Task
            </button>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card stat-total">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Tasks</div>
          </div>
          <div class="stat-card stat-progress">
            <div class="stat-value">${stats.inProgress}</div>
            <div class="stat-label">In Progress</div>
          </div>
          <div class="stat-card stat-done">
            <div class="stat-value">${stats.done}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat-card stat-high">
            <div class="stat-value">${stats.high}</div>
            <div class="stat-label">High Priority</div>
          </div>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="Search tasks..." onkeyup="handleSearch(event)">
        </div>
        <select class="filter-select" id="statusFilter" onchange="applyFilters()">
          <option value="all">All Status</option>
          <option value="backlog">📋 Backlog</option>
          <option value="todo">📝 To Do</option>
          <option value="in_progress">🔄 In Progress</option>
          <option value="review">👁️ Review</option>
          <option value="done">✅ Done</option>
        </select>
        <select class="filter-select" id="priorityFilter" onchange="applyFilters()">
          <option value="all">All Priority</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
      </div>

      <div class="tasks-container">
        ${tasks.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">No tasks found</div>
            <div class="empty-text">Create your first task to get started!</div>
          </div>
        ` : `
          <div class="tasks-grid">
            ${taskCards}
          </div>
        `}
      </div>

      <div class="update-toast" id="updateToast">
        ✨ Tasks updated
      </div>

      <div class="modal-overlay" id="createModal">
        <div class="modal">
          <div class="modal-title">✨ Create New Task</div>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" class="form-input" id="newTaskTitle" placeholder="Enter task title...">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input form-textarea" id="newTaskDescription" placeholder="Enter task description..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-input" id="newTaskPriority">
              <option value="low">🟢 Low</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="hideCreateModal()">Cancel</button>
            <button class="btn btn-primary" onclick="createTask()">Create Task</button>
          </div>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        let searchTimeout;

        function refresh() {
          vscode.postMessage({ command: 'refresh' });
        }

        function handleSearch(event) {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            applyFilters();
          }, 300);
        }

        function applyFilters() {
          const status = document.getElementById('statusFilter').value;
          const priority = document.getElementById('priorityFilter').value;
          const search = document.getElementById('searchInput').value;
          vscode.postMessage({ command: 'filter', status, priority, search });
        }

        function openTask(taskId) {
          vscode.postMessage({ command: 'openTask', taskId });
        }

        function quickSendToAgent(taskId) {
          vscode.postMessage({ command: 'sendToAgent', taskId });
        }

        function showCreateModal() {
          document.getElementById('createModal').classList.add('active');
        }

        function hideCreateModal() {
          document.getElementById('createModal').classList.remove('active');
        }

        function createTask() {
          const title = document.getElementById('newTaskTitle').value;
          const description = document.getElementById('newTaskDescription').value;
          const priority = document.getElementById('newTaskPriority').value;
          
          if (!title.trim()) return;

          vscode.postMessage({ command: 'createTask', title, description, priority });
          
          hideCreateModal();
          document.getElementById('newTaskTitle').value = '';
          document.getElementById('newTaskDescription').value = '';
        }

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') hideCreateModal();
        });

        document.getElementById('createModal').addEventListener('click', (e) => {
          if (e.target.id === 'createModal') hideCreateModal();
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          if (message.command === 'showUpdateNotification') {
            showUpdateToast();
          }
        });

        function showUpdateToast() {
          const toast = document.getElementById('updateToast');
          toast.classList.add('show');
          setTimeout(() => {
            toast.classList.remove('show');
          }, 3000);
        }
      </script>
    </body>
    </html>`;
  }

  private _renderTaskCard(task: Task): string {
    const steps = task.steps || [];
    const completedSteps = steps.filter(st => st.completed).length;
    const hasSteps = steps.length > 0;

    return `
      <div class="task-card priority-${task.priority}" onclick="openTask('${task.id}')">
        <div class="task-header">
          <div style="flex: 1;">
            <div class="task-title">${this._escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-description">${this._escapeHtml(task.description)}</div>` : ''}
          </div>
          <button class="agent-quick-btn" onclick="event.stopPropagation(); quickSendToAgent('${task.id}')" title="Send to AI Agent">
            🤖
          </button>
        </div>
        <div class="task-meta">
          <span class="badge status-${task.status}">${this._getStatusIcon(task.status)} ${this._getStatusLabel(task.status)}</span>
          <span class="badge priority-${task.priority}">${this._getPriorityIcon(task.priority)} ${task.priority}</span>
          ${task.dueDate ? `<span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc;">📅 ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
          ${hasSteps ? `<span class="task-steps">📋 ${completedSteps}/${steps.length}</span>` : ''}
        </div>
      </div>
    `;
  }

  private _escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private _startAutoRefresh() {
    const config = vscode.workspace.getConfiguration('taskos');
    const autoRefresh = config.get<boolean>('autoRefresh', true);
    const intervalSeconds = config.get<number>('autoRefreshInterval', 15);

    if (autoRefresh) {
      this._autoRefreshInterval = setInterval(async () => {
        await this._checkForUpdates();
      }, intervalSeconds * 1000);
    }
  }

  private _stopAutoRefresh() {
    if (this._autoRefreshInterval) {
      clearInterval(this._autoRefreshInterval);
      this._autoRefreshInterval = null;
    }
  }

  private _restartAutoRefresh() {
    this._stopAutoRefresh();
    this._startAutoRefresh();
  }

  private async _checkForUpdates() {
    if (this._currentView !== 'list') return;
    
    try {
      const { tasks } = await this._apiClient.listTasks(this._workspaceId, { limit: 50 });
      const newHash = this._computeTasksHash(tasks);
      
      if (newHash !== this._lastTasksHash) {
        this._lastTasksHash = newHash;
        this._panel.webview.html = this._getListContent(tasks);
        // Show subtle notification
        this._panel.webview.postMessage({ command: 'showUpdateNotification' });
      }
    } catch (error) {
      // Silently ignore errors during auto-refresh
    }
  }

  private _computeTasksHash(tasks: Task[]): string {
    return tasks.map(t => `${t.id}:${t.status}:${t.priority}:${t.title}:${t.updatedAt}`).join('|');
  }

  public dispose() {
    TaskPanel.currentPanel = undefined;
    this._stopAutoRefresh();
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }
}
