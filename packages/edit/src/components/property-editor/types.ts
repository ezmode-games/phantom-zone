/**
 * Property Editor Types
 *
 * Type definitions for the block property editor component.
 * Implements PZ-208: Block Property Editor
 */

import type { z } from "zod/v4";
import type { Block } from "../../model/types";
import type { BaseComponentBlockDefinition } from "../../registry/types";

/**
 * Field types that can be generated from Zod schemas
 */
export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "array"
  | "object"
  | "unknown";

/**
 * Option for select/enum fields
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Schema field metadata extracted from Zod schema
 */
export interface FieldMeta {
  /** Field key/name */
  key: string;
  /** Display label */
  label: string;
  /** Field type for rendering */
  type: FieldType;
  /** Whether the field is required */
  required: boolean;
  /** Whether the field is optional */
  optional: boolean;
  /** Description/help text */
  description?: string;
  /** Default value */
  defaultValue?: unknown;
  /** Options for select fields */
  options?: SelectOption[];
  /** Min value for numbers */
  min?: number;
  /** Max value for numbers */
  max?: number;
  /** Min length for strings/arrays */
  minLength?: number;
  /** Max length for strings/arrays */
  maxLength?: number;
  /** Nested schema for objects */
  nested?: FieldMeta[];
  /** Item schema for arrays */
  itemSchema?: FieldMeta;
}

/**
 * Validation error for a specific field
 */
export interface FieldError {
  /** Field path (e.g., "content" or "items.0.text") */
  path: string;
  /** Error message */
  message: string;
}

/**
 * Property editor props
 */
export interface PropertyEditorProps {
  /** Additional CSS class name */
  className?: string;
  /** Callback when props change */
  onPropsChange?: (blockId: string, props: Record<string, unknown>) => void;
  /** Callback when delete is requested */
  onDelete?: (blockId: string) => void;
  /** Callback when duplicate is requested */
  onDuplicate?: (blockId: string) => void;
  /** Callback when move up is requested */
  onMoveUp?: (blockId: string) => void;
  /** Callback when move down is requested */
  onMoveDown?: (blockId: string) => void;
  /** Whether to show action buttons (default: true) */
  showActions?: boolean;
  /** Whether to enable live updates (default: true) */
  liveUpdate?: boolean;
  /** Debounce delay for live updates in ms (default: 150) */
  debounceDelay?: number;
}

/**
 * Form field props for individual field components
 */
export interface FormFieldProps {
  /** Field metadata */
  field: FieldMeta;
  /** Current value */
  value: unknown;
  /** Change handler */
  onChange: (value: unknown) => void;
  /** Validation errors for this field */
  errors: FieldError[];
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Field path for nested fields */
  path?: string;
}

/**
 * Action buttons props
 */
export interface ActionButtonsProps {
  /** Block ID */
  blockId: string;
  /** Whether block can move up */
  canMoveUp: boolean;
  /** Whether block can move down */
  canMoveDown: boolean;
  /** Delete handler */
  onDelete?: (blockId: string) => void;
  /** Duplicate handler */
  onDuplicate?: (blockId: string) => void;
  /** Move up handler */
  onMoveUp?: (blockId: string) => void;
  /** Move down handler */
  onMoveDown?: (blockId: string) => void;
  /** Whether buttons are disabled */
  disabled?: boolean;
}

/**
 * Schema parser result
 */
export interface SchemaParseResult {
  /** Extracted field metadata */
  fields: FieldMeta[];
  /** Whether parsing was successful */
  success: boolean;
  /** Error message if parsing failed */
  error?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: FieldError[];
}

/**
 * Property editor state
 */
export interface PropertyEditorState {
  /** Current form values */
  values: Record<string, unknown>;
  /** Validation errors */
  errors: FieldError[];
  /** Whether the form has been touched */
  touched: boolean;
  /** Whether the form is submitting */
  submitting: boolean;
}
