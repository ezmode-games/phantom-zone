/**
 * Tests for gaming-friendly error message transformers.
 */

import { describe, expect, it } from "vitest";
import {
  tooSmallTransformer,
  tooBigTransformer,
  invalidTypeTransformer,
  invalidStringTransformer,
  invalidEnumTransformer,
  invalidLiteralTransformer,
  customTransformer,
  invalidUnionTransformer,
  invalidDateTransformer,
  notMultipleOfTransformer,
  notFiniteTransformer,
  transformErrorMessage,
  getFieldLabel,
} from "../../src/validation/messages";
import type { ZodIssueInfo } from "../../src/validation/types";

describe("tooSmallTransformer", () => {
  it("handles required string (min 1)", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "String must contain at least 1 character(s)",
      path: ["name"],
      minimum: 1,
      type: "string",
    };

    expect(tooSmallTransformer(error)).toBe("This field cannot be empty.");
  });

  it("handles string with custom min length", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "String must contain at least 3 character(s)",
      path: ["name"],
      minimum: 3,
      type: "string",
    };

    expect(tooSmallTransformer(error)).toBe("Needs at least 3 characters.");
  });

  it("handles inclusive number minimum", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "Number must be greater than or equal to 10",
      path: ["age"],
      minimum: 10,
      type: "number",
      inclusive: true,
    };

    expect(tooSmallTransformer(error)).toBe("Must be 10 or higher.");
  });

  it("handles exclusive number minimum", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "Number must be greater than 0",
      path: ["amount"],
      minimum: 0,
      type: "number",
      inclusive: false,
    };

    expect(tooSmallTransformer(error)).toBe("Must be greater than 0.");
  });

  it("handles required array (min 1)", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "Array must contain at least 1 element(s)",
      path: ["items"],
      minimum: 1,
      type: "array",
    };

    expect(tooSmallTransformer(error)).toBe("Select at least one option.");
  });

  it("handles array with custom min items", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "Array must contain at least 3 element(s)",
      path: ["items"],
      minimum: 3,
      type: "array",
    };

    expect(tooSmallTransformer(error)).toBe("Select at least 3 options.");
  });

  it("handles date too early", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "Date must be after 2020-01-01",
      path: ["startDate"],
      minimum: new Date("2020-01-01").getTime(),
      type: "date",
    };

    expect(tooSmallTransformer(error)).toBe("Date is too early.");
  });
});

describe("tooBigTransformer", () => {
  it("handles string max length", () => {
    const error: ZodIssueInfo = {
      code: "too_big",
      message: "String must contain at most 100 character(s)",
      path: ["name"],
      maximum: 100,
      type: "string",
    };

    expect(tooBigTransformer(error)).toBe("Maximum 100 characters allowed.");
  });

  it("handles inclusive number maximum", () => {
    const error: ZodIssueInfo = {
      code: "too_big",
      message: "Number must be less than or equal to 100",
      path: ["quantity"],
      maximum: 100,
      type: "number",
      inclusive: true,
    };

    expect(tooBigTransformer(error)).toBe("Must be 100 or lower.");
  });

  it("handles exclusive number maximum", () => {
    const error: ZodIssueInfo = {
      code: "too_big",
      message: "Number must be less than 100",
      path: ["quantity"],
      maximum: 100,
      type: "number",
      inclusive: false,
    };

    expect(tooBigTransformer(error)).toBe("Must be less than 100.");
  });

  it("handles array max items", () => {
    const error: ZodIssueInfo = {
      code: "too_big",
      message: "Array must contain at most 5 element(s)",
      path: ["selections"],
      maximum: 5,
      type: "array",
    };

    expect(tooBigTransformer(error)).toBe("Maximum 5 selections allowed.");
  });

  it("handles date too late", () => {
    const error: ZodIssueInfo = {
      code: "too_big",
      message: "Date must be before 2025-01-01",
      path: ["endDate"],
      maximum: new Date("2025-01-01").getTime(),
      type: "date",
    };

    expect(tooBigTransformer(error)).toBe("Date is too late.");
  });
});

