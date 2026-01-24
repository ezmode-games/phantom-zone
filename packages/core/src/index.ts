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

// Input Registry (PZ-001)
export {
  // Registry factory and utilities
  createDefaultInputRegistry,
  createInputRegistry,
  getInputRegistry,
  resetGlobalRegistry,
  // Default input definitions
  checkboxDefinition,
  datePickerDefinition,
  defaultInputDefinitions,
  fileUploadDefinition,
  multiSelectDefinition,
  numberInputDefinition,
  selectDefinition,
  textAreaDefinition,
  textInputDefinition,
} from "./registry";

// Validation Rule Registry (PZ-001b)
export {
  // Registry factory and utilities
  createValidationRuleRegistry,
  createDefaultValidationRuleRegistry,
  getValidationRuleRegistry,
  resetGlobalRuleRegistry,
  applyValidationRules,
  // Default rule definitions - Constraint rules
  defaultValidationRuleDefinitions,
  requiredRuleDefinition,
  minItemsRuleDefinition,
  maxItemsRuleDefinition,
  positiveRuleDefinition,
  negativeRuleDefinition,
  fileSizeRuleDefinition,
  fileTypeRuleDefinition,
  // Format rules
  patternRuleDefinition,
  emailRuleDefinition,
  urlRuleDefinition,
  uuidRuleDefinition,
  integerRuleDefinition,
  // Range rules
  minLengthRuleDefinition,
  maxLengthRuleDefinition,
  minRuleDefinition,
  maxRuleDefinition,
  stepRuleDefinition,
  minDateRuleDefinition,
  maxDateRuleDefinition,
} from "./registry";

export type {
  // Core types
  AcceptedFile,
  BaseInputDefinition,
  BaseInputProps,
  InputProps,
  InputRegistry,
  InputTypeId,
  InputValue,
  SelectOption,
  TypedInputDefinition,
  ValidationRuleId,
  // Input-specific prop types
  CheckboxProps,
  DatePickerProps,
  FileUploadProps,
  MultiSelectProps,
  NumberInputProps,
  SelectProps,
  TextAreaProps,
  TextInputProps,
  // Validation rule types
  AppliedRule,
  RuleConfigProps,
  RuleConfigComponentRef,
  ValidationRuleCategory,
  ValidationRuleDefinition,
  ValidationRuleRegistry,
  ZodSchemaTransformer,
} from "./registry";

// Validation Error Display (PZ-004)
export {
  // Error message transformers
  tooSmallTransformer,
  tooBigTransformer,
  invalidTypeTransformer,
  invalidStringTransformer,
  invalidEnumTransformer,
  invalidLiteralTransformer,
  customTransformer,
  invalidUnionTransformer,
  invalidDateTransformer,
  notMultipleOfTransformer,
  notFiniteTransformer,
  invalidIntersectionTransformer,
  unrecognizedKeysTransformer,
  defaultMessageTransformers,
  transformErrorMessage,
  getFieldLabel,
  // Error utilities
  createEmptyValidationErrors,
  createValidationErrors,
  createFieldError,
  parseZodError,
  zodIssueToFieldError,
  pathToString,
  mergeValidationErrors,
  addErrorToValidation,
  clearFieldFromValidation,
} from "./validation";

// Validation Error Components (PZ-004)
export {
  FieldError,
  ErrorSummary,
  useValidationErrors,
  getFieldErrorProps,
} from "./components/ValidationErrors";

export type {
  // Validation error types
  FieldValidationError,
  ValidationErrors,
  FieldErrorProps,
  ErrorSummaryProps,
  ParseErrorsOptions,
  ErrorMessageTransformer,
  ZodIssueInfo,
  ValidationErrorsState,
  ScrollToErrorOptions,
} from "./validation";

export type { UseValidationErrorsOptions } from "./components/ValidationErrors";

