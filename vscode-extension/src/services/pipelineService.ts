import * as vscode from 'vscode';
import { Task, TaskOSApiClient } from '../api/client';
import { GitService } from './gitService';
import { TestRunnerService } from './testRunner';
import { CodeReviewService } from './codeReviewService';
import { ProfileManager } from '../profiles/profileManager';
import { AgentService } from './agentService';
import {
  PipelineResult,
  PipelineStage,
  TestRunResult,
  CodeReviewResult,
  CodeStyleProfile,
  CodeReviewProfile,
} from '../profiles/types';

export class PipelineService {
  private gitService: GitService;
  private testRunner: TestRunnerService;
  private codeReviewService: CodeReviewService;
  private profileManager: ProfileManager;
  private agentService: AgentService;

  constructor(
    apiClient: TaskOSApiClient,
    profileManager: ProfileManager,
  ) {
    this.gitService = new GitService();
    this.testRunner = new TestRunnerService();
    this.codeReviewService = new CodeReviewService(apiClient);
    this.profileManager = profileManager;
    this.agentService = new AgentService();
  }

  /**
   * Run the full pipeline: diff -> tests -> review -> autofix -> PR
   */
  async runPipeline(
    task: Task,
    customPRConfig?: {
      customPRTitle?: string;
      customCommitMessage?: string;
      customBaseBranch?: string;
    },
  ): Promise<PipelineResult> {
    const result: PipelineResult = {
      success: false,
      stages_completed: [],
      diff_summary: '',
      autofix_attempted: false,
      autofix_successful: false,
      pr_body: '',
      blockers: [],
      warnings: [],
    };

    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'TaskOS Pipeline',
        cancellable: true,
      },
      async (progress, token) => {
        try {
          // Load profiles
          progress.report({ message: 'Loading profiles...', increment: 5 });
          const styleProfile = await this.profileManager.getActiveStyleProfile();
          const reviewProfile = await this.profileManager.getActiveReviewProfile();

          if (token.isCancellationRequested) { return result; }

          // Stage 1: Get Diff (committed + uncommitted)
          progress.report({ message: 'Getting changes...', increment: 10 });
          let diff = await this.gitService.getFullDiff();
          let changedFiles = await this.gitService.getChangedFiles();

          // Also check for uncommitted changes (staged + unstaged)
          const hasUncommitted = await this.gitService.hasUncommittedChanges();
          if (hasUncommitted) {
            try {
              const uncommittedDiff = await this.gitService.runGitPublic('diff HEAD');
              const untrackedFiles = (await this.gitService.runGitPublic('ls-files --others --exclude-standard')).split('\n').filter(Boolean);
              if (!diff) { diff = uncommittedDiff; }
              else { diff = diff + '\n' + uncommittedDiff; }
              changedFiles = [...new Set([...changedFiles, ...untrackedFiles])];
            } catch {
              // fall through
            }
          }

          if (!diff && changedFiles.length === 0 && !hasUncommitted) {
            vscode.window.showWarningMessage('No changes detected. Make sure you have made changes to your code.');
            return result;
          }

          result.diff_summary = diff ? await this.gitService.getDiffSummary() : `${changedFiles.length} file(s) changed`;
          result.stages_completed.push('get_diff');

          if (token.isCancellationRequested) { return result; }

          // Stage 2: Determine test requirements
          progress.report({ message: 'Analyzing test requirements...', increment: 10 });
          const testReqs = this.testRunner.determineTestRequirements(
            changedFiles,
            diff,
            styleProfile
          );
          result.stages_completed.push('determine_tests');

          let testResult: TestRunResult | undefined;

          if (token.isCancellationRequested) { return result; }

          // Stage 3: Run tests if required
          if (testReqs.required) {
            progress.report({ message: 'Running tests...', increment: 15 });

            const commands = await this.testRunner.detectTestCommands(styleProfile);
            testResult = await this.testRunner.runTests(commands, testReqs.types);
            result.test_result = testResult;
            result.stages_completed.push('run_tests');

            if (testResult.result === 'fail') {
              result.warnings.push(`Tests failed: ${testResult.summary.failed} of ${testResult.summary.total} tests failed`);
            }
          } else {
            // Tests skipped
            if (!styleProfile.testing_policy.allow_skip_with_reason && testReqs.required === false) {
              // Check if profile forbids skipping
              const reason = testReqs.reason;
              testResult = {
                tests_required: false,
                reason,
                commands_run: [],
                result: 'skipped',
                summary: { total: 0, passed: 0, failed: 0, duration_ms: 0 },
                failures: [],
                logs_snippet: '',
              };
              result.test_result = testResult;
            } else {
              testResult = {
                tests_required: false,
                reason: testReqs.reason,
                commands_run: [],
                result: 'skipped',
                summary: { total: 0, passed: 0, failed: 0, duration_ms: 0 },
                failures: [],
                logs_snippet: '',
              };
              result.test_result = testResult;
            }
          }

          if (token.isCancellationRequested) { return result; }

          // Stage 4: Self Code Review
          progress.report({ message: 'Performing code review...', increment: 20 });
          const reviewResult = await this.codeReviewService.reviewDiff(
            diff,
            changedFiles,
            reviewProfile,
            testResult,
            `Task: ${task.title}\nDescription: ${task.description || 'N/A'}`
          );
          result.review_result = reviewResult;
          result.stages_completed.push('self_review');

          // Collect blockers from review
          const reviewBlockers = reviewResult.findings
            .filter(f => f.severity === 'blocker')
            .map(f => `[${f.category}] ${f.file}: ${f.message}`);
          result.blockers.push(...reviewBlockers);

          // Collect warnings from review
          const reviewWarnings = reviewResult.findings
            .filter(f => f.severity === 'warn')
            .map(f => `[${f.category}] ${f.file}: ${f.message}`);
          result.warnings.push(...reviewWarnings);

          // Add test failure as blocker
          if (testResult?.result === 'fail') {
            result.blockers.push(
              `Tests failed: ${testResult.summary.failed} tests failed. Fix before merge.`
            );
          }

          if (token.isCancellationRequested) { return result; }

          // Stage 5: Autofix attempt (if tests failed or blockers found)
          const needsAutofix = testResult?.result === 'fail' || result.blockers.length > 0;

          if (needsAutofix) {
            progress.report({ message: 'Attempting autofix...', increment: 10 });
            result.autofix_attempted = true;
            result.stages_completed.push('autofix');

            const autofixPrompt = this.buildAutofixPrompt(
              task,
              testResult,
              reviewResult,
              result.blockers,
              styleProfile
            );

            // Show the autofix prompt in a notification so user can decide
            const choice = await vscode.window.showWarningMessage(
              `Pipeline found ${result.blockers.length} blocker(s). Send autofix prompt to AI?`,
              'Send to AI',
              'Skip Autofix'
            );

            if (choice === 'Send to AI') {
              try {
                await this.agentService.sendToAgent(
                  { ...task, title: `[AUTOFIX] ${task.title}`, description: autofixPrompt } as Task
                );
                vscode.window.showInformationMessage(
                  'Autofix prompt sent to AI. Run the pipeline again after the AI makes changes.'
                );
                result.autofix_successful = false; // Will need re-run
                return result;
              } catch {
                result.autofix_successful = false;
              }
            } else {
              result.autofix_successful = false;
            }
          }

          if (token.isCancellationRequested) { return result; }

          // Stage 6: Build structured PR body
          progress.report({ message: 'Building PR...', increment: 15 });
          result.pr_body = this.buildStructuredPRBody(
            task,
            result,
            reviewResult,
            testResult,
            reviewProfile
          );
          result.stages_completed.push('build_pr');

          // Stage 7: Open PR
          progress.report({ message: 'Creating pull request...', increment: 15 });

          // Commit and push first if there are uncommitted changes
          const hasChanges = await this.gitService.hasUncommittedChanges();
          if (hasChanges) {
            const commitMsg = customPRConfig?.customCommitMessage
              ? `${customPRConfig.customCommitMessage}\n\nTaskOS Task: ${task.id}`
              : undefined;
            await this.gitService.commitAndPush(
              task.id,
              task.title,
              commitMsg,
              task.workspaceId,
            );
          }

          const prUrl = await this.gitService.createPullRequest(
            task.id,
            customPRConfig?.customPRTitle || task.title,
            task.description || '',
            result.pr_body,
            task.workspaceId,
          );
          result.pr_url = prUrl;
          result.stages_completed.push('open_pr');

          result.success = true;
          progress.report({ message: 'Pipeline complete!', increment: 100 });

          return result;
        } catch (error: any) {
          vscode.window.showErrorMessage(`Pipeline failed: ${error.message}`);
          result.blockers.push(`Pipeline error: ${error.message}`);
          return result;
        }
      }
    );
  }

  private buildAutofixPrompt(
    task: Task,
    testResult: TestRunResult | undefined,
    reviewResult: CodeReviewResult,
    blockers: string[],
    styleProfile: CodeStyleProfile
  ): string {
    const lines: string[] = [];

    lines.push('# AUTOFIX REQUIRED');
    lines.push('');
    lines.push(`The pipeline for task "${task.title}" found issues that need to be fixed.`);
    lines.push('');

    if (testResult?.result === 'fail') {
      lines.push('## Failed Tests');
      lines.push(`${testResult.summary.failed} of ${testResult.summary.total} tests failed.`);
      lines.push('');
      for (const failure of testResult.failures) {
        lines.push(`- **${failure.test_name}**${failure.file ? ` (${failure.file})` : ''}`);
        if (failure.message) lines.push(`  Error: ${failure.message}`);
      }
      lines.push('');
      if (testResult.logs_snippet) {
        lines.push('```');
        lines.push(testResult.logs_snippet.substring(0, 1500));
        lines.push('```');
        lines.push('');
      }
    }

    const blockerFindings = reviewResult.findings.filter(f => f.severity === 'blocker');
    if (blockerFindings.length > 0) {
      lines.push('## Code Review Blockers');
      for (const finding of blockerFindings) {
        lines.push(`- **${finding.file}${finding.line_range ? `:${finding.line_range}` : ''}** [${finding.category}]`);
        lines.push(`  ${finding.message}`);
        if (finding.suggested_fix) {
          lines.push(`  > Fix: ${finding.suggested_fix}`);
        }
      }
      lines.push('');
    }

    if (reviewResult.required_actions.length > 0) {
      lines.push('## Required Actions');
      reviewResult.required_actions.forEach(a => lines.push(`- ${a}`));
      lines.push('');
    }

    lines.push('## Instructions');
    lines.push('Please fix ALL the issues listed above. After fixing:');
    lines.push('1. Make sure all tests pass');
    lines.push('2. Address every blocker from the code review');
    lines.push('3. Follow the code style profile of this project');

    return lines.join('\n');
  }

  private buildStructuredPRBody(
    task: Task,
    pipelineResult: PipelineResult,
    reviewResult: CodeReviewResult,
    testResult: TestRunResult | undefined,
    reviewProfile: CodeReviewProfile
  ): string {
    const lines: string[] = [];

    // What Changed
    lines.push('## What Changed');
    lines.push(reviewResult.summary || 'Changes implemented as described in the task.');
    lines.push('');

    // Why
    lines.push('## Why');
    lines.push(`**Task:** ${task.title}`);
    if (task.description) {
      lines.push(task.description.substring(0, 500));
    }
    lines.push('');

    // Test Results
    lines.push('## Test Results');
    if (testResult) {
      lines.push(`- **Required:** ${testResult.tests_required ? 'Yes' : 'No'} (${testResult.reason})`);
      lines.push(`- **Status:** ${this.resultEmoji(testResult.result)} ${testResult.result.toUpperCase()}`);
      if (testResult.commands_run.length > 0) {
        lines.push(`- **Commands:** ${testResult.commands_run.map(c => `\`${c}\``).join(', ')}`);
      }
      if (testResult.summary.total > 0) {
        lines.push(`- **Results:** ${testResult.summary.passed} passed, ${testResult.summary.failed} failed out of ${testResult.summary.total} (${testResult.summary.duration_ms}ms)`);
      }
      if (testResult.failures.length > 0) {
        lines.push('');
        lines.push('<details>');
        lines.push('<summary>Failed Tests</summary>');
        lines.push('');
        testResult.failures.forEach(f => {
          lines.push(`- \`${f.test_name}\`${f.file ? ` in \`${f.file}\`` : ''}`);
          if (f.message) lines.push(`  > ${f.message}`);
        });
        lines.push('</details>');
      }
    } else {
      lines.push('- Tests not executed');
    }
    lines.push('');

    // Self Review
    lines.push(this.codeReviewService.formatReviewForPR(reviewResult));

    // Checklist from profile
    lines.push('## Checklist');
    if (reviewProfile.required_checks.length > 0) {
      const blockerSet = new Set(
        reviewResult.findings
          .filter(f => f.severity === 'blocker')
          .map(f => f.message)
      );
      for (const check of reviewProfile.required_checks) {
        const passed = !Array.from(blockerSet).some(b => b.toLowerCase().includes(check.toLowerCase()));
        lines.push(`- [${passed ? 'x' : ' '}] ${check}`);
      }
    } else {
      lines.push('- [x] Code follows project conventions');
      lines.push('- [x] Error handling implemented');
    }
    lines.push('');

    // Known Issues / Blockers
    if (pipelineResult.blockers.length > 0) {
      lines.push('## Known Issues / Blockers');
      pipelineResult.blockers.forEach(b => lines.push(`- ${b}`));
      lines.push('');
    }

    lines.push('---');
    lines.push(`*Created via [TaskOS](https://www.task-os.app) Pipeline* | Task ID: \`${task.id}\``);

    return lines.join('\n');
  }

  private resultEmoji(result: string): string {
    switch (result) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  }
}
