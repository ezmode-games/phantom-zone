/**
 * Live Preview (PZ-107)
 *
 * Real-time preview of form as applicants will see it.
 * Features:
 * - Split view: editor left, preview right
 * - Preview updates as fields are edited
 * - Interactive preview (can type in fields)
 * - Shows validation errors in preview
 * - Mobile preview toggle (simulate mobile viewport)
 */

import {
  type ReactNode,
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
  useEffect,
} from "react";

import type { CanvasField, CanvasState } from "./types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Viewport mode for the preview.
 */
export type ViewportMode = "desktop" | "mobile";

/**
 * Validation error for a field in the preview.
 */
export interface PreviewFieldError {
  /** Field ID with the error */
  fieldId: string;
  /** Error message */
  message: string;
}

/**
 * Form values being entered in the preview.
 */
export type PreviewFormValues = Record<string, unknown>;

/**
 * Event emitted when a field value changes in the preview.
 */
export interface PreviewValueChangeEvent {
  /** The field ID that changed */
  fieldId: string;
  /** The new value */
  value: unknown;
}

/**
 * Event emitted when validation is triggered.
 */
export interface PreviewValidationEvent {
  /** Whether the form is valid */
  isValid: boolean;
  /** Validation errors if any */
  errors: PreviewFieldError[];
}

// -----------------------------------------------------------------------------
// Validation Functions
// -----------------------------------------------------------------------------

/**
 * Validates a single field value based on field configuration.
 */
export function validateFieldValue(
  field: CanvasField,
  value: unknown
): string | null {
  // Required validation
  if (field.required) {
    if (value === undefined || value === null || value === "") {
      return "This field is required";
    }
    if (Array.isArray(value) && value.length === 0) {
      return "This field is required";
    }
  }

  // Skip further validation if empty (and not required)
  if (value === undefined || value === null || value === "") {
    return null;
  }

  // Apply validation rules
  for (const rule of field.validationRules) {
    const error = applyValidationRule(field, rule, value);
    if (error) {
      return error;
    }
  }

  return null;
}

/**
 * Applies a single validation rule and returns error message if failed.
 */
function applyValidationRule(
  field: CanvasField,
  rule: { id: string; ruleId: string; config: Record<string, unknown> },
  value: unknown
): string | null {
  const { ruleId, config } = rule;

  switch (ruleId) {
    case "minLength": {
      const min = config.min as number | undefined;
      if (min !== undefined && typeof value === "string" && value.length < min) {
        return `Must be at least ${min} characters`;
      }
      break;
    }

    case "maxLength": {
      const max = config.max as number | undefined;
      if (max !== undefined && typeof value === "string" && value.length > max) {
        return `Must be at most ${max} characters`;
      }
      break;
    }

    case "pattern": {
      const pattern = config.pattern as string | undefined;
      if (pattern && typeof value === "string") {
        try {
          const regex = new RegExp(pattern);
          if (!regex.test(value)) {
            return config.message as string | undefined ?? "Invalid format";
          }
        } catch {
          // Invalid regex, skip validation
        }
      }
      break;
    }

    case "email": {
      if (typeof value === "string" && value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          return "Please enter a valid email address";
        }
      }
      break;
    }

    case "url": {
      if (typeof value === "string" && value) {
        try {
          const parsed = new URL(value);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return "URL must start with http:// or https://";
          }
        } catch {
          return "Please enter a valid URL";
        }
      }
      break;
    }

    case "min": {
      const min = config.min as number | undefined;
      if (min !== undefined && typeof value === "number" && value < min) {
        return `Must be at least ${min}`;
      }
      break;
    }

    case "max": {
      const max = config.max as number | undefined;
      if (max !== undefined && typeof value === "number" && value > max) {
        return `Must be at most ${max}`;
      }
      break;
    }

    case "minItems": {
      const min = config.min as number | undefined;
      if (min !== undefined && Array.isArray(value) && value.length < min) {
        return `Select at least ${min} items`;
      }
      break;
    }

    case "maxItems": {
      const max = config.max as number | undefined;
      if (max !== undefined && Array.isArray(value) && value.length > max) {
        return `Select at most ${max} items`;
      }
      break;
    }

    case "integer": {
      if (typeof value === "number" && !Number.isInteger(value)) {
        return "Must be a whole number";
      }
      break;
    }

    case "positive": {
      if (typeof value === "number" && value <= 0) {
        return "Must be a positive number";
      }
      break;
    }

    case "negative": {
      if (typeof value === "number" && value >= 0) {
        return "Must be a negative number";
      }
      break;
    }
  }

  return null;
}

/**
 * Validates all fields in the form and returns errors.
 */
