/**
 * @phantom-zone/core
 *
 * Form runtime components including:
 * - Input registry (PZ-001)
 * - Validation rule registry (PZ-001b)
 * - Layout engine (PZ-003)
 * - Error display (PZ-004)
 * - State persistence (PZ-005)
 * - Accessibility (PZ-006)
 * - Submission handler (PZ-007)
 */

export const VERSION = "0.0.1";

// Placeholder exports - to be implemented in Phase 1
export type InputType = "text" | "number" | "email" | "url" | "date" | "checkbox" | "select" | "radio" | "textarea";

export interface InputRegistryEntry {
  type: InputType;
  component: React.ComponentType<unknown>;
}

// Will be implemented in PZ-001
export function registerInput(_entry: InputRegistryEntry): never {
  throw new Error("Not implemented - see PZ-001: https://github.com/ezmode-games/phantom-zone/issues/26");
}
