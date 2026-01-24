/**
 * Form Submission Handler Hook (PZ-007)
 *
 * Provides unified submission handling with:
 * - Submit button loading state
 * - Double submission prevention
 * - Success confirmation
 * - Network error handling
 * - Retry mechanism
 * - Callback hooks for custom logic
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ValidationErrors, ZodIssueInfo } from "../validation/types";
import { createEmptyValidationErrors, createValidationErrors } from "../validation/errors";

/**
 * Status of a form submission attempt.
 */
export type SubmissionStatus =
  | "idle"
  | "submitting"
  | "success"
  | "error"
  | "validation_error";

/**
 * Error codes for submission failures.
 */
export type SubmissionErrorCode =
  | "network_error"
  | "timeout"
  | "validation_failed"
  | "server_error"
  | "unknown";

/**
 * Error object for submission failures.
 */
export interface SubmissionError {
  /** Error code for programmatic handling */
  code: SubmissionErrorCode;

  /** Human-readable error message */
  message: string;

  /** Original error if available */
  cause?: unknown;

  /** HTTP status code if applicable */
  statusCode?: number;

  /** Whether this error is retryable */
  retryable: boolean;
}

/**
 * Result of a submission attempt.
 */
export type SubmissionResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: SubmissionError }
  | { status: "validation_error"; errors: ValidationErrors };

/**
 * Submit function signature.
 * Takes form data and returns a promise that resolves to the result.
 */
export type SubmitFunction<TData, TResult> = (
  data: TData
) => Promise<SubmissionResult<TResult>>;

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number;

  /** Base delay in milliseconds between retries (default: 1000) */
  baseDelayMs: number;

  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff: boolean;

  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs: number;

  /** Only retry on specific error codes (default: ["network_error", "timeout"]) */
  retryOnCodes: SubmissionErrorCode[];
}

/**
 * Options for the useFormSubmit hook.
 */
export interface UseFormSubmitOptions<TData, TResult> {
  /** The submit function to call on form submission */
  onSubmit: SubmitFunction<TData, TResult>;

  /** Called before submission starts */
  onSubmitStart?: (data: TData) => void;

  /** Called after successful submission */
  onSuccess?: (result: TResult, data: TData) => void;

  /** Called when submission fails with an error */
  onError?: (error: SubmissionError, data: TData) => void;

  /** Called when validation fails */
  onValidationError?: (errors: ValidationErrors, data: TData) => void;

  /** Called when a retry is about to be attempted */
  onRetry?: (attempt: number, error: SubmissionError, data: TData) => void;

  /** Reset success status after this many milliseconds (0 = never reset) */
  successResetMs?: number;

  /** Timeout in milliseconds for the submit operation (default: 30000) */
  timeoutMs?: number;

  /** Retry configuration (set to false to disable retries) */
  retry?: Partial<RetryConfig> | false;
}

/**
 * Return value of the useFormSubmit hook.
 */
export interface UseFormSubmitReturn<TData, TResult> {
  /** Current submission status */
  status: SubmissionStatus;

  /** Whether a submission is in progress */
  isSubmitting: boolean;

  /** Whether the last submission was successful */
  isSuccess: boolean;

  /** Whether the last submission failed */
  isError: boolean;

  /** The error from the last failed submission */
  error: SubmissionError | null;

  /** Validation errors from the last submission */
  validationErrors: ValidationErrors;

  /** The result data from a successful submission */
  data: TResult | null;

  /** Current retry attempt number (0 if not retrying) */
  retryAttempt: number;

  /** Whether a retry is available for the current error */
  canRetry: boolean;

  /** Submit the form with the given data */
  submit: (data: TData) => Promise<SubmissionResult<TResult>>;

  /** Retry the last failed submission */
  retry: () => Promise<SubmissionResult<TResult> | null>;

  /** Reset the submission state to idle */
  reset: () => void;

  /** Clear validation errors */
  clearValidationErrors: () => void;
}

/**
 * Default retry configuration.
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  exponentialBackoff: true,
  maxDelayMs: 10000,
  retryOnCodes: ["network_error", "timeout"],
};

/**
 * Calculate delay for a retry attempt with exponential backoff.
 */
function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  if (!config.exponentialBackoff) {
    return config.baseDelayMs;
  }

  const delay = config.baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Check if an error is retryable based on config.
 */
function isRetryable(
  error: SubmissionError,
  config: RetryConfig
): boolean {
  return error.retryable && config.retryOnCodes.includes(error.code);
}

/**
 * Create a timeout promise that rejects after the specified duration.
 *
 * Note: We attach an internal no-op catch handler so that if this promise
 * is used in a Promise.race and loses (i.e., the other branch resolves first),
 * the eventual rejection does not surface as an unhandled rejection.
 */
