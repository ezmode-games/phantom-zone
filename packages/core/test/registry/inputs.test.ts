import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkboxDefinition,
  createDefaultInputRegistry,
  createInputRegistry,
  datePickerDefinition,
  defaultInputDefinitions,
  fileUploadDefinition,
  getInputRegistry,
  multiSelectDefinition,
  numberInputDefinition,
  resetGlobalRegistry,
  selectDefinition,
  textAreaDefinition,
  textInputDefinition,
} from "../../src/registry";
import type {
  BaseInputDefinition,
  InputRegistry,
  TextInputProps,
  TypedInputDefinition,
} from "../../src/registry";

describe("Input Registry", () => {
  describe("createInputRegistry", () => {
    let registry: InputRegistry;

    beforeEach(() => {
      registry = createInputRegistry();
    });

    it("creates an empty registry", () => {
      expect(registry.getAll()).toHaveLength(0);
    });

    it("registers a new input type", () => {
      registry.register(textInputDefinition);
      expect(registry.has("text")).toBe(true);
      expect(registry.get("text")).toBeDefined();
    });

    it("throws when registering duplicate input type", () => {
      registry.register(textInputDefinition);
      expect(() => registry.register(textInputDefinition)).toThrow(
        'Input type "text" is already registered'
      );
    });

    it("retrieves input by ID", () => {
      registry.register(numberInputDefinition);
      const input = registry.get("number");
      expect(input).toBeDefined();
      expect(input?.id).toBe("number");
      expect(input?.name).toBe("Number Input");
    });

    it("returns undefined for unregistered ID", () => {
      expect(registry.get("text")).toBeUndefined();
    });

    it("returns all registered inputs", () => {
      registry.register(textInputDefinition);
      registry.register(checkboxDefinition);
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((i) => i.id)).toContain("text");
      expect(all.map((i) => i.id)).toContain("checkbox");
    });

    it("filters inputs by category", () => {
      registry.register(textInputDefinition);
      registry.register(textAreaDefinition);
      registry.register(checkboxDefinition);
      registry.register(selectDefinition);

      const textInputs = registry.getByCategory("text");
      expect(textInputs).toHaveLength(2);
      expect(textInputs.map((i) => i.id)).toContain("text");
      expect(textInputs.map((i) => i.id)).toContain("textarea");

      const choiceInputs = registry.getByCategory("choice");
      expect(choiceInputs).toHaveLength(2);
      expect(choiceInputs.map((i) => i.id)).toContain("checkbox");
      expect(choiceInputs.map((i) => i.id)).toContain("select");
    });

    it("unregisters an input type", () => {
      registry.register(textInputDefinition);
      expect(registry.has("text")).toBe(true);

      const result = registry.unregister("text");
      expect(result).toBe(true);
      expect(registry.has("text")).toBe(false);
      expect(registry.get("text")).toBeUndefined();
    });

    it("returns false when unregistering non-existent type", () => {
      const result = registry.unregister("text");
      expect(result).toBe(false);
    });

    it("clears all registrations", () => {
      registry.register(textInputDefinition);
      registry.register(checkboxDefinition);
      expect(registry.getAll()).toHaveLength(2);

      registry.clear();
      expect(registry.getAll()).toHaveLength(0);
      expect(registry.has("text")).toBe(false);
    });

    it("allows re-registration after unregister", () => {
      registry.register(textInputDefinition);
      registry.unregister("text");

      const customText: TypedInputDefinition<TextInputProps> = {
        ...textInputDefinition,
        name: "Custom Text Input",
      };
      registry.register(customText);

      expect(registry.get("text")?.name).toBe("Custom Text Input");
    });
  });

  describe("createDefaultInputRegistry", () => {
    it("creates registry with all default inputs", () => {
      const registry = createDefaultInputRegistry();
      expect(registry.getAll()).toHaveLength(8);
    });

    it("includes all required input types", () => {
      const registry = createDefaultInputRegistry();
      expect(registry.has("text")).toBe(true);
      expect(registry.has("textarea")).toBe(true);
      expect(registry.has("number")).toBe(true);
      expect(registry.has("checkbox")).toBe(true);
      expect(registry.has("select")).toBe(true);
      expect(registry.has("multiselect")).toBe(true);
      expect(registry.has("date")).toBe(true);
      expect(registry.has("file")).toBe(true);
    });

    it("creates isolated registry instances", () => {
      const registry1 = createDefaultInputRegistry();
      const registry2 = createDefaultInputRegistry();

      registry1.unregister("text");
      expect(registry1.has("text")).toBe(false);
      expect(registry2.has("text")).toBe(true);
    });
  });

  describe("getInputRegistry (global)", () => {
    afterEach(() => {
      resetGlobalRegistry();
    });

    it("returns a pre-populated registry", () => {
      const registry = getInputRegistry();
      expect(registry.getAll()).toHaveLength(8);
    });

    it("returns the same instance on multiple calls", () => {
      const registry1 = getInputRegistry();
      const registry2 = getInputRegistry();
      expect(registry1).toBe(registry2);
    });

    it("persists modifications across calls", () => {
      const registry = getInputRegistry();
      registry.unregister("text");

      const sameRegistry = getInputRegistry();
      expect(sameRegistry.has("text")).toBe(false);
    });
  });

  describe("resetGlobalRegistry", () => {
    it("resets the global registry to fresh state", () => {
      const registry = getInputRegistry();
      registry.unregister("text");
      registry.unregister("checkbox");

      resetGlobalRegistry();

      const freshRegistry = getInputRegistry();
      expect(freshRegistry.has("text")).toBe(true);
      expect(freshRegistry.has("checkbox")).toBe(true);
    });
  });

  describe("Default Input Definitions", () => {
    it("exports all default definitions", () => {
      expect(defaultInputDefinitions).toHaveLength(8);
    });

    describe("textInputDefinition", () => {
      it("has correct properties", () => {
        expect(textInputDefinition.id).toBe("text");
        expect(textInputDefinition.name).toBe("Text Input");
        expect(textInputDefinition.icon).toBe("type");
        expect(textInputDefinition.category).toBe("text");
        expect(textInputDefinition.component).toBeDefined();
      });

      it("has appropriate compatible rules", () => {
        expect(textInputDefinition.compatibleRules).toContain("required");
        expect(textInputDefinition.compatibleRules).toContain("minLength");
        expect(textInputDefinition.compatibleRules).toContain("maxLength");
        expect(textInputDefinition.compatibleRules).toContain("pattern");
        expect(textInputDefinition.compatibleRules).toContain("email");
        expect(textInputDefinition.compatibleRules).toContain("url");
      });

      it("has correct default props", () => {
        expect(textInputDefinition.defaultProps?.type).toBe("text");
      });
    });

    describe("textAreaDefinition", () => {
      it("has correct properties", () => {
        expect(textAreaDefinition.id).toBe("textarea");
        expect(textAreaDefinition.name).toBe("Text Area");
        expect(textAreaDefinition.icon).toBe("align-left");
        expect(textAreaDefinition.category).toBe("text");
      });

      it("has text-focused compatible rules", () => {
        expect(textAreaDefinition.compatibleRules).toContain("required");
        expect(textAreaDefinition.compatibleRules).toContain("minLength");
        expect(textAreaDefinition.compatibleRules).toContain("maxLength");
        expect(textAreaDefinition.compatibleRules).not.toContain("min");
      });

      it("has default rows", () => {
        expect(textAreaDefinition.defaultProps?.rows).toBe(4);
      });
    });

    describe("numberInputDefinition", () => {
      it("has correct properties", () => {
        expect(numberInputDefinition.id).toBe("number");
        expect(numberInputDefinition.name).toBe("Number Input");
        expect(numberInputDefinition.icon).toBe("hash");
        expect(numberInputDefinition.category).toBe("text");
      });

      it("has numeric compatible rules", () => {
        expect(numberInputDefinition.compatibleRules).toContain("required");
        expect(numberInputDefinition.compatibleRules).toContain("min");
        expect(numberInputDefinition.compatibleRules).toContain("max");
        expect(numberInputDefinition.compatibleRules).toContain("step");
        expect(numberInputDefinition.compatibleRules).toContain("integer");
        expect(numberInputDefinition.compatibleRules).toContain("positive");
      });
    });

    describe("checkboxDefinition", () => {
      it("has correct properties", () => {
        expect(checkboxDefinition.id).toBe("checkbox");
        expect(checkboxDefinition.name).toBe("Checkbox");
        expect(checkboxDefinition.icon).toBe("check-square");
        expect(checkboxDefinition.category).toBe("choice");
      });

      it("has only required as compatible rule", () => {
        expect(checkboxDefinition.compatibleRules).toEqual(["required"]);
      });
    });

    describe("selectDefinition", () => {
      it("has correct properties", () => {
        expect(selectDefinition.id).toBe("select");
        expect(selectDefinition.name).toBe("Select");
        expect(selectDefinition.icon).toBe("chevron-down");
        expect(selectDefinition.category).toBe("choice");
      });

      it("has correct default props", () => {
        expect(selectDefinition.defaultProps?.options).toEqual([]);
        expect(selectDefinition.defaultProps?.clearable).toBe(false);
        expect(selectDefinition.defaultProps?.searchable).toBe(false);
      });
    });

    describe("multiSelectDefinition", () => {
      it("has correct properties", () => {
        expect(multiSelectDefinition.id).toBe("multiselect");
        expect(multiSelectDefinition.name).toBe("Multi-Select");
        expect(multiSelectDefinition.icon).toBe("list-checks");
        expect(multiSelectDefinition.category).toBe("choice");
      });

      it("has array-focused compatible rules", () => {
        expect(multiSelectDefinition.compatibleRules).toContain("required");
        expect(multiSelectDefinition.compatibleRules).toContain("minItems");
        expect(multiSelectDefinition.compatibleRules).toContain("maxItems");
      });
    });

    describe("datePickerDefinition", () => {
      it("has correct properties", () => {
        expect(datePickerDefinition.id).toBe("date");
        expect(datePickerDefinition.name).toBe("Date Picker");
        expect(datePickerDefinition.icon).toBe("calendar");
        expect(datePickerDefinition.category).toBe("date");
      });

      it("has date-focused compatible rules", () => {
        expect(datePickerDefinition.compatibleRules).toContain("required");
        expect(datePickerDefinition.compatibleRules).toContain("minDate");
        expect(datePickerDefinition.compatibleRules).toContain("maxDate");
      });
    });

    describe("fileUploadDefinition", () => {
      it("has correct properties", () => {
        expect(fileUploadDefinition.id).toBe("file");
        expect(fileUploadDefinition.name).toBe("File Upload");
        expect(fileUploadDefinition.icon).toBe("upload");
        expect(fileUploadDefinition.category).toBe("file");
      });

      it("has file-focused compatible rules", () => {
        expect(fileUploadDefinition.compatibleRules).toContain("required");
        expect(fileUploadDefinition.compatibleRules).toContain("fileSize");
        expect(fileUploadDefinition.compatibleRules).toContain("fileType");
        expect(fileUploadDefinition.compatibleRules).toContain("maxItems");
      });

      it("has correct default props", () => {
        expect(fileUploadDefinition.defaultProps?.multiple).toBe(false);
      });
    });
  });

  describe("Placeholder Components", () => {
    it("all definitions have components that return null", () => {
      for (const def of defaultInputDefinitions) {
        const Component = def.component;
        const result = Component({
          id: "test",
          name: "test",
          value: undefined,
          onChange: () => {},
        } as never);
        expect(result).toBeNull();
      }
    });
  });

  describe("Category Grouping", () => {
    it("groups text inputs correctly", () => {
      const registry = createDefaultInputRegistry();
      const textInputs = registry.getByCategory("text");
      expect(textInputs.map((i) => i.id).sort()).toEqual([
        "number",
        "text",
        "textarea",
      ]);
    });

    it("groups choice inputs correctly", () => {
      const registry = createDefaultInputRegistry();
      const choiceInputs = registry.getByCategory("choice");
      expect(choiceInputs.map((i) => i.id).sort()).toEqual([
        "checkbox",
        "multiselect",
        "select",
      ]);
    });

    it("groups date inputs correctly", () => {
      const registry = createDefaultInputRegistry();
      const dateInputs = registry.getByCategory("date");
      expect(dateInputs.map((i) => i.id)).toEqual(["date"]);
    });

    it("groups file inputs correctly", () => {
      const registry = createDefaultInputRegistry();
      const fileInputs = registry.getByCategory("file");
      expect(fileInputs.map((i) => i.id)).toEqual(["file"]);
    });
  });
});
