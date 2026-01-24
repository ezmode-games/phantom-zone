/**
 * Accessible ID generation utilities for phantom-zone forms.
 *
 * Provides consistent ID generation for linking form elements
 * with their labels, descriptions, and error messages.
 */

import type { CreateAccessibleIdOptions, FieldAccessibilityIds } from "./types";

/** Counter for generating unique IDs when no base is provided */
let idCounter = 0;

/**
 * Generates a unique ID for accessibility purposes.
 * If a base ID is provided, it will be used as the prefix.
 * Otherwise, a unique ID is generated.
 *
 * @param baseId - Optional base ID to use as prefix
 * @param options - Options for ID generation
 * @returns A unique, sanitized ID string
 *
 * @example
 * ```ts
 * // With base ID
 * createAccessibleId("email", { suffix: "error" });
 * // Returns: "email-error"
 *
 * // Without base ID
 * createAccessibleId(undefined, { prefix: "field", suffix: "label" });
 * // Returns: "field-1-label"
 * ```
 */
export function createAccessibleId(
  baseId?: string,
  options: CreateAccessibleIdOptions = {},
): string {
  const { prefix, suffix, separator = "-" } = options;

  // Build parts array
  const parts: string[] = [];

  if (prefix) {
    parts.push(sanitizeIdPart(prefix));
  }

  if (baseId) {
    parts.push(sanitizeIdPart(baseId));
  } else {
    // Generate unique ID
    idCounter += 1;
    parts.push(String(idCounter));
  }

  if (suffix) {
    parts.push(sanitizeIdPart(suffix));
  }

  return parts.join(separator);
}

/**
 * Generates a complete set of accessible IDs for a form field.
 * Use this to ensure consistent ID patterns across your form.
 *
 * @param fieldName - The field name or path (e.g., "email", "address.city")
 * @param prefix - Optional prefix to namespace IDs (e.g., "contact-form")
 * @returns Object containing all accessibility-related IDs
 *
 * @example
 * ```tsx
 * const ids = createFieldAccessibilityIds("email", "signup");
 * // Returns:
 * // {
 * //   inputId: "signup-email",
 * //   labelId: "signup-email-label",
 * //   errorId: "signup-email-error",
 * //   descriptionId: "signup-email-description",
 * //   hintId: "signup-email-hint"
 * // }
 *
 * <label id={ids.labelId} htmlFor={ids.inputId}>Email</label>
 * <input
 *   id={ids.inputId}
 *   aria-describedby={ids.descriptionId}
 *   aria-errormessage={ids.errorId}
 * />
 * <p id={ids.descriptionId}>We will never share your email.</p>
 * <FieldError id={ids.errorId} fieldPath="email" errors={errors} />
 * ```
 */
export function createFieldAccessibilityIds(
  fieldName: string,
  prefix?: string,
): FieldAccessibilityIds {
  const sanitizedName = sanitizeIdPart(fieldName);
  const base = prefix
    ? `${sanitizeIdPart(prefix)}-${sanitizedName}`
    : sanitizedName;

  return {
    inputId: base,
    labelId: `${base}-label`,
    errorId: `${base}-error`,
    descriptionId: `${base}-description`,
    hintId: `${base}-hint`,
  };
}

/**
 * Joins multiple IDs for use in aria-describedby or aria-labelledby.
 * Filters out empty/undefined values.
 *
 * @param ids - Array of IDs to join
 * @returns Space-separated string of IDs, or undefined if empty
 *
 * @example
 * ```ts
 * const describedBy = joinIds([
 *   hasDescription ? ids.descriptionId : undefined,
 *   hasError ? ids.errorId : undefined,
 *   hasHint ? ids.hintId : undefined,
 * ]);
 * // Returns: "field-description field-error" (if description and error exist)
 *
 * <input aria-describedby={describedBy} />
 * ```
 */
export function joinIds(
  ids: Array<string | undefined | null | false>,
): string | undefined {
  const validIds = ids.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );

  return validIds.length > 0 ? validIds.join(" ") : undefined;
}

/**
 * Sanitizes a string for use as part of an HTML ID.
 * Replaces invalid characters and ensures the result is a valid ID.
 *
 * @param value - The string to sanitize
 * @returns A valid ID string
 *
 * @example
 * ```ts
 * sanitizeIdPart("address.city"); // Returns: "address-city"
 * sanitizeIdPart("items[0]"); // Returns: "items-0"
 * sanitizeIdPart("My Field!"); // Returns: "my-field"
 * ```
 */
export function sanitizeIdPart(value: string): string {
  return (
    value
      // Convert to lowercase
      .toLowerCase()
      // Replace dots and brackets (common in form paths) with dashes
      .replace(/\./g, "-")
      .replace(/\[/g, "-")
      .replace(/\]/g, "")
      // Replace spaces and underscores with dashes
      .replace(/[\s_]+/g, "-")
      // Remove any characters that aren't alphanumeric or dashes
      .replace(/[^a-z0-9-]/g, "")
      // Remove leading/trailing dashes
      .replace(/^-+|-+$/g, "")
      // Collapse multiple dashes
      .replace(/-{2,}/g, "-")
  );
}

/**
 * Resets the internal ID counter.
 * Primarily useful for testing to ensure consistent IDs.
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Gets the current ID counter value.
 * Useful for debugging or testing.
 */
export function getIdCounter(): number {
  return idCounter;
}
