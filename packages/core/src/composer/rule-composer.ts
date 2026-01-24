/**
 * Rule Composition Engine (PZ-102b)
 *
 * Composes multiple validation rules into a single Zod schema.
 * Rules are applied in order (first attached = first in chain).
 *
 * Features:
 * - Conflict detection (min > max, contradictory rules, etc.)
 * - Rule configuration validation
 * - Human-readable Zod code generation
 * - Result<T, E> pattern for error handling
 */

import { z } from "zod";
import type { ZodTypeAny } from "zod";
import {
  getValidationRuleRegistry,
  type ValidationRuleRegistry,
} from "../registry";
import type { InputTypeId, ValidationRuleId } from "../registry/types";
import {
  type AppliedRule,
  type ComposedSchema,
  type CompositionError,
  type CompositionResult,
  type ComposeRulesOptions,
  type ConflictInfo,
  type ConflictType,
  type GenerateZodCodeOptions,
  type ValidatedRuleConfig,
  INPUT_TYPE_TO_ZOD_BASE,
  success,
  failure,
} from "./types";

// ============================================================================
// Rule Configuration Validation
// ============================================================================

/**
 * Validates the configuration for a specific rule.
 *
 * Note: This function validates the configuration for known rules.
 * Unknown rules are handled by the composeRules function (which checks
 * rule existence in the registry before calling this function).
 *
 * @param ruleId - The validation rule identifier
 * @param config - The rule configuration to validate
 * @param _registry - Unused, kept for API consistency
 * @returns ValidatedRuleConfig with validation result
 */
export function validateRuleConfig(
  ruleId: ValidationRuleId,
  config: Record<string, unknown>,
  _registry?: ValidationRuleRegistry
): ValidatedRuleConfig {

  // Validate based on rule type
  switch (ruleId) {
    case "minLength":
    case "maxLength": {
      const length = config.length;
      if (typeof length !== "number" || !Number.isInteger(length) || length < 0) {
        return {
          isValid: false,
          errorMessage: `${ruleId} requires a non-negative integer 'length' value`,
        };
      }
      return { isValid: true, normalizedConfig: { length } };
    }

    case "min":
    case "max": {
      const value = config.value;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return {
          isValid: false,
          errorMessage: `${ruleId} requires a finite number 'value'`,
        };
      }
      return { isValid: true, normalizedConfig: { value } };
    }

    case "minItems":
    case "maxItems": {
      const key = ruleId === "minItems" ? "min" : "max";
      const count = config[key];
      if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
        return {
          isValid: false,
          errorMessage: `${ruleId} requires a non-negative integer '${key}' value`,
        };
      }
      return { isValid: true, normalizedConfig: { [key]: count } };
    }

    case "step": {
      const step = config.step;
      if (typeof step !== "number" || step <= 0) {
        return {
          isValid: false,
          errorMessage: "step requires a positive number 'step' value",
        };
      }
      return { isValid: true, normalizedConfig: { step } };
    }

    case "pattern": {
      const pattern = config.pattern;
      if (typeof pattern !== "string") {
        return {
          isValid: false,
          errorMessage: "pattern requires a string 'pattern' value",
        };
      }
      // Validate the regex
      try {
        new RegExp(pattern);
      } catch {
        return {
          isValid: false,
          errorMessage: `Invalid regex pattern: ${pattern}`,
        };
      }
      const message = typeof config.message === "string" ? config.message : undefined;
      return {
        isValid: true,
        normalizedConfig: { pattern, ...(message && { message }) },
      };
    }

    case "minDate":
    case "maxDate": {
      const date = config.date;
      if (date === null || date === undefined) {
        // Null/undefined date is valid (rule is a no-op)
        return { isValid: true, normalizedConfig: { date: null } };
      }
      if (date instanceof Date) {
        if (Number.isNaN(date.getTime())) {
          return {
            isValid: false,
            errorMessage: `${ruleId} requires a valid Date object`,
          };
        }
        return { isValid: true, normalizedConfig: { date } };
      }
      if (typeof date === "string") {
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) {
          return {
            isValid: false,
            errorMessage: `${ruleId} requires a valid date string`,
          };
        }
        return { isValid: true, normalizedConfig: { date: parsed } };
      }
      return {
        isValid: false,
        errorMessage: `${ruleId} requires a Date object or date string`,
      };
    }

    case "fileSize": {
      const maxBytes = config.maxBytes;
      if (typeof maxBytes !== "number" || !Number.isInteger(maxBytes) || maxBytes <= 0) {
        return {
          isValid: false,
          errorMessage: "fileSize requires a positive integer 'maxBytes' value",
        };
      }
      return { isValid: true, normalizedConfig: { maxBytes } };
    }

    case "fileType": {
      const types = config.types;
      if (!Array.isArray(types) || types.length === 0) {
        return {
          isValid: false,
          errorMessage: "fileType requires a non-empty array of 'types'",
        };
      }
      if (!types.every((t) => typeof t === "string")) {
        return {
          isValid: false,
          errorMessage: "fileType 'types' must be an array of strings",
        };
      }
      return { isValid: true, normalizedConfig: { types } };
    }

    // Rules that don't require configuration
    case "required":
    case "email":
    case "url":
    case "uuid":
    case "integer":
    case "positive":
    case "negative":
      return { isValid: true, normalizedConfig: {} };

    default:
      // Unknown rule type - allow any config
      return { isValid: true, normalizedConfig: config };
  }
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Detects conflicts between applied rules.
 *
 * @param appliedRules - Array of rules to check for conflicts
 * @returns Array of detected conflicts
 */
