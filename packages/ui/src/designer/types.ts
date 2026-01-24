import { z } from "zod";
import type { InputTypeId, ValidationRuleId } from "@phantom-zone/core";

/**
 * Generates a UUIDv7 (time-sortable UUID).
 * Based on the UUIDv7 specification (RFC 9562).
 */
export function generateUUIDv7(): string {
  const timestamp = Date.now();

  // Get random bytes for the rest
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  // Construct UUIDv7:
  // - 48 bits of timestamp (milliseconds since Unix epoch)
  // - 4 bits version (7)
  // - 12 bits random
  // - 2 bits variant (10)
  // - 62 bits random

  // Timestamp high 32 bits
  const timestampHigh = Math.floor(timestamp / 0x10000);
  // Timestamp low 16 bits
  const timestampLow = timestamp & 0xffff;

  // Build the UUID hex string
  const hex = [
    timestampHigh.toString(16).padStart(8, "0"),
    timestampLow.toString(16).padStart(4, "0"),
    // Version 7 + random
    ((0x7 << 12) | ((randomBytes[0] as number) << 4) | ((randomBytes[1] as number) >> 4)).toString(16).padStart(4, "0"),
    // Variant 10 + random
    ((0x2 << 14) | (((randomBytes[1] as number) & 0x0f) << 10) | ((randomBytes[2] as number) << 2) | ((randomBytes[3] as number) >> 6)).toString(16).padStart(4, "0"),
    // Remaining random bytes
    Array.from(randomBytes.slice(4))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  ];

  return `${hex[0]}-${hex[1]}-${hex[2]}-${hex[3]}-${hex[4]}`;
}

/**
 * Configuration for a validation rule applied to a field.
 */
export const AppliedValidationRuleSchema = z.object({
  /** Unique ID for this applied rule instance */
  id: z.string(),
  /** The validation rule type */
  ruleId: z.string(),
  /** Rule-specific configuration */
  config: z.record(z.string(), z.any()),
});

export type AppliedValidationRule = z.infer<typeof AppliedValidationRuleSchema>;

/**
 * Option for select/multiselect fields.
 */
export const FieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
});

export type FieldOption = z.infer<typeof FieldOptionSchema>;

/**
 * A field definition in the canvas state.
 * This represents a form field with its configuration.
 */
export const CanvasFieldSchema = z.object({
  /** Unique identifier (UUIDv7) */
  id: z.string(),
  /** The input type from the registry */
  inputType: z.string(),
  /** Field label displayed to users */
  label: z.string(),
  /** Optional field name (defaults to auto-generated from label) */
  name: z.string().optional(),
  /** Placeholder text */
  placeholder: z.string().optional(),
  /** Help text shown below the field */
  helpText: z.string().optional(),
  /** Whether the field is required */
  required: z.boolean().default(false),
  /** Applied validation rules */
  validationRules: z.array(AppliedValidationRuleSchema).default([]),
  /** Options for select/multiselect fields */
  options: z.array(FieldOptionSchema).optional(),
  /** Default value */
  defaultValue: z.any().optional(),
  /** Additional field-specific configuration */
  config: z.record(z.string(), z.any()).optional(),
});

export type CanvasField = z.infer<typeof CanvasFieldSchema>;

/**
 * The complete canvas state representing the form being designed.
 */
export const CanvasStateSchema = z.object({
  /** Form identifier */
  id: z.string(),
  /** Form title */
  title: z.string().default("Untitled Form"),
  /** Form description */
  description: z.string().optional(),
  /** Ordered list of fields */
  fields: z.array(CanvasFieldSchema).default([]),
  /** Currently selected field ID */
  selectedFieldId: z.string().nullable().default(null),
  /** Whether preview mode is active */
  isPreviewMode: z.boolean().default(false),
});

export type CanvasState = z.infer<typeof CanvasStateSchema>;

/**
 * Actions that can be performed on the canvas.
 */
export type CanvasAction =
  | { type: "ADD_FIELD"; field: CanvasField; index?: number }
  | { type: "REMOVE_FIELD"; fieldId: string }
  | { type: "UPDATE_FIELD"; fieldId: string; updates: Partial<Omit<CanvasField, "id">> }
  | { type: "REORDER_FIELDS"; fromIndex: number; toIndex: number }
  | { type: "SELECT_FIELD"; fieldId: string | null }
  | { type: "TOGGLE_PREVIEW" }
  | { type: "SET_FORM_TITLE"; title: string }
  | { type: "SET_FORM_DESCRIPTION"; description: string }
  | { type: "RESET"; state?: CanvasState };

/**
 * Creates a new empty canvas state.
 */
export function createEmptyCanvasState(): CanvasState {
  return {
    id: generateUUIDv7(),
    title: "Untitled Form",
    description: undefined,
    fields: [],
    selectedFieldId: null,
    isPreviewMode: false,
  };
}

/**
 * Creates a new field with the specified input type.
 */
export function createField(
  inputType: InputTypeId,
  label: string,
  overrides?: Partial<Omit<CanvasField, "id" | "inputType">>
): CanvasField {
  return {
    id: generateUUIDv7(),
    inputType,
    label,
    name: undefined,
    placeholder: undefined,
    helpText: undefined,
    required: false,
    validationRules: [],
    options: undefined,
    defaultValue: undefined,
    config: undefined,
    ...overrides,
  };
}

/**
 * Reducer function for canvas state management.
 */
export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "ADD_FIELD": {
      const newFields = [...state.fields];
      const insertIndex = action.index ?? newFields.length;
      newFields.splice(insertIndex, 0, action.field);
      return {
        ...state,
        fields: newFields,
        selectedFieldId: action.field.id,
      };
    }

    case "REMOVE_FIELD": {
      const newFields = state.fields.filter((f) => f.id !== action.fieldId);
      const wasSelected = state.selectedFieldId === action.fieldId;
      return {
        ...state,
        fields: newFields,
        selectedFieldId: wasSelected ? null : state.selectedFieldId,
      };
    }

    case "UPDATE_FIELD": {
      const newFields = state.fields.map((f) =>
        f.id === action.fieldId ? { ...f, ...action.updates } : f
      );
      return {
        ...state,
        fields: newFields,
      };
    }

    case "REORDER_FIELDS": {
      const newFields = [...state.fields];
      const [removed] = newFields.splice(action.fromIndex, 1);
      if (removed) {
        newFields.splice(action.toIndex, 0, removed);
      }
      return {
        ...state,
        fields: newFields,
      };
    }

    case "SELECT_FIELD": {
      return {
        ...state,
        selectedFieldId: action.fieldId,
      };
    }

    case "TOGGLE_PREVIEW": {
      return {
        ...state,
        isPreviewMode: !state.isPreviewMode,
        // Deselect field when entering preview mode
        selectedFieldId: state.isPreviewMode ? state.selectedFieldId : null,
      };
    }

    case "SET_FORM_TITLE": {
      return {
        ...state,
        title: action.title,
      };
    }

    case "SET_FORM_DESCRIPTION": {
      return {
        ...state,
        description: action.description,
      };
    }

    case "RESET": {
      return action.state ?? createEmptyCanvasState();
    }

    default: {
      // Exhaustive check
      const _exhaustive: never = action;
      return state;
    }
  }
}
