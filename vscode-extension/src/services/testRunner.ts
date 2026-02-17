import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { CodeStyleProfile, TestRunResult, TestType, TestCommands } from '../profiles/types';

const execAsync = promisify(exec);

export class TestRunnerService {
  private workspacePath: string;

  constructor() {
    const folders = vscode.workspace.workspaceFolders;
    this.workspacePath = folders?.[0]?.uri.fsPath || '';
  }

  /**
   * Detect test commands from profile config or auto-detect from project files
   */
  async detectTestCommands(profile?: CodeStyleProfile): Promise<TestCommands> {
    // Priority 1: Commands from profile
    if (profile?.testing_policy?.test_commands) {
      const cmds = profile.testing_policy.test_commands;
      if (cmds.unit || cmds.integration || cmds.e2e) {
        return cmds;
      }
    }

    // Priority 2: Extension settings
    const config = vscode.workspace.getConfiguration('taskos');
    const configuredCommands = config.get<TestCommands>('testCommands');
    if (configuredCommands && (configuredCommands.unit || configuredCommands.integration || configuredCommands.e2e)) {
      return configuredCommands;
    }

    // Priority 3: Auto-detect from project
    return await this.autoDetectTestCommands();
  }

  private async autoDetectTestCommands(): Promise<TestCommands> {
    const commands: TestCommands = {};

    try {
      // Check package.json for Node.js projects
      const packageJsonPath = path.join(this.workspacePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const scripts = pkg.scripts || {};

        if (scripts.test) commands.unit = 'npm test';
        if (scripts['test:unit']) commands.unit = 'npm run test:unit';
        if (scripts['test:integration']) commands.integration = 'npm run test:integration';
        if (scripts['test:e2e']) commands.e2e = 'npm run test:e2e';

        // Check for common test runners
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (!commands.unit) {
          if (deps.jest || deps['@jest/core']) commands.unit = 'npx jest --passWithNoTests';
          else if (deps.vitest) commands.unit = 'npx vitest run';
          else if (deps.mocha) commands.unit = 'npx mocha';
        }
      }

      // Check for Python projects
      const pytestIniPath = path.join(this.workspacePath, 'pytest.ini');
      const pyprojectPath = path.join(this.workspacePath, 'pyproject.toml');
      if (fs.existsSync(pytestIniPath) || fs.existsSync(pyprojectPath)) {
        commands.unit = 'pytest';
      }

      // Check for Go projects
      const goModPath = path.join(this.workspacePath, 'go.mod');
      if (fs.existsSync(goModPath)) {
        commands.unit = 'go test ./...';
      }
    } catch (error) {
      console.error('TestRunner: Auto-detection failed:', error);
    }

    return commands;
  }

  /**
   * Determine if tests are required based on profile policy and changed files
   */
  determineTestRequirements(
    changedFiles: string[],
    diff: string,
    profile?: CodeStyleProfile
  ): { required: boolean; reason: string; types: TestType[] } {
    const policy = profile?.testing_policy;

    if (!policy) {
      // Heuristic-based detection when no profile
      return this.heuristicTestRequirements(changedFiles, diff);
    }

    const triggers: string[] = [];
    const types: TestType[] = [];

    // Check each condition
    if (policy.test_required_when.api_changed && this.hasApiChanges(changedFiles, diff)) {
      triggers.push('API endpoint changes detected');
    }
    if (policy.test_required_when.business_logic_changed && this.hasLogicChanges(changedFiles, diff)) {
      triggers.push('Business logic changes detected');
    }
    if (policy.test_required_when.db_query_changed && this.hasDbChanges(changedFiles, diff)) {
      triggers.push('Database query changes detected');
    }
    if (policy.test_required_when.bugfix && this.isBugfix(diff)) {
      triggers.push('Bugfix detected');
    }

    if (triggers.length > 0) {
      return {
        required: true,
        reason: triggers.join('; '),
        types: policy.test_types_required.length > 0 ? [...policy.test_types_required] : ['unit'],
      };
    }

    return {
      required: false,
      reason: 'No test-triggering changes detected based on profile policy',
      types: [],
    };
  }

  private heuristicTestRequirements(
    changedFiles: string[],
    diff: string
  ): { required: boolean; reason: string; types: TestType[] } {
    const triggers: string[] = [];

    if (this.hasApiChanges(changedFiles, diff)) triggers.push('API changes');
    if (this.hasLogicChanges(changedFiles, diff)) triggers.push('Service/logic changes');

    if (triggers.length > 0) {
      return {
        required: true,
        reason: `Heuristic: ${triggers.join(', ')} detected`,
        types: ['unit'],
      };
    }

    return { required: false, reason: 'No significant logic changes detected', types: [] };
  }

