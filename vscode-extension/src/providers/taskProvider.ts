import * as vscode from 'vscode';
import { TaskOSApiClient, Task } from '../api/client';

export class TaskProvider implements vscode.TreeDataProvider<TaskItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TaskItem | undefined | null | void> = new vscode.EventEmitter<TaskItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TaskItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private tasks: Task[] = [];
  private isLoading = false;
  private errorMessage: string | null = null;
  private autoRefreshInterval: NodeJS.Timeout | null = null;
  private lastTasksHash: string = '';

  constructor(
    private apiClient: TaskOSApiClient | null,
    private workspaceId: string
  ) {
    this.startAutoRefresh();
  }

  private startAutoRefresh() {
    const config = vscode.workspace.getConfiguration('taskos');
    const autoRefresh = config.get<boolean>('autoRefresh', true);
    const intervalSeconds = config.get<number>('autoRefreshInterval', 15);

    if (autoRefresh && this.apiClient && this.workspaceId) {
      this.autoRefreshInterval = setInterval(async () => {
        await this.checkForUpdates();
      }, intervalSeconds * 1000);
    }
  }

  private stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  private async checkForUpdates() {
    if (!this.apiClient || !this.workspaceId) return;
    
    try {
      const { tasks } = await this.apiClient.listTasks(this.workspaceId, { limit: 20 });
      const newHash = tasks.map(t => `${t.id}:${t.status}:${t.updatedAt}`).join('|');
      
      if (newHash !== this.lastTasksHash) {
        this.lastTasksHash = newHash;
        this.tasks = tasks;
        this._onDidChangeTreeData.fire();
      }
    } catch (error) {
      // Silently ignore errors during auto-refresh
    }
  }

  dispose() {
    this.stopAutoRefresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  updateClient(apiClient: TaskOSApiClient, workspaceId: string): void {
    this.apiClient = apiClient;
    this.workspaceId = workspaceId;
    this.stopAutoRefresh();
    this.startAutoRefresh();
    this.refresh();
  }

  getTreeItem(element: TaskItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskItem): Promise<TaskItem[]> {
    if (!this.apiClient || !this.workspaceId) {
      return [new TaskItem(
        'Click here to configure API key',
        '',
        'none',
        'none',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'taskos.configure',
          title: 'Configure TaskOS',
          arguments: []
        },
        'settings'
      )];
    }

    if (element) {
      return [];
    }

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const { tasks } = await this.apiClient.listTasks(this.workspaceId, { limit: 20 });
      this.tasks = tasks;
      this.isLoading = false;

      if (tasks.length === 0) {
        return [new TaskItem(
          'No tasks found',
          'Create your first task!',
          'none',
          'none',
          vscode.TreeItemCollapsibleState.None,
          undefined,
          'empty'
        )];
      }

      // Group by status
      const statusGroups: { [key: string]: Task[] } = {
        'in_progress': [],
        'todo': [],
        'review': [],
        'backlog': [],
        'done': []
      };

      tasks.forEach(task => {
        if (statusGroups[task.status]) {
          statusGroups[task.status].push(task);
        }
      });

      const items: TaskItem[] = [];

      // Add section headers and tasks
      const sections = [
        { key: 'in_progress', label: '🔄 In Progress', icon: 'sync' },
        { key: 'todo', label: '📝 To Do', icon: 'checklist' },
        { key: 'review', label: '👁️ Review', icon: 'eye' },
        { key: 'backlog', label: '📋 Backlog', icon: 'inbox' },
        { key: 'done', label: '✅ Done', icon: 'pass' }
      ];

      for (const section of sections) {
        const sectionTasks = statusGroups[section.key];
        if (sectionTasks.length > 0) {
          // Add section header
          items.push(new TaskItem(
            `${section.label} (${sectionTasks.length})`,
            '',
            'section',
            'none',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'section'
          ));

          // Add tasks in this section
          sectionTasks.forEach(task => {
            items.push(this.createTaskItem(task));
          });
        }
      }

      return items;
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage = error.message;
      return [new TaskItem(
        'Failed to load tasks',
        error.message || 'Unknown error',
        'none',
        'none',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'taskos.configure',
          title: 'Configure',
          arguments: []
        },
        'error'
      )];
    }
  }

  private createTaskItem(task: Task): TaskItem {
    const priorityIcons: { [key: string]: string } = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    const priorityIcon = priorityIcons[task.priority] || '⚪';
    const title = `${priorityIcon} ${task.title}`;
    
    return new TaskItem(
      title,
      task.description || '',
      task.status,
      task.priority,
      vscode.TreeItemCollapsibleState.None,
      {
        command: 'taskos.openTaskInBrowser',
        title: 'Open Task',
        arguments: [task.id]
      },
      'task',
      task.id
    );
  }
}

class TaskItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly desc: string,
    public readonly status: string,
    public readonly priority: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly itemType?: string,
    public readonly taskId?: string
  ) {
    super(label, collapsibleState);

    this.tooltip = desc || label;
    this.description = '';

    // Set context value for menus
    this.contextValue = itemType || 'task';

    // Set icons based on type
    if (itemType === 'settings') {
      this.iconPath = new vscode.ThemeIcon('gear', new vscode.ThemeColor('charts.yellow'));
    } else if (itemType === 'error') {
      this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    } else if (itemType === 'empty') {
      this.iconPath = new vscode.ThemeIcon('inbox');
    } else if (itemType === 'section') {
      this.iconPath = undefined;
    } else if (itemType === 'task') {
      // Task icons based on status
      const statusIcons: { [key: string]: { icon: string; color: string } } = {
        'backlog': { icon: 'inbox', color: 'charts.gray' },
        'todo': { icon: 'circle-outline', color: 'charts.blue' },
        'in_progress': { icon: 'sync', color: 'charts.yellow' },
        'review': { icon: 'eye', color: 'charts.purple' },
        'done': { icon: 'pass-filled', color: 'charts.green' }
      };

      const statusConfig = statusIcons[status] || statusIcons['todo'];
      this.iconPath = new vscode.ThemeIcon(statusConfig.icon, new vscode.ThemeColor(statusConfig.color));
    }
  }
}
