import { describe, expect, it } from "vitest";
import {
  generateFormFile,
  inferTypeName,
} from "../../src/codegen/templates/form-wrapper";
import type { FieldDescriptor, FormDescriptor } from "../../src/introspection";
import type { ComponentConfig } from "../../src/mapping";

function createField(
  overrides: Partial<FieldDescriptor> = {},
): FieldDescriptor {
  return {
    name: "testField",
    label: "Test Field",
    type: "string",
    isOptional: false,
    constraints: {},
    metadata: { kind: "string" },
    ...overrides,
  };
}

function createConfig(
  overrides: Partial<ComponentConfig> = {},
): ComponentConfig {
  return {
    component: "Input",
    componentProps: { type: "text" },
    fieldProps: {
      label: "Test Field",
      required: true,
    },
    ...overrides,
  };
}

function createForm(overrides: Partial<FormDescriptor> = {}): FormDescriptor {
  return {
    name: "TestForm",
    fields: [],
    schemaImportPath: "./schema",
    schemaExportName: "testSchema",
    ...overrides,
  };
}

describe("inferTypeName", () => {
  it("removes Schema suffix and capitalizes", () => {
    expect(inferTypeName("userSchema")).toBe("User");
  });

  it("handles capital S in Schema", () => {
    expect(inferTypeName("profileSchema")).toBe("Profile");
  });

  it("handles already capitalized names", () => {
    expect(inferTypeName("UserSchema")).toBe("User");
  });

  it("handles lowercase schema suffix", () => {
    expect(inferTypeName("testschema")).toBe("Test");
  });

  it("handles name without schema suffix", () => {
    expect(inferTypeName("config")).toBe("Config");
  });
});

