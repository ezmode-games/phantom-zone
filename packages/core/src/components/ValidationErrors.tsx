/**
 * Validation error display components for phantom-zone forms.
 *
 * Provides inline field errors and form-level error summaries
 * with gaming-friendly messaging.
 */

import type { ReactNode, RefObject } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  createValidationErrors,
  createEmptyValidationErrors,
  addErrorToValidation,
  clearFieldFromValidation,
} from "../validation/errors";
import type {
  FieldErrorProps,
  ErrorSummaryProps,
  ValidationErrors,
  ValidationErrorsState,
  ZodIssueInfo,
  ScrollToErrorOptions,
  ParseErrorsOptions,
} from "../validation/types";

/**
 * FieldError - Displays inline validation errors for a specific field.
 *
 * Place this component below the input field it relates to.
 * Link it to the input using aria-describedby for accessibility.
 *
 * @example
 * ```tsx
 * <input
 *   id="email"
 *   aria-describedby="email-error"
 *   aria-invalid={errors.hasFieldError("email")}
 * />
 * <FieldError
 *   fieldPath="email"
 *   errors={errors}
 *   id="email-error"
 * />
 * ```
 */
export function FieldError({
  fieldPath,
  errors,
  className,
  showAll = false,
  id,
}: FieldErrorProps): ReactNode {
  const fieldErrors = errors.getFieldErrors(fieldPath);

  if (fieldErrors.length === 0) {
    return null;
  }

  const firstError = fieldErrors[0];
  if (!firstError) {
    return null;
  }

  const displayErrors = showAll ? fieldErrors : [firstError];

  return (
    <div
      id={id}
      className={className}
      role="alert"
      aria-live="polite"
      data-field-error={fieldPath}
    >
      {displayErrors.map((error, index) => (
        <p
          key={`${error.code}-${String(index)}`}
          data-error-code={error.code}
        >
          {error.message}
        </p>
      ))}
    </div>
  );
}

/**
 * Props for individual error items in the summary.
 */
interface ErrorSummaryItemProps {
  /** The field path */
  fieldPath: string;
  /** The error message */
  message: string;
  /** Click handler for scroll-to-error */
  onClick?: () => void;
}

/**
 * ErrorSummaryItem - A single error in the summary list.
 */
function ErrorSummaryItem({
  fieldPath,
  message,
  onClick,
}: ErrorSummaryItemProps): ReactNode {
  if (onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          data-error-link={fieldPath}
        >
          {message}
        </button>
      </li>
    );
  }

  return <li>{message}</li>;
}

/**
 * ErrorSummary - Displays a form-level error summary.
 *
 * Shows all errors at the top of the form with optional scroll-to-error links.
 * This should be rendered at the top of the form, typically after submit attempts.
 *
 * @example
 * ```tsx
 * <form onSubmit={handleSubmit}>
 *   <ErrorSummary
 *     errors={errors}
 *     title="Please fix the following errors:"
 *     scrollToError
 *   />
 *   {/* form fields *\/}
 * </form>
 * ```
 */
