/**
 * Branch Convention - Single shared utility
 *
 * Used by: server actions, API preview endpoint, VS Code extension (via copy).
 * This is the SINGLE SOURCE OF TRUTH for sanitization and placeholder rendering.
 * The extension bundles a copy of this file; keep it dependency-free.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaskTypeMapping {
  /** Display name shown in UI, e.g. "Feature", "Bug" */
  taskType: string;
  /** Conventional-commit prefix, e.g. "feat", "fix" */
  gitPrefix: string;
  /** Branch directory prefix, e.g. "feature", "bugfix" */
  branchPrefix: string;
}

export interface BranchConventionConfig {
  /** Maps task types to git prefixes and branch prefixes */
  taskTypeMappings: TaskTypeMapping[];
  /**
   * Branch name pattern.
   * Placeholders: {branchPrefix}, {gitPrefix}, {title}, {id}, {username}
   * Example: "{branchPrefix}/{title}-{id}"
   */
  branchPattern: string;
  /**
   * PR title pattern.
   * Placeholders: {gitPrefix}, {title}, {id}, {taskType}, {username}
   * Example: "{gitPrefix}: {title}"
   */
  prTitlePattern: string;
  /**
   * Commit message pattern.
   * Placeholders: {gitPrefix}, {title}, {id}, {taskType}, {username}
   * Example: "{gitPrefix}: {title}"
   */
  commitPattern: string;
  /** Default base branch for PRs, e.g. "main" */
  defaultBaseBranch: string;
  /** Fallback taskType key when none is specified */
  defaultTaskType: string;
}

export interface RenderContext {
  taskTitle: string;
  taskId: string;
  taskType?: string;
  username?: string;
}

