/**
 * Types for the Rule Composition Engine.
 *
 * The composer takes a list of validation rules and their configurations,
 * then generates a composed Zod schema and human-readable Zod code.
 */

import type { ZodTypeAny } from "zod";
import type { InputTypeId, ValidationRuleId } from "../registry/types";

/**
 * A validation rule applied to a field with its configuration.
 * This is the input format for the rule composition engine.
 */
export interface AppliedRule {
  /** The validation rule identifier */
  ruleId: ValidationRuleId;

  /** The configuration for this rule instance */
  config: Record<string, unknown>;
}

/**
 * Information about a conflict between applied rules.
 */
export interface ConflictInfo {
  /** The type of conflict */
  type: ConflictType;

  /** Human-readable description of the conflict */
  message: string;

  /** The first rule involved in the conflict */
  rule1: AppliedRule;

  /** The second rule involved in the conflict */
  rule2: AppliedRule;

  /** Optional: which rule should take precedence to resolve */
  suggestedResolution?: "keep-first" | "keep-second" | "adjust-values";
}

/**
 * Types of conflicts that can occur between validation rules.
 */
export type ConflictType =
  | "min-exceeds-max" // min > max for length, value, or items
  | "contradictory" // e.g., positive and negative
  | "redundant" // same rule applied twice
  | "incompatible"; // rules that cannot work together

/**
 * Error codes for composition failures.
 */
export type CompositionErrorCode =
  | "UNKNOWN_RULE"
  | "INVALID_CONFIG"
  | "INCOMPATIBLE_INPUT_TYPE"
  | "CONFLICT_DETECTED"
  | "COMPOSITION_FAILED";

/**
 * Error information for composition failures.
 */
export interface CompositionError {
  /** Error code for programmatic handling */
  code: CompositionErrorCode;

  /** Human-readable error message */
  message: string;

  /** The rule ID that caused the error (if applicable) */
  ruleId?: ValidationRuleId;

  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Result of rule composition - either success or failure.
 * Uses the Result pattern to avoid thrown exceptions.
 */
export type CompositionResult<T> =
  | { success: true; value: T }
  | { success: false; error: CompositionError };

/**
 * The output of a successful composition.
 */
export interface ComposedSchema {
  /** The composed Zod schema ready for validation */
  schema: ZodTypeAny;

  /** Human-readable Zod code for the composed schema */
  zodCode: string;

  /** List of any conflicts detected (composition may still succeed with warnings) */
  warnings: ConflictInfo[];
}

/**
 * Configuration for a specific validation rule, validated against rule definition.
 */
export interface ValidatedRuleConfig {
  /** Whether the config is valid */
  isValid: boolean;

  /** Validation error message if invalid */
  errorMessage?: string;

  /** The sanitized/normalized config if valid */
  normalizedConfig?: Record<string, unknown>;
}

/**
 * Options for composing rules.
 */
export interface ComposeRulesOptions {
  /** Whether to continue composition despite warnings (default: true) */
  continueOnWarnings?: boolean;

  /** Whether to deduplicate redundant rules (default: true) */
  deduplicateRules?: boolean;

  /** Custom error message prefix for generated Zod code */
  errorMessagePrefix?: string;
}

/**
 * Options for generating Zod code.
 */
export interface GenerateZodCodeOptions {
  /** Whether to include comments explaining each rule (default: true) */
  includeComments?: boolean;

  /** Whether to use multi-line formatting (default: true) */
  multiLine?: boolean;

  /** Indentation string (default: "  ") */
  indent?: string;
}

/**
 * Mapping of input types to their base Zod schema type names.
 */
export const INPUT_TYPE_TO_ZOD_BASE: Record<InputTypeId, string> = {
  text: "z.string()",
  textarea: "z.string()",
  number: "z.number()",
  checkbox: "z.boolean()",
  select: "z.string()",
  multiselect: "z.array(z.string())",
  date: "z.date()",
  file: "z.instanceof(File)",
};

/**
 * Helper to create a success result.
 */
export function success<T>(value: T): CompositionResult<T> {
  return { success: true, value };
}

/**
 * Helper to create a failure result.
 */
export function failure<T>(error: CompositionError): CompositionResult<T> {
  return { success: false, error };
}

/**
 * Type guard to check if a result is successful.
 */
export function isSuccess<T>(
  result: CompositionResult<T>
): result is { success: true; value: T } {
  return result.success;
}

/**
 * Type guard to check if a result is a failure.
 */
export function isFailure<T>(
  result: CompositionResult<T>
): result is { success: false; error: CompositionError } {
  return !result.success;
}
