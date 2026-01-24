/**
 * Input Registry
 *
 * Provides a registry of base input types for the form builder.
 * Each input type defines its component, compatible validation rules,
 * and default props.
 */

// Types
export type {
  AcceptedFile,
  BaseInputDefinition,
  BaseInputProps,
  CheckboxProps,
  DatePickerProps,
  FileUploadProps,
  InputProps,
  InputRegistry,
  InputTypeId,
  InputValue,
  MultiSelectProps,
  NumberInputProps,
  SelectOption,
  SelectProps,
  TextAreaProps,
  TextInputProps,
  TypedInputDefinition,
  ValidationRuleId,
} from "./types";

// Registry factory and utilities
export {
  createDefaultInputRegistry,
  createInputRegistry,
  getInputRegistry,
  resetGlobalRegistry,
} from "./inputs";

// Default input definitions (for customization/extension)
export {
  checkboxDefinition,
  datePickerDefinition,
  defaultInputDefinitions,
  fileUploadDefinition,
  multiSelectDefinition,
  numberInputDefinition,
  selectDefinition,
  textAreaDefinition,
  textInputDefinition,
} from "./inputs";