// Layout Engine (PZ-003)
export {
  // Layout computation
  computeLayout,
  evaluateCondition,
  evaluateVisibilityRules,
  // Layout utilities
  createDefaultLayout,
  createTwoColumnLayout,
  createFieldGroup,
  mergeLayouts,
  getVisibleFieldIds,
  isFieldVisible,
  // Zod schemas
  LayoutTypeSchema,
  FieldWidthSchema,
  ComparisonOperatorSchema,
  VisibilityConditionSchema,
  LogicalOperatorSchema,
  ConditionGroupSchema,
  VisibilityRulesSchema,
  FieldLayoutSchema,
  FieldGroupSchema,
  FormLayoutSchema,
} from "./layout";

export type {
  // Layout types
  LayoutType,
  FieldWidth,
  ComparisonOperator,
  VisibilityCondition,
  LogicalOperator,
  ConditionGroup,
  VisibilityRules,
  FieldLayout,
  FieldGroup,
  FormLayout,
  // Computed layout types
  ComputedFieldLayout,
  ComputedFieldGroup,
  ComputedFormLayout,
  FormValues,
  ComputeLayoutOptions,
} from "./layout";

// State Persistence (PZ-005)
export {
  // Persistence factory
  createFormPersistence,
  createMemoryStorageAdapter,
  // Schemas
  PersistenceConfigSchema,
  StoredFormStateSchema,
  createPersistenceError,
  // React hooks
  useFormPersistence,
  useFormPersistenceHandler,
  useHasPersistedData,
} from "./persistence";

export type {
  // Persistence types
  ClearResult,
  CreateFormPersistenceOptions,
  FormPersistence,
  PersistenceConfig,
  PersistenceConfigInput,
  PersistenceError,
  PersistenceErrorCode,
  R2BackupFunction,
  RestoreResult,
  SaveResult,
  StorageAdapter,
  StoredFormState,
  UseFormPersistenceOptions,
  UseFormPersistenceReturn,
} from "./persistence";

// Form Submission Handler (PZ-007)
export {
  useFormSubmit,
  // Factory functions for creating submission results
  createSubmissionError,
  createSuccessResult,
  createErrorResult,
  createValidationErrorResult,
} from "./hooks";

export type {
  // Submission types
  SubmissionStatus,
  SubmissionErrorCode,
  SubmissionError,
  SubmissionResult,
  SubmitFunction,
  RetryConfig,
  UseFormSubmitOptions,
  UseFormSubmitReturn,
} from "./hooks";

// Accessibility Utilities (PZ-006)
export {
  // ID generation utilities
  createAccessibleId,
  createFieldAccessibilityIds,
  joinIds,
  sanitizeIdPart,
  resetIdCounter,
  getIdCounter,
  // Focus management utilities
  FOCUSABLE_SELECTOR,
  TABBABLE_SELECTOR,
  isFocusable,
  isVisible,
  getFocusableElements,
  getFirstFocusableElement,
  getLastFocusableElement,
  focusElement,
  focusFirstInvalidElement,
  focusById,
  focusByName,
  saveFocus,
  restoreFocus,
  createFocusTrap,
  // Keyboard navigation utilities
  Keys,
  isActivationKey,
  isArrowKey,
  isEscapeKey,
  getNavigationDirection,
  calculateNextIndex,
  createListKeyHandler,
  createRovingTabindexState,
  getRovingTabindex,
  matchesShortcut,
  preventDefaultForKeys,
  // Live region announcements
  announce,
  announceAssertive,
  announcePolite,
  clearAnnouncements,
  cleanupLiveRegions,
  FormAnnouncements,
  // Color contrast utilities
  ContrastThresholds,
  parseHexColor,
  calculateLuminance,
  calculateContrastRatio,
  checkContrast,
  formatContrastRatio,
  getMinimumContrast,
  suggestTextColor,
  // Screen reader-only styles
  SCREEN_READER_ONLY_STYLES,
} from "./accessibility";

export type {
  // Accessibility types
  AccessibleInputProps,
  AnnounceOptions,
  AriaErrorProps,
  AriaExpandedProps,
  AriaFormRole,
  AriaInteractiveProps,
  AriaLabelProps,
  AriaLive,
  AriaSelectedProps,
  ContrastResult,
  CreateAccessibleIdOptions,
  FieldAccessibilityIds,
  FocusOptions as A11yFocusOptions,
  KeyboardNavigationOptions,
  KeyName,
  RovingTabindexState,
  ScreenReaderOnlyStyles,
} from "./accessibility";
