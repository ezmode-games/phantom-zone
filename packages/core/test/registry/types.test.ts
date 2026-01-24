import { describe, expect, it } from "vitest";
import type {
  BaseInputDefinition,
  BaseInputProps,
  CheckboxProps,
  DatePickerProps,
  FileUploadProps,
  InputProps,
  InputRegistry,
  InputTypeId,
  MultiSelectProps,
  NumberInputProps,
  SelectOption,
  SelectProps,
  TextAreaProps,
  TextInputProps,
  ValidationRuleId,
} from "../../src/registry";

describe("Registry Types", () => {
  describe("InputTypeId", () => {
    it("supports all required input types", () => {
      const types: InputTypeId[] = [
        "text",
        "textarea",
        "number",
        "checkbox",
        "select",
        "multiselect",
        "date",
        "file",
      ];
      expect(types).toHaveLength(8);
    });
  });

  describe("ValidationRuleId", () => {
    it("supports common validation rules", () => {
      const rules: ValidationRuleId[] = [
        "required",
        "minLength",
        "maxLength",
        "pattern",
        "email",
        "url",
        "uuid",
        "min",
        "max",
        "step",
        "integer",
        "positive",
        "negative",
        "minDate",
        "maxDate",
        "minItems",
        "maxItems",
        "fileSize",
        "fileType",
      ];
      expect(rules).toHaveLength(19);
    });
  });

  describe("BaseInputProps", () => {
    it("accepts minimal required props", () => {
      const props: BaseInputProps = {
        id: "field-1",
        name: "username",
        value: "test",
        onChange: () => {},
      };
      expect(props.id).toBe("field-1");
      expect(props.name).toBe("username");
    });

    it("accepts all optional props", () => {
      const props: BaseInputProps = {
        id: "field-1",
        name: "username",
        value: "test",
        onChange: () => {},
        onBlur: () => {},
        disabled: true,
        readOnly: true,
        placeholder: "Enter username",
        "aria-label": "Username field",
        "aria-describedby": "username-help",
        "aria-invalid": true,
        "aria-errormessage": "username-error",
      };
      expect(props.disabled).toBe(true);
      expect(props["aria-invalid"]).toBe(true);
    });
  });

  describe("TextInputProps", () => {
    it("accepts text input specific props", () => {
      const props: TextInputProps = {
        id: "email-field",
        name: "email",
        value: "user@example.com",
        onChange: () => {},
        type: "email",
        minLength: 5,
        maxLength: 100,
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        autoComplete: "email",
      };
      expect(props.type).toBe("email");
      expect(props.pattern).toBeDefined();
    });

    it("restricts type to valid HTML input types", () => {
      const types: TextInputProps["type"][] = [
        "text",
        "email",
        "url",
        "tel",
        "password",
      ];
      expect(types).toHaveLength(5);
    });
  });

  describe("TextAreaProps", () => {
    it("accepts textarea specific props", () => {
      const props: TextAreaProps = {
        id: "bio-field",
        name: "bio",
        value: "My biography",
        onChange: () => {},
        minLength: 10,
        maxLength: 1000,
        rows: 6,
      };
      expect(props.rows).toBe(6);
    });
  });

  describe("NumberInputProps", () => {
    it("accepts number input specific props", () => {
      const props: NumberInputProps = {
        id: "age-field",
        name: "age",
        value: 25,
        onChange: () => {},
        min: 0,
        max: 150,
        step: 1,
      };
      expect(props.min).toBe(0);
      expect(props.max).toBe(150);
    });

    it("accepts null value for empty state", () => {
      const props: NumberInputProps = {
        id: "optional-number",
        name: "count",
        value: null,
        onChange: () => {},
      };
      expect(props.value).toBeNull();
    });
  });

  describe("CheckboxProps", () => {
    it("accepts checkbox specific props", () => {
      const props: CheckboxProps = {
        id: "terms-field",
        name: "acceptTerms",
        value: true,
        onChange: () => {},
        label: "I accept the terms and conditions",
      };
      expect(props.label).toBeDefined();
      expect(props.value).toBe(true);
    });
  });

  describe("SelectOption", () => {
    it("accepts basic option", () => {
      const option: SelectOption = {
        value: "admin",
        label: "Administrator",
      };
      expect(option.value).toBe("admin");
    });

    it("accepts disabled option", () => {
      const option: SelectOption = {
        value: "deprecated",
        label: "Deprecated Role",
        disabled: true,
      };
      expect(option.disabled).toBe(true);
    });
  });

  describe("SelectProps", () => {
    it("accepts select specific props", () => {
      const props: SelectProps = {
        id: "role-field",
        name: "role",
        value: "user",
        onChange: () => {},
        options: [
          { value: "admin", label: "Admin" },
          { value: "user", label: "User" },
        ],
        clearable: true,
        searchable: true,
      };
      expect(props.options).toHaveLength(2);
      expect(props.clearable).toBe(true);
    });

    it("accepts null value for unselected state", () => {
      const props: SelectProps = {
        id: "unselected",
        name: "choice",
        value: null,
        onChange: () => {},
        options: [],
      };
      expect(props.value).toBeNull();
    });
  });

  describe("MultiSelectProps", () => {
    it("accepts multi-select specific props", () => {
      const props: MultiSelectProps = {
        id: "tags-field",
        name: "tags",
        value: ["react", "typescript"],
        onChange: () => {},
        options: [
          { value: "react", label: "React" },
          { value: "typescript", label: "TypeScript" },
          { value: "node", label: "Node.js" },
        ],
        minItems: 1,
        maxItems: 5,
        searchable: true,
      };
      expect(props.value).toHaveLength(2);
      expect(props.minItems).toBe(1);
    });
  });

  describe("DatePickerProps", () => {
    it("accepts date picker specific props", () => {
      const props: DatePickerProps = {
        id: "dob-field",
        name: "dateOfBirth",
        value: new Date("1990-01-15"),
        onChange: () => {},
        minDate: new Date("1900-01-01"),
        maxDate: new Date(),
        format: "yyyy-MM-dd",
      };
      expect(props.format).toBe("yyyy-MM-dd");
    });

    it("accepts null value for empty state", () => {
      const props: DatePickerProps = {
        id: "optional-date",
        name: "expiry",
        value: null,
        onChange: () => {},
      };
      expect(props.value).toBeNull();
    });
  });

  describe("FileUploadProps", () => {
    it("accepts file upload specific props", () => {
      const props: FileUploadProps = {
        id: "avatar-field",
        name: "avatar",
        value: null,
        onChange: () => {},
        multiple: false,
        accept: [
          { mimeType: "image/*", extensions: [".jpg", ".png", ".gif"] },
        ],
        maxSize: 5 * 1024 * 1024, // 5MB
      };
      expect(props.maxSize).toBe(5 * 1024 * 1024);
    });

    it("accepts multiple files config", () => {
      const props: FileUploadProps = {
        id: "documents-field",
        name: "documents",
        value: null,
        onChange: () => {},
        multiple: true,
        maxFiles: 10,
        accept: [{ mimeType: "application/pdf" }],
      };
      expect(props.multiple).toBe(true);
      expect(props.maxFiles).toBe(10);
    });
  });

  describe("InputProps union", () => {
    it("allows discriminating between input types", () => {
      const textProps: InputProps = {
        id: "text",
        name: "text",
        value: "hello",
        onChange: () => {},
        type: "text",
      } satisfies TextInputProps;

      const numberProps: InputProps = {
        id: "number",
        name: "number",
        value: 42,
        onChange: () => {},
        min: 0,
      } satisfies NumberInputProps;

      expect(textProps).toBeDefined();
      expect(numberProps).toBeDefined();
    });
  });

  describe("BaseInputDefinition", () => {
    it("accepts complete definition", () => {
      const mockComponent = () => null;
      const definition: BaseInputDefinition = {
        id: "text",
        name: "Text Input",
        icon: "type",
        component: mockComponent,
        compatibleRules: ["required", "minLength", "maxLength"],
        defaultProps: { type: "text" },
        description: "A text input field",
        category: "text",
      };
      expect(definition.id).toBe("text");
      expect(definition.compatibleRules).toContain("required");
    });

    it("accepts minimal definition without optional fields", () => {
      const definition: BaseInputDefinition = {
        id: "text",
        name: "Text Input",
        icon: "type",
        component: () => null,
        compatibleRules: [],
      };
      expect(definition.defaultProps).toBeUndefined();
      expect(definition.description).toBeUndefined();
    });

    it("supports all category values", () => {
      const categories: BaseInputDefinition["category"][] = [
        "text",
        "choice",
        "date",
        "file",
        "other",
        undefined,
      ];
      expect(categories).toHaveLength(6);
    });
  });

  describe("InputRegistry interface", () => {
    it("defines all required methods", () => {
      const mockRegistry: InputRegistry = {
        register: () => {},
        get: () => undefined,
        getAll: () => [],
        getByCategory: () => [],
        has: () => false,
        unregister: () => false,
        clear: () => {},
      };
      expect(mockRegistry.register).toBeDefined();
      expect(mockRegistry.get).toBeDefined();
      expect(mockRegistry.getAll).toBeDefined();
      expect(mockRegistry.getByCategory).toBeDefined();
      expect(mockRegistry.has).toBeDefined();
      expect(mockRegistry.unregister).toBeDefined();
      expect(mockRegistry.clear).toBeDefined();
    });
  });
});