export interface RenderedConvention {
  branchName: string;
  prTitle: string;
  commitMessage: string;
  baseBranch: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_TASK_TYPE_MAPPINGS: TaskTypeMapping[] = [
  { taskType: "feature", gitPrefix: "feat", branchPrefix: "feature" },
  { taskType: "bug", gitPrefix: "fix", branchPrefix: "bugfix" },
  { taskType: "task", gitPrefix: "chore", branchPrefix: "task" },
  { taskType: "hotfix", gitPrefix: "hotfix", branchPrefix: "hotfix" },
  { taskType: "docs", gitPrefix: "docs", branchPrefix: "docs" },
  { taskType: "refactor", gitPrefix: "refactor", branchPrefix: "refactor" },
];

export const DEFAULT_BRANCH_CONVENTION: BranchConventionConfig = {
  taskTypeMappings: DEFAULT_TASK_TYPE_MAPPINGS,
  branchPattern: "{branchPrefix}/{title}-{id}",
  prTitlePattern: "{gitPrefix}: {title}",
  commitPattern: "{gitPrefix}: {title}",
  defaultBaseBranch: "main",
  defaultTaskType: "task",
};

// ─── Presets ─────────────────────────────────────────────────────────────────

export interface ConventionPreset {
  id: string;
  name: string;
  description: string;
  config: BranchConventionConfig;
}

export const CONVENTION_PRESETS: ConventionPreset[] = [
  {
    id: "default",
    name: "TaskOS Default",
    description: "Simple prefix/title-id pattern with conventional commits",
    config: DEFAULT_BRANCH_CONVENTION,
  },
  {
    id: "git-flow",
    name: "Git Flow",
    description:
      "Vincent Driessen's branching model with develop as the base branch",
    config: {
      taskTypeMappings: [
        { taskType: "feature", gitPrefix: "feat", branchPrefix: "feature" },
        { taskType: "bug", gitPrefix: "fix", branchPrefix: "bugfix" },
        { taskType: "hotfix", gitPrefix: "hotfix", branchPrefix: "hotfix" },
        { taskType: "release", gitPrefix: "release", branchPrefix: "release" },
        { taskType: "task", gitPrefix: "chore", branchPrefix: "feature" },
        { taskType: "docs", gitPrefix: "docs", branchPrefix: "feature" },
        { taskType: "refactor", gitPrefix: "refactor", branchPrefix: "feature" },
      ],
      branchPattern: "{branchPrefix}/{title}-{id}",
      prTitlePattern: "{gitPrefix}: {title}",
      commitPattern: "{gitPrefix}: {title}",
      defaultBaseBranch: "develop",
      defaultTaskType: "feature",
    },
  },
  {
    id: "github-flow",
    name: "GitHub Flow",
    description:
      "Lightweight flow — everything branches from and merges into main",
    config: {
      taskTypeMappings: [
        { taskType: "feature", gitPrefix: "feat", branchPrefix: "feat" },
        { taskType: "bug", gitPrefix: "fix", branchPrefix: "fix" },
        { taskType: "task", gitPrefix: "chore", branchPrefix: "chore" },
        { taskType: "hotfix", gitPrefix: "fix", branchPrefix: "fix" },
        { taskType: "docs", gitPrefix: "docs", branchPrefix: "docs" },
        { taskType: "refactor", gitPrefix: "refactor", branchPrefix: "refactor" },
      ],
      branchPattern: "{branchPrefix}/{title}",
      prTitlePattern: "{gitPrefix}: {title}",
      commitPattern: "{gitPrefix}({taskType}): {title}",
      defaultBaseBranch: "main",
      defaultTaskType: "feature",
    },
  },
  {
    id: "trunk-based",
    name: "Trunk-Based Development",
    description:
      "Short-lived branches with username prefix for quick merges to main",
    config: {
      taskTypeMappings: [
        { taskType: "feature", gitPrefix: "feat", branchPrefix: "feat" },
        { taskType: "bug", gitPrefix: "fix", branchPrefix: "fix" },
        { taskType: "task", gitPrefix: "chore", branchPrefix: "chore" },
        { taskType: "hotfix", gitPrefix: "fix", branchPrefix: "fix" },
        { taskType: "docs", gitPrefix: "docs", branchPrefix: "docs" },
        { taskType: "refactor", gitPrefix: "refactor", branchPrefix: "refactor" },
      ],
      branchPattern: "{username}/{branchPrefix}/{title}",
      prTitlePattern: "{gitPrefix}: {title} [{id}]",
      commitPattern: "{gitPrefix}: {title}",
      defaultBaseBranch: "main",
      defaultTaskType: "feature",
    },
  },
  {
    id: "conventional",
    name: "Conventional Commits",
    description:
      "Follows the Conventional Commits spec with scope in branch names",
    config: {
      taskTypeMappings: [
        { taskType: "feature", gitPrefix: "feat", branchPrefix: "feat" },
        { taskType: "bug", gitPrefix: "fix", branchPrefix: "fix" },
        { taskType: "task", gitPrefix: "chore", branchPrefix: "chore" },
        { taskType: "hotfix", gitPrefix: "fix", branchPrefix: "fix" },
        { taskType: "docs", gitPrefix: "docs", branchPrefix: "docs" },
        { taskType: "refactor", gitPrefix: "refactor", branchPrefix: "refactor" },
        { taskType: "test", gitPrefix: "test", branchPrefix: "test" },
        { taskType: "ci", gitPrefix: "ci", branchPrefix: "ci" },
        { taskType: "perf", gitPrefix: "perf", branchPrefix: "perf" },
      ],
      branchPattern: "{gitPrefix}/{title}-{id}",
      prTitlePattern: "{gitPrefix}: {title}",
      commitPattern: "{gitPrefix}: {title}",
      defaultBaseBranch: "main",
      defaultTaskType: "feat",
    },
  },
];

// ─── Core logic ──────────────────────────────────────────────────────────────

/**
 * Sanitize a string for use in a git branch name.
 * - lowercase
 * - replace non-alphanumeric with hyphens
 * - collapse consecutive hyphens
 * - trim leading/trailing hyphens
 * - cap at maxLength characters
 */
export function sanitizeBranchSegment(
  raw: string,
  maxLength = 50
): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, maxLength);
}

/**
 * Resolve the TaskTypeMapping for a given taskType key.
 * Falls back to defaultTaskType, then to the first mapping.
 */