describe("invalidTypeTransformer", () => {
  it("handles undefined for required field", () => {
    const error: ZodIssueInfo = {
      code: "invalid_type",
      message: "Required",
      path: ["name"],
      expected: "string",
      received: "undefined",
    };

    expect(invalidTypeTransformer(error)).toBe("This field is required.");
  });

  it("handles null for required field", () => {
    const error: ZodIssueInfo = {
      code: "invalid_type",
      message: "Expected string, received null",
      path: ["name"],
      expected: "string",
      received: "null",
    };

    expect(invalidTypeTransformer(error)).toBe("This field is required.");
  });

  it("handles number expected but string received", () => {
    const error: ZodIssueInfo = {
      code: "invalid_type",
      message: "Expected number, received string",
      path: ["age"],
      expected: "number",
      received: "string",
    };

    expect(invalidTypeTransformer(error)).toBe("Enter a valid number.");
  });

  it("handles string expected but number received", () => {
    const error: ZodIssueInfo = {
      code: "invalid_type",
      message: "Expected string, received number",
      path: ["name"],
      expected: "string",
      received: "number",
    };

    expect(invalidTypeTransformer(error)).toBe("Enter text, not a number.");
  });

  it("handles date expected", () => {
    const error: ZodIssueInfo = {
      code: "invalid_type",
      message: "Expected date, received string",
      path: ["startDate"],
      expected: "date",
      received: "string",
    };

    expect(invalidTypeTransformer(error)).toBe("Enter a valid date.");
  });

  it("handles boolean expected", () => {
    const error: ZodIssueInfo = {
      code: "invalid_type",
      message: "Expected boolean, received string",
      path: ["accepted"],
      expected: "boolean",
      received: "string",
    };

    expect(invalidTypeTransformer(error)).toBe("This must be checked or unchecked.");
  });

  it("handles array expected", () => {
    const error: ZodIssueInfo = {
      code: "invalid_type",
      message: "Expected array, received string",
      path: ["items"],
      expected: "array",
      received: "string",
    };

    expect(invalidTypeTransformer(error)).toBe("Select one or more options.");
  });
});

describe("invalidStringTransformer", () => {
  it("handles email validation", () => {
    const error: ZodIssueInfo = {
      code: "invalid_string",
      message: "Invalid email",
      path: ["email"],
    };

    expect(invalidStringTransformer(error)).toBe("Enter a valid email address.");
  });

  it("handles URL validation", () => {
    const error: ZodIssueInfo = {
      code: "invalid_string",
      message: "Invalid url",
      path: ["website"],
    };

    expect(invalidStringTransformer(error)).toBe("Enter a valid URL.");
  });

  it("handles UUID validation", () => {
    const error: ZodIssueInfo = {
      code: "invalid_string",
      message: "Invalid uuid",
      path: ["id"],
    };

    expect(invalidStringTransformer(error)).toBe("Invalid identifier format.");
  });

  it("handles regex pattern validation", () => {
    const error: ZodIssueInfo = {
      code: "invalid_string",
      message: "Invalid regex pattern",
      path: ["code"],
    };

    expect(invalidStringTransformer(error)).toBe("Format is incorrect.");
  });

  it("handles datetime validation", () => {
    const error: ZodIssueInfo = {
      code: "invalid_string",
      message: "Invalid datetime",
      path: ["timestamp"],
    };

    expect(invalidStringTransformer(error)).toBe("Enter a valid date.");
  });

  it("handles time validation", () => {
    const error: ZodIssueInfo = {
      code: "invalid_string",
      message: "Invalid time",
      path: ["startTime"],
    };

    expect(invalidStringTransformer(error)).toBe("Enter a valid time.");
  });

  it("handles unknown string validation with fallback", () => {
    const error: ZodIssueInfo = {
      code: "invalid_string",
      message: "Invalid string format",
      path: ["field"],
    };

    expect(invalidStringTransformer(error)).toBe("Invalid format.");
  });
});

describe("invalidEnumTransformer", () => {
  it("returns gaming-friendly message", () => {
    const error: ZodIssueInfo = {
      code: "invalid_enum_value",
      message: "Invalid enum value",
      path: ["status"],
    };

    expect(invalidEnumTransformer(error)).toBe("Select a valid option.");
  });
});

