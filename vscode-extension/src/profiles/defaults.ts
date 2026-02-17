import { CodeReviewProfile, CodeStyleProfile } from './types';

// ============== DEFAULT PROFILES ==============

export const DEFAULT_CODE_REVIEW_PROFILE: CodeReviewProfile = {
  strictness: 'medium',
  focus_areas: ['readability', 'error-handling', 'types', 'testing'],
  rules: [
    {
      id: 'no-any',
      description: 'Avoid using "any" type - use proper types or "unknown"',
      severity: 'warn',
      applies_to: 'all',
    },
    {
      id: 'error-handling',
      description: 'All async operations must have proper error handling',
      severity: 'warn',
      applies_to: 'all',
    },
    {
      id: 'function-length',
      description: 'Functions should not exceed 50 lines',
      severity: 'info',
      applies_to: 'all',
    },
  ],
  required_checks: [
    'No console.log left in production code',
    'No hardcoded secrets or credentials',
  ],
  feedback_format: 'summary+inline',
  tone: 'neutral',
};

export const DEFAULT_CODE_STYLE_PROFILE: CodeStyleProfile = {
  language_stack: ['typescript', 'react', 'node'],
  patterns_preferred: [],
  patterns_avoid: [],
  architecture_constraints: [],
  naming_conventions: [
    'camelCase for variables and functions',
    'PascalCase for classes and components',
    'UPPER_SNAKE_CASE for constants',
  ],
  error_handling_policy: 'Use try-catch for async operations, return meaningful error messages',
  linting_formatting_policy: 'align with repo config',
  testing_policy: {
    test_required_when: {
      business_logic_changed: true,
      api_changed: true,
      db_query_changed: false,
      bugfix: true,
    },
    test_types_required: ['unit'],
    minimum_expectations: ['tests for new code paths'],
    allow_skip_with_reason: true,
  },
};

// ============== STRICT PROFILES ==============

export const STRICT_CODE_REVIEW_PROFILE: CodeReviewProfile = {
  strictness: 'high',
  focus_areas: [
    'security',
    'performance',
    'readability',
    'testing',
    'edge-cases',
    'api-contracts',
    'error-handling',
    'logging',
    'types',
    'architecture',
  ],
  rules: [
    {
      id: 'no-any',
      description: 'Never use "any" type - use proper types, generics, or "unknown"',
      severity: 'blocker',
      applies_to: 'all',
    },
    {
      id: 'error-handling',
      description: 'All async operations must have proper error handling with specific error types',
      severity: 'blocker',
      applies_to: 'all',
    },
    {
      id: 'function-length',
      description: 'Functions must not exceed 40 lines',
      severity: 'warn',
      applies_to: 'all',
    },
    {
      id: 'api-tests',
      description: 'Every API endpoint change must have corresponding test coverage',
      severity: 'blocker',
      applies_to: 'backend',
    },
    {
      id: 'no-magic-numbers',
      description: 'No magic numbers - use named constants',
      severity: 'warn',
      applies_to: 'all',
    },
    {
      id: 'input-validation',
      description: 'All user inputs must be validated and sanitized',
      severity: 'blocker',
      applies_to: 'all',
    },
    {
      id: 'no-secrets',
      description: 'No hardcoded secrets, tokens, or credentials',
      severity: 'blocker',
      applies_to: 'all',
    },
    {
      id: 'logging',
      description: 'Critical operations must have structured logging',
      severity: 'warn',
      applies_to: 'backend',
    },
  ],
  required_checks: [
    'No "any" types',
    'No functions over 40 lines',
    'All API changes have tests',
    'No hardcoded secrets',
    'Input validation on all endpoints',
    'Proper error handling on all async operations',
  ],
  feedback_format: 'summary+inline',
  tone: 'strict',
};

export const STRICT_CODE_STYLE_PROFILE: CodeStyleProfile = {
  language_stack: ['typescript', 'react', 'node'],
  patterns_preferred: [
    'Repository Pattern',
    'Dependency Injection',
    'Factory Pattern',
    'Strategy Pattern',
  ],
  patterns_avoid: [
    'God objects',
    'Spaghetti code',
    'Tight coupling',
    'Service locator anti-pattern',
  ],
  architecture_constraints: [
    'Thin controllers - no business logic in route handlers',
    'Clean architecture - separate concerns into layers',
    'Single Responsibility Principle for all classes/modules',
    'Use interfaces for dependency boundaries',
  ],
  naming_conventions: [
    'camelCase for variables and functions',
    'PascalCase for classes, components, and interfaces',
    'UPPER_SNAKE_CASE for constants and enums',
    'Prefix interfaces with I only when needed for disambiguation',
    'Use descriptive names - no abbreviations except well-known ones (e.g., id, url)',
  ],
  error_handling_policy:
    'Use typed errors with error codes. Never swallow errors silently. Always provide context in error messages. Use Result pattern for expected failures.',
  linting_formatting_policy: 'align with repo config',
  testing_policy: {
    test_required_when: {
      business_logic_changed: true,
      api_changed: true,
      db_query_changed: true,
      bugfix: true,
    },
    test_types_required: ['unit', 'integration'],
    minimum_expectations: [
      'Tests for all new code paths',
      'Regression test for every bugfix',
      'Integration tests for API endpoints',
      'Edge case coverage for business logic',
    ],
    allow_skip_with_reason: false,
  },
};

// ============== PRESET MAP ==============

export const PRESETS = {
  default: {
    code_review: DEFAULT_CODE_REVIEW_PROFILE,
    code_style: DEFAULT_CODE_STYLE_PROFILE,
  },
  strict: {
    code_review: STRICT_CODE_REVIEW_PROFILE,
    code_style: STRICT_CODE_STYLE_PROFILE,
  },
} as const;

export type PresetName = keyof typeof PRESETS;
