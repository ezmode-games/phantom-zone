/**
 * Validation module for phantom-zone forms.
 *
 * Provides:
 * - Gaming-friendly error message transformers
 * - Validation error parsing and management
 * - Type definitions for error display
 */

// Error message transformers
export {
  // Individual transformers
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
  invalidIntersectionTransformer,
  unrecognizedKeysTransformer,
  // Default transformer map
  defaultMessageTransformers,
  // Main transform function
  transformErrorMessage,
  // Utility functions
  getFieldLabel,
} from "./messages";

// Error utilities
export {
  // Factory functions
  createEmptyValidationErrors,
  createValidationErrors,
  createFieldError,
  // Parsing functions
  parseZodError,
  zodIssueToFieldError,
  pathToString,
  // Manipulation functions
  mergeValidationErrors,
  addErrorToValidation,
  clearFieldFromValidation,
} from "./errors";

// Types
export type {
  FieldValidationError,
  ValidationErrors,
  FieldErrorProps,
  ErrorSummaryProps,
  ParseErrorsOptions,
  ErrorMessageTransformer,
  ZodIssueInfo,
  ValidationErrorsState,
  ScrollToErrorOptions,
} from "./types";
