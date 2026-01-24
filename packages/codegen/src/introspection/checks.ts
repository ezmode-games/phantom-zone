import type { $ZodType } from "zod/v4/core";
import type { FieldConstraints } from "./types";

interface ZodCheckDef {
  check: string;
  minimum?: number;
  maximum?: number;
  value?: number;
  format?: string;
  pattern?: RegExp;
}

interface ZodCheck {
  _zod?: { def?: ZodCheckDef };
  format?: string;
  isInt?: boolean;
}

/**
 * Extracts validation constraints from a Zod schema's checks array.
 * Must be called on unwrapped schema (not optional wrapper).
 *
 * If called on an optional wrapper schema, this function will simply return
 * an empty object, because optional wrappers themselves do not carry checks.
 */
export function extractConstraints(schema: $ZodType): FieldConstraints {
  const def = schema._zod.def as {
    type: string;
    checks?: ZodCheck[];
  };

  const checks = def.checks;
  if (!checks || !Array.isArray(checks)) {
    return {};
  }

  const constraints: FieldConstraints = {};

  for (const check of checks) {
    const checkDef = check._zod?.def;
    if (!checkDef) continue;

    switch (checkDef.check) {
      // String length checks
      case "min_length":
        if (checkDef.minimum !== undefined) {
          constraints.minLength = checkDef.minimum;
        }
        break;

      case "max_length":
        if (checkDef.maximum !== undefined) {
          constraints.maxLength = checkDef.maximum;
        }
        break;

      // String format checks (email, url, uuid, regex, etc.)
      case "string_format":
        if (checkDef.format === "regex" && checkDef.pattern) {
          constraints.pattern = checkDef.pattern.source;
        } else if (checkDef.format === "email") {
          constraints.format = "email";
        } else if (checkDef.format === "url") {
          constraints.format = "url";
        } else if (checkDef.format === "uuid") {
          constraints.format = "uuid";
        } else if (checkDef.format === "cuid") {
          constraints.format = "cuid";
        } else if (checkDef.format === "datetime") {
          constraints.format = "datetime";
        }
        break;

      // Number range checks
      case "greater_than":
        if (checkDef.value !== undefined) {
          constraints.min = checkDef.value;
        }
        break;

      case "less_than":
        if (checkDef.value !== undefined) {
          constraints.max = checkDef.value;
        }
        break;

      // Number format check (int)
      case "number_format":
        if (check.isInt) {
          constraints.isInt = true;
        }
        break;

      // Number multipleOf
      case "multiple_of":
        if (checkDef.value !== undefined) {
          constraints.step = checkDef.value;
        }
        break;
    }
  }

  return constraints;
}