export function detectConflicts(appliedRules: AppliedRule[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Build lookup maps for efficient conflict detection
  const rulesByType = new Map<ValidationRuleId, AppliedRule[]>();
  for (const rule of appliedRules) {
    const existing = rulesByType.get(rule.ruleId) ?? [];
    existing.push(rule);
    rulesByType.set(rule.ruleId, existing);
  }

  // Check for redundant rules (same rule applied multiple times)
  for (const [ruleId, rules] of rulesByType) {
    if (rules.length > 1) {
      for (let i = 1; i < rules.length; i++) {
        conflicts.push({
          type: "redundant",
          message: `Rule '${ruleId}' is applied multiple times`,
          rule1: rules[0]!,
          rule2: rules[i]!,
          suggestedResolution: "keep-first",
        });
      }
    }
  }

  // Check min/max length conflicts
  const minLengthRules = rulesByType.get("minLength");
  const maxLengthRules = rulesByType.get("maxLength");
  if (minLengthRules && maxLengthRules) {
    for (const minRule of minLengthRules) {
      for (const maxRule of maxLengthRules) {
        const minValue = minRule.config.length as number;
        const maxValue = maxRule.config.length as number;
        if (minValue > maxValue) {
          conflicts.push({
            type: "min-exceeds-max",
            message: `minLength (${minValue}) exceeds maxLength (${maxValue})`,
            rule1: minRule,
            rule2: maxRule,
            suggestedResolution: "adjust-values",
          });
        }
      }
    }
  }

  // Check min/max value conflicts (for numbers)
  const minRules = rulesByType.get("min");
  const maxRules = rulesByType.get("max");
  if (minRules && maxRules) {
    for (const minRule of minRules) {
      for (const maxRule of maxRules) {
        const minValue = minRule.config.value as number;
        const maxValue = maxRule.config.value as number;
        if (minValue > maxValue) {
          conflicts.push({
            type: "min-exceeds-max",
            message: `min (${minValue}) exceeds max (${maxValue})`,
            rule1: minRule,
            rule2: maxRule,
            suggestedResolution: "adjust-values",
          });
        }
      }
    }
  }

  // Check minItems/maxItems conflicts
  const minItemsRules = rulesByType.get("minItems");
  const maxItemsRules = rulesByType.get("maxItems");
  if (minItemsRules && maxItemsRules) {
    for (const minRule of minItemsRules) {
      for (const maxRule of maxItemsRules) {
        const minValue = minRule.config.min as number;
        const maxValue = maxRule.config.max as number;
        if (minValue > maxValue) {
          conflicts.push({
            type: "min-exceeds-max",
            message: `minItems (${minValue}) exceeds maxItems (${maxValue})`,
            rule1: minRule,
            rule2: maxRule,
            suggestedResolution: "adjust-values",
          });
        }
      }
    }
  }

  // Check minDate/maxDate conflicts
  const minDateRules = rulesByType.get("minDate");
  const maxDateRules = rulesByType.get("maxDate");
  if (minDateRules && maxDateRules) {
    for (const minRule of minDateRules) {
      for (const maxRule of maxDateRules) {
        const minDate = minRule.config.date as Date | null;
        const maxDate = maxRule.config.date as Date | null;
        if (minDate && maxDate && minDate > maxDate) {
          conflicts.push({
            type: "min-exceeds-max",
            message: `minDate (${minDate.toISOString()}) exceeds maxDate (${maxDate.toISOString()})`,
            rule1: minRule,
            rule2: maxRule,
            suggestedResolution: "adjust-values",
          });
        }
      }
    }
  }

  // Check for contradictory rules
  const hasPositive = rulesByType.has("positive");
  const hasNegative = rulesByType.has("negative");
  if (hasPositive && hasNegative) {
    conflicts.push({
      type: "contradictory",
      message: "Cannot have both 'positive' and 'negative' rules",
      rule1: rulesByType.get("positive")![0]!,
      rule2: rulesByType.get("negative")![0]!,
    });
  }

  return conflicts;
}

// ============================================================================
// Base Schema Creation
// ============================================================================

/**
 * Creates the base Zod schema for an input type.
 *
 * @param inputType - The input type identifier
 * @returns The base Zod schema for this input type
 */
function createBaseSchema(inputType: InputTypeId): ZodTypeAny {
  switch (inputType) {
    case "text":
    case "textarea":
      return z.string();
    case "number":
      return z.number();
    case "checkbox":
      return z.boolean();
    case "select":
      return z.string().nullable();
    case "multiselect":
      return z.array(z.string());
    case "date":
      return z.date().nullable();
    case "file":
      // File input can be single file, array of files, or null
      return z.instanceof(File).nullable();
    default:
      return z.unknown();
  }
}

// ============================================================================
// Zod Code Generation
// ============================================================================

/**
 * Generates the Zod method call for a specific rule.
 *
 * @param rule - The applied rule
 * @returns The Zod method call as a string, or null if the rule has no code representation
 */
function generateRuleZodCode(rule: AppliedRule): string | null {
  switch (rule.ruleId) {
    case "required":
      return '.min(1, "Required")';

    case "minLength": {
      const length = rule.config.length as number;
      return `.min(${length}, "At least ${length} character${length === 1 ? "" : "s"}")`;
    }

    case "maxLength": {
      const length = rule.config.length as number;
      return `.max(${length}, "At most ${length} character${length === 1 ? "" : "s"}")`;
    }

    case "min": {
      const value = rule.config.value as number;
      return `.min(${value}, "Must be at least ${value}")`;
    }

    case "max": {
      const value = rule.config.value as number;
      return `.max(${value}, "Must be at most ${value}")`;
    }

    case "minItems": {
      const min = rule.config.min as number;
      return `.min(${min}, "At least ${min} item${min === 1 ? "" : "s"} required")`;
    }

    case "maxItems": {
      const max = rule.config.max as number;
      return `.max(${max}, "At most ${max} item${max === 1 ? "" : "s"} allowed")`;
    }

    case "email":
      return '.email("Must be a valid email address")';

    case "url":
      return '.url("Must be a valid URL")';

    case "uuid":
      return '.uuid("Must be a valid UUID")';

    case "pattern": {
      const pattern = rule.config.pattern as string;
      const message = (rule.config.message as string) ?? "Invalid format";
      // Escape the pattern for inclusion in a template literal
      const escapedPattern = pattern.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
      return `.regex(/${escapedPattern}/, "${message}")`;
    }

    case "integer":
      return '.int("Must be a whole number")';

    case "positive":
      return '.positive("Must be a positive number")';

    case "negative":
      return '.negative("Must be a negative number")';

    case "step": {
      const step = rule.config.step as number;
      return `.multipleOf(${step}, "Must be a multiple of ${step}")`;
    }

    case "minDate": {
      const date = rule.config.date as Date | null;
      if (!date) return null;
      return `.min(new Date("${date.toISOString()}"), "Date must be on or after ${date.toLocaleDateString()}")`;
    }

    case "maxDate": {
      const date = rule.config.date as Date | null;
      if (!date) return null;
      return `.max(new Date("${date.toISOString()}"), "Date must be on or before ${date.toLocaleDateString()}")`;
    }

    case "fileSize": {
      const maxBytes = rule.config.maxBytes as number;
      return `.refine(f => !f || f.size <= ${maxBytes}, "File size must not exceed ${formatBytes(maxBytes)}")`;
    }

    case "fileType": {
      const types = rule.config.types as string[];
      const typesStr = JSON.stringify(types);
      return `.refine(f => !f || matchesMimeType(f.type, ${typesStr}), "File type must be one of: ${types.join(", ")}")`;
    }

    default:
      return null;
  }
}

/**
 * Format bytes into human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Generates human-readable Zod code for a set of applied rules.
 *
 * @param inputType - The input type for the base schema
 * @param appliedRules - Array of rules to generate code for
 * @param options - Code generation options
 * @returns The generated Zod code string
 */
export function generateZodCode(
  inputType: InputTypeId,
  appliedRules: AppliedRule[],
  options: GenerateZodCodeOptions = {}
): string {
  const { includeComments = true, multiLine = true, indent = "  " } = options;

  const baseCode = INPUT_TYPE_TO_ZOD_BASE[inputType];
  const ruleCodes: string[] = [];

  for (const rule of appliedRules) {
    const code = generateRuleZodCode(rule);
    if (code) {
      ruleCodes.push(code);
    }
  }

  if (ruleCodes.length === 0) {
    return baseCode;
  }

  if (multiLine) {
    const lines = [baseCode];
    for (let i = 0; i < ruleCodes.length; i++) {
      const code = ruleCodes[i];
      if (includeComments) {
        lines.push(`${indent}// ${appliedRules[i]?.ruleId}`);
      }
      lines.push(`${indent}${code}`);
    }
    return lines.join("\n");
  }

  return baseCode + ruleCodes.join("");
}

// ============================================================================
// Rule Composition
// ============================================================================

/**
 * Composes multiple validation rules into a single Zod schema.
 *
 * Rules are applied in order (first attached = first in chain).
 * The composer validates configurations, detects conflicts, and generates
 * both the schema and human-readable Zod code.
 *
 * @param inputType - The input type for the base schema
 * @param appliedRules - Array of rules to compose (in application order)
 * @param options - Composition options
 * @param registry - Optional registry to use (defaults to global)
 * @returns CompositionResult containing the composed schema or an error
 */
export function composeRules(
  inputType: InputTypeId,
  appliedRules: AppliedRule[],
  options: ComposeRulesOptions = {},
  registry: ValidationRuleRegistry = getValidationRuleRegistry()
): CompositionResult<ComposedSchema> {
  const { continueOnWarnings = true, deduplicateRules = true } = options;

  // 1. Verify all rules exist in the registry
  for (const rule of appliedRules) {
    if (!registry.has(rule.ruleId)) {
      return failure({
        code: "UNKNOWN_RULE",
        message: `Unknown validation rule: ${rule.ruleId}`,
        ruleId: rule.ruleId,
      });
    }
  }

  // 2. Validate all rule configurations
  for (const rule of appliedRules) {
    const validation = validateRuleConfig(rule.ruleId, rule.config, registry);
    if (!validation.isValid) {
      return failure({
        code: "INVALID_CONFIG",
        message: validation.errorMessage!,
        ruleId: rule.ruleId,
        details: { config: rule.config },
      });
    }
  }

  // 3. Check rule compatibility with input type
  for (const rule of appliedRules) {
    const ruleDef = registry.get(rule.ruleId);
    if (ruleDef && !ruleDef.compatibleInputs.includes(inputType)) {
      return failure({
        code: "INCOMPATIBLE_INPUT_TYPE",
        message: `Rule '${rule.ruleId}' is not compatible with input type '${inputType}'`,
        ruleId: rule.ruleId,
        details: {
          inputType,
          compatibleInputs: ruleDef.compatibleInputs,
        },
      });
    }
  }

  // 4. Detect conflicts
  const conflicts = detectConflicts(appliedRules);

  // 5. Filter to only critical conflicts (non-redundant)
  const criticalConflicts = conflicts.filter((c) => c.type !== "redundant");

  // If there are critical conflicts and we're not continuing on warnings, fail
  if (criticalConflicts.length > 0 && !continueOnWarnings) {
    const conflict = criticalConflicts[0]!;
    return failure({
      code: "CONFLICT_DETECTED",
      message: conflict.message,
      details: { conflicts: criticalConflicts },
    });
  }

  // 6. Optionally deduplicate redundant rules
  let rulesToApply = appliedRules;
  if (deduplicateRules) {
    const seen = new Set<ValidationRuleId>();
    rulesToApply = appliedRules.filter((rule) => {
      if (seen.has(rule.ruleId)) {
        return false;
      }
      seen.add(rule.ruleId);
      return true;
    });
  }

  // 7. Create base schema
  let schema: ZodTypeAny = createBaseSchema(inputType);

  // 8. Apply each rule in order
  for (const rule of rulesToApply) {
    const ruleDef = registry.get(rule.ruleId);
    if (ruleDef) {
      try {
        schema = ruleDef.toZod(rule.config)(schema) as ZodTypeAny;
      } catch (error) {
        return failure({
          code: "COMPOSITION_FAILED",
          message: `Failed to apply rule '${rule.ruleId}': ${error instanceof Error ? error.message : String(error)}`,
          ruleId: rule.ruleId,
          details: { error: String(error) },
        });
      }
    }
  }

  // 9. Generate Zod code
  const zodCode = generateZodCode(inputType, rulesToApply);

  return success({
    schema,
    zodCode,
    warnings: conflicts,
  });
}