  private hasApiChanges(files: string[], diff: string): boolean {
    const apiPatterns = [/route\.(ts|js)/, /controller/, /api\//, /endpoint/, /handler/];
    return files.some(f => apiPatterns.some(p => p.test(f))) ||
      /(@(Get|Post|Put|Delete|Patch)|app\.(get|post|put|delete|patch)|router\.|export\s+async\s+function\s+(GET|POST|PUT|DELETE))/.test(diff);
  }

  private hasLogicChanges(files: string[], diff: string): boolean {
    const logicPatterns = [/service/, /util/, /helper/, /lib\//, /core\//, /domain\//];
    return files.some(f => logicPatterns.some(p => p.test(f.toLowerCase())));
  }

  private hasDbChanges(files: string[], diff: string): boolean {
    return /\.(query|execute|findMany|findFirst|insert|update|delete|select|from|where)\s*\(/.test(diff) ||
      files.some(f => /(schema|migration|model|repository|dao)/i.test(f));
  }

  private isBugfix(diff: string): boolean {
    return /(fix|bug|patch|hotfix|issue)/i.test(diff);
  }

  /**
   * Run test commands and return structured results
   */
  async runTests(commands: TestCommands, typesToRun: TestType[]): Promise<TestRunResult> {
    const commandsRun: string[] = [];
    let allPassed = true;
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const failures: Array<{ test_name: string; file?: string; message?: string }> = [];
    let logsSnippet = '';
    const startTime = Date.now();

    for (const type of typesToRun) {
      const cmd = commands[type];
      if (!cmd) {
        continue;
      }

      commandsRun.push(cmd);

      try {
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: this.workspacePath,
          timeout: 120_000, // 2 minutes
          maxBuffer: 1024 * 1024 * 5, // 5MB
        });

        const output = stdout + '\n' + stderr;
        const parsed = this.parseTestOutput(output);
        totalTests += parsed.total;
        passedTests += parsed.passed;
        failedTests += parsed.failed;
        failures.push(...parsed.failures);

        // Keep last 50 lines of output
        const outputLines = output.trim().split('\n');
        logsSnippet += outputLines.slice(-50).join('\n') + '\n';
      } catch (error: any) {
        allPassed = false;
        const output = (error.stdout || '') + '\n' + (error.stderr || '');
        const parsed = this.parseTestOutput(output);

        totalTests += parsed.total || 1;
        failedTests += parsed.failed || 1;
        passedTests += parsed.passed || 0;
        failures.push(...parsed.failures);

        if (parsed.failures.length === 0) {
          failures.push({
            test_name: `${type} test suite`,
            message: error.message?.substring(0, 200) || 'Test command failed',
          });
        }

        const outputLines = output.trim().split('\n');
        logsSnippet += outputLines.slice(-50).join('\n') + '\n';
      }
    }

    if (commandsRun.length === 0) {
      return {
        tests_required: true,
        reason: 'No test commands available for the required test types',
        commands_run: [],
        result: 'skipped',
        summary: { total: 0, passed: 0, failed: 0, duration_ms: 0 },
        failures: [],
        logs_snippet: 'No test commands configured or detected.',
      };
    }

    const durationMs = Date.now() - startTime;

    return {
      tests_required: true,
      reason: `Ran ${typesToRun.join(', ')} tests`,
      commands_run: commandsRun,
      result: failedTests > 0 ? 'fail' : 'pass',
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        duration_ms: durationMs,
      },
      failures,
      logs_snippet: logsSnippet.substring(0, 3000), // Cap at 3KB
    };
  }

  private parseTestOutput(output: string): {
    total: number;
    passed: number;
    failed: number;
    failures: Array<{ test_name: string; file?: string; message?: string }>;
  } {
    let total = 0, passed = 0, failed = 0;
    const failures: Array<{ test_name: string; file?: string; message?: string }> = [];

    // Jest / Vitest format: "Tests: X passed, Y failed, Z total"
    const jestMatch = output.match(/Tests:\s+(?:(\d+)\s+passed,?\s*)?(?:(\d+)\s+failed,?\s*)?(\d+)\s+total/);
    if (jestMatch) {
      passed = parseInt(jestMatch[1] || '0');
      failed = parseInt(jestMatch[2] || '0');
      total = parseInt(jestMatch[3] || '0');
    }

    // Jest "Test Suites" format
    if (total === 0) {
      const suiteMatch = output.match(/Test Suites:\s+(?:(\d+)\s+passed,?\s*)?(?:(\d+)\s+failed,?\s*)?(\d+)\s+total/);
      if (suiteMatch) {
        passed = parseInt(suiteMatch[1] || '0');
        failed = parseInt(suiteMatch[2] || '0');
        total = parseInt(suiteMatch[3] || '0');
      }
    }

    // Pytest format: "X passed, Y failed"
    if (total === 0) {
      const pytestMatch = output.match(/(\d+)\s+passed(?:.*?(\d+)\s+failed)?/);
      if (pytestMatch) {
        passed = parseInt(pytestMatch[1] || '0');
        failed = parseInt(pytestMatch[2] || '0');
        total = passed + failed;
      }
    }

    // Go test: "ok" / "FAIL"
    if (total === 0) {
      const goPassCount = (output.match(/^ok\s/gm) || []).length;
      const goFailCount = (output.match(/^FAIL\s/gm) || []).length;
      if (goPassCount + goFailCount > 0) {
        passed = goPassCount;
        failed = goFailCount;
        total = passed + failed;
      }
    }

    // Extract failed test names (Jest/Vitest format: "FAIL path/to/file.test.ts")
    const failedFileMatches = output.matchAll(/FAIL\s+([^\s]+\.(?:test|spec)\.\w+)/g);
    for (const match of failedFileMatches) {
      failures.push({ test_name: match[1], file: match[1] });
    }

    // Extract individual test failures: "✕ test name" or "× test name"
    const testFailMatches = output.matchAll(/[✕×✖]\s+(.+)/g);
    for (const match of testFailMatches) {
      if (!failures.some(f => f.test_name === match[1])) {
        failures.push({ test_name: match[1].trim() });
      }
    }

    return { total, passed, failed, failures };
  }
}
