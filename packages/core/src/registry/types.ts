import type { ComponentType } from "react";

/**
 * Standard validation rule identifiers that inputs can declare compatibility with.
 * These map to common Zod validation checks.
 */
export type ValidationRuleId =
  | "required"
  | "minLength"
  | "maxLength"
  | "pattern"
  | "email"
  | "url"
  | "uuid"
  | "min"
  | "max"
  | "step"
  | "integer"
  | "positive"
  | "negative"
  | "minDate"
  | "maxDate"
  | "minItems"
  | "maxItems"
  | "fileSize"
  | "fileType";

/**
 * Input type identifiers used in the registry.
 */
export type InputTypeId =
  | "text"
  | "textarea"
  | "number"
  | "checkbox"
  | "select"
  | "multiselect"
  | "date"
  | "file";

/**
 * Base props that all input components must accept.
 * Generic over the value type T.
 */
export interface BaseInputProps<T = unknown> {
  /** Unique field identifier */
  id: string;

  /** Field name for form submission */
  name: string;

  /** Current field value */
  value: T;

  /** Called when the value changes */
  onChange: (value: T) => void;

  /** Called when the field loses focus */
  onBlur?: () => void;

  /** Whether the field is disabled */
  disabled?: boolean;

  /** Whether the field is read-only */
  readOnly?: boolean;

  /** Placeholder text */
  placeholder?: string;

  /** Accessible label (visually hidden if using FormField wrapper) */
  "aria-label"?: string;

  /** ID of element describing this input */
  "aria-describedby"?: string;

  /** Whether field has an error */
  "aria-invalid"?: boolean;

  /** Error message ID for aria-errormessage */
  "aria-errormessage"?: string;
}

/**
 * Props for text input (single line)
 */
export interface TextInputProps extends BaseInputProps<string> {
  type?: "text" | "email" | "url" | "tel" | "password";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
}

/**
 * Props for textarea (multi-line)
 */
export interface TextAreaProps extends BaseInputProps<string> {
  minLength?: number;
  maxLength?: number;
  rows?: number;
  autoComplete?: string;
}

/**
 * Props for number input
 */
export interface NumberInputProps extends BaseInputProps<number | null> {
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Props for checkbox (boolean)
 */
export interface CheckboxProps extends BaseInputProps<boolean> {
  /** Label displayed next to checkbox */
  label?: string;
}

/**
 * Option for select/multiselect
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Props for single select
 */
export interface SelectProps extends BaseInputProps<string | null> {
  options: SelectOption[];
  /** Allow clearing the selection */
  clearable?: boolean;
  /** Searchable/filterable dropdown */
  searchable?: boolean;
}

/**
 * Props for multi-select
 */
export interface MultiSelectProps extends BaseInputProps<string[]> {
  options: SelectOption[];
  /** Minimum selections required */
  minItems?: number;
  /** Maximum selections allowed */
  maxItems?: number;
  /** Searchable/filterable dropdown */
  searchable?: boolean;
}

/**
 * Props for date picker
 */
export interface DatePickerProps extends BaseInputProps<Date | null> {
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Date format display string */
  format?: string;
}

/**
 * Accepted file specification
 */
export interface AcceptedFile {
  /** MIME type pattern (e.g., "image/*", "application/pdf") */
  mimeType: string;
  /** File extensions (e.g., [".pdf", ".doc"]) */
  extensions?: string[];
}

/**
 * Props for file upload
 */
export interface FileUploadProps extends BaseInputProps<File | File[] | null> {
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Accepted file types */
  accept?: AcceptedFile[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files (when multiple) */
  maxFiles?: number;
}

/**
 * Union of all input prop types for type narrowing
 */
export type InputProps =
  | TextInputProps
  | TextAreaProps
  | NumberInputProps
  | CheckboxProps
  | SelectProps
  | MultiSelectProps
  | DatePickerProps
  | FileUploadProps;

/**
 * All supported input value types
 */
export type InputValue =
  | string
  | number
  | boolean
  | Date
  | File
  | File[]
  | string[]
  | null;

/**
 * Definition for a base input type in the registry.
 * Used by the form designer to show available inputs.
 *
 * Note: The component prop uses a general type to allow storing
 * heterogeneous input definitions in the registry. Type safety
 * for specific input types is maintained through the typed
 * definition exports (e.g., textInputDefinition).
 */
export interface BaseInputDefinition {
  /** Unique identifier for this input type */
  id: InputTypeId;

  /** Human-readable display name */
  name: string;

  /** Icon identifier (e.g., Lucide icon name or custom) */
  icon: string;

  /** The React component that renders this input */
  // biome-ignore lint/suspicious/noExplicitAny: Required for heterogeneous registry storage
  component: ComponentType<any>;

  /** Validation rules this input is compatible with */
  compatibleRules: ValidationRuleId[];

  /** Default props when adding this input to a form */
  defaultProps?: Record<string, unknown>;

  /** Description shown in the input palette */
  description?: string;

  /** Category for grouping in the palette */
  category?: "text" | "choice" | "date" | "file" | "other";
}

/**
 * Typed input definition for creating new input types with full type safety.
 * Use this when defining custom inputs to ensure type correctness.
 *
 * The generic parameter P should be your specific props interface
 * (e.g., TextInputProps, SelectProps).
 */
export interface TypedInputDefinition<P> {
  /** Unique identifier for this input type */
  id: InputTypeId;

  /** Human-readable display name */
  name: string;

  /** Icon identifier (e.g., Lucide icon name or custom) */
  icon: string;

  /** The React component that renders this input */
  component: ComponentType<P>;

  /** Validation rules this input is compatible with */
  compatibleRules: ValidationRuleId[];

  /** Default props when adding this input to a form (excludes base props) */
  defaultProps?: Partial<Omit<P, "id" | "name" | "value" | "onChange">>;

  /** Description shown in the input palette */
  description?: string;

  /** Category for grouping in the palette */
  category?: "text" | "choice" | "date" | "file" | "other";
}

/**
 * The input registry interface for managing registered inputs
 */
export interface InputRegistry {
  /** Register a new input type */
  register(definition: BaseInputDefinition): void;

  /** Get an input definition by ID */
  get(id: InputTypeId): BaseInputDefinition | undefined;

  /** Get all registered inputs */
  getAll(): BaseInputDefinition[];

  /** Get inputs by category */
  getByCategory(
    category: BaseInputDefinition["category"]
  ): BaseInputDefinition[];

  /** Check if an input type is registered */
  has(id: InputTypeId): boolean;

  /** Unregister an input type */
  unregister(id: InputTypeId): boolean;

  /** Clear all registrations */
  clear(): void;
}
