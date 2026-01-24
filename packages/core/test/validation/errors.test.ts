/**
 * Tests for validation error utilities.
 */

import { describe, expect, it } from "vitest";
import {
  createEmptyValidationErrors,
  createValidationErrors,
  createFieldError,
  parseZodError,
  pathToString,
  zodIssueToFieldError,
  mergeValidationErrors,
  addErrorToValidation,
  clearFieldFromValidation,
} from "../../src/validation/errors";
import type { ZodIssueInfo } from "../../src/validation/types";

describe("pathToString", () => {
  it("converts simple path", () => {
    expect(pathToString(["email"])).toBe("email");
  });

  it("converts nested path", () => {
    expect(pathToString(["address", "city"])).toBe("address.city");
  });

  it("converts path with array indices", () => {
    expect(pathToString(["items", 0, "name"])).toBe("items[0].name");
  });

  it("handles empty path", () => {
    expect(pathToString([])).toBe("");
  });

  it("handles deeply nested path", () => {
    expect(pathToString(["a", "b", "c", "d"])).toBe("a.b.c.d");
  });

  it("handles multiple array indices", () => {
    expect(pathToString(["matrix", 0, 1])).toBe("matrix[0][1]");
  });
});

describe("createEmptyValidationErrors", () => {
  it("creates empty validation errors", () => {
    const errors = createEmptyValidationErrors();

    expect(errors.hasErrors).toBe(false);
    expect(errors.errorCount).toBe(0);
    expect(errors.formErrors).toHaveLength(0);
    expect(errors.fieldErrors.size).toBe(0);
    expect(errors.getFirstErrorField()).toBeUndefined();
  });

  it("returns no errors for any field", () => {
    const errors = createEmptyValidationErrors();

    expect(errors.hasFieldError("email")).toBe(false);
    expect(errors.getFieldError("email")).toBeUndefined();
    expect(errors.getFieldErrors("email")).toHaveLength(0);
  });
});

describe("zodIssueToFieldError", () => {
  it("converts a Zod issue to FieldValidationError", () => {
    const issue: ZodIssueInfo = {
      code: "too_small",
      message: "String must contain at least 1 character(s)",
      path: ["username"],
      minimum: 1,
      inclusive: true,
      type: "string",
    };

    const error = zodIssueToFieldError(issue);

    expect(error.path).toBe("username");
    expect(error.code).toBe("too_small");
    expect(error.message).toBe("This field cannot be empty.");
    expect(error.minimum).toBe(1);
    expect(error.inclusive).toBe(true);
  });

  it("uses gaming-friendly messages", () => {
    const issue: ZodIssueInfo = {
      code: "invalid_type",
      message: "Expected number, received string",
      path: ["age"],
      expected: "number",
      received: "string",
    };

    const error = zodIssueToFieldError(issue);

    expect(error.message).toBe("Enter a valid number.");
  });
});

describe("createValidationErrors", () => {
  it("creates errors from Zod issues", () => {
    const issues: ZodIssueInfo[] = [
      {
        code: "too_small",
        message: "String must contain at least 1 character(s)",
        path: ["email"],
        minimum: 1,
        type: "string",
      },
      {
        code: "invalid_type",
        message: "Expected number, received string",
        path: ["age"],
        expected: "number",
        received: "string",
      },
    ];

    const errors = createValidationErrors(issues);

    expect(errors.hasErrors).toBe(true);
    expect(errors.errorCount).toBe(2);
    expect(errors.hasFieldError("email")).toBe(true);
    expect(errors.hasFieldError("age")).toBe(true);
    expect(errors.getFirstErrorField()).toBe("email");
  });

  it("groups multiple errors for same field", () => {
    const issues: ZodIssueInfo[] = [
      {
        code: "too_small",
        message: "String must contain at least 3 character(s)",
        path: ["password"],
        minimum: 3,
        type: "string",
      },
      {
        code: "invalid_string",
        message: "Invalid",
        path: ["password"],
      },
    ];

    const errors = createValidationErrors(issues);

    expect(errors.hasErrors).toBe(true);
    expect(errors.errorCount).toBe(2);
    expect(errors.getFieldErrors("password")).toHaveLength(2);
    expect(errors.getFieldError("password")?.code).toBe("too_small");
  });

  it("handles form-level errors (empty path)", () => {
    const issues: ZodIssueInfo[] = [
      {
        code: "custom",
        message: "Form is invalid",
        path: [],
      },
    ];

    const errors = createValidationErrors(issues);

    expect(errors.hasErrors).toBe(true);
    expect(errors.formErrors).toHaveLength(1);
    expect(errors.formErrors[0]?.message).toBe("Form is invalid");
  });

  it("handles nested field paths", () => {
    const issues: ZodIssueInfo[] = [
      {
        code: "too_small",
        message: "Required",
        path: ["address", "city"],
        minimum: 1,
        type: "string",
      },
    ];

    const errors = createValidationErrors(issues);

    expect(errors.hasFieldError("address.city")).toBe(true);
    expect(errors.getFieldError("address.city")).toBeDefined();
  });

  it("preserves original messages when useGamingMessages is false", () => {
    const issues: ZodIssueInfo[] = [
      {
        code: "too_small",
        message: "String must contain at least 1 character(s)",
        path: ["email"],
        minimum: 1,
        type: "string",
      },
    ];

    const errors = createValidationErrors(issues, { useGamingMessages: false });

    expect(errors.getFieldError("email")?.message).toBe(
      "String must contain at least 1 character(s)"
    );
  });
});

