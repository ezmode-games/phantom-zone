/**
 * Tests for composer types and helpers
 */

import { describe, expect, it } from "vitest";
import {
  INPUT_TYPE_TO_ZOD_BASE,
  success,
  failure,
  isSuccess,
  isFailure,
} from "../../src/composer";
import type {
  AppliedRule,
  ComposedSchema,
  CompositionError,
  CompositionResult,
  ConflictInfo,
  ValidatedRuleConfig,
} from "../../src/composer";

describe("INPUT_TYPE_TO_ZOD_BASE", () => {
  it("maps text to z.string()", () => {
    expect(INPUT_TYPE_TO_ZOD_BASE.text).toBe("z.string()");
  });

  it("maps textarea to z.string()", () => {
    expect(INPUT_TYPE_TO_ZOD_BASE.textarea).toBe("z.string()");
  });

  it("maps number to z.number()", () => {
    expect(INPUT_TYPE_TO_ZOD_BASE.number).toBe("z.number()");
  });

  it("maps checkbox to z.boolean()", () => {
    expect(INPUT_TYPE_TO_ZOD_BASE.checkbox).toBe("z.boolean()");
  });

  it("maps select to z.string()", () => {
    expect(INPUT_TYPE_TO_ZOD_BASE.select).toBe("z.string()");
  });

  it("maps multiselect to z.array(z.string())", () => {
    expect(INPUT_TYPE_TO_ZOD_BASE.multiselect).toBe("z.array(z.string())");
  });

  it("maps date to z.date()", () => {
    expect(INPUT_TYPE_TO_ZOD_BASE.date).toBe("z.date()");
  });

  it("maps file to z.instanceof(File)", () => {
    expect(INPUT_TYPE_TO_ZOD_BASE.file).toBe("z.instanceof(File)");
  });
});

describe("Result helpers", () => {
  describe("success", () => {
    it("creates a success result", () => {
      const result = success({ value: 42 });

      expect(result.success).toBe(true);
      expect((result as { success: true; value: { value: number } }).value).toEqual({ value: 42 });
    });

    it("works with any value type", () => {
      const stringResult = success("hello");
      const arrayResult = success([1, 2, 3]);
      const nullResult = success(null);

      expect(stringResult.success).toBe(true);
      expect(arrayResult.success).toBe(true);
      expect(nullResult.success).toBe(true);
    });
  });

  describe("failure", () => {
    it("creates a failure result", () => {
      const error: CompositionError = {
        code: "UNKNOWN_RULE",
        message: "Rule not found",
      };
      const result = failure<string>(error);

      expect(result.success).toBe(false);
      expect((result as { success: false; error: CompositionError }).error).toEqual(error);
    });

    it("preserves error details", () => {
      const error: CompositionError = {
        code: "INVALID_CONFIG",
        message: "Invalid configuration",
        ruleId: "minLength",
        details: { length: -5 },
      };
      const result = failure<number>(error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_CONFIG");
        expect(result.error.ruleId).toBe("minLength");
        expect(result.error.details).toEqual({ length: -5 });
      }
    });
  });

  describe("isSuccess", () => {
    it("returns true for success results", () => {
      const result = success(42);
      expect(isSuccess(result)).toBe(true);
    });

    it("returns false for failure results", () => {
      const result = failure<number>({ code: "UNKNOWN_RULE", message: "Error" });
      expect(isSuccess(result)).toBe(false);
    });

    it("acts as a type guard", () => {
      const result: CompositionResult<number> = success(42);

      if (isSuccess(result)) {
        // TypeScript should know result.value is number
        const value: number = result.value;
        expect(value).toBe(42);
      }
    });
  });

  describe("isFailure", () => {
    it("returns true for failure results", () => {
      const result = failure<number>({ code: "UNKNOWN_RULE", message: "Error" });
      expect(isFailure(result)).toBe(true);
    });

    it("returns false for success results", () => {
      const result = success(42);
      expect(isFailure(result)).toBe(false);
    });

    it("acts as a type guard", () => {
      const result: CompositionResult<number> = failure({ code: "UNKNOWN_RULE", message: "Error" });

      if (isFailure(result)) {
        // TypeScript should know result.error is CompositionError
        const error: CompositionError = result.error;
        expect(error.code).toBe("UNKNOWN_RULE");
      }
    });
  });
});

describe("Type structures", () => {
  it("AppliedRule has required fields", () => {
    const rule: AppliedRule = {
      ruleId: "required",
      config: {},
    };

    expect(rule.ruleId).toBe("required");
    expect(rule.config).toEqual({});
  });

  it("ConflictInfo has required fields", () => {
    const rule1: AppliedRule = { ruleId: "minLength", config: { length: 100 } };
    const rule2: AppliedRule = { ruleId: "maxLength", config: { length: 50 } };

    const conflict: ConflictInfo = {
      type: "min-exceeds-max",
      message: "minLength exceeds maxLength",
      rule1,
      rule2,
      suggestedResolution: "adjust-values",
    };

    expect(conflict.type).toBe("min-exceeds-max");
    expect(conflict.rule1).toBe(rule1);
    expect(conflict.rule2).toBe(rule2);
    expect(conflict.suggestedResolution).toBe("adjust-values");
  });

  it("ValidatedRuleConfig for valid config", () => {
    const valid: ValidatedRuleConfig = {
      isValid: true,
      normalizedConfig: { length: 5 },
    };

    expect(valid.isValid).toBe(true);
    expect(valid.normalizedConfig).toEqual({ length: 5 });
  });

  it("ValidatedRuleConfig for invalid config", () => {
    const invalid: ValidatedRuleConfig = {
      isValid: false,
      errorMessage: "Length must be positive",
    };

    expect(invalid.isValid).toBe(false);
    expect(invalid.errorMessage).toBe("Length must be positive");
  });
});
