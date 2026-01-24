/**
 * Form Templates Types (PZ-106)
 *
 * Type definitions for the form templates system.
 */

import type { z } from "zod";
import type { CanvasField, CanvasState } from "../types";

/**
 * Template category for grouping templates.
 */
export type TemplateCategory = "guild" | "recruitment" | "social" | "custom";

/**
 * Metadata for a form template.
 */
export interface TemplateMetadata {
  /** Unique identifier for this template */
  id: string;
  /** Display name shown in the selector */
  name: string;
  /** Description of what this template is for */
  description: string;
  /** Template category for grouping */
  category: TemplateCategory;
  /** Icon identifier (e.g., Lucide icon name) */
  icon: string;
  /** Whether this is a built-in template (cannot be deleted) */
  isBuiltIn: boolean;
  /** When the template was created (ISO date string) */
  createdAt: string;
  /** When the template was last updated (ISO date string) */
  updatedAt: string;
}

/**
 * A complete form template including metadata and fields.
 */
export interface FormTemplate {
  /** Template metadata */
  metadata: TemplateMetadata;
  /** Form title to use when applying template */
  title: string;
  /** Form description to use when applying template */
  description?: string;
  /** Template fields (without IDs - they will be generated on apply) */
  fields: TemplateField[];
}

/**
 * A field definition within a template.
 * Similar to CanvasField but without the id (generated on apply).
 */
export interface TemplateField {
  /** The input type from the registry */
  inputType: string;
  /** Field label displayed to users */
  label: string;
  /** Optional field name (defaults to auto-generated from label) */
  name?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text shown below the field */
  helpText?: string;
  /** Whether the field is required */
  required: boolean;
  /** Options for select/multiselect fields */
  options?: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  /** Default value */
  defaultValue?: unknown;
  /** Additional field-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * Event emitted when a template is selected.
 */
export interface TemplateSelectEvent {
  /** The selected template */
  template: FormTemplate;
}

/**
 * Event emitted when a custom template is saved.
 */
export interface TemplateSaveEvent {
  /** The template metadata (id auto-generated if new) */
  metadata: Omit<TemplateMetadata, "id" | "createdAt" | "updatedAt" | "isBuiltIn">;
  /** Current canvas state to save as template */
  canvasState: CanvasState;
}

/**
 * Event emitted when a custom template is deleted.
 */
export interface TemplateDeleteEvent {
  /** The template ID to delete */
  templateId: string;
}

/**
 * Result of applying a template to the canvas.
 */
export interface TemplateApplyResult {
  /** The generated canvas state */
  canvasState: CanvasState;
  /** Number of fields created */
  fieldCount: number;
}

/**
 * Storage interface for custom templates.
 */
export interface TemplateStorage {
  /** Get all custom templates */
  getAll(): Promise<FormTemplate[]>;
  /** Save a custom template (creates or updates) */
  save(template: FormTemplate): Promise<void>;
  /** Delete a custom template */
  delete(templateId: string): Promise<boolean>;
  /** Clear all custom templates */
  clear(): Promise<void>;
}

/**
 * Template registry for managing built-in and custom templates.
 */
export interface TemplateRegistry {
  /** Get all built-in templates */
  getBuiltIn(): FormTemplate[];
  /** Get all custom templates */
  getCustom(): Promise<FormTemplate[]>;
  /** Get all templates (built-in + custom) */
  getAll(): Promise<FormTemplate[]>;
  /** Get a template by ID */
  get(templateId: string): Promise<FormTemplate | undefined>;
  /** Get templates by category */
  getByCategory(category: TemplateCategory): Promise<FormTemplate[]>;
  /** Save a custom template */
  saveCustom(template: Omit<FormTemplate, "metadata"> & { metadata: Omit<TemplateMetadata, "id" | "createdAt" | "updatedAt" | "isBuiltIn"> }): Promise<FormTemplate>;
  /** Delete a custom template */
  deleteCustom(templateId: string): Promise<boolean>;
}
