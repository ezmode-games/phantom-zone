import { describe, expect, it } from "vitest";
import {
  generateUUIDv7,
  createEmptyCanvasState,
  createField,
  canvasReducer,
  CanvasFieldSchema,
  CanvasStateSchema,
  AppliedValidationRuleSchema,
  FieldOptionSchema,
  type CanvasState,
  type CanvasField,
  type CanvasAction,
} from "../../src/designer/types";

describe("generateUUIDv7", () => {
  it("generates a valid UUID format", () => {
    const uuid = generateUUIDv7();
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("generates version 7 UUIDs", () => {
    const uuid = generateUUIDv7();
    // Version is in position 14 (0-indexed), should be "7"
    expect(uuid[14]).toBe("7");
  });

  it("generates unique UUIDs", () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      uuids.add(generateUUIDv7());
    }
    expect(uuids.size).toBe(1000);
  });

  it("generates time-sortable UUIDs", () => {
    const uuid1 = generateUUIDv7();
    // Small delay to ensure different timestamp
    const start = Date.now();
    while (Date.now() - start < 2) {
      // busy wait
    }
    const uuid2 = generateUUIDv7();

    // First 8 characters represent the high bits of timestamp
    expect(uuid1 < uuid2).toBe(true);
  });
});

describe("Zod Schemas", () => {
  describe("AppliedValidationRuleSchema", () => {
    it("validates a valid rule", () => {
      const rule = {
        id: "rule-1",
        ruleId: "required",
        config: {},
      };
      const result = AppliedValidationRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it("validates a rule with config", () => {
      const rule = {
        id: "rule-2",
        ruleId: "minLength",
        config: { value: 5, message: "Too short" },
      };
      const result = AppliedValidationRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it("rejects rule without id", () => {
      const rule = {
        ruleId: "required",
        config: {},
      };
      const result = AppliedValidationRuleSchema.safeParse(rule);
      expect(result.success).toBe(false);
    });
  });

  describe("FieldOptionSchema", () => {
    it("validates a minimal option", () => {
      const option = { value: "a", label: "Option A" };
      const result = FieldOptionSchema.safeParse(option);
      expect(result.success).toBe(true);
    });

    it("validates an option with disabled", () => {
      const option = { value: "b", label: "Option B", disabled: true };
      const result = FieldOptionSchema.safeParse(option);
      expect(result.success).toBe(true);
    });
  });

  describe("CanvasFieldSchema", () => {
    it("validates a minimal field", () => {
      const field = {
        id: generateUUIDv7(),
        inputType: "text",
        label: "Name",
      };
      const result = CanvasFieldSchema.safeParse(field);
      expect(result.success).toBe(true);
    });

    it("validates a full field", () => {
      const field = {
        id: generateUUIDv7(),
        inputType: "select",
        label: "Color",
        name: "color_field",
        placeholder: "Select a color",
        helpText: "Choose your favorite color",
        required: true,
        validationRules: [
          { id: "rule-1", ruleId: "required", config: {} },
        ],
        options: [
          { value: "red", label: "Red" },
          { value: "blue", label: "Blue" },
        ],
        defaultValue: "red",
        config: { searchable: true },
      };
      const result = CanvasFieldSchema.safeParse(field);
      expect(result.success).toBe(true);
    });

    it("applies default values", () => {
      const field = {
        id: generateUUIDv7(),
        inputType: "text",
        label: "Name",
      };
      const result = CanvasFieldSchema.parse(field);
      expect(result.required).toBe(false);
      expect(result.validationRules).toEqual([]);
    });
  });

  describe("CanvasStateSchema", () => {
    it("validates an empty state", () => {
      const state = {
        id: generateUUIDv7(),
      };
      const result = CanvasStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it("validates a full state", () => {
      const state = {
        id: generateUUIDv7(),
        title: "My Form",
        description: "A test form",
        fields: [
          { id: generateUUIDv7(), inputType: "text", label: "Name" },
        ],
        selectedFieldId: null,
        isPreviewMode: false,
      };
      const result = CanvasStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it("applies default values", () => {
      const state = {
        id: generateUUIDv7(),
      };
      const result = CanvasStateSchema.parse(state);
      expect(result.title).toBe("Untitled Form");
      expect(result.fields).toEqual([]);
      expect(result.selectedFieldId).toBeNull();
      expect(result.isPreviewMode).toBe(false);
    });
  });
});

describe("createEmptyCanvasState", () => {
  it("creates a state with a valid UUID", () => {
    const state = createEmptyCanvasState();
    expect(state.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("creates a state with default values", () => {
    const state = createEmptyCanvasState();
    expect(state.title).toBe("Untitled Form");
    expect(state.description).toBeUndefined();
    expect(state.fields).toEqual([]);
    expect(state.selectedFieldId).toBeNull();
    expect(state.isPreviewMode).toBe(false);
  });

  it("creates unique states", () => {
    const state1 = createEmptyCanvasState();
    const state2 = createEmptyCanvasState();
    expect(state1.id).not.toBe(state2.id);
  });
});

describe("createField", () => {
  it("creates a field with required properties", () => {
    const field = createField("text", "Email");
    expect(field.inputType).toBe("text");
    expect(field.label).toBe("Email");
    expect(field.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("creates a field with default values", () => {
    const field = createField("text", "Name");
    expect(field.required).toBe(false);
    expect(field.validationRules).toEqual([]);
    expect(field.placeholder).toBeUndefined();
    expect(field.helpText).toBeUndefined();
    expect(field.options).toBeUndefined();
    expect(field.defaultValue).toBeUndefined();
    expect(field.config).toBeUndefined();
  });

  it("accepts overrides", () => {
    const field = createField("text", "Name", {
      placeholder: "Enter name",
      required: true,
      helpText: "Your full name",
    });
    expect(field.placeholder).toBe("Enter name");
    expect(field.required).toBe(true);
    expect(field.helpText).toBe("Your full name");
  });

  it("creates unique fields", () => {
    const field1 = createField("text", "Name");
    const field2 = createField("text", "Name");
    expect(field1.id).not.toBe(field2.id);
  });
});

describe("canvasReducer", () => {
  let initialState: CanvasState;

  beforeEach(() => {
    initialState = createEmptyCanvasState();
  });

  describe("ADD_FIELD", () => {
    it("adds a field to empty state", () => {
      const field = createField("text", "Name");
      const newState = canvasReducer(initialState, {
        type: "ADD_FIELD",
        field,
      });
      expect(newState.fields).toHaveLength(1);
      expect(newState.fields[0]).toBe(field);
    });

    it("selects the added field", () => {
      const field = createField("text", "Name");
      const newState = canvasReducer(initialState, {
        type: "ADD_FIELD",
        field,
      });
      expect(newState.selectedFieldId).toBe(field.id);
    });

    it("adds field at specified index", () => {
      const field1 = createField("text", "First");
      const field2 = createField("text", "Second");
      const field3 = createField("text", "Third");

      let state = canvasReducer(initialState, { type: "ADD_FIELD", field: field1 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field3 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field2, index: 1 });

      expect(state.fields).toHaveLength(3);
      expect(state.fields[0]?.label).toBe("First");
      expect(state.fields[1]?.label).toBe("Second");
      expect(state.fields[2]?.label).toBe("Third");
    });

    it("adds field at end when index exceeds length", () => {
      const field1 = createField("text", "First");
      const field2 = createField("text", "Second");

      let state = canvasReducer(initialState, { type: "ADD_FIELD", field: field1 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field2, index: 100 });

      expect(state.fields).toHaveLength(2);
      expect(state.fields[1]?.label).toBe("Second");
    });
  });

  describe("REMOVE_FIELD", () => {
    it("removes a field", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      state = canvasReducer(state, { type: "REMOVE_FIELD", fieldId: field.id });

      expect(state.fields).toHaveLength(0);
    });

    it("clears selection when selected field is removed", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      expect(state.selectedFieldId).toBe(field.id);

      state = canvasReducer(state, { type: "REMOVE_FIELD", fieldId: field.id });
      expect(state.selectedFieldId).toBeNull();
    });

    it("preserves selection when other field is removed", () => {
      const field1 = createField("text", "First");
      const field2 = createField("text", "Second");

      let state = canvasReducer(initialState, { type: "ADD_FIELD", field: field1 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field2 });
      state = canvasReducer(state, { type: "SELECT_FIELD", fieldId: field1.id });
      state = canvasReducer(state, { type: "REMOVE_FIELD", fieldId: field2.id });

      expect(state.selectedFieldId).toBe(field1.id);
    });

    it("handles removing non-existent field", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      state = canvasReducer(state, { type: "REMOVE_FIELD", fieldId: "non-existent" });

      expect(state.fields).toHaveLength(1);
    });
  });

  describe("UPDATE_FIELD", () => {
    it("updates field properties", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      state = canvasReducer(state, {
        type: "UPDATE_FIELD",
        fieldId: field.id,
        updates: { label: "Full Name", placeholder: "Enter your name" },
      });

      expect(state.fields[0]?.label).toBe("Full Name");
      expect(state.fields[0]?.placeholder).toBe("Enter your name");
    });

    it("preserves other fields", () => {
      const field1 = createField("text", "First");
      const field2 = createField("text", "Second");

      let state = canvasReducer(initialState, { type: "ADD_FIELD", field: field1 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field2 });
      state = canvasReducer(state, {
        type: "UPDATE_FIELD",
        fieldId: field1.id,
        updates: { label: "Updated First" },
      });

      expect(state.fields[0]?.label).toBe("Updated First");
      expect(state.fields[1]?.label).toBe("Second");
    });

    it("handles updating non-existent field", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      state = canvasReducer(state, {
        type: "UPDATE_FIELD",
        fieldId: "non-existent",
        updates: { label: "New Label" },
      });

      expect(state.fields[0]?.label).toBe("Name");
    });
  });

  describe("REORDER_FIELDS", () => {
    it("reorders fields from earlier to later position", () => {
      const field1 = createField("text", "First");
      const field2 = createField("text", "Second");
      const field3 = createField("text", "Third");

      let state = canvasReducer(initialState, { type: "ADD_FIELD", field: field1 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field2 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field3 });

      state = canvasReducer(state, {
        type: "REORDER_FIELDS",
        fromIndex: 0,
        toIndex: 2,
      });

      expect(state.fields.map((f) => f.label)).toEqual(["Second", "Third", "First"]);
    });

    it("reorders fields from later to earlier position", () => {
      const field1 = createField("text", "First");
      const field2 = createField("text", "Second");
      const field3 = createField("text", "Third");

      let state = canvasReducer(initialState, { type: "ADD_FIELD", field: field1 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field2 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field3 });

      state = canvasReducer(state, {
        type: "REORDER_FIELDS",
        fromIndex: 2,
        toIndex: 0,
      });

      expect(state.fields.map((f) => f.label)).toEqual(["Third", "First", "Second"]);
    });

    it("handles same index", () => {
      const field1 = createField("text", "First");
      const field2 = createField("text", "Second");

      let state = canvasReducer(initialState, { type: "ADD_FIELD", field: field1 });
      state = canvasReducer(state, { type: "ADD_FIELD", field: field2 });

      state = canvasReducer(state, {
        type: "REORDER_FIELDS",
        fromIndex: 0,
        toIndex: 0,
      });

      expect(state.fields.map((f) => f.label)).toEqual(["First", "Second"]);
    });
  });

  describe("SELECT_FIELD", () => {
    it("selects a field", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      // Selecting another adds it, so we need to select the first one
      state = canvasReducer(state, { type: "SELECT_FIELD", fieldId: field.id });

      expect(state.selectedFieldId).toBe(field.id);
    });

    it("clears selection with null", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      state = canvasReducer(state, { type: "SELECT_FIELD", fieldId: null });

      expect(state.selectedFieldId).toBeNull();
    });
  });

  describe("TOGGLE_PREVIEW", () => {
    it("toggles preview mode on", () => {
      const newState = canvasReducer(initialState, { type: "TOGGLE_PREVIEW" });
      expect(newState.isPreviewMode).toBe(true);
    });

    it("toggles preview mode off", () => {
      let state = canvasReducer(initialState, { type: "TOGGLE_PREVIEW" });
      state = canvasReducer(state, { type: "TOGGLE_PREVIEW" });
      expect(state.isPreviewMode).toBe(false);
    });

    it("clears selection when entering preview mode", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      expect(state.selectedFieldId).toBe(field.id);

      state = canvasReducer(state, { type: "TOGGLE_PREVIEW" });
      expect(state.selectedFieldId).toBeNull();
    });

    it("preserves selection state when exiting preview mode", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      state = canvasReducer(state, { type: "TOGGLE_PREVIEW" }); // enter preview
      state = canvasReducer(state, { type: "TOGGLE_PREVIEW" }); // exit preview

      // Selection was cleared on enter, remains cleared
      expect(state.selectedFieldId).toBeNull();
    });
  });

  describe("SET_FORM_TITLE", () => {
    it("sets the form title", () => {
      const newState = canvasReducer(initialState, {
        type: "SET_FORM_TITLE",
        title: "Contact Form",
      });
      expect(newState.title).toBe("Contact Form");
    });
  });

  describe("SET_FORM_DESCRIPTION", () => {
    it("sets the form description", () => {
      const newState = canvasReducer(initialState, {
        type: "SET_FORM_DESCRIPTION",
        description: "Please fill out this form",
      });
      expect(newState.description).toBe("Please fill out this form");
    });
  });

  describe("RESET", () => {
    it("resets to empty state", () => {
      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      state = canvasReducer(state, { type: "RESET" });

      expect(state.fields).toHaveLength(0);
      expect(state.id).not.toBe(initialState.id); // New ID
    });

    it("resets to provided state", () => {
      const customState: CanvasState = {
        id: "custom-id",
        title: "Custom Form",
        description: "Custom description",
        fields: [createField("text", "Custom Field")],
        selectedFieldId: null,
        isPreviewMode: true,
      };

      const field = createField("text", "Name");
      let state = canvasReducer(initialState, { type: "ADD_FIELD", field });
      state = canvasReducer(state, { type: "RESET", state: customState });

      expect(state).toBe(customState);
      expect(state.title).toBe("Custom Form");
    });
  });
});

describe("Integration: Schema validation with reducer output", () => {
  it("reducer output is always valid according to schema", () => {
    let state = createEmptyCanvasState();

    // Perform various operations
    const field1 = createField("text", "Name");
    const field2 = createField("select", "Color", {
      options: [
        { value: "red", label: "Red" },
        { value: "blue", label: "Blue" },
      ],
    });

    state = canvasReducer(state, { type: "ADD_FIELD", field: field1 });
    state = canvasReducer(state, { type: "ADD_FIELD", field: field2 });
    state = canvasReducer(state, {
      type: "UPDATE_FIELD",
      fieldId: field1.id,
      updates: { required: true, placeholder: "Enter name" },
    });
    state = canvasReducer(state, { type: "SET_FORM_TITLE", title: "Test Form" });
    state = canvasReducer(state, { type: "TOGGLE_PREVIEW" });

    // Validate final state
    const result = CanvasStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });
});
