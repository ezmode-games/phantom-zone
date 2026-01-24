/**
 * Template Apply Tests (PZ-106)
 *
 * Tests for applying templates to create canvas state.
 */

import { describe, expect, it } from "vitest";
import {
  templateFieldToCanvasField,
  applyTemplate,
  canvasStateToTemplate,
  mergeTemplateIntoCanvas,
  validateTemplate,
  generalApplicationTemplate,
  raidRecruitmentTemplate,
  casualJoinTemplate,
} from "../../../src/designer/templates";
import { createEmptyCanvasState, createField } from "../../../src/designer/types";
import type { FormTemplate, TemplateField } from "../../../src/designer/templates";

describe("templateFieldToCanvasField", () => {
  it("generates a unique id", () => {
    const templateField: TemplateField = {
      inputType: "text",
      label: "Name",
      required: true,
    };

    const canvasField1 = templateFieldToCanvasField(templateField);
    const canvasField2 = templateFieldToCanvasField(templateField);

    expect(canvasField1.id).toBeTruthy();
    expect(canvasField2.id).toBeTruthy();
    expect(canvasField1.id).not.toBe(canvasField2.id);
  });

  it("preserves all template field properties", () => {
    const templateField: TemplateField = {
      inputType: "select",
      label: "Class",
      name: "characterClass",
      placeholder: "Select your class",
      helpText: "Choose wisely",
      required: true,
      options: [
        { value: "warrior", label: "Warrior" },
        { value: "mage", label: "Mage" },
      ],
      defaultValue: "warrior",
      config: { searchable: true },
    };

    const canvasField = templateFieldToCanvasField(templateField);

    expect(canvasField.inputType).toBe("select");
    expect(canvasField.label).toBe("Class");
    expect(canvasField.name).toBe("characterClass");
    expect(canvasField.placeholder).toBe("Select your class");
    expect(canvasField.helpText).toBe("Choose wisely");
    expect(canvasField.required).toBe(true);
    expect(canvasField.options).toEqual(templateField.options);
    expect(canvasField.defaultValue).toBe("warrior");
    expect(canvasField.config).toEqual({ searchable: true });
  });

  it("initializes validationRules as empty array", () => {
    const templateField: TemplateField = {
      inputType: "text",
      label: "Name",
      required: true,
    };

    const canvasField = templateFieldToCanvasField(templateField);
    expect(canvasField.validationRules).toEqual([]);
  });

  it("handles minimal template field", () => {
    const templateField: TemplateField = {
      inputType: "text",
      label: "Name",
      required: false,
    };

    const canvasField = templateFieldToCanvasField(templateField);

    expect(canvasField.id).toBeTruthy();
    expect(canvasField.inputType).toBe("text");
    expect(canvasField.label).toBe("Name");
    expect(canvasField.required).toBe(false);
    expect(canvasField.name).toBeUndefined();
    expect(canvasField.placeholder).toBeUndefined();
    expect(canvasField.helpText).toBeUndefined();
  });
});

