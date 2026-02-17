import * as vscode from 'vscode';
import { TaskOSApiClient } from '../api/client';
import {
  AgentProfile,
  CodeReviewProfile,
  CodeStyleProfile,
} from './types';
import {
  DEFAULT_CODE_REVIEW_PROFILE,
  DEFAULT_CODE_STYLE_PROFILE,
} from './defaults';

export class ProfileManager {
  private apiClient: TaskOSApiClient;
  private workspaceId: string;
  private cachedProfiles: AgentProfile[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(apiClient: TaskOSApiClient, workspaceId: string) {
    this.apiClient = apiClient;
    this.workspaceId = workspaceId;
  }

  updateClient(apiClient: TaskOSApiClient, workspaceId: string): void {
    this.apiClient = apiClient;
    this.workspaceId = workspaceId;
    this.invalidateCache();
  }

  invalidateCache(): void {
    this.cachedProfiles = null;
    this.cacheTimestamp = 0;
  }

  private isCacheValid(): boolean {
    return (
      this.cachedProfiles !== null &&
      Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS
    );
  }

  async getAllProfiles(): Promise<AgentProfile[]> {
    if (this.isCacheValid()) {
      return this.cachedProfiles!;
    }

    try {
      const profiles = await this.apiClient.listProfiles(this.workspaceId);
      this.cachedProfiles = profiles;
      this.cacheTimestamp = Date.now();
      return profiles;
    } catch (error) {
      console.error('ProfileManager: Failed to fetch profiles:', error);
      return this.cachedProfiles || [];
    }
  }

  async getActiveReviewProfile(): Promise<CodeReviewProfile> {
    try {
      const profiles = await this.getAllProfiles();
      const reviewProfiles = profiles.filter((p) => p.type === 'code_review');
      const defaultProfile = reviewProfiles.find((p) => p.isDefault);
      if (defaultProfile) {
        return defaultProfile.config as CodeReviewProfile;
      }
      if (reviewProfiles.length > 0) {
        return reviewProfiles[0].config as CodeReviewProfile;
      }
    } catch {
      // Fall through to defaults
    }
    return DEFAULT_CODE_REVIEW_PROFILE;
  }

  async getActiveStyleProfile(): Promise<CodeStyleProfile> {
    try {
      const profiles = await this.getAllProfiles();
      const styleProfiles = profiles.filter((p) => p.type === 'code_style');
      const defaultProfile = styleProfiles.find((p) => p.isDefault);
      if (defaultProfile) {
        return defaultProfile.config as CodeStyleProfile;
      }
      if (styleProfiles.length > 0) {
        return styleProfiles[0].config as CodeStyleProfile;
      }
    } catch {
      // Fall through to defaults
    }
    return DEFAULT_CODE_STYLE_PROFILE;
  }

  async createProfile(
    type: 'code_review' | 'code_style',
    name: string,
    config: CodeReviewProfile | CodeStyleProfile,
    isDefault: boolean = false
  ): Promise<AgentProfile> {
    const profile = await this.apiClient.createProfile(this.workspaceId, {
      type,
      name,
      config,
      isDefault,
    });
    this.invalidateCache();
    return profile;
  }

  async updateProfile(
    profileId: string,
    updates: { name?: string; config?: Record<string, unknown>; isDefault?: boolean }
  ): Promise<AgentProfile> {
    const profile = await this.apiClient.updateProfile(
      this.workspaceId,
      profileId,
      updates
    );
    this.invalidateCache();
    return profile;
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.apiClient.deleteProfile(this.workspaceId, profileId);
    this.invalidateCache();
  }
}
