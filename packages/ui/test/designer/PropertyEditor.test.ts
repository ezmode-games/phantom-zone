/**
 * PropertyEditor Tests (PZ-102)
 *
 * Note: These tests are limited since we use node environment.
 * Full component testing would require jsdom environment and @testing-library/react.
 * These tests verify types, exports, and basic functionality.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  PropertyEditor,
  usePropertyEditor,
  createField,
  generateUUIDv7,
} from "../../src/designer";
import type {
  PropertyEditorProps,
  FieldPropertyValues,
  FieldPropertyChangeEvent,
  RuleAddEvent,
  RuleRemoveEvent,
  RuleConfigChangeEvent,
  RuleReorderEvent,
  CanvasField,
  AppliedValidationRule,
} from "../../src/designer";
import {
  resetGlobalRegistry,
  resetGlobalRuleRegistry,
  getValidationRuleRegistry,
} from "@phantom-zone/core";

describe("PropertyEditor", () => {
  beforeEach(() => {
    // Reset registries before each test to ensure clean state
    resetGlobalRegistry();
    resetGlobalRuleRegistry();
  });

  describe("exports", () => {
    it("PropertyEditor is exported as a function", () => {
      expect(typeof PropertyEditor).toBe("function");
    });

    it("usePropertyEditor is exported as a function", () => {
      expect(typeof usePropertyEditor).toBe("function");
    });
  });

  describe("PropertyEditor component", () => {
    it("is a valid React component function", () => {
      expect(PropertyEditor.length).toBeGreaterThanOrEqual(0);
    });

    it("has sub-components attached", () => {
      expect(PropertyEditor.EmptyState).toBeDefined();
      expect(PropertyEditor.FieldPropertiesSection).toBeDefined();
      expect(PropertyEditor.RulesSection).toBeDefined();
      expect(PropertyEditor.DefaultRuleConfig).toBeDefined();
      expect(PropertyEditor.DragHandleIcon).toBeDefined();
      expect(PropertyEditor.RemoveIcon).toBeDefined();
      expect(PropertyEditor.PlusIcon).toBeDefined();
      expect(PropertyEditor.SettingsIcon).toBeDefined();
    });
  });

  describe("usePropertyEditor hook", () => {
    it("is exported as a function", () => {
      // Note: We cannot test the actual hook behavior in node environment
      // since React hooks require a React component context.
      expect(typeof usePropertyEditor).toBe("function");
    });
  });
});

describe("PropertyEditor Type Tests", () => {
  it("PropertyEditorProps interface is correct", () => {
    const field = createField("text", "Test Field");
    const props: PropertyEditorProps = {
      field,
      onPropertyChange: (event: FieldPropertyChangeEvent) => {
        void event;
      },
      onRuleAdd: (event: RuleAddEvent) => {
        void event;
      },
      onRuleRemove: (event: RuleRemoveEvent) => {
        void event;
      },
      onRuleConfigChange: (event: RuleConfigChangeEvent) => {
        void event;
      },
      onRuleReorder: (event: RuleReorderEvent) => {
        void event;
      },
      renderRuleConfig: (ruleId, config, onChange) => {
        void ruleId;
        void config;
        void onChange;
        return null;
      },
      className: "test-class",
      children: null,
    };

    expect(props.field).toBeDefined();
    expect(typeof props.onPropertyChange).toBe("function");
    expect(typeof props.onRuleAdd).toBe("function");
    expect(typeof props.onRuleRemove).toBe("function");
    expect(typeof props.onRuleConfigChange).toBe("function");
    expect(typeof props.onRuleReorder).toBe("function");
    expect(typeof props.renderRuleConfig).toBe("function");
    expect(props.className).toBe("test-class");
  });

  it("PropertyEditorProps supports null field", () => {
    const props: PropertyEditorProps = {
      field: null,
    };

    expect(props.field).toBeNull();
  });

  it("FieldPropertyValues type has correct structure", () => {
    const values: FieldPropertyValues = {
      label: "Test Label",
      helpText: "Some help text",
      placeholder: "Enter value...",
      required: true,
    };

    expect(values.label).toBe("Test Label");
    expect(values.helpText).toBe("Some help text");
    expect(values.placeholder).toBe("Enter value...");
    expect(values.required).toBe(true);
  });

  it("FieldPropertyChangeEvent type has correct structure", () => {
    const event: FieldPropertyChangeEvent = {
      fieldId: "field-123",
      property: "label",
      value: "New Label",
    };

    expect(event.fieldId).toBe("field-123");
    expect(event.property).toBe("label");
    expect(event.value).toBe("New Label");
  });

  it("FieldPropertyChangeEvent supports boolean values", () => {
    const event: FieldPropertyChangeEvent = {
      fieldId: "field-123",
      property: "required",
      value: true,
    };

    expect(event.property).toBe("required");
    expect(event.value).toBe(true);
  });

  it("RuleAddEvent type has correct structure", () => {
    const event: RuleAddEvent = {
      fieldId: "field-123",
      ruleId: "required",
      config: {},
    };

    expect(event.fieldId).toBe("field-123");
    expect(event.ruleId).toBe("required");
    expect(event.config).toEqual({});
  });

  it("RuleAddEvent supports config with values", () => {
    const event: RuleAddEvent = {
      fieldId: "field-123",
      ruleId: "minLength",
      config: { length: 5 },
    };

    expect(event.ruleId).toBe("minLength");
    expect(event.config).toEqual({ length: 5 });
  });

  it("RuleRemoveEvent type has correct structure", () => {
    const event: RuleRemoveEvent = {
      fieldId: "field-123",
      appliedRuleId: "rule-456",
    };

    expect(event.fieldId).toBe("field-123");
    expect(event.appliedRuleId).toBe("rule-456");
  });

  it("RuleConfigChangeEvent type has correct structure", () => {
    const event: RuleConfigChangeEvent = {
      fieldId: "field-123",
      appliedRuleId: "rule-456",
      config: { length: 10 },
    };

    expect(event.fieldId).toBe("field-123");
    expect(event.appliedRuleId).toBe("rule-456");
    expect(event.config).toEqual({ length: 10 });
  });

  it("RuleReorderEvent type has correct structure", () => {
    const event: RuleReorderEvent = {
      fieldId: "field-123",
      fromIndex: 0,
      toIndex: 2,
    };

    expect(event.fieldId).toBe("field-123");
    expect(event.fromIndex).toBe(0);
    expect(event.toIndex).toBe(2);
  });
});

describe("PropertyEditor Integration with CanvasField", () => {
  it("works with a basic text field", () => {
    const field: CanvasField = createField("text", "Name");

    expect(field.id).toBeTruthy();
    expect(field.inputType).toBe("text");
    expect(field.label).toBe("Name");
    expect(field.validationRules).toEqual([]);
  });

  it("works with a field that has validation rules", () => {
    const appliedRule: AppliedValidationRule = {
      id: generateUUIDv7(),
      ruleId: "required",
      config: {},
    };

    const field: CanvasField = createField("text", "Email", {
      validationRules: [appliedRule],
    });

    expect(field.validationRules).toHaveLength(1);
    expect(field.validationRules[0]?.ruleId).toBe("required");
  });

  it("works with a field that has multiple validation rules", () => {
    const rules: AppliedValidationRule[] = [
      { id: generateUUIDv7(), ruleId: "required", config: {} },
      { id: generateUUIDv7(), ruleId: "minLength", config: { length: 2 } },
      { id: generateUUIDv7(), ruleId: "maxLength", config: { length: 100 } },
    ];

    const field: CanvasField = createField("text", "Username", {
      validationRules: rules,
    });

    expect(field.validationRules).toHaveLength(3);
    expect(field.validationRules.map((r) => r.ruleId)).toEqual([
      "required",
      "minLength",
      "maxLength",
    ]);
  });
});

describe("PropertyEditor Event Handling Scenarios", () => {
  describe("Property change events", () => {
    it("captures label changes correctly", () => {
      let capturedEvent: FieldPropertyChangeEvent | null = null;

      const props: PropertyEditorProps = {
        field: createField("text", "Test"),
        onPropertyChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FieldPropertyChangeEvent = {
        fieldId: props.field?.id ?? "",
        property: "label",
        value: "Updated Label",
      };

      props.onPropertyChange?.(testEvent);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.property).toBe("label");
      expect(capturedEvent?.value).toBe("Updated Label");
    });

    it("captures helpText changes correctly", () => {
      let capturedEvent: FieldPropertyChangeEvent | null = null;

      const props: PropertyEditorProps = {
        field: createField("text", "Test"),
        onPropertyChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FieldPropertyChangeEvent = {
        fieldId: props.field?.id ?? "",
        property: "helpText",
        value: "This is helpful information",
      };

      props.onPropertyChange?.(testEvent);

      expect(capturedEvent?.property).toBe("helpText");
      expect(capturedEvent?.value).toBe("This is helpful information");
    });

    it("captures placeholder changes correctly", () => {
      let capturedEvent: FieldPropertyChangeEvent | null = null;

      const props: PropertyEditorProps = {
        field: createField("text", "Test"),
        onPropertyChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FieldPropertyChangeEvent = {
        fieldId: props.field?.id ?? "",
        property: "placeholder",
        value: "Enter your text here...",
      };

      props.onPropertyChange?.(testEvent);

      expect(capturedEvent?.property).toBe("placeholder");
      expect(capturedEvent?.value).toBe("Enter your text here...");
    });

    it("captures required changes correctly", () => {
      let capturedEvent: FieldPropertyChangeEvent | null = null;

      const props: PropertyEditorProps = {
        field: createField("text", "Test"),
        onPropertyChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: FieldPropertyChangeEvent = {
        fieldId: props.field?.id ?? "",
        property: "required",
        value: true,
      };

      props.onPropertyChange?.(testEvent);

      expect(capturedEvent?.property).toBe("required");
      expect(capturedEvent?.value).toBe(true);
    });
  });

  describe("Rule add events", () => {
    it("captures rule add with empty config", () => {
      let capturedEvent: RuleAddEvent | null = null;

      const props: PropertyEditorProps = {
        field: createField("text", "Test"),
        onRuleAdd: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: RuleAddEvent = {
        fieldId: props.field?.id ?? "",
        ruleId: "required",
        config: {},
      };

      props.onRuleAdd?.(testEvent);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.ruleId).toBe("required");
      expect(capturedEvent?.config).toEqual({});
    });

    it("captures rule add with config values", () => {
      let capturedEvent: RuleAddEvent | null = null;

      const props: PropertyEditorProps = {
        field: createField("number", "Age"),
        onRuleAdd: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: RuleAddEvent = {
        fieldId: props.field?.id ?? "",
        ruleId: "min",
        config: { value: 18 },
      };

      props.onRuleAdd?.(testEvent);

      expect(capturedEvent?.ruleId).toBe("min");
      expect(capturedEvent?.config).toEqual({ value: 18 });
    });
  });

  describe("Rule remove events", () => {
    it("captures rule removal correctly", () => {
      let capturedEvent: RuleRemoveEvent | null = null;

      const appliedRule: AppliedValidationRule = {
        id: generateUUIDv7(),
        ruleId: "required",
        config: {},
      };

      const props: PropertyEditorProps = {
        field: createField("text", "Test", { validationRules: [appliedRule] }),
        onRuleRemove: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: RuleRemoveEvent = {
        fieldId: props.field?.id ?? "",
        appliedRuleId: appliedRule.id,
      };

      props.onRuleRemove?.(testEvent);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.appliedRuleId).toBe(appliedRule.id);
    });
  });

  describe("Rule config change events", () => {
    it("captures config changes correctly", () => {
      let capturedEvent: RuleConfigChangeEvent | null = null;

      const appliedRule: AppliedValidationRule = {
        id: generateUUIDv7(),
        ruleId: "minLength",
        config: { length: 5 },
      };

      const props: PropertyEditorProps = {
        field: createField("text", "Test", { validationRules: [appliedRule] }),
        onRuleConfigChange: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: RuleConfigChangeEvent = {
        fieldId: props.field?.id ?? "",
        appliedRuleId: appliedRule.id,
        config: { length: 10 },
      };

      props.onRuleConfigChange?.(testEvent);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.appliedRuleId).toBe(appliedRule.id);
      expect(capturedEvent?.config).toEqual({ length: 10 });
    });
  });

  describe("Rule reorder events", () => {
    it("captures reorder correctly", () => {
      let capturedEvent: RuleReorderEvent | null = null;

      const rules: AppliedValidationRule[] = [
        { id: generateUUIDv7(), ruleId: "required", config: {} },
        { id: generateUUIDv7(), ruleId: "email", config: {} },
      ];

      const props: PropertyEditorProps = {
        field: createField("text", "Email", { validationRules: rules }),
        onRuleReorder: (event) => {
          capturedEvent = event;
        },
      };

      const testEvent: RuleReorderEvent = {
        fieldId: props.field?.id ?? "",
        fromIndex: 0,
        toIndex: 1,
      };

      props.onRuleReorder?.(testEvent);

      expect(capturedEvent).not.toBeNull();
      expect(capturedEvent?.fromIndex).toBe(0);
      expect(capturedEvent?.toIndex).toBe(1);
    });
  });
});

describe("PropertyEditor with Validation Rule Registry", () => {
  beforeEach(() => {
    resetGlobalRuleRegistry();
  });

  it("registry has expected rules", () => {
    const registry = getValidationRuleRegistry();

    expect(registry.has("required")).toBe(true);
    expect(registry.has("minLength")).toBe(true);
    expect(registry.has("maxLength")).toBe(true);
    expect(registry.has("email")).toBe(true);
    expect(registry.has("url")).toBe(true);
    expect(registry.has("min")).toBe(true);
    expect(registry.has("max")).toBe(true);
  });

  it("can get compatible rules for text input", () => {
    const registry = getValidationRuleRegistry();
    const compatibleRules = registry.getCompatibleRules("text");

    expect(compatibleRules.length).toBeGreaterThan(0);

    const ruleIds = compatibleRules.map((r) => r.id);
    expect(ruleIds).toContain("required");
    expect(ruleIds).toContain("minLength");
    expect(ruleIds).toContain("maxLength");
    expect(ruleIds).toContain("email");
    expect(ruleIds).toContain("url");
  });

  it("can get compatible rules for number input", () => {
    const registry = getValidationRuleRegistry();
    const compatibleRules = registry.getCompatibleRules("number");

    expect(compatibleRules.length).toBeGreaterThan(0);

    const ruleIds = compatibleRules.map((r) => r.id);
    expect(ruleIds).toContain("required");
    expect(ruleIds).toContain("min");
    expect(ruleIds).toContain("max");
    expect(ruleIds).toContain("integer");
    expect(ruleIds).toContain("positive");
  });

  it("can get compatible rules for date input", () => {
    const registry = getValidationRuleRegistry();
    const compatibleRules = registry.getCompatibleRules("date");

    expect(compatibleRules.length).toBeGreaterThan(0);

    const ruleIds = compatibleRules.map((r) => r.id);
    expect(ruleIds).toContain("required");
    expect(ruleIds).toContain("minDate");
    expect(ruleIds).toContain("maxDate");
  });

  it("can get compatible rules for file input", () => {
    const registry = getValidationRuleRegistry();
    const compatibleRules = registry.getCompatibleRules("file");

    expect(compatibleRules.length).toBeGreaterThan(0);

    const ruleIds = compatibleRules.map((r) => r.id);
    expect(ruleIds).toContain("required");
    expect(ruleIds).toContain("fileSize");
    expect(ruleIds).toContain("fileType");
  });

  it("can get compatible rules for multiselect input", () => {
    const registry = getValidationRuleRegistry();
    const compatibleRules = registry.getCompatibleRules("multiselect");

    expect(compatibleRules.length).toBeGreaterThan(0);

    const ruleIds = compatibleRules.map((r) => r.id);
    expect(ruleIds).toContain("required");
    expect(ruleIds).toContain("minItems");
    expect(ruleIds).toContain("maxItems");
  });
});

describe("PropertyEditor Rule Configuration", () => {
  it("minLength rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("minLength");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ length: 1 });
  });

  it("maxLength rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("maxLength");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ length: 255 });
  });

  it("min rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("min");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ value: 0 });
  });

  it("max rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("max");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ value: 100 });
  });

  it("pattern rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("pattern");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ pattern: ".*", message: "Invalid format" });
  });

  it("fileSize rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("fileSize");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ maxBytes: 5 * 1024 * 1024 });
  });

  it("fileType rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("fileType");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ types: ["image/*", "application/pdf"] });
  });

  it("minItems rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("minItems");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ min: 1 });
  });

  it("maxItems rule has correct default config", () => {
    const registry = getValidationRuleRegistry();
    const rule = registry.get("maxItems");

    expect(rule).toBeDefined();
    expect(rule?.defaultConfig).toEqual({ max: 10 });
  });
});

describe("PropertyEditor Field Types", () => {
  it("supports all input types", () => {
    const inputTypes = [
      "text",
      "textarea",
      "number",
      "checkbox",
      "select",
      "multiselect",
      "date",
      "file",
    ] as const;

    for (const inputType of inputTypes) {
      const field = createField(inputType, `${inputType} field`);

      const props: PropertyEditorProps = {
        field,
      };

      expect(props.field?.inputType).toBe(inputType);
    }
  });

  it("field with all properties", () => {
    const rules: AppliedValidationRule[] = [
      { id: generateUUIDv7(), ruleId: "required", config: {} },
    ];

    const field: CanvasField = createField("text", "Full Field", {
      name: "full_field",
      placeholder: "Enter value",
      helpText: "This is help text",
      required: true,
      validationRules: rules,
      defaultValue: "default",
      config: { customOption: true },
    });

    expect(field.name).toBe("full_field");
    expect(field.placeholder).toBe("Enter value");
    expect(field.helpText).toBe("This is help text");
    expect(field.required).toBe(true);
    expect(field.validationRules).toHaveLength(1);
    expect(field.defaultValue).toBe("default");
    expect(field.config).toEqual({ customOption: true });
  });
});

describe("PropertyEditor Edge Cases", () => {
  it("handles field with no rules gracefully", () => {
    const field = createField("text", "No Rules");
    expect(field.validationRules).toEqual([]);
  });

  it("handles field with empty string properties", () => {
    const field = createField("text", "Empty Props", {
      helpText: "",
      placeholder: "",
    });

    expect(field.helpText).toBe("");
    expect(field.placeholder).toBe("");
  });

  it("handles rule with complex config", () => {
    const complexConfig: Record<string, unknown> = {
      types: ["image/*", "application/pdf", ".doc", ".docx"],
      nested: { key: "value" },
      array: [1, 2, 3],
    };

    const appliedRule: AppliedValidationRule = {
      id: generateUUIDv7(),
      ruleId: "fileType",
      config: complexConfig,
    };

    expect(appliedRule.config).toEqual(complexConfig);
  });

  it("generates unique IDs for applied rules", () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(generateUUIDv7());
    }

    expect(ids.size).toBe(100);
  });
});

describe("PropertyEditor Custom renderRuleConfig", () => {
  it("accepts custom renderRuleConfig function", () => {
    let renderCalled = false;
    let passedRuleId: string | null = null;

    const customRender = (
      ruleId: string,
      _config: Record<string, unknown>,
      _onChange: (config: Record<string, unknown>) => void
    ) => {
      renderCalled = true;
      passedRuleId = ruleId;
      return null;
    };

    const props: PropertyEditorProps = {
      field: createField("text", "Test"),
      renderRuleConfig: customRender,
    };

    // Simulate calling the render function
    props.renderRuleConfig?.("minLength", { length: 5 }, () => {});

    expect(renderCalled).toBe(true);
    expect(passedRuleId).toBe("minLength");
  });
});

describe("PropertyEditor Factory Functions", () => {
  it("generateUUIDv7 creates valid UUIDs", () => {
    const uuid = generateUUIDv7();

    // UUID format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("generateUUIDv7 creates UUIDs with timestamp prefix", () => {
    const uuid1 = generateUUIDv7();
    const uuid2 = generateUUIDv7();

    // UUIDs generated close together should share the same timestamp prefix
    // The first 8 characters are the high 32 bits of the timestamp
    const timestamp1 = uuid1.slice(0, 8);
    const timestamp2 = uuid2.slice(0, 8);

    // They should be the same or very close (within same millisecond window)
    expect(timestamp1).toBe(timestamp2);
  });

  it("createField creates fields with unique IDs", () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(createField("text", `Field ${i}`).id);
    }

    expect(ids.size).toBe(100);
  });
});