describe("parseZodError", () => {
  it("parses a Zod error object", () => {
    const zodError = {
      issues: [
        {
          code: "too_small",
          message: "Required",
          path: ["name"],
          minimum: 1,
          type: "string",
        },
      ],
    };

    const errors = parseZodError(zodError);

    expect(errors.hasErrors).toBe(true);
    expect(errors.hasFieldError("name")).toBe(true);
  });
});

describe("createFieldError", () => {
  it("creates a field error with custom message", () => {
    const error = createFieldError("email", "Email already taken");

    expect(error.path).toBe("email");
    expect(error.message).toBe("Email already taken");
    expect(error.code).toBe("custom");
  });

  it("allows custom code", () => {
    const error = createFieldError("email", "Invalid email", "invalid_email");

    expect(error.code).toBe("invalid_email");
  });
});

describe("mergeValidationErrors", () => {
  it("merges multiple error sets", () => {
    const errors1 = createValidationErrors([
      {
        code: "too_small",
        message: "Required",
        path: ["email"],
        minimum: 1,
        type: "string",
      },
    ]);

    const errors2 = createValidationErrors([
      {
        code: "too_small",
        message: "Required",
        path: ["name"],
        minimum: 1,
        type: "string",
      },
    ]);

    const merged = mergeValidationErrors(errors1, errors2);

    expect(merged.hasErrors).toBe(true);
    expect(merged.errorCount).toBe(2);
    expect(merged.hasFieldError("email")).toBe(true);
    expect(merged.hasFieldError("name")).toBe(true);
  });

  it("merges errors for same field", () => {
    const errors1 = createValidationErrors([
      {
        code: "too_small",
        message: "Too short",
        path: ["password"],
        minimum: 8,
        type: "string",
      },
    ]);

    const errors2 = createValidationErrors([
      {
        code: "invalid_string",
        message: "Must contain number",
        path: ["password"],
      },
    ]);

    const merged = mergeValidationErrors(errors1, errors2);

    expect(merged.getFieldErrors("password")).toHaveLength(2);
  });

  it("handles empty error sets", () => {
    const errors1 = createEmptyValidationErrors();
    const errors2 = createEmptyValidationErrors();

    const merged = mergeValidationErrors(errors1, errors2);

    expect(merged.hasErrors).toBe(false);
    expect(merged.errorCount).toBe(0);
  });
});

describe("addErrorToValidation", () => {
  it("adds error to existing validation", () => {
    const initial = createEmptyValidationErrors();
    const updated = addErrorToValidation(initial, "email", "Invalid email");

    expect(updated.hasErrors).toBe(true);
    expect(updated.hasFieldError("email")).toBe(true);
    expect(updated.getFieldError("email")?.message).toBe("Invalid email");
    // Original should be unchanged
    expect(initial.hasErrors).toBe(false);
  });

  it("adds to existing field errors", () => {
    const initial = createValidationErrors([
      {
        code: "too_small",
        message: "Required",
        path: ["email"],
        minimum: 1,
        type: "string",
      },
    ]);

    const updated = addErrorToValidation(initial, "email", "Already taken");

    expect(updated.getFieldErrors("email")).toHaveLength(2);
  });

  it("adds form-level error with empty path", () => {
    const initial = createEmptyValidationErrors();
    const updated = addErrorToValidation(initial, "", "Form is invalid");

    expect(updated.formErrors).toHaveLength(1);
    expect(updated.formErrors[0]?.message).toBe("Form is invalid");
  });
});

describe("clearFieldFromValidation", () => {
  it("removes errors for a specific field", () => {
    const initial = createValidationErrors([
      {
        code: "too_small",
        message: "Required",
        path: ["email"],
        minimum: 1,
        type: "string",
      },
      {
        code: "too_small",
        message: "Required",
        path: ["name"],
        minimum: 1,
        type: "string",
      },
    ]);

    const updated = clearFieldFromValidation(initial, "email");

    expect(updated.hasFieldError("email")).toBe(false);
    expect(updated.hasFieldError("name")).toBe(true);
    expect(updated.errorCount).toBe(1);
  });

  it("returns same object if field has no errors", () => {
    const initial = createValidationErrors([
      {
        code: "too_small",
        message: "Required",
        path: ["email"],
        minimum: 1,
        type: "string",
      },
    ]);

    const updated = clearFieldFromValidation(initial, "name");

    expect(updated).toBe(initial);
  });

  it("updates first error field when clearing", () => {
    const initial = createValidationErrors([
      {
        code: "too_small",
        message: "Required",
        path: ["email"],
        minimum: 1,
        type: "string",
      },
      {
        code: "too_small",
        message: "Required",
        path: ["name"],
        minimum: 1,
        type: "string",
      },
    ]);

    expect(initial.getFirstErrorField()).toBe("email");

    const updated = clearFieldFromValidation(initial, "email");

    expect(updated.getFirstErrorField()).toBe("name");
  });
});
