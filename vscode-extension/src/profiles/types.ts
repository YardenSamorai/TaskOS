// ============== Code Review Profile ==============

export type Severity = 'info' | 'warn' | 'blocker';
export type Strictness = 'low' | 'medium' | 'high';
export type AppliesTo = 'frontend' | 'backend' | 'all';
export type FeedbackFormat = 'inline' | 'bullets' | 'summary+inline';
export type Tone = 'neutral' | 'direct' | 'strict';

export type FocusArea =
  | 'security'
  | 'performance'
  | 'readability'
  | 'testing'
  | 'edge-cases'
  | 'api-contracts'
  | 'error-handling'
  | 'logging'
  | 'types'
  | 'architecture';

export interface ReviewRule {
  id: string;
  description: string;
  severity: Severity;
  applies_to: AppliesTo;
  examples?: string[];
}

export interface CodeReviewProfile {
  strictness: Strictness;
  focus_areas: FocusArea[];
  rules: ReviewRule[];
  required_checks: string[];
  feedback_format: FeedbackFormat;
  tone: Tone;
}

// ============== Code Style Profile ==============

export type TestType = 'unit' | 'integration' | 'e2e';

export interface TestRequiredWhen {
  business_logic_changed: boolean;
  api_changed: boolean;
  db_query_changed: boolean;
  bugfix: boolean;
}

export interface TestCommands {
  unit?: string;
  integration?: string;
  e2e?: string;
}

export interface TestingPolicy {
  test_required_when: TestRequiredWhen;
  test_types_required: TestType[];
  minimum_expectations: string[];
  allow_skip_with_reason: boolean;
  test_commands?: TestCommands;
}

export interface CodeStyleProfile {
  language_stack: string[];
  patterns_preferred: string[];
  patterns_avoid: string[];
  architecture_constraints: string[];
  naming_conventions: string[];
  error_handling_policy: string;
  linting_formatting_policy: string;
  testing_policy: TestingPolicy;
}

// ============== Profile Wrapper ==============

export type AgentProfileType = 'code_review' | 'code_style';

export interface AgentProfile {
  id: string;
  workspaceId: string;
  type: AgentProfileType;
  name: string;
  config: CodeReviewProfile | CodeStyleProfile;
  isDefault: boolean;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

// ============== Review Result Types ==============

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ReviewFinding {
  file: string;
  line_range?: string;
  severity: Severity;
  category: string;
  message: string;
  suggested_fix?: string;
}

export interface CodeReviewResult {
  summary: string;
  risk_level: RiskLevel;
  test_status: {
    status: 'pass' | 'fail' | 'skipped' | 'not_run';
    reason?: string;
  };
  findings: ReviewFinding[];
  required_actions: string[];
  optional_suggestions: string[];
}

// ============== Test Run Result ==============

export interface TestRunResult {
  tests_required: boolean;
  reason: string;
  commands_run: string[];
  result: 'pass' | 'fail' | 'skipped';
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration_ms: number;
  };
  failures: Array<{
    test_name: string;
    file?: string;
    message?: string;
  }>;
  logs_snippet: string;
}

// ============== Pipeline Result ==============

export type PipelineStage =
  | 'get_diff'
  | 'determine_tests'
  | 'run_tests'
  | 'self_review'
  | 'autofix'
  | 'build_pr'
  | 'open_pr';

export interface PipelineResult {
  success: boolean;
  stages_completed: PipelineStage[];
  diff_summary: string;
  test_result?: TestRunResult;
  review_result?: CodeReviewResult;
  autofix_attempted: boolean;
  autofix_successful: boolean;
  pr_url?: string;
  pr_body: string;
  blockers: string[];
  warnings: string[];
}
