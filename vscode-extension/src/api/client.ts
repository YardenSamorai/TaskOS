import * as vscode from 'vscode';
import type { BranchConventionConfig } from '../services/branchConvention';

export interface TaskStep {
  id: string;
  content: string;
  completed: boolean;
  orderIndex: number;
  completedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  startDate: string | null;
  workspaceId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  steps?: TaskStep[];
  assignees: Array<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface CreateTaskRequest {
  workspaceId: string;
  projectId?: string;
  title: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  startDate?: string;
  assigneeIds?: string[];
  tagIds?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  startDate?: string | null;
}

export interface GenerateCodeRequest {
  taskDescription: string;
  taskId?: string;
  language?: string;
  context?: {
    workspaceName?: string;
    projectName?: string;
    filePath?: string;
    existingCode?: string;
  };
}

export interface GenerateCodeResponse {
  success: boolean;
  code: string;
  language: string;
  explanation: string;
  dependencies: string[];
  files: Array<{
    path: string;
    content: string;
  }>;
}

export class TaskOSApiClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: object
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const status = response.status;
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parse errors
        }

        if (status === 401) {
          vscode.window.showErrorMessage('TaskOS: Invalid API key. Please check your configuration.');
        } else if (status === 403) {
          vscode.window.showErrorMessage(`TaskOS: ${errorData.error || 'Access forbidden. Pro or Enterprise plan required.'}`);
        } else if (status === 429) {
          const retryAfter = response.headers.get('retry-after');
          vscode.window.showWarningMessage(
            `TaskOS: Rate limit exceeded. ${retryAfter ? `Retry after ${retryAfter} seconds.` : 'Please try again later.'}`
          );
        } else if (status >= 500) {
          vscode.window.showErrorMessage('TaskOS: Server error. Please try again later.');
        } else {
          vscode.window.showErrorMessage(`TaskOS: ${errorData.error || 'Request failed'}`);
        }
        
        throw new Error(errorData.error || `HTTP ${status}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        vscode.window.showErrorMessage('TaskOS: Network error. Please check your connection.');
      }
      throw error;
    }
  }

  async listTasks(workspaceId: string, filters?: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tasks: Task[]; total: number }> {
    const params = new URLSearchParams({ workspaceId });
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
    }

    const data = await this.request<{ tasks: Task[]; total: number }>(
      'GET',
      `/tasks?${params.toString()}`
    );
    
    return {
      tasks: data.tasks || [],
      total: data.total || 0,
    };
  }

  async getTask(taskId: string): Promise<Task> {
    const data = await this.request<{ task: Task }>('GET', `/tasks/${taskId}`);
    return data.task;
  }

  async createTask(task: CreateTaskRequest): Promise<Task> {
    const data = await this.request<{ task: Task }>('POST', '/tasks', task);
    return data.task;
  }

  async updateTask(taskId: string, updates: UpdateTaskRequest): Promise<Task> {
    const data = await this.request<{ task: Task }>('PUT', `/tasks/${taskId}`, updates);
    return data.task;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request<void>('DELETE', `/tasks/${taskId}`);
  }

  async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    return await this.request<GenerateCodeResponse>('POST', '/ai/generate-code', request);
  }

  // ============== PROFILES ==============

  async listProfiles(workspaceId: string, type?: string): Promise<any[]> {
    const params = type ? `?type=${type}` : '';
    const data = await this.request<{ profiles: any[] }>(
      'GET',
      `/workspaces/${workspaceId}/profiles${params}`
    );
    return data.profiles || [];
  }

  async createProfile(
    workspaceId: string,
    profile: { type: string; name: string; config: any; isDefault?: boolean }
  ): Promise<any> {
    const data = await this.request<{ profile: any }>(
      'POST',
      `/workspaces/${workspaceId}/profiles`,
      profile
    );
    return data.profile;
  }

  async updateProfile(
    workspaceId: string,
    profileId: string,
    updates: { name?: string; config?: any; isDefault?: boolean }
  ): Promise<any> {
    const data = await this.request<{ profile: any }>(
      'PUT',
      `/workspaces/${workspaceId}/profiles/${profileId}`,
      updates
    );
    return data.profile;
  }

  async deleteProfile(workspaceId: string, profileId: string): Promise<void> {
    await this.request<any>(
      'DELETE',
      `/workspaces/${workspaceId}/profiles/${profileId}`
    );
  }

  // ============== AI COMMIT MESSAGE ==============

  async generateCommitMessage(payload: {
    taskTitle: string;
    taskDescription?: string;
    diffSummary?: string;
    changedFiles?: string[];
  }): Promise<{ commitMessage: string; prTitle: string; prSummary: string }> {
    return await this.request<{
      commitMessage: string;
      prTitle: string;
      prSummary: string;
    }>('POST', '/ai/generate-commit', payload);
  }

  // ============== BRANCH CONVENTIONS ==============

  async getBranchConvention(workspaceId: string): Promise<{
    config: BranchConventionConfig;
    isCustom: boolean;
  }> {
    return await this.request<{ config: BranchConventionConfig; isCustom: boolean }>(
      'GET',
      `/workspaces/${workspaceId}/branch-convention`
    );
  }

  // ============== CODE REVIEW ==============

  async reviewCode(payload: {
    diff: string;
    changedFiles: string[];
    projectContext?: string;
    reviewProfile: any;
    testResults?: any;
  }): Promise<any> {
    return await this.request<any>('POST', '/ai/code-review', payload);
  }

  updateApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  updateApiUrl(apiUrl: string) {
    this.apiUrl = apiUrl;
  }
}
