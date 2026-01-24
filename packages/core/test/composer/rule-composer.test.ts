/**
 * Tests for the Rule Composition Engine (PZ-102b)
 */

import { describe, expect, it, beforeEach } from "vitest";
import { z } from "zod";
import {
  composeRules,
  detectConflicts,
  validateRuleConfig,
  generateZodCode,
  isSuccess,
  isFailure,
} from "../../src/composer";
import type { AppliedRule, ConflictInfo } from "../../src/composer";
import { resetGlobalRuleRegistry } from "../../src/registry";

describe("validateRuleConfig", () => {
  beforeEach(() => {
    resetGlobalRuleRegistry();
  });

  describe("minLength rule", () => {
    it("accepts valid positive integer", () => {
      const result = validateRuleConfig("minLength", { length: 5 });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig).toEqual({ length: 5 });
    });

    it("accepts zero", () => {
      const result = validateRuleConfig("minLength", { length: 0 });
      expect(result.isValid).toBe(true);
    });

    it("rejects negative values", () => {
      const result = validateRuleConfig("minLength", { length: -1 });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("non-negative integer");
    });

    it("rejects non-integer values", () => {
      const result = validateRuleConfig("minLength", { length: 5.5 });
      expect(result.isValid).toBe(false);
    });

    it("rejects non-number values", () => {
      const result = validateRuleConfig("minLength", { length: "5" });
      expect(result.isValid).toBe(false);
    });
  });

  describe("maxLength rule", () => {
    it("accepts valid positive integer", () => {
      const result = validateRuleConfig("maxLength", { length: 100 });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig).toEqual({ length: 100 });
    });

    it("rejects negative values", () => {
      const result = validateRuleConfig("maxLength", { length: -5 });
      expect(result.isValid).toBe(false);
    });
  });

  describe("min rule", () => {
    it("accepts valid finite number", () => {
      const result = validateRuleConfig("min", { value: 10 });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig).toEqual({ value: 10 });
    });

    it("accepts zero", () => {
      const result = validateRuleConfig("min", { value: 0 });
      expect(result.isValid).toBe(true);
    });

    it("accepts negative values", () => {
      const result = validateRuleConfig("min", { value: -100 });
      expect(result.isValid).toBe(true);
    });

    it("accepts decimal values", () => {
      const result = validateRuleConfig("min", { value: 3.14 });
      expect(result.isValid).toBe(true);
    });

    it("rejects Infinity", () => {
      const result = validateRuleConfig("min", { value: Number.POSITIVE_INFINITY });
      expect(result.isValid).toBe(false);
    });

    it("rejects NaN", () => {
      const result = validateRuleConfig("min", { value: Number.NaN });
      expect(result.isValid).toBe(false);
    });
  });

  describe("max rule", () => {
    it("accepts valid finite number", () => {
      const result = validateRuleConfig("max", { value: 100 });
      expect(result.isValid).toBe(true);
    });

    it("rejects non-number values", () => {
      const result = validateRuleConfig("max", { value: "100" });
      expect(result.isValid).toBe(false);
    });
  });

  describe("minItems rule", () => {
    it("accepts valid config", () => {
      const result = validateRuleConfig("minItems", { min: 2 });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig).toEqual({ min: 2 });
    });

    it("rejects negative values", () => {
      const result = validateRuleConfig("minItems", { min: -1 });
      expect(result.isValid).toBe(false);
    });
  });

  describe("maxItems rule", () => {
    it("accepts valid config", () => {
      const result = validateRuleConfig("maxItems", { max: 10 });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig).toEqual({ max: 10 });
    });
  });

  describe("step rule", () => {
    it("accepts positive step", () => {
      const result = validateRuleConfig("step", { step: 0.5 });
      expect(result.isValid).toBe(true);
    });

    it("rejects zero step", () => {
      const result = validateRuleConfig("step", { step: 0 });
      expect(result.isValid).toBe(false);
    });

    it("rejects negative step", () => {
      const result = validateRuleConfig("step", { step: -1 });
      expect(result.isValid).toBe(false);
    });
  });

  describe("pattern rule", () => {
    it("accepts valid regex pattern", () => {
      const result = validateRuleConfig("pattern", { pattern: "^[a-z]+$" });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig).toEqual({ pattern: "^[a-z]+$" });
    });

    it("accepts pattern with custom message", () => {
      const result = validateRuleConfig("pattern", {
        pattern: "^[A-Z]+$",
        message: "Must be uppercase",
      });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig).toEqual({
        pattern: "^[A-Z]+$",
        message: "Must be uppercase",
      });
    });

    it("rejects invalid regex", () => {
      const result = validateRuleConfig("pattern", { pattern: "[" });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("Invalid regex");
    });

    it("rejects non-string pattern", () => {
      const result = validateRuleConfig("pattern", { pattern: 123 });
      expect(result.isValid).toBe(false);
    });
  });

  describe("minDate rule", () => {
    it("accepts Date object", () => {
      const date = new Date("2024-01-01");
      const result = validateRuleConfig("minDate", { date });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig?.date).toEqual(date);
    });

    it("accepts date string", () => {
      const result = validateRuleConfig("minDate", { date: "2024-01-01" });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig?.date).toBeInstanceOf(Date);
    });

    it("accepts null date", () => {
      const result = validateRuleConfig("minDate", { date: null });
      expect(result.isValid).toBe(true);
      expect(result.normalizedConfig).toEqual({ date: null });
    });

    it("rejects invalid date string", () => {
      const result = validateRuleConfig("minDate", { date: "not-a-date" });
      expect(result.isValid).toBe(false);
    });
  });

  describe("fileSize rule", () => {
    it("accepts positive integer bytes", () => {
      const result = validateRuleConfig("fileSize", { maxBytes: 1024 * 1024 });
      expect(result.isValid).toBe(true);
    });

    it("rejects zero bytes", () => {
      const result = validateRuleConfig("fileSize", { maxBytes: 0 });
      expect(result.isValid).toBe(false);
    });

    it("rejects non-integer bytes", () => {
      const result = validateRuleConfig("fileSize", { maxBytes: 1024.5 });
      expect(result.isValid).toBe(false);
    });
  });

  describe("fileType rule", () => {
    it("accepts array of MIME types", () => {
      const result = validateRuleConfig("fileType", {
        types: ["image/*", "application/pdf"],
      });
      expect(result.isValid).toBe(true);
    });

    it("rejects empty array", () => {
      const result = validateRuleConfig("fileType", { types: [] });
      expect(result.isValid).toBe(false);
    });

    it("rejects non-array", () => {
      const result = validateRuleConfig("fileType", { types: "image/*" });
      expect(result.isValid).toBe(false);
    });
  });

  describe("rules without configuration", () => {
    it("validates required rule", () => {
      const result = validateRuleConfig("required", {});
      expect(result.isValid).toBe(true);
    });

    it("validates email rule", () => {
      const result = validateRuleConfig("email", {});
      expect(result.isValid).toBe(true);
    });

    it("validates url rule", () => {
      const result = validateRuleConfig("url", {});
      expect(result.isValid).toBe(true);
    });

    it("validates uuid rule", () => {
      const result = validateRuleConfig("uuid", {});
      expect(result.isValid).toBe(true);
    });

    it("validates integer rule", () => {
      const result = validateRuleConfig("integer", {});
      expect(result.isValid).toBe(true);
    });

    it("validates positive rule", () => {
      const result = validateRuleConfig("positive", {});
      expect(result.isValid).toBe(true);
    });

    it("validates negative rule", () => {
      const result = validateRuleConfig("negative", {});
      expect(result.isValid).toBe(true);
    });
  });

  describe("unknown rules", () => {
    it("passes validation for unknown rule (existence check happens in composeRules)", () => {
      // validateRuleConfig only validates known rule configs
      // Unknown rules are handled by composeRules
      const result = validateRuleConfig("unknownRule" as any, {});
      expect(result.isValid).toBe(true);
    });
  });
});