function createTimeoutPromise(ms: number): Promise<never> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });

  // Ensure the rejection is always handled to avoid unhandled rejection warnings
  timeoutPromise.catch(() => {
    // Intentionally swallow - timeout was not the winner of the race
  });

  return timeoutPromise;
}

/**
 * Create a SubmissionError from various error types.
 */
export function createSubmissionError(
  error: unknown,
  defaultCode: SubmissionErrorCode = "unknown"
): SubmissionError {
  // Handle timeout errors
  if (error instanceof Error && error.message.includes("timed out")) {
    return {
      code: "timeout",
      message: "The request timed out. Please try again.",
      cause: error,
      retryable: true,
    };
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      code: "network_error",
      message: "Unable to connect to the server. Please check your internet connection.",
      cause: error,
      retryable: true,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      code: defaultCode,
      message: error.message,
      cause: error,
      retryable: defaultCode === "network_error" || defaultCode === "timeout",
    };
  }

  // Handle unknown errors
  return {
    code: "unknown",
    message: "An unexpected error occurred. Please try again.",
    cause: error,
    retryable: false,
  };
}

/**
 * Create a success result.
 */
export function createSuccessResult<T>(data: T): SubmissionResult<T> {
  return { status: "success", data };
}

/**
 * Create an error result.
 */
export function createErrorResult<T>(error: SubmissionError): SubmissionResult<T> {
  return { status: "error", error };
}

/**
 * Create a validation error result from Zod issues.
 */
export function createValidationErrorResult<T>(
  issues: ZodIssueInfo[]
): SubmissionResult<T> {
  return {
    status: "validation_error",
    errors: createValidationErrors(issues),
  };
}

/**
 * Hook for managing form submission state and behavior.
 *
 * Provides:
 * - Loading state management
 * - Double submission prevention
 * - Network error handling with retries
 * - Validation error integration
 * - Success/error callbacks
 *
 * @example
 * ```tsx
 * const {
 *   submit,
 *   isSubmitting,
 *   isSuccess,
 *   error,
 *   validationErrors,
 * } = useFormSubmit({
 *   onSubmit: async (data) => {
 *     const result = schema.safeParse(data);
 *     if (!result.success) {
 *       return createValidationErrorResult(result.error.issues);
 *     }
 *     const response = await api.submitForm(result.data);
 *     return createSuccessResult(response);
 *   },
 *   onSuccess: (result) => {
 *     toast.success("Form submitted successfully!");
 *   },
 *   onError: (error) => {
 *     toast.error(error.message);
 *   },
 * });
 *
 * return (
 *   <form onSubmit={(e) => { e.preventDefault(); submit(formData); }}>
 *     <ErrorSummary errors={validationErrors} />
 *     {/* form fields *\/}
 *     <button type="submit" disabled={isSubmitting}>
 *       {isSubmitting ? "Submitting..." : "Submit"}
 *     </button>
 *   </form>
 * );
 * ```
 */