export function validateForm(
  fields: CanvasField[],
  values: PreviewFormValues
): PreviewFieldError[] {
  const errors: PreviewFieldError[] = [];

  for (const field of fields) {
    const value = values[field.id];
    const error = validateFieldValue(field, value);
    if (error) {
      errors.push({ fieldId: field.id, message: error });
    }
  }

  return errors;
}

/**
 * Gets the initial value for a field based on its type and default value.
 */
export function getInitialFieldValue(field: CanvasField): unknown {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  switch (field.inputType) {
    case "checkbox":
      return false;
    case "multiselect":
      return [];
    case "number":
      return null;
    case "date":
      return null;
    case "file":
      return null;
    default:
      return "";
  }
}

/**
 * Creates initial form values from canvas fields.
 */
export function createInitialFormValues(fields: CanvasField[]): PreviewFormValues {
  const values: PreviewFormValues = {};
  for (const field of fields) {
    values[field.id] = getInitialFieldValue(field);
  }
  return values;
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface PreviewContextValue {
  /** Current form state being previewed */
  canvasState: CanvasState;
  /** Current form values */
  values: PreviewFormValues;
  /** Validation errors */
  errors: PreviewFieldError[];
  /** Current viewport mode */
  viewportMode: ViewportMode;
  /** Update a field value */
  onValueChange: (event: PreviewValueChangeEvent) => void;
  /** Toggle viewport mode */
  onViewportChange: (mode: ViewportMode) => void;
  /** Validate the form */
  onValidate: () => PreviewValidationEvent;
  /** Reset form values */
  onReset: () => void;
  /** Get error for a specific field */
  getFieldError: (fieldId: string) => string | undefined;
  /** Check if a field has an error */
  hasFieldError: (fieldId: string) => boolean;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

/**
 * Hook to access the Preview context.
 * Must be used within a Preview component.
 */
export function usePreview(): PreviewContextValue {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error("usePreview must be used within a Preview component");
  }
  return context;
}

// -----------------------------------------------------------------------------
// Field Input Components
// -----------------------------------------------------------------------------

interface FieldInputProps {
  field: CanvasField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

function TextFieldInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const stringValue = (value ?? "") as string;
  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = [error ? errorId : null, field.helpText ? helpId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div data-testid={`preview-input-container-${field.id}`}>
      <input
        id={inputId}
        type="text"
        data-testid={`preview-input-${field.id}`}
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
      />
    </div>
  );
}

function TextAreaInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const stringValue = (value ?? "") as string;
  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = [error ? errorId : null, field.helpText ? helpId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div data-testid={`preview-input-container-${field.id}`}>
      <textarea
        id={inputId}
        data-testid={`preview-input-${field.id}`}
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
        disabled={disabled}
        rows={3}
        aria-invalid={!!error}
        aria-describedby={describedBy}
      />
    </div>
  );
}

function NumberFieldInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  // Convert null to empty string for the input value
  const numberValue = value === null || value === undefined ? "" : (value as number);
  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = [error ? errorId : null, field.helpText ? helpId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div data-testid={`preview-input-container-${field.id}`}>
      <input
        id={inputId}
        type="number"
        data-testid={`preview-input-${field.id}`}
        value={numberValue}
        onChange={(e) => {
          const parsed = e.target.value === "" ? null : Number(e.target.value);
          onChange(parsed);
        }}
        placeholder={field.placeholder ?? "Enter a number"}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
      />
    </div>
  );
}

function CheckboxInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const boolValue = (value ?? false) as boolean;
  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = [error ? errorId : null, field.helpText ? helpId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div data-testid={`preview-input-container-${field.id}`}>
      <label htmlFor={inputId} data-testid={`preview-checkbox-label-${field.id}`}>
        <input
          id={inputId}
          type="checkbox"
          data-testid={`preview-input-${field.id}`}
          checked={boolValue}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
        {field.label}
      </label>
    </div>
  );
}

function SelectInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const stringValue = (value ?? "") as string;
  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = [error ? errorId : null, field.helpText ? helpId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div data-testid={`preview-input-container-${field.id}`}>
      <select
        id={inputId}
        data-testid={`preview-input-${field.id}`}
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
      >
        <option value="">{field.placeholder ?? "Select an option"}</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MultiSelectInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const arrayValue = (value ?? []) as string[];
  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = [error ? errorId : null, field.helpText ? helpId : null].filter(Boolean).join(" ") || undefined;

  const handleChange = useCallback(
    (optionValue: string, checked: boolean) => {
      const newValue = checked
        ? [...arrayValue, optionValue]
        : arrayValue.filter((v) => v !== optionValue);
      onChange(newValue);
    },
    [arrayValue, onChange]
  );

  return (
    <div
      data-testid={`preview-input-container-${field.id}`}
      role="group"
      aria-labelledby={`preview-label-${field.id}`}
      aria-invalid={!!error}
      aria-describedby={describedBy}
    >
      {field.options?.map((option) => (
        <label
          key={option.value}
          htmlFor={`${inputId}-${option.value}`}
          data-testid={`preview-option-${field.id}-${option.value}`}
        >
          <input
            id={`${inputId}-${option.value}`}
            type="checkbox"
            data-testid={`preview-input-${field.id}-${option.value}`}
            checked={arrayValue.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={disabled || option.disabled}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function DateInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  // Convert Date to string format for input
  let stringValue = "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    stringValue = value.toISOString().split("T")[0] ?? "";
  } else if (typeof value === "string") {
    stringValue = value;
  }

  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = [error ? errorId : null, field.helpText ? helpId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div data-testid={`preview-input-container-${field.id}`}>
      <input
        id={inputId}
        type="date"
        data-testid={`preview-input-${field.id}`}
        value={stringValue}
        onChange={(e) => {
          const dateValue = e.target.value ? new Date(e.target.value) : null;
          onChange(dateValue);
        }}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
      />
    </div>
  );
}

function FileInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = [error ? errorId : null, field.helpText ? helpId : null].filter(Boolean).join(" ") || undefined;

  // Get file name(s) for display
  let displayText = "No file selected";
  if (value instanceof File) {
    displayText = value.name;
  } else if (Array.isArray(value) && value.length > 0) {
    displayText = `${value.length} file(s) selected`;
  }

  return (
    <div data-testid={`preview-input-container-${field.id}`}>
      <input
        id={inputId}
        type="file"
        data-testid={`preview-input-${field.id}`}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            onChange(files.length === 1 ? files[0] : Array.from(files));
          } else {
            onChange(null);
          }
        }}
        disabled={disabled}
        multiple={(field.config?.multiple ?? false) as boolean}
        aria-invalid={!!error}
        aria-describedby={describedBy}
      />
      <span data-testid={`preview-file-display-${field.id}`}>{displayText}</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// FormPreview Component
// -----------------------------------------------------------------------------

interface FormPreviewFieldProps {
  field: CanvasField;
}

function FormPreviewField({ field }: FormPreviewFieldProps) {
  const { values, onValueChange, getFieldError } = usePreview();

  const value = values[field.id];
  const error = getFieldError(field.id);

  const handleChange = useCallback(
    (newValue: unknown) => {
      onValueChange({ fieldId: field.id, value: newValue });
    },
    [field.id, onValueChange]
  );

  const inputId = `preview-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  const InputComponent = useMemo(() => {
    switch (field.inputType) {
      case "textarea":
        return TextAreaInput;
      case "number":
        return NumberFieldInput;
      case "checkbox":
        return CheckboxInput;
      case "select":
        return SelectInput;
      case "multiselect":
        return MultiSelectInput;
      case "date":
        return DateInput;
      case "file":
        return FileInput;
      default:
        return TextFieldInput;
    }
  }, [field.inputType]);

  // Checkbox has its own label
  const showLabel = field.inputType !== "checkbox";

  return (
    <div data-testid={`preview-field-${field.id}`} data-field-type={field.inputType}>
      {showLabel && (
        <label
          htmlFor={inputId}
          id={`preview-label-${field.id}`}
          data-testid={`preview-label-${field.id}`}
        >
          {field.label}
          {field.required && <span aria-hidden="true"> *</span>}
        </label>
      )}

      <InputComponent
        field={field}
        value={value}
        onChange={handleChange}
        error={error}
      />

      {field.helpText && (
        <p id={helpId} data-testid={`preview-help-${field.id}`}>
          {field.helpText}
        </p>
      )}

      {error && (
        <p id={errorId} data-testid={`preview-error-${field.id}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface FormPreviewProps {
  /** Whether to show form header (title/description) */
  showHeader?: boolean;
  /** Submit button text */
  submitButtonText?: string;
  /** Callback when form is submitted */
  onSubmit?: (values: PreviewFormValues) => void;
  /** Additional class name */
  className?: string;
}

/**
 * FormPreview renders the form as users will see it.
 * This component must be used within a Preview context.
 */
export function FormPreview({
  showHeader = true,
  submitButtonText = "Submit",
  onSubmit,
  className,
}: FormPreviewProps) {
  const { canvasState, values, errors, onValidate } = usePreview();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const result = onValidate();
      if (result.isValid) {
        onSubmit?.(values);
      }
    },
    [onValidate, onSubmit, values]
  );

  const hasErrors = errors.length > 0;

  return (
    <form
      data-testid="form-preview"
      className={className}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Form preview"
    >
      {showHeader && (
        <header data-testid="preview-form-header">
          <h2 data-testid="preview-form-title">{canvasState.title}</h2>
          {canvasState.description && (
            <p data-testid="preview-form-description">{canvasState.description}</p>
          )}
        </header>
      )}

      <div data-testid="preview-form-fields">
        {canvasState.fields.map((field) => (
          <FormPreviewField key={field.id} field={field} />
        ))}
      </div>

      {canvasState.fields.length === 0 && (
        <div data-testid="preview-empty-state" role="status">
          <p>No fields have been added to this form yet.</p>
        </div>
      )}

      {canvasState.fields.length > 0 && (
        <div data-testid="preview-form-actions">
          <button
            type="submit"
            data-testid="preview-submit-button"
            aria-disabled={hasErrors}
          >
            {submitButtonText}
          </button>
        </div>
      )}
    </form>
  );
}

// -----------------------------------------------------------------------------
// Viewport Toggle Component
// -----------------------------------------------------------------------------

interface ViewportToggleProps {
  mode: ViewportMode;
  onChange: (mode: ViewportMode) => void;
}

function ViewportToggle({ mode, onChange }: ViewportToggleProps) {
  return (
    <div data-testid="viewport-toggle" role="group" aria-label="Viewport mode">
      <button
        type="button"
        data-testid="viewport-desktop"
        onClick={() => onChange("desktop")}
        aria-pressed={mode === "desktop"}
        aria-label="Desktop view"
      >
        <DesktopIcon />
        Desktop
      </button>
      <button
        type="button"
        data-testid="viewport-mobile"
        onClick={() => onChange("mobile")}
        aria-pressed={mode === "mobile"}
        aria-label="Mobile view"
      >
        <MobileIcon />
        Mobile
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Icons
// -----------------------------------------------------------------------------

function DesktopIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="1" y="2" width="14" height="9" rx="1" />
      <path d="M5 14h6M8 11v3" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="1" width="10" height="14" rx="2" />
      <path d="M7 12h2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.5-3.75M13.5 2v2.25h-2.5" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="1" y="2" width="14" height="12" rx="1" />
      <path d="M8 2v12" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Preview Component
// -----------------------------------------------------------------------------

/**
 * Mobile viewport width in pixels.
 */
export const MOBILE_VIEWPORT_WIDTH = 375;

/**
 * Desktop viewport width in pixels.
 */
export const DESKTOP_VIEWPORT_WIDTH = 1024;

export interface PreviewProps {
  /** The canvas state to preview */
  canvasState: CanvasState;
  /** Initial form values (optional) */
  initialValues?: PreviewFormValues;
  /** Initial viewport mode (defaults to desktop) */
  initialViewportMode?: ViewportMode;
  /** Whether to validate on change (defaults to false) */
  validateOnChange?: boolean;
  /** Callback when form values change */
  onValuesChange?: (values: PreviewFormValues) => void;
  /** Callback when validation state changes */
  onValidationChange?: (event: PreviewValidationEvent) => void;
  /** Custom content to render in the editor area (left side) */
  editorContent?: ReactNode;
  /** Whether to show split view (defaults to true) */
  showSplitView?: boolean;
  /** Additional class name */
  className?: string;
  /** Children to render (optional header content) */
  children?: ReactNode;
}

/**
 * Preview provides a real-time preview of the form as applicants will see it.
 *
 * Features:
 * - Split view: editor left, preview right
 * - Preview updates as fields are edited
 * - Interactive preview (can type in fields)
 * - Shows validation errors in preview
 * - Mobile preview toggle (simulate mobile viewport)
 */
export function Preview({
  canvasState,
  initialValues,
  initialViewportMode = "desktop",
  validateOnChange = false,
  onValuesChange,
  onValidationChange,
  editorContent,
  showSplitView = true,
  className,
  children,
}: PreviewProps) {
  // Form values state
  const [values, setValues] = useState<PreviewFormValues>(() =>
    initialValues ?? createInitialFormValues(canvasState.fields)
  );

  // Validation errors state
  const [errors, setErrors] = useState<PreviewFieldError[]>([]);

  // Viewport mode state
  const [viewportMode, setViewportMode] = useState<ViewportMode>(initialViewportMode);

  // Sync values when canvas fields change
  useEffect(() => {
    setValues((prev) => {
      const newValues = createInitialFormValues(canvasState.fields);
      // Preserve existing values for fields that still exist
      for (const field of canvasState.fields) {
        if (prev[field.id] !== undefined) {
          newValues[field.id] = prev[field.id];
        }
      }
      return newValues;
    });
  }, [canvasState.fields]);

  // Handle value change
  const handleValueChange = useCallback(
    (event: PreviewValueChangeEvent) => {
      setValues((prev) => {
        const newValues = { ...prev, [event.fieldId]: event.value };
        onValuesChange?.(newValues);
        return newValues;
      });

      // Validate on change if enabled
      if (validateOnChange) {
        setErrors((prev) => {
          const field = canvasState.fields.find((f) => f.id === event.fieldId);
          if (!field) return prev;

          const error = validateFieldValue(field, event.value);
          const filtered = prev.filter((e) => e.fieldId !== event.fieldId);

          if (error) {
            const newErrors = [...filtered, { fieldId: event.fieldId, message: error }];
            onValidationChange?.({ isValid: newErrors.length === 0, errors: newErrors });
            return newErrors;
          }

          onValidationChange?.({ isValid: filtered.length === 0, errors: filtered });
          return filtered;
        });
      }
    },
    [canvasState.fields, validateOnChange, onValuesChange, onValidationChange]
  );

  // Handle viewport change
  const handleViewportChange = useCallback((mode: ViewportMode) => {
    setViewportMode(mode);
  }, []);

  // Validate form
  const handleValidate = useCallback((): PreviewValidationEvent => {
    const validationErrors = validateForm(canvasState.fields, values);
    setErrors(validationErrors);
    const event = {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
    };
    onValidationChange?.(event);
    return event;
  }, [canvasState.fields, values, onValidationChange]);

  // Reset form values
  const handleReset = useCallback(() => {
    const newValues = createInitialFormValues(canvasState.fields);
    setValues(newValues);
    setErrors([]);
    onValuesChange?.(newValues);
    onValidationChange?.({ isValid: true, errors: [] });
  }, [canvasState.fields, onValuesChange, onValidationChange]);

  // Get error for a specific field
  const getFieldError = useCallback(
    (fieldId: string): string | undefined => {
      return errors.find((e) => e.fieldId === fieldId)?.message;
    },
    [errors]
  );

  // Check if a field has an error
  const hasFieldError = useCallback(
    (fieldId: string): boolean => {
      return errors.some((e) => e.fieldId === fieldId);
    },
    [errors]
  );

  // Context value
  const contextValue = useMemo<PreviewContextValue>(
    () => ({
      canvasState,
      values,
      errors,
      viewportMode,
      onValueChange: handleValueChange,
      onViewportChange: handleViewportChange,
      onValidate: handleValidate,
      onReset: handleReset,
      getFieldError,
      hasFieldError,
    }),
    [
      canvasState,
      values,
      errors,
      viewportMode,
      handleValueChange,
      handleViewportChange,
      handleValidate,
      handleReset,
      getFieldError,
      hasFieldError,
    ]
  );

  // Viewport styles
  const previewStyles = useMemo(() => {
    if (viewportMode === "mobile") {
      return {
        maxWidth: `${MOBILE_VIEWPORT_WIDTH}px`,
        margin: "0 auto",
      };
    }
    return {};
  }, [viewportMode]);

  return (
    <PreviewContext.Provider value={contextValue}>
      <div
        data-testid="preview-container"
        data-viewport={viewportMode}
        data-split-view={showSplitView}
        className={className}
        role="region"
        aria-label="Form preview"
      >
        {/* Header with controls */}
        <header data-testid="preview-header">
          {children}
          <div data-testid="preview-controls">
            <ViewportToggle mode={viewportMode} onChange={handleViewportChange} />
            <button
              type="button"
              data-testid="preview-reset-button"
              onClick={handleReset}
              aria-label="Reset form"
            >
              <RefreshIcon />
              Reset
            </button>
          </div>
        </header>

        {/* Main content area */}
        <div data-testid="preview-content">
          {showSplitView && editorContent && (
            <div data-testid="preview-editor-pane" role="region" aria-label="Editor">
              {editorContent}
            </div>
          )}

          <div
            data-testid="preview-preview-pane"
            role="region"
            aria-label="Preview"
            style={previewStyles}
          >
            <FormPreview />
          </div>
        </div>
      </div>
    </PreviewContext.Provider>
  );
}

// Export sub-components for flexibility
Preview.FormPreview = FormPreview;
Preview.ViewportToggle = ViewportToggle;
Preview.DesktopIcon = DesktopIcon;
Preview.MobileIcon = MobileIcon;
Preview.RefreshIcon = RefreshIcon;
Preview.SplitIcon = SplitIcon;
