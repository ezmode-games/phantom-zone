/**
 * Zod Schema Parser
 *
 * Extracts field metadata from Zod schemas for form generation.
 * Implements PZ-208: Block Property Editor
 */

import { z } from "zod/v4";
import type { FieldMeta, FieldType, SchemaParseResult, SelectOption } from "./types";

/**
 * Convert a key to a display label
 * e.g., "showLineNumbers" -> "Show Line Numbers"
 */
export function keyToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Get the innermost type from optional/nullable/default wrappers
 */
function unwrapSchema(schema: z.ZodType): { inner: z.ZodType; optional: boolean; defaultValue?: unknown } {
  // Use 'unknown' for current to allow reassignment from internal types
  let current: unknown = schema;
  let optional = false;
  let defaultValue: unknown;

  // Unwrap ZodOptional (Zod v4 uses .unwrap() method)
  if (current instanceof z.ZodOptional) {
    optional = true;
    current = current.unwrap();
  }

  // Unwrap ZodNullable (Zod v4 uses .unwrap() method)
  if (current instanceof z.ZodNullable) {
    optional = true;
    current = current.unwrap();
  }

  // Unwrap ZodDefault (Zod v4 uses _def.defaultValue)
  if (current instanceof z.ZodDefault) {
    defaultValue = current._def.defaultValue;
    current = current.unwrap();
  }

  // Handle nested optional after default
  if (current instanceof z.ZodOptional) {
    optional = true;
    current = current.unwrap();
  }

  return { inner: current as z.ZodType, optional, defaultValue };
}

/**
 * Determine the field type from a Zod schema
 */
function getFieldType(schema: z.ZodType): FieldType {
  const { inner } = unwrapSchema(schema);

  if (inner instanceof z.ZodString) return "text";
  if (inner instanceof z.ZodNumber) return "number";
  if (inner instanceof z.ZodBoolean) return "boolean";
  if (inner instanceof z.ZodEnum) return "select";
  if (inner instanceof z.ZodLiteral) return "select";
  if (inner instanceof z.ZodUnion) {
    // Check if all members are literals (enum-like) - Zod v4 uses .options directly
    const options = inner.options;
    if (options.every((opt) => opt instanceof z.ZodLiteral)) {
      return "select";
    }
    return "unknown";
  }
  if (inner instanceof z.ZodArray) return "array";
  if (inner instanceof z.ZodObject) return "object";
  if (inner instanceof z.ZodRecord) return "object";

  return "unknown";
}

/**
 * Extract options from enum/union schemas
 */
function getSelectOptions(schema: z.ZodType): SelectOption[] | undefined {
  const { inner } = unwrapSchema(schema);

  if (inner instanceof z.ZodEnum) {
    // Zod v4 uses .options (array) directly
    const values = inner.options as string[];
    return values.map((value) => ({
      value,
      label: keyToLabel(value),
    }));
  }

  if (inner instanceof z.ZodUnion) {
    // Zod v4 uses .options directly
    const options = inner.options;
    if (options.every((opt) => opt instanceof z.ZodLiteral)) {
      return options.map((opt) => {
        // Access the value property directly (we know it's a ZodLiteral from the every check)
        const value = (opt as { value: unknown }).value;
        return {
          value: String(value),
          label: keyToLabel(String(value)),
        };
      });
    }
  }

  if (inner instanceof z.ZodLiteral) {
    // Zod v4 uses .value directly
    const value = inner.value;
    return [{ value: String(value), label: keyToLabel(String(value)) }];
  }

  return undefined;
}

/**
 * Extract number constraints
 */
function getNumberConstraints(schema: z.ZodType): { min?: number; max?: number } {
  const { inner } = unwrapSchema(schema);

  if (!(inner instanceof z.ZodNumber)) {
    return {};
  }

  const constraints: { min?: number; max?: number } = {};

  // Zod v4 exposes minValue/maxValue directly
  if (inner.minValue !== null) {
    constraints.min = inner.minValue;
  }
  if (inner.maxValue !== null) {
    constraints.max = inner.maxValue;
  }

  return constraints;
}

/**
 * Extract string constraints
 */
function getStringConstraints(schema: z.ZodType): { minLength?: number; maxLength?: number } {
  const { inner } = unwrapSchema(schema);

  if (!(inner instanceof z.ZodString)) {
    return {};
  }

  const constraints: { minLength?: number; maxLength?: number } = {};

  // Zod v4 exposes minLength/maxLength directly
  if (inner.minLength !== null) {
    constraints.minLength = inner.minLength;
  }
  if (inner.maxLength !== null) {
    constraints.maxLength = inner.maxLength;
  }

  return constraints;
}

/**
 * Parse a single field from a Zod schema
 */
function parseField(key: string, schema: z.ZodType): FieldMeta {
  const { inner, optional, defaultValue } = unwrapSchema(schema);
  const type = getFieldType(schema);

  const field: FieldMeta = {
    key,
    label: keyToLabel(key),
    type,
    required: !optional,
    optional,
    defaultValue,
  };

  // Add select options
  if (type === "select") {
    field.options = getSelectOptions(schema);
  }

  // Add number constraints
  if (type === "number") {
    const { min, max } = getNumberConstraints(schema);
    if (min !== undefined) field.min = min;
    if (max !== undefined) field.max = max;
  }

  // Add string constraints
  if (type === "text") {
    const { minLength, maxLength } = getStringConstraints(schema);
    if (minLength !== undefined) field.minLength = minLength;
    if (maxLength !== undefined) field.maxLength = maxLength;
  }

  // Handle nested objects - Zod v4 uses .shape directly
  if (type === "object" && inner instanceof z.ZodObject) {
    const shape = inner.shape;
    if (shape && typeof shape === "object") {
      field.nested = Object.entries(shape).map(([nestedKey, nestedSchema]) =>
        parseField(nestedKey, nestedSchema as z.ZodType)
      );
    }
  }

  // Handle arrays - Zod v4 uses .element directly
  if (type === "array" && inner instanceof z.ZodArray) {
    const elementType = inner.element;
    if (elementType) {
      field.itemSchema = parseField("item", elementType as z.ZodType);
    }
  }

  return field;
}

/**
 * Parse a Zod object schema into field metadata
 */
export function parseSchema(schema: z.ZodType): SchemaParseResult {
  try {
    const { inner } = unwrapSchema(schema);

    if (!(inner instanceof z.ZodObject)) {
      return {
        fields: [],
        success: false,
        error: "Schema must be a ZodObject",
      };
    }

    // Zod v4 uses .shape directly
    const shape = inner.shape;
    if (!shape) {
      return {
        fields: [],
        success: false,
        error: "Schema has no shape defined",
      };
    }

    const fields: FieldMeta[] = Object.entries(shape).map(([key, fieldSchema]) =>
      parseField(key, fieldSchema as z.ZodType)
    );

    // Filter out base block props that shouldn't be edited directly
    const filteredFields = fields.filter(
      (field) => !["className", "style", "dataAttributes"].includes(field.key)
    );

    return {
      fields: filteredFields,
      success: true,
    };
  } catch (error) {
    return {
      fields: [],
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse schema",
    };
  }
}

/**
 * Validate props against a schema and return field errors
 */
export function validateProps(
  schema: z.ZodType,
  props: Record<string, unknown>
): { valid: boolean; errors: Array<{ path: string; message: string }> } {
  const result = schema.safeParse(props);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return { valid: false, errors };
}
