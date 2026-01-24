/**
 * Validation error utilities for parsing Zod errors into gaming-friendly displays.
 */

import { transformErrorMessage } from "./messages";
import type {
  FieldValidationError,
  ValidationErrors,
  ParseErrorsOptions,
  ZodIssueInfo,
  ErrorMessageTransformer,
} from "./types";

/**
 * Create an empty ValidationErrors object.
 */
export function createEmptyValidationErrors(): ValidationErrors {
  const fieldErrors = new Map<string, FieldValidationError[]>();
  const formErrors: FieldValidationError[] = [];

  return {
    fieldErrors,
    formErrors,
    hasErrors: false,
    errorCount: 0,
    getFieldError: (path: string) => fieldErrors.get(path)?.[0],
    getFieldErrors: (path: string) => fieldErrors.get(path) ?? [],
    hasFieldError: (path: string) => fieldErrors.has(path),
    getFirstErrorField: () => undefined,
  };
}

/**
 * Convert a Zod issue path to a string path.
 * Handles both string keys and numeric array indices.
 */
export function pathToString(path: (string | number)[]): string {
  return path
    .map((segment, index) => {
      if (typeof segment === "number") {
        return `[${String(segment)}]`;
      }
      return index === 0 ? segment : `.${segment}`;
    })
    .join("");
}

/**
 * Convert a Zod issue to a FieldValidationError.
 */
export function zodIssueToFieldError(
  issue: ZodIssueInfo,
  customTransformers?: Partial<Record<string, ErrorMessageTransformer>>
): FieldValidationError {
  const path = pathToString(issue.path);
  const message = transformErrorMessage(issue, customTransformers);

  return {
    path,
    code: issue.code,
    message,
    minimum: issue.minimum,
    maximum: issue.maximum,
    inclusive: issue.inclusive,
    expected: issue.expected,
    received: issue.received,
  };
}

/**
 * Create a ValidationErrors object from an array of Zod issues.
 *
 * @param issues - Array of Zod issues
 * @param options - Options for parsing errors
 * @returns ValidationErrors object with gaming-friendly messages
 */
export function createValidationErrors(
  issues: ZodIssueInfo[],
  options: ParseErrorsOptions = {}
): ValidationErrors {
  const { messageTransformers, useGamingMessages = true } = options;

  const fieldErrors = new Map<string, FieldValidationError[]>();
  const formErrors: FieldValidationError[] = [];
  let errorCount = 0;
  let firstErrorField: string | undefined;

  for (const issue of issues) {
    const transformers = useGamingMessages ? messageTransformers : undefined;
    const fieldError = useGamingMessages
      ? zodIssueToFieldError(issue, transformers)
      : {
          path: pathToString(issue.path),
          code: issue.code,
          message: issue.message,
          minimum: issue.minimum,
          maximum: issue.maximum,
          inclusive: issue.inclusive,
          expected: issue.expected,
          received: issue.received,
        };

    errorCount++;

    if (issue.path.length === 0) {
      // Form-level error (no path)
      formErrors.push(fieldError);
    } else {
      const path = fieldError.path;

      if (firstErrorField === undefined) {
        firstErrorField = path;
      }

      const existing = fieldErrors.get(path);
      if (existing) {
        existing.push(fieldError);
      } else {
        fieldErrors.set(path, [fieldError]);
      }
    }
  }

  return {
    fieldErrors,
    formErrors,
    hasErrors: errorCount > 0,
    errorCount,
    getFieldError: (path: string) => fieldErrors.get(path)?.[0],
    getFieldErrors: (path: string) => fieldErrors.get(path) ?? [],
    hasFieldError: (path: string) => fieldErrors.has(path),
    getFirstErrorField: () => firstErrorField,
  };
}

/**
 * Parse a Zod error object (with issues array) into ValidationErrors.
 * This is a convenience wrapper around createValidationErrors.
 *
 * @param zodError - A Zod error object with an issues array
 * @param options - Options for parsing errors
 * @returns ValidationErrors object with gaming-friendly messages
 */
