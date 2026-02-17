import { TaskOSApiClient } from '../api/client';
import {
  CodeReviewProfile,
  CodeReviewResult,
  TestRunResult,
  ReviewFinding,
} from '../profiles/types';

export class CodeReviewService {
  private apiClient: TaskOSApiClient;

  constructor(apiClient: TaskOSApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Send diff for AI code review via TaskOS API
   */
  async reviewDiff(
    diff: string,
    changedFiles: string[],
    reviewProfile: CodeReviewProfile,
    testResults?: TestRunResult,
    projectContext?: string
  ): Promise<CodeReviewResult> {
    try {
      const response = await this.apiClient.reviewCode({
        diff,
        changedFiles,
        projectContext,
        reviewProfile,
        testResults: testResults
          ? {
              result: testResults.result,
              summary: testResults.summary,
              failures: testResults.failures,
            }
          : undefined,
      });

      return {
        summary: response.summary || 'Review completed',
        risk_level: response.risk_level || 'medium',
        test_status: response.test_status || { status: 'not_run' },
        findings: (response.findings || []).map((f: any) => ({
          file: f.file || 'unknown',
          line_range: f.line_range,
          severity: f.severity || 'info',
          category: f.category || 'general',
          message: f.message || '',
          suggested_fix: f.suggested_fix,
        })),
        required_actions: response.required_actions || [],
        optional_suggestions: response.optional_suggestions || [],
      };
    } catch (error: any) {
      console.error('CodeReviewService: Review failed:', error);
      return {
        summary: `Review failed: ${error.message || 'Unknown error'}`,
        risk_level: 'high',
        test_status: { status: 'not_run', reason: 'Review API call failed' },
        findings: [],
        required_actions: ['Manual review required - automated review failed'],
        optional_suggestions: [],
      };
    }
  }

  /**
   * Check if review has any blockers
   */
  hasBlockers(review: CodeReviewResult): boolean {
    return review.findings.some((f) => f.severity === 'blocker') ||
      review.required_actions.length > 0;
  }

  /**
   * Format review results as markdown for PR body
   */
  formatReviewForPR(review: CodeReviewResult): string {
    const lines: string[] = [];

    lines.push('## Self Code Review');
    lines.push('');
    lines.push(`**Summary:** ${review.summary}`);
    lines.push(`**Risk Level:** ${this.riskBadge(review.risk_level)}`);
    lines.push('');

    // Counts
    const blockers = review.findings.filter((f) => f.severity === 'blocker');
    const warnings = review.findings.filter((f) => f.severity === 'warn');
    const infos = review.findings.filter((f) => f.severity === 'info');

    lines.push(
      `| Blockers | Warnings | Info |`,
      `| :---: | :---: | :---: |`,
      `| ${blockers.length} | ${warnings.length} | ${infos.length} |`
    );
    lines.push('');

    // Findings
    if (review.findings.length > 0) {
      lines.push('### Findings');
      lines.push('');

      for (const finding of review.findings) {
        const icon = this.severityIcon(finding.severity);
        const location = finding.line_range
          ? `\`${finding.file}:${finding.line_range}\``
          : `\`${finding.file}\``;
        lines.push(
          `${icon} **[${finding.severity.toUpperCase()}]** ${location} - *${finding.category}*`
        );
        lines.push(`  ${finding.message}`);
        if (finding.suggested_fix) {
          lines.push(`  > **Suggested fix:** ${finding.suggested_fix}`);
        }
        lines.push('');
      }
    } else {
      lines.push('*No findings - code looks clean!*');
      lines.push('');
    }

    // Required actions
    if (review.required_actions.length > 0) {
      lines.push('### Required Actions');
      review.required_actions.forEach((a) => lines.push(`- [ ] ${a}`));
      lines.push('');
    }

    // Optional suggestions
    if (review.optional_suggestions.length > 0) {
      lines.push('<details>');
      lines.push('<summary>Optional Suggestions</summary>');
      lines.push('');
      review.optional_suggestions.forEach((s) => lines.push(`- ${s}`));
      lines.push('</details>');
      lines.push('');
    }

    return lines.join('\n');
  }

  private riskBadge(level: string): string {
    switch (level) {
      case 'low': return '🟢 Low';
      case 'medium': return '🟡 Medium';
      case 'high': return '🔴 High';
      default: return level;
    }
  }

  private severityIcon(severity: string): string {
    switch (severity) {
      case 'blocker': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  }
}
