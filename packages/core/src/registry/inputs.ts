import type {
  BaseInputDefinition,
  CheckboxProps,
  DatePickerProps,
  FileUploadProps,
  InputRegistry,
  InputTypeId,
  MultiSelectProps,
  NumberInputProps,
  SelectProps,
  TextAreaProps,
  TextInputProps,
  TypedInputDefinition,
} from "./types";

/**
 * Creates a new input registry instance.
 * The registry stores input definitions and provides methods to manage them.
 */
export function createInputRegistry(): InputRegistry {
  const registry = new Map<InputTypeId, BaseInputDefinition>();

  return {
    register(definition: BaseInputDefinition): void {
      if (registry.has(definition.id)) {
        throw new Error(
          `Input type "${definition.id}" is already registered. ` +
            "Use unregister() first if you want to replace it."
        );
      }
      registry.set(definition.id, definition);
    },

    get(id: InputTypeId): BaseInputDefinition | undefined {
      return registry.get(id);
    },

    getAll(): BaseInputDefinition[] {
      return Array.from(registry.values());
    },

    getByCategory(
      category: BaseInputDefinition["category"]
    ): BaseInputDefinition[] {
      return Array.from(registry.values()).filter(
        (def) => def.category === category
      );
    },

    has(id: InputTypeId): boolean {
      return registry.has(id);
    },

    unregister(id: InputTypeId): boolean {
      return registry.delete(id);
    },

    clear(): void {
      registry.clear();
    },
  };
}

/**
 * Placeholder component for text input.
 * Users should replace with their own implementation (e.g., shadcn/ui Input).
 */
function PlaceholderTextInput(props: TextInputProps): null {
  void props;
  return null;
}

/**
 * Placeholder component for textarea.
 */
function PlaceholderTextArea(props: TextAreaProps): null {
  void props;
  return null;
}

/**
 * Placeholder component for number input.
 */
function PlaceholderNumberInput(props: NumberInputProps): null {
  void props;
  return null;
}

/**
 * Placeholder component for checkbox.
 */
function PlaceholderCheckbox(props: CheckboxProps): null {
  void props;
  return null;
}

/**
 * Placeholder component for select.
 */
function PlaceholderSelect(props: SelectProps): null {
  void props;
  return null;
}

/**
 * Placeholder component for multi-select.
 */
function PlaceholderMultiSelect(props: MultiSelectProps): null {
  void props;
  return null;
}

/**
 * Placeholder component for date picker.
 */
function PlaceholderDatePicker(props: DatePickerProps): null {
  void props;
  return null;
}

/**
 * Placeholder component for file upload.
 */
function PlaceholderFileUpload(props: FileUploadProps): null {
  void props;
  return null;
}

/**
 * Text Input definition - single line text entry
 */
export const textInputDefinition: TypedInputDefinition<TextInputProps> = {
  id: "text",
  name: "Text Input",
  icon: "type",
  component: PlaceholderTextInput,
  compatibleRules: [
    "required",
    "minLength",
    "maxLength",
    "pattern",
    "email",
    "url",
    "uuid",
  ],
  defaultProps: {
    type: "text",
  },
  description: "Single-line text input for short text entries",
  category: "text",
};

/**
 * Text Area definition - multi-line text entry
 */
export const textAreaDefinition: TypedInputDefinition<TextAreaProps> = {
  id: "textarea",
  name: "Text Area",
  icon: "align-left",
  component: PlaceholderTextArea,
  compatibleRules: ["required", "minLength", "maxLength"],
  defaultProps: {
    rows: 4,
  },
  description: "Multi-line text input for longer content",
  category: "text",
};

/**
 * Number Input definition - numeric entry
 */
export const numberInputDefinition: TypedInputDefinition<NumberInputProps> = {
  id: "number",
  name: "Number Input",
  icon: "hash",
  component: PlaceholderNumberInput,
  compatibleRules: [
    "required",
    "min",
    "max",
    "step",
    "integer",
    "positive",
    "negative",
  ],
  defaultProps: {},
  description: "Numeric input with optional min/max/step constraints",
  category: "text",
};

/**
 * Checkbox definition - boolean toggle
 */
export const checkboxDefinition: TypedInputDefinition<CheckboxProps> = {
  id: "checkbox",
  name: "Checkbox",
  icon: "check-square",
  component: PlaceholderCheckbox,
  compatibleRules: ["required"],
  defaultProps: {},
  description: "Boolean checkbox for true/false values",
  category: "choice",
};

/**
 * Select definition - single choice dropdown
 */
export const selectDefinition: TypedInputDefinition<SelectProps> = {
  id: "select",
  name: "Select",
  icon: "chevron-down",
  component: PlaceholderSelect,
  compatibleRules: ["required"],
  defaultProps: {
    options: [],
    clearable: false,
    searchable: false,
  },
  description: "Dropdown for selecting a single option",
  category: "choice",
};

/**
 * Multi-Select definition - multiple choice
 */
export const multiSelectDefinition: TypedInputDefinition<MultiSelectProps> = {
  id: "multiselect",
  name: "Multi-Select",
  icon: "list-checks",
  component: PlaceholderMultiSelect,
  compatibleRules: ["required", "minItems", "maxItems"],
  defaultProps: {
    options: [],
    searchable: false,
  },
  description: "Select multiple options from a list",
  category: "choice",
};

/**
 * Date Picker definition - date selection
 */
export const datePickerDefinition: TypedInputDefinition<DatePickerProps> = {
  id: "date",
  name: "Date Picker",
  icon: "calendar",
  component: PlaceholderDatePicker,
  compatibleRules: ["required", "minDate", "maxDate"],
  defaultProps: {},
  description: "Calendar picker for date selection",
  category: "date",
};

/**
 * File Upload definition - file selection
 */
export const fileUploadDefinition: TypedInputDefinition<FileUploadProps> = {
  id: "file",
  name: "File Upload",
  icon: "upload",
  component: PlaceholderFileUpload,
  compatibleRules: ["required", "fileSize", "fileType", "maxItems"],
  defaultProps: {
    multiple: false,
  },
  description: "File upload with drag-and-drop support",
  category: "file",
};

/**
 * All default input definitions.
 */
export const defaultInputDefinitions: BaseInputDefinition[] = [
  textInputDefinition,
  textAreaDefinition,
  numberInputDefinition,
  checkboxDefinition,
  selectDefinition,
  multiSelectDefinition,
  datePickerDefinition,
  fileUploadDefinition,
];

/**
 * Creates a registry pre-populated with all default input types.
 */
export function createDefaultInputRegistry(): InputRegistry {
  const registry = createInputRegistry();

  for (const definition of defaultInputDefinitions) {
    registry.register(definition);
  }

  return registry;
}

/**
 * Global default registry instance.
 * Use createInputRegistry() or createDefaultInputRegistry() for isolated instances.
 */
let globalRegistry: InputRegistry | null = null;

/**
 * Gets the global input registry, creating it if necessary.
 * The global registry is pre-populated with default input types.
 */
export function getInputRegistry(): InputRegistry {
  if (!globalRegistry) {
    globalRegistry = createDefaultInputRegistry();
  }
  return globalRegistry;
}

/**
 * Resets the global registry to a fresh default state.
 * Primarily useful for testing.
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}
