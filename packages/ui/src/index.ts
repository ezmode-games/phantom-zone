/**
 * @phantom-zone/ui
 *
 * Form designer UI components including:
 * - Designer canvas (PZ-100)
 * - Input & rule palette (PZ-101)
 * - Field property editor (PZ-102)
 * - Rule composition engine (PZ-102b)
 * - Conditional logic builder (PZ-103)
 * - Form settings panel (PZ-104)
 * - Schema export/import (PZ-105)
 * - Form templates (PZ-106)
 * - Live preview (PZ-107)
 * - Schema versioning UI (PZ-108)
 * - Response compatibility check (PZ-109)
 * - Undo/redo (PZ-110)
 */

export const VERSION = "0.0.1";

// Designer Canvas (PZ-100)
export {
  // Canvas component and hook
  FormCanvas,
  useFormCanvas,
  // Factory functions
  createEmptyCanvasState,
  createField,
  generateUUIDv7,
  // State management
  canvasReducer,
  // Schemas for runtime validation
  AppliedValidationRuleSchema,
  FieldOptionSchema,
  CanvasFieldSchema,
  CanvasStateSchema,
} from "./designer";

export type {
  FormCanvasProps,
  AppliedValidationRule,
  FieldOption,
  CanvasField,
  CanvasState,
  CanvasAction,
} from "./designer";

// Placeholder - full designer to be completed in Phase 2
export function FormDesigner(): never {
  throw new Error("Not implemented - see PZ-100: https://github.com/ezmode-games/phantom-zone/issues/34");
}
