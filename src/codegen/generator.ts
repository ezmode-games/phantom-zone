import type { $ZodType } from "zod/v4/core";
import { introspect } from "../introspection";
import type { ComponentConfig } from "../mapping";
import { resolveField } from "../mapping";
import { generateFormFile } from "./templates";

export interface GenerateOptions {
  /** The Zod schema to generate from */
  schema: $ZodType;

  /** Name for the form component */
  formName: string;

  /** Import path for the schema */
  schemaImportPath: string;

  /** Exported name of the schema */
  schemaExportName: string;

  /** UI component import path */
  uiImportPath?: string;
}

export interface GenerateResult {
  /** The generated form component code */
  code: string;

  /** List of fields that were processed */
  fields: string[];

  /** Any warnings (e.g., unsupported features skipped) */
  warnings: string[];
}

/**
 * Generates a form component from a Zod schema.
 */
export function generate(options: GenerateOptions): GenerateResult {
  const {
    schema,
    formName,
    schemaImportPath,
    schemaExportName,
    uiImportPath = "@/components/ui",
  } = options;

  const warnings: string[] = [];
  const processedFields: string[] = [];
  const fieldConfigs = new Map<string, ComponentConfig>();

  // 1. Introspect schema -> FormDescriptor
  const formDescriptor = introspect(schema, {
    formName,
    schemaImportPath,
    schemaExportName,
  });

  // 2. For each field, resolve -> ComponentConfig
  for (const field of formDescriptor.fields) {
    try {
      const config = resolveField(field);
      fieldConfigs.set(field.name, config);
      processedFields.push(field.name);
    } catch (error) {
      // Add warning and skip field
      const message = error instanceof Error ? error.message : "Unknown error";
      warnings.push(`Field "${field.name}": ${message}`);
    }
  }

  // 3. Generate form wrapper with all fields
  const code = generateFormFile({
    form: formDescriptor,
    fieldConfigs,
    uiImportPath,
  });

  return {
    code,
    fields: processedFields,
    warnings,
  };
}