export function resolveMapping(
  config: BranchConventionConfig,
  taskType?: string
): TaskTypeMapping {
  const key = (taskType || config.defaultTaskType).toLowerCase();
  const found = config.taskTypeMappings.find(
    (m) => m.taskType.toLowerCase() === key
  );
  if (found) return found;

  const fallback = config.taskTypeMappings.find(
    (m) => m.taskType.toLowerCase() === config.defaultTaskType.toLowerCase()
  );
  return fallback || config.taskTypeMappings[0] || DEFAULT_TASK_TYPE_MAPPINGS[2];
}

/**
 * Replace placeholders in a pattern string.
 */
export function renderPattern(
  pattern: string,
  vars: Record<string, string>
): string {
  let result = pattern;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

/**
 * Render a full convention (branch, PR title, commit) from config + context.
 * This is the function both server and extension call.
 */
export function renderConvention(
  config: BranchConventionConfig,
  ctx: RenderContext
): RenderedConvention {
  const mapping = resolveMapping(config, ctx.taskType);

  const sanitizedTitle = sanitizeBranchSegment(ctx.taskTitle);
  const shortId = ctx.taskId.substring(0, 8);
  const username = ctx.username
    ? sanitizeBranchSegment(ctx.username, 20)
    : "user";

  const vars: Record<string, string> = {
    branchPrefix: mapping.branchPrefix,
    gitPrefix: mapping.gitPrefix,
    title: sanitizedTitle,
    id: shortId,
    taskType: mapping.taskType,
    username,
  };

  const branchName = renderPattern(config.branchPattern, vars);
  const prTitle = renderPattern(config.prTitlePattern, vars);
  const commitMessage = renderPattern(config.commitPattern, vars);

  return {
    branchName,
    prTitle,
    commitMessage,
    baseBranch: config.defaultBaseBranch,
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function validateConfig(
  config: BranchConventionConfig
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (
    !config.taskTypeMappings ||
    !Array.isArray(config.taskTypeMappings) ||
    config.taskTypeMappings.length === 0
  ) {
    errors.push({
      field: "taskTypeMappings",
      message: "At least one task type mapping is required",
    });
  } else {
    const seen = new Set<string>();
    for (let i = 0; i < config.taskTypeMappings.length; i++) {
      const m = config.taskTypeMappings[i];
      if (!m.taskType?.trim()) {
        errors.push({
          field: `taskTypeMappings[${i}].taskType`,
          message: "Task type is required",
        });
      }
      if (!m.gitPrefix?.trim()) {
        errors.push({
          field: `taskTypeMappings[${i}].gitPrefix`,
          message: "Git prefix is required",
        });
      }
      if (!m.branchPrefix?.trim()) {
        errors.push({
          field: `taskTypeMappings[${i}].branchPrefix`,
          message: "Branch prefix is required",
        });
      }
      const key = m.taskType?.toLowerCase();
      if (key && seen.has(key)) {
        errors.push({
          field: `taskTypeMappings[${i}].taskType`,
          message: `Duplicate task type: "${m.taskType}"`,
        });
      }
      if (key) seen.add(key);
    }
  }

  if (!config.branchPattern?.includes("{title}")) {
    errors.push({
      field: "branchPattern",
      message: 'Branch pattern must include "{title}" placeholder',
    });
  }

  if (!config.prTitlePattern?.trim()) {
    errors.push({
      field: "prTitlePattern",
      message: "PR title pattern is required",
    });
  }

  if (!config.commitPattern?.trim()) {
    errors.push({
      field: "commitPattern",
      message: "Commit pattern is required",
    });
  }

  if (!config.defaultBaseBranch?.trim()) {
    errors.push({
      field: "defaultBaseBranch",
      message: "Default base branch is required",
    });
  }

  if (config.defaultTaskType) {
    const exists = config.taskTypeMappings?.some(
      (m) =>
        m.taskType.toLowerCase() === config.defaultTaskType.toLowerCase()
    );
    if (!exists) {
      errors.push({
        field: "defaultTaskType",
        message: `Default task type "${config.defaultTaskType}" not found in mappings`,
      });
    }
  }

  return errors;
}