describe("detectConflicts", () => {
  describe("redundant rules", () => {
    it("detects duplicate required rules", () => {
      const rules: AppliedRule[] = [
        { ruleId: "required", config: {} },
        { ruleId: "required", config: {} },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("redundant");
      expect(conflicts[0]?.message).toContain("required");
    });

    it("detects multiple instances of the same rule", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: 5 } },
        { ruleId: "minLength", config: { length: 10 } },
        { ruleId: "minLength", config: { length: 15 } },
      ];

      const conflicts = detectConflicts(rules);

      // Should have 2 conflicts (index 1 and 2 conflict with index 0)
      expect(conflicts).toHaveLength(2);
      expect(conflicts.every((c) => c.type === "redundant")).toBe(true);
    });
  });

  describe("min/max length conflicts", () => {
    it("detects minLength > maxLength", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: 100 } },
        { ruleId: "maxLength", config: { length: 50 } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("min-exceeds-max");
      expect(conflicts[0]?.message).toContain("minLength (100)");
      expect(conflicts[0]?.message).toContain("maxLength (50)");
    });

    it("allows minLength <= maxLength", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: 5 } },
        { ruleId: "maxLength", config: { length: 100 } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(0);
    });

    it("allows minLength == maxLength (exact length)", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: 10 } },
        { ruleId: "maxLength", config: { length: 10 } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe("min/max value conflicts", () => {
    it("detects min > max for numbers", () => {
      const rules: AppliedRule[] = [
        { ruleId: "min", config: { value: 100 } },
        { ruleId: "max", config: { value: 50 } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("min-exceeds-max");
    });

    it("allows min <= max", () => {
      const rules: AppliedRule[] = [
        { ruleId: "min", config: { value: 0 } },
        { ruleId: "max", config: { value: 100 } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe("minItems/maxItems conflicts", () => {
    it("detects minItems > maxItems", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minItems", config: { min: 5 } },
        { ruleId: "maxItems", config: { max: 3 } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("min-exceeds-max");
    });
  });

  describe("date range conflicts", () => {
    it("detects minDate > maxDate", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minDate", config: { date: new Date("2025-01-01") } },
        { ruleId: "maxDate", config: { date: new Date("2024-01-01") } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("min-exceeds-max");
    });

    it("allows minDate <= maxDate", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minDate", config: { date: new Date("2024-01-01") } },
        { ruleId: "maxDate", config: { date: new Date("2025-01-01") } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(0);
    });

    it("ignores null dates", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minDate", config: { date: null } },
        { ruleId: "maxDate", config: { date: new Date("2024-01-01") } },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe("contradictory rules", () => {
    it("detects positive + negative conflict", () => {
      const rules: AppliedRule[] = [
        { ruleId: "positive", config: {} },
        { ruleId: "negative", config: {} },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("contradictory");
    });
  });

  describe("no conflicts", () => {
    it("returns empty array for compatible rules", () => {
      const rules: AppliedRule[] = [
        { ruleId: "required", config: {} },
        { ruleId: "minLength", config: { length: 5 } },
        { ruleId: "maxLength", config: { length: 100 } },
        { ruleId: "email", config: {} },
      ];

      const conflicts = detectConflicts(rules);

      expect(conflicts).toHaveLength(0);
    });
  });
});

describe("generateZodCode", () => {
  it("generates code for single rule", () => {
    const rules: AppliedRule[] = [{ ruleId: "required", config: {} }];

    const code = generateZodCode("text", rules);

    expect(code).toContain("z.string()");
    expect(code).toContain('.min(1, "Required")');
  });

  it("generates code for multiple rules", () => {
    const rules: AppliedRule[] = [
      { ruleId: "required", config: {} },
      { ruleId: "minLength", config: { length: 50 } },
      { ruleId: "maxLength", config: { length: 500 } },
    ];

    const code = generateZodCode("text", rules);

    expect(code).toContain("z.string()");
    expect(code).toContain('.min(1, "Required")');
    expect(code).toContain('.min(50, "At least 50 characters")');
    expect(code).toContain('.max(500, "At most 500 characters")');
  });

  it("generates single-line code when multiLine is false", () => {
    const rules: AppliedRule[] = [
      { ruleId: "required", config: {} },
      { ruleId: "email", config: {} },
    ];

    const code = generateZodCode("text", rules, { multiLine: false });

    expect(code).not.toContain("\n");
    expect(code).toContain("z.string()");
    expect(code).toContain(".email");
  });

  it("generates code for number rules", () => {
    const rules: AppliedRule[] = [
      { ruleId: "min", config: { value: 0 } },
      { ruleId: "max", config: { value: 100 } },
      { ruleId: "integer", config: {} },
    ];

    const code = generateZodCode("number", rules);

    expect(code).toContain("z.number()");
    expect(code).toContain('.min(0, "Must be at least 0")');
    expect(code).toContain('.max(100, "Must be at most 100")');
    expect(code).toContain('.int("Must be a whole number")');
  });

  it("generates code for array rules", () => {
    const rules: AppliedRule[] = [
      { ruleId: "minItems", config: { min: 2 } },
      { ruleId: "maxItems", config: { max: 10 } },
    ];

    const code = generateZodCode("multiselect", rules);

    expect(code).toContain("z.array(z.string())");
    expect(code).toContain('.min(2, "At least 2 items required")');
    expect(code).toContain('.max(10, "At most 10 items allowed")');
  });

  it("generates code for email rule", () => {
    const rules: AppliedRule[] = [{ ruleId: "email", config: {} }];

    const code = generateZodCode("text", rules);

    expect(code).toContain('.email("Must be a valid email address")');
  });

  it("generates code for url rule", () => {
    const rules: AppliedRule[] = [{ ruleId: "url", config: {} }];

    const code = generateZodCode("text", rules);

    expect(code).toContain('.url("Must be a valid URL")');
  });

  it("generates code for pattern rule", () => {
    const rules: AppliedRule[] = [
      { ruleId: "pattern", config: { pattern: "^[A-Z]+$", message: "Must be uppercase" } },
    ];

    const code = generateZodCode("text", rules);

    expect(code).toContain(".regex(/^[A-Z]+$/");
    expect(code).toContain("Must be uppercase");
  });

  it("generates code for step rule", () => {
    const rules: AppliedRule[] = [{ ruleId: "step", config: { step: 0.5 } }];

    const code = generateZodCode("number", rules);

    expect(code).toContain('.multipleOf(0.5, "Must be a multiple of 0.5")');
  });

  it("generates base code when no rules applied", () => {
    const code = generateZodCode("text", []);

    expect(code).toBe("z.string()");
  });

  it("generates correct base for different input types", () => {
    expect(generateZodCode("text", [])).toBe("z.string()");
    expect(generateZodCode("textarea", [])).toBe("z.string()");
    expect(generateZodCode("number", [])).toBe("z.number()");
    expect(generateZodCode("checkbox", [])).toBe("z.boolean()");
    expect(generateZodCode("select", [])).toBe("z.string()");
    expect(generateZodCode("multiselect", [])).toBe("z.array(z.string())");
    expect(generateZodCode("date", [])).toBe("z.date()");
    expect(generateZodCode("file", [])).toBe("z.instanceof(File)");
  });
});

describe("composeRules", () => {
  beforeEach(() => {
    resetGlobalRuleRegistry();
  });

  describe("successful composition", () => {
    it("composes required rule for text input", () => {
      const rules: AppliedRule[] = [{ ruleId: "required", config: {} }];

      const result = composeRules("text", rules);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.schema).toBeDefined();
        expect(result.value.zodCode).toContain("z.string()");
        expect(result.value.warnings).toHaveLength(0);

        // Test the actual schema
        expect(result.value.schema.safeParse("").success).toBe(false);
        expect(result.value.schema.safeParse("hello").success).toBe(true);
      }
    });

    it("composes multiple rules in order", () => {
      const rules: AppliedRule[] = [
        { ruleId: "required", config: {} },
        { ruleId: "minLength", config: { length: 5 } },
        { ruleId: "maxLength", config: { length: 100 } },
      ];

      const result = composeRules("text", rules);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const { schema } = result.value;

        expect(schema.safeParse("").success).toBe(false);
        expect(schema.safeParse("abc").success).toBe(false);
        expect(schema.safeParse("hello").success).toBe(true);
        expect(schema.safeParse("a".repeat(101)).success).toBe(false);
        expect(schema.safeParse("a".repeat(100)).success).toBe(true);
      }
    });

    it("composes email validation", () => {
      const rules: AppliedRule[] = [
        { ruleId: "required", config: {} },
        { ruleId: "email", config: {} },
      ];

      const result = composeRules("text", rules);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const { schema } = result.value;

        expect(schema.safeParse("").success).toBe(false);
        expect(schema.safeParse("notanemail").success).toBe(false);
        expect(schema.safeParse("test@example.com").success).toBe(true);
      }
    });

    it("composes number validation", () => {
      const rules: AppliedRule[] = [
        { ruleId: "min", config: { value: 0 } },
        { ruleId: "max", config: { value: 100 } },
        { ruleId: "integer", config: {} },
      ];

      const result = composeRules("number", rules);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const { schema } = result.value;

        expect(schema.safeParse(-1).success).toBe(false);
        expect(schema.safeParse(101).success).toBe(false);
        expect(schema.safeParse(3.14).success).toBe(false);
        expect(schema.safeParse(50).success).toBe(true);
      }
    });

    it("composes multiselect validation", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minItems", config: { min: 1 } },
        { ruleId: "maxItems", config: { max: 3 } },
      ];

      const result = composeRules("multiselect", rules);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const { schema } = result.value;

        expect(schema.safeParse([]).success).toBe(false);
        expect(schema.safeParse(["a"]).success).toBe(true);
        expect(schema.safeParse(["a", "b", "c", "d"]).success).toBe(false);
      }
    });
  });

  describe("deduplication", () => {
    it("deduplicates redundant rules by default", () => {
      const rules: AppliedRule[] = [
        { ruleId: "required", config: {} },
        { ruleId: "required", config: {} },
      ];

      const result = composeRules("text", rules);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.warnings).toHaveLength(1);
        expect(result.value.warnings[0]?.type).toBe("redundant");
      }
    });

    it("keeps duplicate rules when deduplication is disabled", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: 5 } },
        { ruleId: "minLength", config: { length: 10 } },
      ];

      const result = composeRules("text", rules, { deduplicateRules: false });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        // Both rules should be in the Zod code
        expect(result.value.zodCode).toContain("At least 5 character");
        expect(result.value.zodCode).toContain("At least 10 character");
      }
    });
  });

  describe("conflict handling", () => {
    it("detects conflicts with detectConflicts before composing", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: 100 } },
        { ruleId: "maxLength", config: { length: 50 } },
      ];

      // detectConflicts should find the min > max conflict
      const conflicts = detectConflicts(rules);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.type).toBe("min-exceeds-max");
    });

    it("includes redundant rule conflicts as warnings when composing", () => {
      const rules: AppliedRule[] = [
        { ruleId: "required", config: {} },
        { ruleId: "required", config: {} },
      ];

      const result = composeRules("text", rules);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.warnings).toHaveLength(1);
        expect(result.value.warnings[0]?.type).toBe("redundant");
      }
    });

    it("fails on min > max conflicts even with continueOnWarnings=true due to Zod runtime error", () => {
      // Note: min > max conflicts cause Zod to throw when creating the schema
      // because it creates invalid regex patterns like {100,50}
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: 100 } },
        { ruleId: "maxLength", config: { length: 50 } },
      ];

      const result = composeRules("text", rules);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe("COMPOSITION_FAILED");
      }
    });

    it("fails on conflicts when continueOnWarnings is false", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: 100 } },
        { ruleId: "maxLength", config: { length: 50 } },
      ];

      const result = composeRules("text", rules, { continueOnWarnings: false });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe("CONFLICT_DETECTED");
      }
    });
  });

  describe("error handling", () => {
    it("fails for unknown rule", () => {
      const rules: AppliedRule[] = [
        { ruleId: "unknownRule" as any, config: {} },
      ];

      const result = composeRules("text", rules);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe("UNKNOWN_RULE");
        expect(result.error.message).toContain("unknownRule");
      }
    });

    it("fails for invalid config", () => {
      const rules: AppliedRule[] = [
        { ruleId: "minLength", config: { length: -5 } },
      ];

      const result = composeRules("text", rules);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe("INVALID_CONFIG");
      }
    });

    it("fails for incompatible input type", () => {
      const rules: AppliedRule[] = [
        { ruleId: "email", config: {} },
      ];

      // email is only compatible with text, not number
      const result = composeRules("number", rules);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe("INCOMPATIBLE_INPUT_TYPE");
        expect(result.error.message).toContain("email");
        expect(result.error.message).toContain("number");
      }
    });
  });

  describe("example from requirements", () => {
    it("generates expected Zod schema for required + min/max length", () => {
      // User attaches: Required, Min Length (50), Max Length (500)
      const rules: AppliedRule[] = [
        { ruleId: "required", config: {} },
        { ruleId: "minLength", config: { length: 50 } },
        { ruleId: "maxLength", config: { length: 500 } },
      ];

      const result = composeRules("textarea", rules);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const { zodCode, schema } = result.value;

        // Check the generated code contains expected parts
        expect(zodCode).toContain("z.string()");
        expect(zodCode).toContain('.min(1, "Required")');
        expect(zodCode).toContain('.min(50, "At least 50 characters")');
        expect(zodCode).toContain('.max(500, "At most 500 characters")');

        // Test the schema behavior
        expect(schema.safeParse("").success).toBe(false); // required fails
        expect(schema.safeParse("short").success).toBe(false); // minLength fails
        expect(schema.safeParse("a".repeat(50)).success).toBe(true); // exactly 50
        expect(schema.safeParse("a".repeat(500)).success).toBe(true); // exactly 500
        expect(schema.safeParse("a".repeat(501)).success).toBe(false); // maxLength fails
      }
    });
  });
});

describe("Result type helpers", () => {
  it("isSuccess correctly identifies success", () => {
    const rules: AppliedRule[] = [{ ruleId: "required", config: {} }];
    const result = composeRules("text", rules);

    expect(isSuccess(result)).toBe(true);
    expect(isFailure(result)).toBe(false);
  });

  it("isFailure correctly identifies failure", () => {
    const rules: AppliedRule[] = [
      { ruleId: "unknownRule" as any, config: {} },
    ];
    const result = composeRules("text", rules);

    expect(isFailure(result)).toBe(true);
    expect(isSuccess(result)).toBe(false);
  });
});
