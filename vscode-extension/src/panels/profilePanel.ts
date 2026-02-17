import * as vscode from 'vscode';
import { TaskOSApiClient } from '../api/client';
import { ProfileManager } from '../profiles/profileManager';
import { PRESETS, PresetName } from '../profiles/defaults';

export class ProfilePanel {
  public static currentPanel: ProfilePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _profileManager: ProfileManager;
  private _workspaceId: string;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    apiClient: TaskOSApiClient,
    workspaceId: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._workspaceId = workspaceId;
    this._profileManager = new ProfileManager(apiClient, workspaceId);

    this._update();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'loadProfiles': await this._update(); break;
          case 'applyPreset': await this._applyPreset(message.preset); break;
          case 'saveProfile': await this._saveProfile(message.type, message.name, message.config, message.isDefault); break;
          case 'deleteProfile': await this._deleteProfile(message.profileId); break;
          case 'setDefault': await this._setDefault(message.profileId); break;
        }
      },
      null,
      this._disposables
    );
  }

  public static render(extensionUri: vscode.Uri, apiClient: TaskOSApiClient, workspaceId: string) {
    if (ProfilePanel.currentPanel) {
      ProfilePanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      return;
    }
    const panel = vscode.window.createWebviewPanel('taskosProfiles', 'TaskOS — Profiles', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
    ProfilePanel.currentPanel = new ProfilePanel(panel, extensionUri, apiClient, workspaceId);
  }

  private async _applyPreset(presetName: string) {
    try {
      const preset = PRESETS[presetName as PresetName];
      if (!preset) { vscode.window.showErrorMessage(`Unknown preset: ${presetName}`); return; }
      const label = presetName.charAt(0).toUpperCase() + presetName.slice(1);
      await this._profileManager.createProfile('code_review', `${label} Code Review`, preset.code_review, true);
      await this._profileManager.createProfile('code_style', `${label} Code Style`, preset.code_style, true);
      vscode.window.showInformationMessage(`"${label}" preset applied!`);
      await this._update();
    } catch (error) { vscode.window.showErrorMessage(`Failed to apply preset: ${error}`); }
  }

  private async _saveProfile(type: string, name: string, config: any, isDefault: boolean) {
    try {
      await this._profileManager.createProfile(type as 'code_review' | 'code_style', name, config, isDefault);
      vscode.window.showInformationMessage(`Profile "${name}" saved!`);
      await this._update();
    } catch (error) { vscode.window.showErrorMessage(`Failed to save profile: ${error}`); }
  }

  private async _deleteProfile(profileId: string) {
    try {
      await this._profileManager.deleteProfile(profileId);
      await this._update();
    } catch (error) { vscode.window.showErrorMessage(`Failed to delete profile: ${error}`); }
  }

  private async _setDefault(profileId: string) {
    try {
      await this._profileManager.updateProfile(profileId, { isDefault: true });
      await this._update();
    } catch (error) { vscode.window.showErrorMessage(`Failed to set default: ${error}`); }
  }

  private async _update() {
    try {
      const profiles = await this._profileManager.getAllProfiles();
      this._panel.webview.html = this._getContent(
        profiles.filter(p => p.type === 'code_review'),
        profiles.filter(p => p.type === 'code_style')
      );
    } catch { this._panel.webview.html = this._getContent([], []); }
  }

  private _getContent(reviewProfiles: any[], styleProfiles: any[]): string {
    const renderCard = (p: any) => {
      const isReview = p.type === 'code_review';
      const details = isReview
        ? [
            ['Strictness', p.config?.strictness || 'medium'],
            ['Focus Areas', (p.config?.focus_areas || []).length + ' areas'],
            ['Rules', (p.config?.rules || []).length + ' rules'],
            ['Tone', p.config?.tone || 'neutral'],
          ]
        : [
            ['Stack', (p.config?.language_stack || []).join(', ') || 'Any'],
            ['Patterns', (p.config?.patterns_preferred || []).length + ' preferred'],
            ['Tests', p.config?.testing_policy?.allow_skip_with_reason === false ? 'Mandatory' : 'When needed'],
          ];

      return `
        <div class="profile-card ${p.isDefault ? 'is-active' : ''}">
          <div class="pc-top">
            <div class="pc-name">${this._escape(p.name)}</div>
            <div class="pc-badges">
              ${p.isDefault ? '<span class="pc-badge pc-badge-active">Active</span>' : ''}
              <span class="pc-badge pc-badge-type">${isReview ? 'Review' : 'Style'}</span>
            </div>
          </div>
          <div class="pc-details">
            ${details.map(([k, v]) => `<div class="pc-row"><span class="pc-key">${k}</span><span class="pc-val">${v}</span></div>`).join('')}
          </div>
          <div class="pc-actions">
            ${!p.isDefault ? `<button class="btn btn-ghost btn-sm" onclick="setDefault('${p.id}')">Set Active</button>` : '<span class="pc-active-label">Currently active</span>'}
            <button class="btn btn-danger-ghost btn-sm" onclick="deleteProfile('${p.id}')">Delete</button>
          </div>
        </div>
      `;
    };

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      :root {
        --bg-primary: #06060a; --bg-secondary: #0c0c14; --bg-card: #0e0e18;
        --bg-card-hover: #141422; --bg-elevated: #16162a; --bg-input: #0e0e1a;
        --border-subtle: rgba(255,255,255,0.06); --border-default: rgba(255,255,255,0.08);
        --border-hover: rgba(255,255,255,0.12); --border-focus: rgba(124,58,237,0.5);
        --border-accent: rgba(124,58,237,0.3);
        --text-primary: #f0f0f5; --text-secondary: rgba(240,240,245,0.65);
        --text-tertiary: rgba(240,240,245,0.4); --text-inverse: #06060a;
        --accent-primary: #7C3AED; --accent-primary-hover: #8B5CF6;
        --accent-primary-subtle: rgba(124,58,237,0.12);
        --accent-gradient: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
        --success: #10B981; --success-subtle: rgba(16,185,129,0.12);
        --warning: #F59E0B; --warning-subtle: rgba(245,158,11,0.12);
        --danger: #EF4444; --danger-subtle: rgba(239,68,68,0.12);
        --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 18px; --radius-full: 100px;
        --shadow-glow: 0 0 20px rgba(124,58,237,0.15);
        --font-sans: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        --transition-base: 200ms cubic-bezier(0.4,0,0.2,1);
        --transition-slow: 300ms cubic-bezier(0.4,0,0.2,1);
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: var(--font-sans); background: var(--bg-primary); color: var(--text-primary); min-height: 100vh; -webkit-font-smoothing: antialiased; }

      .btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: var(--radius-md); border: 1px solid transparent; font-weight: 500; font-size: 13px; cursor: pointer; transition: all var(--transition-base); font-family: var(--font-sans); white-space: nowrap; }
      .btn:active { transform: scale(0.97); }
      .btn-primary { background: var(--accent-gradient); color: #fff; box-shadow: 0 1px 3px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
      .btn-primary:hover { box-shadow: 0 4px 16px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.1); }
      .btn-ghost { background: transparent; color: var(--text-secondary); border-color: var(--border-default); }
      .btn-ghost:hover { background: rgba(255,255,255,0.04); border-color: var(--border-hover); color: var(--text-primary); }
      .btn-danger-ghost { background: var(--danger-subtle); color: #F87171; border-color: rgba(239,68,68,0.2); }
      .btn-danger-ghost:hover { background: rgba(239,68,68,0.2); }
      .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: var(--radius-sm); }
      .btn-lg { padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: var(--radius-lg); }

      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

      .container { max-width: 720px; margin: 0 auto; padding: 28px 24px; }

      .page-head { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle); }
      .page-title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 4px; }
      .page-sub { font-size: 13px; color: var(--text-tertiary); }

      /* Presets */
      .presets {
        border: 1px solid var(--border-accent); border-radius: var(--radius-lg);
        padding: 20px; margin-bottom: 28px; background: var(--accent-primary-subtle);
      }
      .presets-label { font-size: 13px; font-weight: 600; color: var(--accent-primary-hover); margin-bottom: 4px; }
      .presets-desc { font-size: 12px; color: var(--text-tertiary); margin-bottom: 14px; }
      .presets-btns { display: flex; gap: 10px; flex-wrap: wrap; }
      .btn-preset {
        background: rgba(124,58,237,0.15); color: var(--accent-primary-hover);
        border: 1px solid rgba(124,58,237,0.25); padding: 10px 18px;
        border-radius: var(--radius-md); font-size: 13px; font-weight: 600;
        cursor: pointer; transition: all var(--transition-base); font-family: var(--font-sans);
      }
      .btn-preset:hover { background: rgba(124,58,237,0.25); border-color: rgba(124,58,237,0.4); }

      /* Section */
      .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .section-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
      .section-count { font-size: 12px; color: var(--text-tertiary); }
      .section { margin-bottom: 28px; }

      /* Profile cards */
      .profile-card {
        background: var(--bg-card); border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg); padding: 16px 18px; margin-bottom: 10px;
        transition: all var(--transition-base); animation: fadeIn var(--transition-slow) ease both;
      }
      .profile-card:hover { border-color: var(--border-hover); }
      .profile-card.is-active { border-color: var(--border-accent); }

      .pc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .pc-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
      .pc-badges { display: flex; gap: 6px; }
      .pc-badge {
        padding: 2px 8px; border-radius: var(--radius-full);
        font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .pc-badge-active { background: var(--accent-primary-subtle); color: var(--accent-primary-hover); }
      .pc-badge-type { background: rgba(255,255,255,0.05); color: var(--text-tertiary); }

      .pc-details { margin-bottom: 14px; }
      .pc-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 5px 0; font-size: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.03);
      }
      .pc-row:last-child { border-bottom: none; }
      .pc-key { color: var(--text-tertiary); }
      .pc-val { color: var(--text-secondary); font-weight: 500; }

      .pc-actions { display: flex; gap: 8px; align-items: center; }
      .pc-active-label { font-size: 11px; color: var(--accent-primary-hover); font-weight: 600; }

      .empty-msg { text-align: center; padding: 32px; color: var(--text-tertiary); font-size: 13px; }
    </style>
    </head>
    <body>
      <div class="container">
        <div class="page-head">
          <div class="page-title">Agent Profiles</div>
          <div class="page-sub">Configure how the AI writes and reviews code for your workspace</div>
        </div>

        <div class="presets">
          <div class="presets-label">Quick Setup</div>
          <div class="presets-desc">Apply a pre-configured set of review and style rules</div>
          <div class="presets-btns">
            <button class="btn-preset" onclick="applyPreset('default')">Apply Default</button>
            <button class="btn-preset" onclick="applyPreset('strict')">Apply Strict</button>
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <div class="section-title">Code Review Profiles</div>
            <div class="section-count">${reviewProfiles.length} profile${reviewProfiles.length !== 1 ? 's' : ''}</div>
          </div>
          ${reviewProfiles.length > 0 ? reviewProfiles.map(renderCard).join('') : '<div class="empty-msg">No review profiles — apply a preset to get started</div>'}
        </div>

        <div class="section">
          <div class="section-head">
            <div class="section-title">Code Style Profiles</div>
            <div class="section-count">${styleProfiles.length} profile${styleProfiles.length !== 1 ? 's' : ''}</div>
          </div>
          ${styleProfiles.length > 0 ? styleProfiles.map(renderCard).join('') : '<div class="empty-msg">No style profiles — apply a preset to get started</div>'}
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        function applyPreset(n) { vscode.postMessage({ command: 'applyPreset', preset: n }); }
        function setDefault(id) { vscode.postMessage({ command: 'setDefault', profileId: id }); }
        function deleteProfile(id) { if (confirm('Delete this profile?')) vscode.postMessage({ command: 'deleteProfile', profileId: id }); }
      </script>
    </body></html>`;
  }

  private _escape(text: string): string {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  public dispose() {
    ProfilePanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) { const x = this._disposables.pop(); if (x) x.dispose(); }
  }
}