export function useFormSubmit<TData, TResult>(
  options: UseFormSubmitOptions<TData, TResult>
): UseFormSubmitReturn<TData, TResult> {
  const {
    onSubmit,
    onSubmitStart,
    onSuccess,
    onError,
    onValidationError,
    onRetry,
    successResetMs = 0,
    timeoutMs = 30000,
    retry: retryOption = {},
  } = options;

  // Merge retry config with defaults
  const retryConfig: RetryConfig | false =
    retryOption === false
      ? false
      : { ...DEFAULT_RETRY_CONFIG, ...retryOption };

  // State
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [error, setError] = useState<SubmissionError | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    createEmptyValidationErrors()
  );
  const [data, setData] = useState<TResult | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  // Refs to track submission state
  const isSubmittingRef = useRef(false);
  const lastDataRef = useRef<TData | null>(null);
  const isMountedRef = useRef(true);
  const successResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  const clearSuccessResetTimeout = useCallback(() => {
    if (successResetTimeoutRef.current) {
      clearTimeout(successResetTimeoutRef.current);
      successResetTimeoutRef.current = null;
    }
  }, []);

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearSuccessResetTimeout();
    };
  }, [clearSuccessResetTimeout]);

  // Schedule success reset
  const scheduleSuccessReset = useCallback(() => {
    if (successResetMs > 0) {
      clearSuccessResetTimeout();
      successResetTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setStatus("idle");
          setData(null);
        }
      }, successResetMs);
    }
  }, [successResetMs, clearSuccessResetTimeout]);

  // Reset function
  const reset = useCallback(() => {
    clearSuccessResetTimeout();
    setStatus("idle");
    setError(null);
    setValidationErrors(createEmptyValidationErrors());
    setData(null);
    setRetryAttempt(0);
    isSubmittingRef.current = false;
    lastDataRef.current = null;
  }, [clearSuccessResetTimeout]);

  // Clear validation errors
  const clearValidationErrors = useCallback(() => {
    setValidationErrors(createEmptyValidationErrors());
    if (status === "validation_error") {
      setStatus("idle");
    }
  }, [status]);

  // Execute a single submission attempt
  const executeSubmission = useCallback(
    async (
      submitData: TData,
      attempt: number
    ): Promise<SubmissionResult<TResult>> => {
      // Track attempt for debugging/observability
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.debug?.(`[useFormSubmit] Executing submission attempt ${attempt}`);
      }
      try {
        // Race against timeout
        const result = await Promise.race([
          onSubmit(submitData),
          createTimeoutPromise(timeoutMs),
        ]);

        return result;
      } catch (err) {
        const submissionError = createSubmissionError(err);
        return createErrorResult(submissionError);
      }
    },
    [onSubmit, timeoutMs]
  );

  // Main submit function
  const submit = useCallback(
    async (submitData: TData): Promise<SubmissionResult<TResult>> => {
      // Prevent double submission
      if (isSubmittingRef.current) {
        return createErrorResult({
          code: "unknown",
          message: "A submission is already in progress",
          retryable: false,
        });
      }

      // Clear previous state
      clearSuccessResetTimeout();
      setError(null);
      setValidationErrors(createEmptyValidationErrors());
      setData(null);
      setRetryAttempt(0);

      // Mark as submitting
      isSubmittingRef.current = true;
      lastDataRef.current = submitData;
      setStatus("submitting");

      // Notify start
      onSubmitStart?.(submitData);

      let currentAttempt = 1;
      let lastResult: SubmissionResult<TResult>;

      // Retry loop
      while (true) {
        if (!isMountedRef.current) {
          return createErrorResult({
            code: "unknown",
            message: "Component unmounted during submission",
            retryable: false,
          });
        }

        lastResult = await executeSubmission(submitData, currentAttempt);

        // Handle success
        if (lastResult.status === "success") {
          if (isMountedRef.current) {
            setStatus("success");
            setData(lastResult.data);
            isSubmittingRef.current = false;
            scheduleSuccessReset();
            onSuccess?.(lastResult.data, submitData);
          }
          return lastResult;
        }

        // Handle validation errors (not retryable)
        if (lastResult.status === "validation_error") {
          if (isMountedRef.current) {
            setStatus("validation_error");
            setValidationErrors(lastResult.errors);
            isSubmittingRef.current = false;
            onValidationError?.(lastResult.errors, submitData);
          }
          return lastResult;
        }

        // Handle errors
        const { error: submissionError } = lastResult;

        // Check if we should retry
        const shouldRetry =
          retryConfig !== false &&
          currentAttempt < retryConfig.maxAttempts &&
          isRetryable(submissionError, retryConfig);

        if (!shouldRetry) {
          if (isMountedRef.current) {
            setStatus("error");
            setError(submissionError);
            isSubmittingRef.current = false;
            onError?.(submissionError, submitData);
          }
          return lastResult;
        }

        // Retry
        currentAttempt++;
        if (isMountedRef.current) {
          setRetryAttempt(currentAttempt);
        }

        onRetry?.(currentAttempt, submissionError, submitData);

        // Wait before retrying
        const delay = calculateRetryDelay(currentAttempt, retryConfig);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    },
    [
      clearSuccessResetTimeout,
      executeSubmission,
      onSubmitStart,
      onSuccess,
      onValidationError,
      onError,
      onRetry,
      retryConfig,
      scheduleSuccessReset,
    ]
  );

  // Manual retry function
  const retryFn = useCallback(async (): Promise<SubmissionResult<TResult> | null> => {
    const lastData = lastDataRef.current;
    if (lastData === null) {
      return null;
    }

    return submit(lastData);
  }, [submit]);

  // Compute derived states
  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error" || status === "validation_error";

  const canRetry = useMemo(() => {
    if (error === null || retryConfig === false) {
      return false;
    }
    return isRetryable(error, retryConfig);
  }, [error, retryConfig]);

  return useMemo(
    () => ({
      status,
      isSubmitting,
      isSuccess,
      isError,
      error,
      validationErrors,
      data,
      retryAttempt,
      canRetry,
      submit,
      retry: retryFn,
      reset,
      clearValidationErrors,
    }),
    [
      status,
      isSubmitting,
      isSuccess,
      isError,
      error,
      validationErrors,
      data,
      retryAttempt,
      canRetry,
      submit,
      retryFn,
      reset,
      clearValidationErrors,
    ]
  );
}
