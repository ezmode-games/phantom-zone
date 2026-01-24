/**
 * Rule Composition Engine (PZ-102b)
 *
 * Composes multiple validation rules into a single Zod schema.
 * Provides conflict detection, configuration validation, and
 * human-readable Zod code generation.
 */

// Main composition functions
export {
  composeRules,
  detectConflicts,
  validateRuleConfig,
  generateZodCode,
} from "./rule-composer";

// Types
export type {
  AppliedRule,
  ComposedSchema,
  CompositionError,
  CompositionErrorCode,
  CompositionResult,
  ComposeRulesOptions,
  ConflictInfo,
  ConflictType,
  GenerateZodCodeOptions,
  ValidatedRuleConfig,
} from "./types";

// Result helpers
export {
  INPUT_TYPE_TO_ZOD_BASE,
  success,
  failure,
  isSuccess,
  isFailure,
} from "./types";