describe("generateFormFile", () => {
  describe("file structure", () => {
    it("starts with 'use client' directive", () => {
      const form = createForm();
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output.startsWith("'use client';")).toBe(true);
    });

    it("exports the form component", () => {
      const form = createForm({ name: "UserForm" });
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("export function UserForm(");
    });

    it("includes submit button", () => {
      const form = createForm();
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain('<button type="submit">Submit</button>');
    });
  });

  describe("imports", () => {
    it("imports useForm from @tanstack/react-form", () => {
      const form = createForm();
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain(
        "import { useForm } from '@tanstack/react-form';",
      );
    });

    it("imports schema and type from schema path", () => {
      const form = createForm({
        schemaImportPath: "./user-schema",
        schemaExportName: "userSchema",
      });
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain(
        "import { userSchema, type User } from './user-schema';",
      );
    });

    it("imports Field from UI library", () => {
      const form = createForm();
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("Field,");
      expect(output).toContain("} from '@rafters/ui';");
    });

    it("imports only used components", () => {
      const form = createForm({
        fields: [createField({ name: "email" })],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        ["email", createConfig({ component: "Input" })],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("Input,");
      expect(output).not.toContain("Textarea,");
      expect(output).not.toContain("Select,");
    });

    it("includes Label when RadioGroup is used", () => {
      const form = createForm({
        fields: [createField({ name: "role" })],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        ["role", createConfig({ component: "RadioGroup" })],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("RadioGroup,");
      expect(output).toContain("Label,");
    });

    it("uses custom UI import path", () => {
      const form = createForm();
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@/components/ui",
      });

      expect(output).toContain("} from '@/components/ui';");
    });
  });

  describe("props interface", () => {
    it("generates props interface with correct name", () => {
      const form = createForm({ name: "ProfileForm" });
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("interface ProfileFormProps {");
    });

    it("includes defaultValues with Partial type", () => {
      const form = createForm({
        name: "UserForm",
        schemaExportName: "userSchema",
      });
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("defaultValues?: Partial<User>;");
    });

    it("includes onSubmit with correct type", () => {
      const form = createForm({
        name: "UserForm",
        schemaExportName: "userSchema",
      });
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain(
        "onSubmit: (data: User) => void | Promise<void>;",
      );
    });
  });

  describe("default values", () => {
    it("uses empty string for string fields", () => {
      const form = createForm({
        fields: [createField({ name: "name", type: "string" })],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        ["name", createConfig()],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain('name: "",');
    });

    it("uses 0 for number fields", () => {
      const form = createForm({
        fields: [
          createField({
            name: "age",
            type: "number",
            metadata: { kind: "number" },
          }),
        ],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        ["age", createConfig({ component: "Input", componentProps: {} })],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("age: 0,");
    });

    it("uses min value for slider fields", () => {
      const form = createForm({
        fields: [
          createField({
            name: "priority",
            type: "number",
            metadata: { kind: "number" },
          }),
        ],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        [
          "priority",
          createConfig({
            component: "Slider",
            componentProps: { min: 1, max: 10 },
          }),
        ],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("priority: 1,");
    });

    it("uses false for boolean fields", () => {
      const form = createForm({
        fields: [
          createField({
            name: "active",
            type: "boolean",
            metadata: { kind: "boolean" },
          }),
        ],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        ["active", createConfig({ component: "Checkbox" })],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("active: false,");
    });

    it("uses undefined for date fields", () => {
      const form = createForm({
        fields: [
          createField({
            name: "birthDate",
            type: "date",
            metadata: { kind: "date" },
          }),
        ],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        ["birthDate", createConfig({ component: "DatePicker" })],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("birthDate: undefined,");
    });

    it("uses first enum value for enum fields", () => {
      const form = createForm({
        fields: [
          createField({
            name: "role",
            type: "enum",
            metadata: { kind: "enum", values: ["admin", "user", "guest"] },
          }),
        ],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        ["role", createConfig({ component: "Select" })],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain('role: "admin",');
    });
  });

  describe("form setup", () => {
    it("uses schema as validator", () => {
      const form = createForm({ schemaExportName: "userSchema" });
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("onSubmit: userSchema,");
    });

    it("calls onSubmit with form value", () => {
      const form = createForm();
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("await onSubmit(value);");
    });

    it("prevents default form submission", () => {
      const form = createForm();
      const fieldConfigs = new Map<string, ComponentConfig>();

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain("e.preventDefault();");
      expect(output).toContain("e.stopPropagation();");
    });
  });

  describe("field generation", () => {
    it("generates JSX for each field", () => {
      const form = createForm({
        fields: [
          createField({ name: "firstName", label: "First Name" }),
          createField({ name: "email", label: "Email" }),
        ],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        [
          "firstName",
          createConfig({ fieldProps: { label: "First Name", required: true } }),
        ],
        [
          "email",
          createConfig({ fieldProps: { label: "Email", required: true } }),
        ],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain('name="firstName"');
      expect(output).toContain('name="email"');
      expect(output).toContain('label="First Name"');
      expect(output).toContain('label="Email"');
    });

    it("skips fields without config", () => {
      const form = createForm({
        fields: [
          createField({ name: "name" }),
          createField({ name: "unknown" }),
        ],
      });
      const fieldConfigs = new Map<string, ComponentConfig>([
        ["name", createConfig()],
        // 'unknown' has no config
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      expect(output).toContain('name="name"');
      expect(output).not.toContain('name="unknown"');
    });
  });

  describe("full output", () => {
    it("generates complete valid form component", () => {
      const form = createForm({
        name: "UserForm",
        schemaImportPath: "./schema",
        schemaExportName: "userSchema",
        fields: [
          createField({ name: "email", label: "Email", type: "string" }),
          createField({
            name: "role",
            label: "Role",
            type: "enum",
            metadata: { kind: "enum", values: ["admin", "user"] },
          }),
          createField({
            name: "active",
            label: "Active",
            type: "boolean",
            metadata: { kind: "boolean" },
          }),
        ],
      });

      const fieldConfigs = new Map<string, ComponentConfig>([
        [
          "email",
          {
            component: "Input",
            componentProps: { type: "email" },
            fieldProps: { label: "Email", required: true },
          },
        ],
        [
          "role",
          {
            component: "RadioGroup",
            componentProps: { options: ["admin", "user"] },
            fieldProps: { label: "Role", required: true },
          },
        ],
        [
          "active",
          {
            component: "Checkbox",
            componentProps: {},
            fieldProps: { label: "Active", required: false },
          },
        ],
      ]);

      const output = generateFormFile({
        form,
        fieldConfigs,
        uiImportPath: "@rafters/ui",
      });

      // Verify structure
      expect(output).toContain("'use client';");
      expect(output).toContain(
        "import { useForm } from '@tanstack/react-form';",
      );
      expect(output).toContain(
        "import { userSchema, type User } from './schema';",
      );
      expect(output).toContain("interface UserFormProps {");
      expect(output).toContain("export function UserForm(");
      expect(output).toContain('email: "",');
      expect(output).toContain('role: "admin",');
      expect(output).toContain("active: false,");
      expect(output).toContain('<button type="submit">Submit</button>');
    });
  });
});