export function ErrorSummary({
  errors,
  className,
  title = "Please fix the following errors:",
  scrollToError = true,
  scrollBehavior = "smooth",
  summaryRef,
}: ErrorSummaryProps): ReactNode {
  if (!errors.hasErrors) {
    return null;
  }

  const handleErrorClick = useCallback(
    (fieldPath: string) => {
      if (!scrollToError) return;

      // Try to find the field element
      const selectors = [
        `[name="${fieldPath}"]`,
        `#${fieldPath}`,
        `[data-field="${fieldPath}"]`,
        `[data-field-error="${fieldPath}"]`,
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({ behavior: scrollBehavior, block: "center" });

          // Focus if it's an interactive element
          if (element instanceof HTMLElement && "focus" in element) {
            element.focus();
          }
          break;
        }
      }
    },
    [scrollToError, scrollBehavior]
  );

  // Collect all errors for display
  const allErrors: Array<{ path: string; message: string }> = [];

  // Add form-level errors first
  for (const error of errors.formErrors) {
    allErrors.push({ path: "", message: error.message });
  }

  // Add field errors
  for (const [path, fieldErrors] of errors.fieldErrors) {
    // Only show first error per field in summary
    const firstError = fieldErrors[0];
    if (firstError) {
      allErrors.push({ path, message: firstError.message });
    }
  }

  return (
    <div
      className={className}
      role="alert"
      aria-live="assertive"
      data-error-summary
      ref={summaryRef as RefObject<HTMLDivElement>}
      tabIndex={-1}
    >
      <p>{title}</p>
      <ul>
        {allErrors.map((error, index) => (
          <ErrorSummaryItem
            key={`${error.path}-${String(index)}`}
            fieldPath={error.path}
            message={error.message}
            onClick={
              scrollToError && error.path
                ? () => handleErrorClick(error.path)
                : undefined
            }
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Options for the useValidationErrors hook.
 */
export interface UseValidationErrorsOptions extends ParseErrorsOptions {
  /** Initial errors to populate */
  initialErrors?: ZodIssueInfo[];
}

/**
 * useValidationErrors - Hook for managing validation error state.
 *
 * Provides a complete API for:
 * - Setting errors from Zod validation results
 * - Clearing all errors or specific field errors
 * - Adding manual errors
 * - Scrolling to the first error field
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { errors, setErrors, clearErrors, scrollToFirstError } = useValidationErrors();
 *
 *   const handleSubmit = (data: FormData) => {
 *     const result = schema.safeParse(data);
 *     if (!result.success) {
 *       setErrors(result.error.issues);
 *       scrollToFirstError();
 *       return;
 *     }
 *     // Submit successful data
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <ErrorSummary errors={errors} />
 *       {/* fields with FieldError components *\/}
 *     </form>
 *   );
 * }
 * ```
 */
export function useValidationErrors(
  options: UseValidationErrorsOptions = {}
): ValidationErrorsState {
  const { initialErrors, messageTransformers, useGamingMessages = true } = options;

  const [errors, setErrorsState] = useState<ValidationErrors>(() => {
    if (initialErrors && initialErrors.length > 0) {
      return createValidationErrors(initialErrors, {
        messageTransformers,
        useGamingMessages,
      });
    }
    return createEmptyValidationErrors();
  });

  // Store options in a ref to avoid recreating callbacks
  const optionsRef = useRef({ messageTransformers, useGamingMessages });
  optionsRef.current = { messageTransformers, useGamingMessages };

  const setErrors = useCallback((issues: ZodIssueInfo[]) => {
    const newErrors = createValidationErrors(issues, optionsRef.current);
    setErrorsState(newErrors);
  }, []);

  const clearErrors = useCallback(() => {
    setErrorsState(createEmptyValidationErrors());
  }, []);

  const clearFieldErrors = useCallback((path: string) => {
    setErrorsState((current) => clearFieldFromValidation(current, path));
  }, []);

  const addError = useCallback(
    (path: string, message: string, code = "custom") => {
      setErrorsState((current) =>
        addErrorToValidation(current, path, message, code)
      );
    },
    []
  );

  const scrollToFirstError = useCallback(
    (scrollOptions: ScrollToErrorOptions = {}) => {
      const {
        behavior = "smooth",
        block = "center",
        inline = "nearest",
        focus = true,
        offsetTop = 0,
      } = scrollOptions;

      const firstErrorField = errors.getFirstErrorField();
      if (!firstErrorField) return;

      // Try multiple selector strategies to find the field
      const selectors = [
        `[name="${firstErrorField}"]`,
        `#${firstErrorField}`,
        `[data-field="${firstErrorField}"]`,
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element instanceof HTMLElement) {
          // Calculate scroll position with offset
          if (offsetTop > 0) {
            const rect = element.getBoundingClientRect();
            const scrollTop = window.scrollY + rect.top - offsetTop;
            window.scrollTo({ top: scrollTop, behavior });
          } else {
            element.scrollIntoView({ behavior, block, inline });
          }

          if (focus && "focus" in element) {
            element.focus();
          }
          return;
        }
      }
    },
    [errors]
  );

  return useMemo(
    () => ({
      errors,
      setErrors,
      clearErrors,
      clearFieldErrors,
      addError,
      scrollToFirstError,
    }),
    [errors, setErrors, clearErrors, clearFieldErrors, addError, scrollToFirstError]
  );
}

/**
 * Get error message props for a field.
 * Helper function for integrating with form libraries.
 *
 * @example
 * ```tsx
 * const errorProps = getFieldErrorProps("email", errors);
 * <input {...errorProps.inputProps} />
 * <span {...errorProps.messageProps}>{errorProps.message}</span>
 * ```
 */
export function getFieldErrorProps(
  fieldPath: string,
  errors: ValidationErrors,
  errorId?: string
): {
  hasError: boolean;
  message: string | undefined;
  inputProps: {
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  };
  messageProps: {
    id: string | undefined;
    role: "alert" | undefined;
    "aria-live": "polite" | undefined;
  };
} {
  const hasError = errors.hasFieldError(fieldPath);
  const error = errors.getFieldError(fieldPath);
  const id = errorId ?? `${fieldPath}-error`;

  return {
    hasError,
    message: error?.message,
    inputProps: {
      "aria-invalid": hasError,
      "aria-describedby": hasError ? id : undefined,
    },
    messageProps: {
      id: hasError ? id : undefined,
      role: hasError ? "alert" : undefined,
      "aria-live": hasError ? "polite" : undefined,
    },
  };
}
