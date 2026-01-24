/** Supported field types after unwrapping */
export type FieldType = "string" | "number" | "boolean" | "date" | "enum";

/** Validation constraints extracted from Zod checks */
export interface FieldConstraints {
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "email" | "url" | "uuid" | "cuid" | "datetime";

  // Number constraints
  min?: number;
  max?: number;
  step?: number;
  isInt?: boolean;
}

/** Type-specific metadata */
export type FieldMetadata =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "date" }
  | { kind: "enum"; values: readonly string[] };

/** Single field descriptor */
export interface FieldDescriptor {
  /** Original key name from schema shape */
  name: string;

  /** Human-readable label derived from name */
  label: string;

  /** Description from schema.describe() */
  description?: string;

  /** Core type after unwrapping optional/nullable */
  type: FieldType;

  /** Whether wrapped in z.optional() */
  isOptional: boolean;

  /** Validation constraints */
  constraints: FieldConstraints;

  /** Type-specific metadata (e.g., enum values) */
  metadata: FieldMetadata;
}

/** Complete form descriptor */
export interface FormDescriptor {
  /** Form name for the generated component */
  name: string;

  /** All fields in order */
  fields: FieldDescriptor[];

  /** Import path for the schema */
  schemaImportPath: string;

  /** Exported schema name */
  schemaExportName: string;
}
