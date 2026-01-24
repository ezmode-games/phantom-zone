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

// Export/Import component and utilities (PZ-105)
export {
  ExportImport,
  useExportImport,
  // Export functions
  exportSchema,
  serializeSchema,
  downloadSchema,
  // Import/validation functions
  validateSchema,
  schemaToCanvasState,
  // Version utilities
  compareVersions,
  isVersionSupported,
  // Schemas
  ExportMetadataSchema,
  ExportedFormSchema,
  ExportableSchemaSchema,
  // Constants
  SCHEMA_VERSION,
  MIN_SUPPORTED_VERSION,
} from "./ExportImport";
export type {
  ExportImportProps,
  ExportableSchema,
  ExportMetadata,
  SchemaValidationResult,
  SchemaValidationError,
  SchemaImportEvent,
  SchemaImportErrorEvent,
} from "./ExportImport";

// Form Templates component and utilities (PZ-106)
export {
  TemplateSelector,
  useTemplateSelector,
  // Built-in templates
  generalApplicationTemplate,
  raidRecruitmentTemplate,
  casualJoinTemplate,
  builtInTemplates,
  getBuiltInTemplate,
  getBuiltInTemplatesByCategory,
  // Registry
  createInMemoryStorage,
  createLocalStorage,
  createTemplateRegistry,
  createInMemoryRegistry,
  createLocalStorageRegistry,
  getDefaultRegistry,
  resetDefaultRegistry,
  // Apply functions
  templateFieldToCanvasField,
  applyTemplate,
  canvasStateToTemplate,
  mergeTemplateIntoCanvas,
  validateTemplate,
} from "./templates";
export type {
  TemplateSelectorProps,
  TemplateCategory,
  TemplateMetadata,
  FormTemplate,
  TemplateField,
  TemplateSelectEvent,
  TemplateSaveEvent,
  TemplateDeleteEvent,
  TemplateApplyResult,
  TemplateStorage,
  TemplateRegistry,
} from "./templates";

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
