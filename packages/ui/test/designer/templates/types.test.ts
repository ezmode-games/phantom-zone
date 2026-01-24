/**
 * Template Types Tests (PZ-106)
 *
 * Tests for template type definitions and interfaces.
 */

import { describe, expect, it } from "vitest";
import type {
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
} from "../../../src/designer/templates";

describe("Template Types", () => {
  describe("TemplateCategory", () => {
    it("accepts valid category values", () => {
      const categories: TemplateCategory[] = ["guild", "recruitment", "social", "custom"];

      for (const category of categories) {
        expect(category).toBeTruthy();
      }
    });
  });

  describe("TemplateMetadata", () => {
    it("has correct structure", () => {
      const metadata: TemplateMetadata = {
        id: "test-template",
        name: "Test Template",
        description: "A test template for testing",
        category: "guild",
        icon: "file-text",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      };

      expect(metadata.id).toBe("test-template");
      expect(metadata.name).toBe("Test Template");
      expect(metadata.description).toBe("A test template for testing");
      expect(metadata.category).toBe("guild");
      expect(metadata.icon).toBe("file-text");
      expect(metadata.isBuiltIn).toBe(false);
      expect(metadata.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(metadata.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("supports all category values", () => {
      const categories: TemplateCategory[] = ["guild", "recruitment", "social", "custom"];

      for (const category of categories) {
        const metadata: TemplateMetadata = {
          id: `test-${category}`,
          name: `Test ${category}`,
          description: "Description",
          category,
          icon: "file",
          isBuiltIn: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        };

        expect(metadata.category).toBe(category);
      }
    });
  });

  describe("TemplateField", () => {
    it("has correct minimal structure", () => {
      const field: TemplateField = {
        inputType: "text",
        label: "Name",
        required: true,
      };

      expect(field.inputType).toBe("text");
      expect(field.label).toBe("Name");
      expect(field.required).toBe(true);
    });

    it("supports all optional properties", () => {
      const field: TemplateField = {
        inputType: "select",
        label: "Class",
        name: "characterClass",
        placeholder: "Select your class",
        helpText: "Choose your character class",
        required: true,
        options: [
          { value: "warrior", label: "Warrior" },
          { value: "mage", label: "Mage" },
        ],
        defaultValue: "warrior",
        config: { searchable: true },
      };

      expect(field.name).toBe("characterClass");
      expect(field.placeholder).toBe("Select your class");
      expect(field.helpText).toBe("Choose your character class");
      expect(field.options).toHaveLength(2);
      expect(field.defaultValue).toBe("warrior");
      expect(field.config).toEqual({ searchable: true });
    });

    it("supports different input types", () => {
      const inputTypes = ["text", "textarea", "number", "checkbox", "select", "multiselect", "date", "file"];

      for (const inputType of inputTypes) {
        const field: TemplateField = {
          inputType,
          label: `Test ${inputType}`,
          required: false,
        };

        expect(field.inputType).toBe(inputType);
      }
    });
  });

  describe("FormTemplate", () => {
    it("has correct structure", () => {
      const template: FormTemplate = {
        metadata: {
          id: "test-template",
          name: "Test Template",
          description: "A test template",
          category: "guild",
          icon: "file-text",
          isBuiltIn: false,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        title: "Test Form",
        description: "A test form description",
        fields: [
          { inputType: "text", label: "Name", required: true },
          { inputType: "textarea", label: "Bio", required: false },
        ],
      };

      expect(template.metadata.id).toBe("test-template");
      expect(template.title).toBe("Test Form");
      expect(template.description).toBe("A test form description");
      expect(template.fields).toHaveLength(2);
    });

    it("supports optional description", () => {
      const template: FormTemplate = {
        metadata: {
          id: "test",
          name: "Test",
          description: "Test description",
          category: "guild",
          icon: "file",
          isBuiltIn: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        title: "Test Form",
        fields: [],
      };

      expect(template.description).toBeUndefined();
    });

    it("supports empty fields array", () => {
      const template: FormTemplate = {
        metadata: {
          id: "empty",
          name: "Empty Template",
          description: "No fields",
          category: "custom",
          icon: "file",
          isBuiltIn: false,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        title: "Empty Form",
        fields: [],
      };

      expect(template.fields).toHaveLength(0);
    });
  });

  describe("TemplateSelectEvent", () => {
    it("has correct structure", () => {
      const template: FormTemplate = {
        metadata: {
          id: "test",
          name: "Test",
          description: "Test",
          category: "guild",
          icon: "file",
          isBuiltIn: true,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        title: "Test",
        fields: [],
      };

      const event: TemplateSelectEvent = {
        template,
      };

      expect(event.template).toBe(template);
    });
  });

  describe("TemplateDeleteEvent", () => {
    it("has correct structure", () => {
      const event: TemplateDeleteEvent = {
        templateId: "template-123",
      };

      expect(event.templateId).toBe("template-123");
    });
  });

  describe("TemplateApplyResult", () => {
    it("has correct structure", () => {
      const result: TemplateApplyResult = {
        canvasState: {
          id: "canvas-123",
          title: "Test Form",
          description: "A test form",
          fields: [],
          selectedFieldId: null,
          isPreviewMode: false,
        },
        fieldCount: 5,
      };

      expect(result.canvasState.id).toBe("canvas-123");
      expect(result.fieldCount).toBe(5);
    });
  });
});

describe("Interface Contract Tests", () => {
  it("TemplateStorage interface has required methods", () => {
    // This tests that the interface is correctly defined
    const mockStorage: TemplateStorage = {
      getAll: async () => [],
      save: async () => {},
      delete: async () => true,
      clear: async () => {},
    };

    expect(typeof mockStorage.getAll).toBe("function");
    expect(typeof mockStorage.save).toBe("function");
    expect(typeof mockStorage.delete).toBe("function");
    expect(typeof mockStorage.clear).toBe("function");
  });

  it("TemplateRegistry interface has required methods", () => {
    const mockRegistry: TemplateRegistry = {
      getBuiltIn: () => [],
      getCustom: async () => [],
      getAll: async () => [],
      get: async () => undefined,
      getByCategory: async () => [],
      saveCustom: async () => ({
        metadata: {
          id: "new",
          name: "New",
          description: "New",
          category: "custom",
          icon: "file",
          isBuiltIn: false,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        title: "New Form",
        fields: [],
      }),
      deleteCustom: async () => true,
    };

    expect(typeof mockRegistry.getBuiltIn).toBe("function");
    expect(typeof mockRegistry.getCustom).toBe("function");
    expect(typeof mockRegistry.getAll).toBe("function");
    expect(typeof mockRegistry.get).toBe("function");
    expect(typeof mockRegistry.getByCategory).toBe("function");
    expect(typeof mockRegistry.saveCustom).toBe("function");
    expect(typeof mockRegistry.deleteCustom).toBe("function");
  });
});
