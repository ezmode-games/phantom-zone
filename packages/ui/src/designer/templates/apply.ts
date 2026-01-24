/**
 * Template Application (PZ-106)
 *
 * Functions for applying templates to create canvas state.
 */

import { generateUUIDv7, type CanvasField, type CanvasState } from "../types";
import type { FormTemplate, TemplateApplyResult, TemplateField } from "./types";

/**
 * Converts a template field to a canvas field.
 * Generates a new UUIDv7 for the field.
 */
export function templateFieldToCanvasField(templateField: TemplateField): CanvasField {
  return {
    id: generateUUIDv7(),
    inputType: templateField.inputType,
    label: templateField.label,
    name: templateField.name,
    placeholder: templateField.placeholder,
    helpText: templateField.helpText,
    required: templateField.required,
    validationRules: [],
    options: templateField.options,
    defaultValue: templateField.defaultValue,
    config: templateField.config,
  };
}

/**
 * Applies a template to create a new canvas state.
 * All field IDs are freshly generated.
 */
export function applyTemplate(template: FormTemplate): TemplateApplyResult {
  const fields = template.fields.map(templateFieldToCanvasField);

  const canvasState: CanvasState = {
    id: generateUUIDv7(),
    title: template.title,
    description: template.description,
    fields,
    selectedFieldId: null,
    isPreviewMode: false,
  };

  return {
    canvasState,
    fieldCount: fields.length,
  };
}

/**
 * Converts a canvas state to a form template.
 * Used when saving a custom template from the current form.
 */
export function canvasStateToTemplate(
  canvasState: CanvasState,
  metadata: {
    name: string;
    description: string;
    category: FormTemplate["metadata"]["category"];
    icon: string;
  }
): Omit<FormTemplate, "metadata"> & {
  metadata: Omit<FormTemplate["metadata"], "id" | "createdAt" | "updatedAt" | "isBuiltIn">;
} {
  const fields: TemplateField[] = canvasState.fields.map((field) => ({
    inputType: field.inputType,
    label: field.label,
    name: field.name,
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
    options: field.options,
    defaultValue: field.defaultValue,
    config: field.config,
  }));

  return {
    metadata: {
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      icon: metadata.icon,
    },
    title: canvasState.title,
    description: canvasState.description,
    fields,
  };
}

/**
 * Merges a template into an existing canvas state.
 * Appends template fields after existing fields.
 */
export function mergeTemplateIntoCanvas(
  canvasState: CanvasState,
  template: FormTemplate
): CanvasState {
  const newFields = template.fields.map(templateFieldToCanvasField);

  return {
    ...canvasState,
    fields: [...canvasState.fields, ...newFields],
  };
}

/**
 * Validates that a template has the minimum required structure.
 */
export function validateTemplate(template: unknown): template is FormTemplate {
  if (!template || typeof template !== "object") {
    return false;
  }

  const t = template as Record<string, unknown>;

  // Check metadata
  if (!t.metadata || typeof t.metadata !== "object") {
    return false;
  }

  const metadata = t.metadata as Record<string, unknown>;
  if (
    typeof metadata.id !== "string" ||
    typeof metadata.name !== "string" ||
    typeof metadata.description !== "string" ||
    typeof metadata.category !== "string" ||
    typeof metadata.icon !== "string" ||
    typeof metadata.isBuiltIn !== "boolean"
  ) {
    return false;
  }

  // Check title
  if (typeof t.title !== "string") {
    return false;
  }

  // Check fields
  if (!Array.isArray(t.fields)) {
    return false;
  }

  // Validate each field has minimum structure
  for (const field of t.fields) {
    if (!field || typeof field !== "object") {
      return false;
    }
    const f = field as Record<string, unknown>;
    if (
      typeof f.inputType !== "string" ||
      typeof f.label !== "string" ||
      typeof f.required !== "boolean"
    ) {
      return false;
    }
  }

  return true;
}
