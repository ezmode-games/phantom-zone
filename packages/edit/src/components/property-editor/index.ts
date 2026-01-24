/**
 * Property Editor Module
 *
 * Exports for the block property editor component.
 * Implements PZ-208: Block Property Editor
 */

// Components
export { PropertyEditor } from "./PropertyEditor";
export { FormField } from "./FormField";
export { ActionButtons } from "./ActionButtons";

// Types
export type {
  ActionButtonsProps,
  FieldError,
  FieldMeta,
  FieldType,
  FormFieldProps,
  PropertyEditorProps,
  PropertyEditorState,
  SchemaParseResult,
  SelectOption,
  ValidationResult,
} from "./types";

// State
export {
  $selectedBlock,
  $blockDefinition,
  $fieldMeta,
  $showPropertyEditor,
  $canMoveUp,
  $canMoveDown,
  $validationErrors,
  $hasErrors,
  $propertyEditorState,
  getFieldErrors,
  hasFieldError,
  setErrors,
  clearErrors,
  markTouched,
  resetPropertyEditorState,
} from "./state";

// Schema parsing utilities
export {
  parseSchema,
  validateProps,
  keyToLabel,
} from "./schema-parser";
