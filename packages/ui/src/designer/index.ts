/**
 * Form Designer Components
 *
 * This module provides the visual form designer canvas and related utilities.
 */

// Canvas component and hook
export { FormCanvas, useFormCanvas } from "./FormCanvas";
export type { FormCanvasProps } from "./FormCanvas";

// Palette component and hook (PZ-101)
export { Palette, usePalette, defaultPresets } from "./Palette";
export type {
  PaletteProps,
  PaletteItemData,
  PaletteDropEvent,
  PresetDefinition,
  InputCategory,
  RuleCategory,
} from "./Palette";

// Property Editor component and hook (PZ-102)
export { PropertyEditor, usePropertyEditor } from "./PropertyEditor";
export type {
  PropertyEditorProps,
  FieldPropertyValues,
  FieldPropertyChangeEvent,
  RuleAddEvent,
  RuleRemoveEvent,
  RuleConfigChangeEvent,
  RuleReorderEvent,
} from "./PropertyEditor";

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