describe("invalidLiteralTransformer", () => {
  it("handles true literal (checkbox acknowledgment)", () => {
    const error: ZodIssueInfo = {
      code: "invalid_literal",
      message: "Invalid literal value, expected true",
      path: ["terms"],
      expected: "true",
    };

    expect(invalidLiteralTransformer(error)).toBe("This must be accepted.");
  });

  it("handles other literals with fallback", () => {
    const error: ZodIssueInfo = {
      code: "invalid_literal",
      message: "Invalid literal value",
      path: ["type"],
      expected: "foo",
    };

    expect(invalidLiteralTransformer(error)).toBe("Invalid value.");
  });
});

describe("customTransformer", () => {
  it("passes through custom message", () => {
    const error: ZodIssueInfo = {
      code: "custom",
      message: "Passwords do not match",
      path: ["confirmPassword"],
    };

    expect(customTransformer(error)).toBe("Passwords do not match");
  });
});

describe("invalidUnionTransformer", () => {
  it("returns gaming-friendly message", () => {
    const error: ZodIssueInfo = {
      code: "invalid_union",
      message: "Invalid union value",
      path: ["data"],
    };

    expect(invalidUnionTransformer(error)).toBe("Invalid selection.");
  });
});

describe("invalidDateTransformer", () => {
  it("returns gaming-friendly message", () => {
    const error: ZodIssueInfo = {
      code: "invalid_date",
      message: "Invalid date",
      path: ["date"],
    };

    expect(invalidDateTransformer(error)).toBe("Enter a valid date.");
  });
});

describe("notMultipleOfTransformer", () => {
  it("shows step increment message", () => {
    const error: ZodIssueInfo = {
      code: "not_multiple_of",
      message: "Number must be a multiple of 0.5",
      path: ["amount"],
      minimum: 0.5,
    };

    expect(notMultipleOfTransformer(error)).toBe("Must be in increments of 0.5.");
  });

  it("handles missing step value", () => {
    const error: ZodIssueInfo = {
      code: "not_multiple_of",
      message: "Number must be a multiple of step",
      path: ["amount"],
    };

    expect(notMultipleOfTransformer(error)).toBe("Invalid increment.");
  });
});

describe("notFiniteTransformer", () => {
  it("returns gaming-friendly message", () => {
    const error: ZodIssueInfo = {
      code: "not_finite",
      message: "Number must be finite",
      path: ["amount"],
    };

    expect(notFiniteTransformer(error)).toBe("Enter a finite number.");
  });
});

describe("transformErrorMessage", () => {
  it("uses default transformers", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "String must contain at least 1 character(s)",
      path: ["name"],
      minimum: 1,
      type: "string",
    };

    expect(transformErrorMessage(error)).toBe("This field cannot be empty.");
  });

  it("allows custom transformers to override defaults", () => {
    const error: ZodIssueInfo = {
      code: "too_small",
      message: "String must contain at least 1 character(s)",
      path: ["name"],
      minimum: 1,
      type: "string",
    };

    const customTransformers = {
      too_small: () => "Custom error message",
    };

    expect(transformErrorMessage(error, customTransformers)).toBe("Custom error message");
  });

  it("falls back to original message for unknown codes", () => {
    const error: ZodIssueInfo = {
      code: "unknown_code",
      message: "Some error",
      path: ["field"],
    };

    expect(transformErrorMessage(error)).toBe("Some error");
  });
});

describe("getFieldLabel", () => {
  it("converts camelCase to Title Case", () => {
    expect(getFieldLabel("userName")).toBe("User Name");
  });

  it("handles simple field names", () => {
    expect(getFieldLabel("email")).toBe("Email");
  });

  it("extracts last segment from path", () => {
    expect(getFieldLabel("address.city")).toBe("City");
  });

  it("handles deeply nested paths", () => {
    expect(getFieldLabel("user.profile.firstName")).toBe("First Name");
  });

  it("handles PascalCase", () => {
    expect(getFieldLabel("UserName")).toBe("User Name");
  });

  it("returns Field for empty path", () => {
    expect(getFieldLabel("")).toBe("Field");
  });
});
