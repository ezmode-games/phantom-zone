import type { $ZodType } from "zod/v4/core";

export interface UnwrapResult {
  /** The innermost non-wrapper schema */
  inner: $ZodType;
  /** Whether z.optional() was present */
  isOptional: boolean;
}

/** Type guard to check if schema has unwrap method */
function hasUnwrap(
  schema: unknown,
): schema is { unwrap: () => $ZodType } & $ZodType {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "unwrap" in schema &&
    typeof (schema as Record<string, unknown>).unwrap === "function"
  );
}

/** Validates that the schema is a Zod 4 schema with required properties */
function isValidZod4Schema(schema: unknown): schema is $ZodType {
  if (!schema || typeof schema !== "object") {
    return false;
  }

  const s = schema as Record<string, unknown>;
  if (!("_zod" in s) || !s._zod || typeof s._zod !== "object") {
    return false;
  }

  const zod = s._zod as Record<string, unknown>;
  if (!("def" in zod) || !zod.def || typeof zod.def !== "object") {
    return false;
  }

  const def = zod.def as Record<string, unknown>;
  return "type" in def;
}

/**
 * Unwraps optional wrapper from a Zod schema.
 * Handles: z.optional(), z.string().optional()
 */
export function unwrapSchema(schema: $ZodType): UnwrapResult {
  // Validate that this is a Zod 4 schema
  if (!isValidZod4Schema(schema)) {
    throw new Error("Schema is not a valid Zod 4 schema");
  }

  let current = schema;
  let isOptional = false;

  // Unwrap nested optionals
  while (current._zod.def.type === "optional") {
    isOptional = true;
    // Verify unwrap method exists before calling
    if (!hasUnwrap(current)) {
      throw new Error("Optional schema missing unwrap method");
    }
    current = current.unwrap();
  }

  return {
    inner: current,
    isOptional,
  };
}
