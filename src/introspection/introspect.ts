import type { $ZodType } from "zod/v4/core";
import { extractConstraints } from "./checks";
import type {
  FieldDescriptor,
  FieldMetadata,
  FieldType,
  FormDescriptor,
} from "./types";
import { unwrapSchema } from "./unwrap";

export interface IntrospectOptions {
  /** Name for the generated form component */
  formName: string;
  /** Import path for the schema file */
  schemaImportPath: string;
  /** Exported name of the schema */
  schemaExportName: string;
}

interface ZodObjectDef {
  type: string;
  shape: Record<string, $ZodType>;
}

interface ZodEnumDef {
  type: string;
  entries: Record<string, string>;
}

const SUPPORTED_TYPES = [
  "string",
  "number",
  "boolean",
  "date",
  "enum",
] as const;

/**
 * Converts a camelCase or PascalCase field name to a human-readable label.
 * Examples: "firstName" -> "First Name", "email" -> "Email", "isActive" -> "Is Active"
 * Preserves consecutive uppercase letters (acronyms) like "URL", "ID".
 */
function nameToLabel(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert space between lower and upper
    .replace(/^./, (s) => s.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Builds FieldMetadata based on the field type.
 */
function buildMetadata(inner: $ZodType): FieldMetadata {
  const def = inner._zod.def as { type: string };

  if (def.type === "enum") {
    const enumDef = def as ZodEnumDef;
    // Zod 4 stores enum values in entries object: {a: 'a', b: 'b'}
    const values = Object.keys(enumDef.entries);
    return { kind: "enum", values };
  }

  return { kind: def.type as "string" | "number" | "boolean" | "date" };
}

/**
 * Introspects a Zod object schema and returns a FormDescriptor.
 * Only accepts z.object() schemas at the top level.
 */
export function introspect(
  schema: $ZodType,
  options: IntrospectOptions,
): FormDescriptor {
  const def = schema._zod.def as ZodObjectDef;

  if (def.type !== "object") {
    throw new Error(
      "phantom-zone only supports z.object() schemas at the top level",
    );
  }

  const fields: FieldDescriptor[] = [];

  for (const [name, fieldSchema] of Object.entries(def.shape)) {
    const { inner, isOptional } = unwrapSchema(fieldSchema);
    const innerDef = inner._zod.def as { type: string };
    const type = innerDef.type;

    if (!SUPPORTED_TYPES.includes(type as FieldType)) {
      throw new Error(
        `Unsupported field type "${type}" for field "${name}". Supported: ${SUPPORTED_TYPES.join(", ")}`,
      );
    }

    const fieldType = type as FieldType;
    const constraints = extractConstraints(inner);
    const metadata = buildMetadata(inner);

    // Get description from inner schema (describe() is on the unwrapped schema)
    const description = (inner as { description?: string }).description;

    const field: FieldDescriptor = {
      name,
      label: nameToLabel(name),
      type: fieldType,
      isOptional,
      constraints,
      metadata,
    };

    if (description) {
      field.description = description;
    }

    fields.push(field);
  }

  return {
    name: options.formName,
    fields,
    schemaImportPath: options.schemaImportPath,
    schemaExportName: options.schemaExportName,
  };
}
