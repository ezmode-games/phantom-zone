/**
 * Form Designer Components
 *
 * This module provides the visual form designer canvas and related utilities.
 */

// Canvas component and hook
export { FormCanvas, useFormCanvas } from "./FormCanvas";
export type { FormCanvasProps } from "./FormCanvas";

// Types and utilities
export {
  // Schemas for runtime validation
  AppliedValidationRuleSchema,
  FieldOptionSchema,
  CanvasFieldSchema,
  CanvasStateSchema,
  // Factory functions
  createEmptyCanvasState,
  createField,
  generateUUIDv7,
  // State management
  canvasReducer,
} from "./types";

export type {
  AppliedValidationRule,
  FieldOption,
  CanvasField,
  CanvasState,
  CanvasAction,
} from "./types";