export function parseZodError(
  zodError: { issues: ZodIssueInfo[] },
  options: ParseErrorsOptions = {}
): ValidationErrors {
  return createValidationErrors(zodError.issues, options);
}

/**
 * Merge multiple ValidationErrors objects into one.
 * Useful when validating multiple schemas.
 */
export function mergeValidationErrors(
  ...errorSets: ValidationErrors[]
): ValidationErrors {
  const fieldErrors = new Map<string, FieldValidationError[]>();
  const formErrors: FieldValidationError[] = [];
  let errorCount = 0;
  let firstErrorField: string | undefined;

  for (const errors of errorSets) {
    // Merge form-level errors
    formErrors.push(...errors.formErrors);
    errorCount += errors.formErrors.length;

    // Merge field errors
    for (const [path, pathErrors] of errors.fieldErrors) {
      if (firstErrorField === undefined && pathErrors.length > 0) {
        firstErrorField = path;
      }

      const existing = fieldErrors.get(path);
      if (existing) {
        existing.push(...pathErrors);
      } else {
        fieldErrors.set(path, [...pathErrors]);
      }
      errorCount += pathErrors.length;
    }
  }

  return {
    fieldErrors,
    formErrors,
    hasErrors: errorCount > 0,
    errorCount,
    getFieldError: (path: string) => fieldErrors.get(path)?.[0],
    getFieldErrors: (path: string) => fieldErrors.get(path) ?? [],
    hasFieldError: (path: string) => fieldErrors.has(path),
    getFirstErrorField: () => firstErrorField,
  };
}

/**
 * Create a single-field error for manual error additions.
 */
export function createFieldError(
  path: string,
  message: string,
  code = "custom"
): FieldValidationError {
  return {
    path,
    code,
    message,
  };
}

/**
 * Add an error to an existing ValidationErrors object (immutable).
 */
export function addErrorToValidation(
  errors: ValidationErrors,
  path: string,
  message: string,
  code = "custom"
): ValidationErrors {
  const newFieldErrors = new Map(errors.fieldErrors);
  const error = createFieldError(path, message, code);

  if (path === "") {
    // Form-level error
    return {
      ...errors,
      formErrors: [...errors.formErrors, error],
      hasErrors: true,
      errorCount: errors.errorCount + 1,
    };
  }

  const existing = newFieldErrors.get(path);
  if (existing) {
    newFieldErrors.set(path, [...existing, error]);
  } else {
    newFieldErrors.set(path, [error]);
  }

  const firstErrorField = errors.getFirstErrorField() ?? path;

  return {
    fieldErrors: newFieldErrors,
    formErrors: errors.formErrors,
    hasErrors: true,
    errorCount: errors.errorCount + 1,
    getFieldError: (p: string) => newFieldErrors.get(p)?.[0],
    getFieldErrors: (p: string) => newFieldErrors.get(p) ?? [],
    hasFieldError: (p: string) => newFieldErrors.has(p),
    getFirstErrorField: () => firstErrorField,
  };
}

/**
 * Remove errors for a specific field (immutable).
 */
export function clearFieldFromValidation(
  errors: ValidationErrors,
  path: string
): ValidationErrors {
  if (!errors.hasFieldError(path)) {
    return errors;
  }

  const newFieldErrors = new Map(errors.fieldErrors);
  const removedCount = newFieldErrors.get(path)?.length ?? 0;
  newFieldErrors.delete(path);

  const newErrorCount = errors.errorCount - removedCount;

  // Find new first error field
  let firstErrorField: string | undefined;
  for (const key of newFieldErrors.keys()) {
    firstErrorField = key;
    break;
  }

  return {
    fieldErrors: newFieldErrors,
    formErrors: errors.formErrors,
    hasErrors: newErrorCount > 0,
    errorCount: newErrorCount,
    getFieldError: (p: string) => newFieldErrors.get(p)?.[0],
    getFieldErrors: (p: string) => newFieldErrors.get(p) ?? [],
    hasFieldError: (p: string) => newFieldErrors.has(p),
    getFirstErrorField: () => firstErrorField,
  };
}
