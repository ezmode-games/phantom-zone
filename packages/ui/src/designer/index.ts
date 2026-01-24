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

// Conditional Logic component and hook (PZ-103)
export {
  ConditionalLogic,
  useConditionalLogic,
  ConditionRow,
  ConditionGroupComponent,
  VisibilityIndicator,
  // Utilities
  getCompatibleOperators,
  uiConditionToVisibility,
  uiGroupToVisibilityRules,
  visibilityRulesToUIGroup,
  createEmptyCondition,
  createEmptyConditionGroup,
  // Constants
  OPERATOR_LABELS,
  VALUE_FREE_OPERATORS,
} from "./ConditionalLogic";
export type {
  ConditionalLogicProps,
  UICondition,
  UIConditionGroup,
  VisibilityRulesChangeEvent,
  ConditionAddEvent,
  ConditionRemoveEvent,
  ConditionUpdateEvent,
  GroupOperatorChangeEvent,
  ConditionRowProps,
  ConditionGroupComponentProps,
  VisibilityIndicatorProps,
} from "./ConditionalLogic";

// Form Settings component and hook (PZ-104)
export {
  FormSettings,
  useFormSettings,
  // Factory functions
  createDefaultFormSettings,
  // Validation utilities
  validateEmail,
  validateUrl,
  validateFormSettings,
} from "./FormSettings";
export type {
  FormSettingsProps,
  FormSettingsData,
  FormSettingsChangeEvent,
  FormSettingsValidationError,
  FormStatus,
} from "./FormSettings";

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