describe("applyTemplate", () => {
  it("creates canvas state from general application template", () => {
    const result = applyTemplate(generalApplicationTemplate);

    expect(result.canvasState.id).toBeTruthy();
    expect(result.canvasState.title).toBe("Guild Application");
    expect(result.canvasState.description).toBeTruthy();
    expect(result.canvasState.fields).toHaveLength(generalApplicationTemplate.fields.length);
    expect(result.fieldCount).toBe(generalApplicationTemplate.fields.length);
  });

  it("creates canvas state from raid recruitment template", () => {
    const result = applyTemplate(raidRecruitmentTemplate);

    expect(result.canvasState.title).toBe("Raid Team Application");
    expect(result.fieldCount).toBe(raidRecruitmentTemplate.fields.length);
  });

  it("creates canvas state from casual join template", () => {
    const result = applyTemplate(casualJoinTemplate);

    expect(result.canvasState.title).toBe("Join Our Community");
    expect(result.fieldCount).toBe(casualJoinTemplate.fields.length);
  });

  it("generates unique IDs for each field", () => {
    const result = applyTemplate(generalApplicationTemplate);

    const ids = result.canvasState.fields.map((f) => f.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it("generates unique canvas state ID each time", () => {
    const result1 = applyTemplate(generalApplicationTemplate);
    const result2 = applyTemplate(generalApplicationTemplate);

    expect(result1.canvasState.id).not.toBe(result2.canvasState.id);
  });

  it("sets selectedFieldId to null", () => {
    const result = applyTemplate(generalApplicationTemplate);
    expect(result.canvasState.selectedFieldId).toBeNull();
  });

  it("sets isPreviewMode to false", () => {
    const result = applyTemplate(generalApplicationTemplate);
    expect(result.canvasState.isPreviewMode).toBe(false);
  });

  it("handles template with no description", () => {
    const template: FormTemplate = {
      metadata: {
        id: "no-desc",
        name: "No Description",
        description: "Template metadata description",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Form Without Description",
      fields: [],
    };

    const result = applyTemplate(template);
    expect(result.canvasState.description).toBeUndefined();
  });

  it("handles template with empty fields", () => {
    const template: FormTemplate = {
      metadata: {
        id: "empty",
        name: "Empty",
        description: "Empty template",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Empty Form",
      description: "No fields",
      fields: [],
    };

    const result = applyTemplate(template);

    expect(result.canvasState.fields).toHaveLength(0);
    expect(result.fieldCount).toBe(0);
  });
});

describe("canvasStateToTemplate", () => {
  it("converts canvas state to template data", () => {
    const canvasState = createEmptyCanvasState();
    canvasState.title = "My Form";
    canvasState.description = "A test form";
    canvasState.fields = [
      createField("text", "Name", { required: true }),
      createField("textarea", "Bio", { required: false }),
    ];

    const templateData = canvasStateToTemplate(canvasState, {
      name: "My Template",
      description: "A reusable template",
      category: "custom",
      icon: "file",
    });

    expect(templateData.metadata.name).toBe("My Template");
    expect(templateData.metadata.description).toBe("A reusable template");
    expect(templateData.metadata.category).toBe("custom");
    expect(templateData.metadata.icon).toBe("file");
    expect(templateData.title).toBe("My Form");
    expect(templateData.description).toBe("A test form");
    expect(templateData.fields).toHaveLength(2);
  });

  it("strips field IDs from template fields", () => {
    const canvasState = createEmptyCanvasState();
    canvasState.fields = [createField("text", "Name", { required: true })];

    const templateData = canvasStateToTemplate(canvasState, {
      name: "Test",
      description: "Test",
      category: "custom",
      icon: "file",
    });

    // Template fields should not have IDs (they get generated on apply)
    const field = templateData.fields[0];
    expect(field).not.toHaveProperty("id");
    expect(field!.inputType).toBe("text");
    expect(field!.label).toBe("Name");
  });

  it("preserves field options", () => {
    const canvasState = createEmptyCanvasState();
    canvasState.fields = [
      createField("select", "Class", {
        required: true,
        options: [
          { value: "warrior", label: "Warrior" },
          { value: "mage", label: "Mage" },
        ],
      }),
    ];

    const templateData = canvasStateToTemplate(canvasState, {
      name: "Test",
      description: "Test",
      category: "custom",
      icon: "file",
    });

    expect(templateData.fields[0]!.options).toHaveLength(2);
    expect(templateData.fields[0]!.options![0]!.value).toBe("warrior");
  });

  it("handles empty canvas state", () => {
    const canvasState = createEmptyCanvasState();

    const templateData = canvasStateToTemplate(canvasState, {
      name: "Empty",
      description: "Empty template",
      category: "custom",
      icon: "file",
    });

    expect(templateData.fields).toHaveLength(0);
    expect(templateData.title).toBe("Untitled Form");
  });
});

describe("mergeTemplateIntoCanvas", () => {
  it("appends template fields to existing canvas state", () => {
    const canvasState = createEmptyCanvasState();
    canvasState.fields = [createField("text", "Existing Field", { required: true })];

    const template: FormTemplate = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test",
      fields: [
        { inputType: "text", label: "New Field 1", required: true },
        { inputType: "text", label: "New Field 2", required: false },
      ],
    };

    const result = mergeTemplateIntoCanvas(canvasState, template);

    expect(result.fields).toHaveLength(3);
    expect(result.fields[0]!.label).toBe("Existing Field");
    expect(result.fields[1]!.label).toBe("New Field 1");
    expect(result.fields[2]!.label).toBe("New Field 2");
  });

  it("preserves canvas state id", () => {
    const canvasState = createEmptyCanvasState();
    const originalId = canvasState.id;

    const template: FormTemplate = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test",
      fields: [{ inputType: "text", label: "New Field", required: true }],
    };

    const result = mergeTemplateIntoCanvas(canvasState, template);

    expect(result.id).toBe(originalId);
  });

  it("preserves canvas state title and description", () => {
    const canvasState = createEmptyCanvasState();
    canvasState.title = "My Form";
    canvasState.description = "My Description";

    const template: FormTemplate = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Different Title",
      description: "Different Description",
      fields: [],
    };

    const result = mergeTemplateIntoCanvas(canvasState, template);

    expect(result.title).toBe("My Form");
    expect(result.description).toBe("My Description");
  });

  it("generates new IDs for merged fields", () => {
    const canvasState = createEmptyCanvasState();

    const template: FormTemplate = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test",
      fields: [{ inputType: "text", label: "Field", required: true }],
    };

    const result1 = mergeTemplateIntoCanvas(canvasState, template);
    const result2 = mergeTemplateIntoCanvas(canvasState, template);

    expect(result1.fields[0]!.id).not.toBe(result2.fields[0]!.id);
  });
});

describe("validateTemplate", () => {
  it("returns true for valid template", () => {
    expect(validateTemplate(generalApplicationTemplate)).toBe(true);
    expect(validateTemplate(raidRecruitmentTemplate)).toBe(true);
    expect(validateTemplate(casualJoinTemplate)).toBe(true);
  });

  it("returns true for minimal valid template", () => {
    const template = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test",
      fields: [],
    };

    expect(validateTemplate(template)).toBe(true);
  });

  it("returns false for null", () => {
    expect(validateTemplate(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(validateTemplate(undefined)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(validateTemplate("string")).toBe(false);
    expect(validateTemplate(123)).toBe(false);
    expect(validateTemplate([])).toBe(false);
  });

  it("returns false for missing metadata", () => {
    const template = {
      title: "Test",
      fields: [],
    };

    expect(validateTemplate(template)).toBe(false);
  });

  it("returns false for missing metadata.id", () => {
    const template = {
      metadata: {
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
      },
      title: "Test",
      fields: [],
    };

    expect(validateTemplate(template)).toBe(false);
  });

  it("returns false for missing title", () => {
    const template = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      fields: [],
    };

    expect(validateTemplate(template)).toBe(false);
  });

  it("returns false for non-array fields", () => {
    const template = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test",
      fields: "not an array",
    };

    expect(validateTemplate(template)).toBe(false);
  });

  it("returns false for invalid field in fields array", () => {
    const template = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test",
      fields: [
        { inputType: "text", label: "Valid", required: true },
        { inputType: "text" }, // Missing label and required
      ],
    };

    expect(validateTemplate(template)).toBe(false);
  });

  it("returns false for null field in fields array", () => {
    const template = {
      metadata: {
        id: "test",
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test",
      fields: [null],
    };

    expect(validateTemplate(template)).toBe(false);
  });
});
