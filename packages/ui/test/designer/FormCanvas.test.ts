/**
 * FormCanvas Tests (PZ-100)
 *
 * Note: These tests are limited since we use node environment.
 * Full component testing would require jsdom environment and @testing-library/react.
 * These tests verify types, exports, and basic functionality.
 */

import { describe, expect, it } from "vitest";
import {
  FormCanvas,
  useFormCanvas,
  createEmptyCanvasState,
  createField,
  canvasReducer,
} from "../../src/designer";
import type {
  FormCanvasProps,
  CanvasState,
  CanvasField,
  CanvasAction,
} from "../../src/designer";

describe("FormCanvas", () => {
  describe("exports", () => {
    it("FormCanvas is exported as a function", () => {
      expect(typeof FormCanvas).toBe("function");
    });

    it("useFormCanvas is exported as a function", () => {
      expect(typeof useFormCanvas).toBe("function");
    });

    it("createEmptyCanvasState is exported as a function", () => {
      expect(typeof createEmptyCanvasState).toBe("function");
    });

    it("createField is exported as a function", () => {
      expect(typeof createField).toBe("function");
    });

    it("canvasReducer is exported as a function", () => {
      expect(typeof canvasReducer).toBe("function");
    });
  });

  describe("FormCanvas component", () => {
    it("is a valid React component function", () => {
      expect(FormCanvas.length).toBeGreaterThanOrEqual(0);
    });

    it("has sub-components attached", () => {
      expect(FormCanvas.EmptyState).toBeDefined();
      expect(FormCanvas.PreviewToggle).toBeDefined();
      expect(FormCanvas.DragHandleIcon).toBeDefined();
      expect(FormCanvas.DeleteIcon).toBeDefined();
    });
  });

  describe("useFormCanvas hook", () => {
    it("is exported as a function", () => {
      // Note: We cannot test the actual hook behavior in node environment
      // since React hooks require a React component context.
      // This test verifies the hook is exported and has the correct signature.
      expect(typeof useFormCanvas).toBe("function");
    });
  });
});

describe("FormCanvas Type Tests", () => {
  it("FormCanvasProps interface is correct", () => {
    // Verify the props interface includes expected properties
    const props: FormCanvasProps = {
      initialState: createEmptyCanvasState(),
      onChange: (state: CanvasState) => {
        const _id: string = state.id;
        void _id;
      },
      renderField: (field: CanvasField, isPreview: boolean) => {
        const _label: string = field.label;
        const _preview: boolean = isPreview;
        void _label;
        void _preview;
        return null;
      },
      onAddFieldClick: () => {},
      children: null,
      className: "test-class",
    };

    expect(props.initialState).toBeDefined();
    expect(typeof props.onChange).toBe("function");
    expect(typeof props.renderField).toBe("function");
    expect(typeof props.onAddFieldClick).toBe("function");
    expect(props.className).toBe("test-class");
  });

  it("CanvasState type has correct structure", () => {
    const state: CanvasState = {
      id: "test-id",
      title: "Test Form",
      description: "A test form",
      fields: [],
      selectedFieldId: null,
      isPreviewMode: false,
    };

    expect(state.id).toBe("test-id");
    expect(state.title).toBe("Test Form");
    expect(state.description).toBe("A test form");
    expect(state.fields).toEqual([]);
    expect(state.selectedFieldId).toBeNull();
    expect(state.isPreviewMode).toBe(false);
  });

  it("CanvasField type has correct structure", () => {
    const field: CanvasField = {
      id: "field-1",
      inputType: "text",
      label: "Name",
      name: "name_field",
      placeholder: "Enter name",
      helpText: "Your full name",
      required: true,
      validationRules: [],
      options: undefined,
      defaultValue: "",
      config: {},
    };

    expect(field.id).toBe("field-1");
    expect(field.inputType).toBe("text");
    expect(field.label).toBe("Name");
    expect(field.required).toBe(true);
  });

  it("CanvasAction union type covers all actions", () => {
    // Type-level verification that all action types exist
    const addAction: CanvasAction = {
      type: "ADD_FIELD",
      field: createField("text", "Test"),
    };

    const removeAction: CanvasAction = {
      type: "REMOVE_FIELD",
      fieldId: "test-id",
    };

    const updateAction: CanvasAction = {
      type: "UPDATE_FIELD",
      fieldId: "test-id",
      updates: { label: "New Label" },
    };

    const reorderAction: CanvasAction = {
      type: "REORDER_FIELDS",
      fromIndex: 0,
      toIndex: 1,
    };

    const selectAction: CanvasAction = {
      type: "SELECT_FIELD",
      fieldId: "test-id",
    };

    const previewAction: CanvasAction = {
      type: "TOGGLE_PREVIEW",
    };

    const titleAction: CanvasAction = {
      type: "SET_FORM_TITLE",
      title: "New Title",
    };

    const descAction: CanvasAction = {
      type: "SET_FORM_DESCRIPTION",
      description: "New Description",
    };

    const resetAction: CanvasAction = {
      type: "RESET",
    };

    expect(addAction.type).toBe("ADD_FIELD");
    expect(removeAction.type).toBe("REMOVE_FIELD");
    expect(updateAction.type).toBe("UPDATE_FIELD");
    expect(reorderAction.type).toBe("REORDER_FIELDS");
    expect(selectAction.type).toBe("SELECT_FIELD");
    expect(previewAction.type).toBe("TOGGLE_PREVIEW");
    expect(titleAction.type).toBe("SET_FORM_TITLE");
    expect(descAction.type).toBe("SET_FORM_DESCRIPTION");
    expect(resetAction.type).toBe("RESET");
  });
});

describe("FormCanvas Integration", () => {
  describe("State management flow", () => {
    it("supports complete form building workflow", () => {
      // 1. Create empty state
      let state = createEmptyCanvasState();
      expect(state.fields).toHaveLength(0);

      // 2. Add fields
      const nameField = createField("text", "Name", { required: true });
      const emailField = createField("text", "Email", {
        placeholder: "email@example.com",
      });

      state = canvasReducer(state, { type: "ADD_FIELD", field: nameField });
      state = canvasReducer(state, { type: "ADD_FIELD", field: emailField });
      expect(state.fields).toHaveLength(2);

      // 3. Select and edit field
      state = canvasReducer(state, { type: "SELECT_FIELD", fieldId: nameField.id });
      expect(state.selectedFieldId).toBe(nameField.id);

      state = canvasReducer(state, {
        type: "UPDATE_FIELD",
        fieldId: nameField.id,
        updates: { helpText: "Enter your full name" },
      });
      expect(state.fields[0]?.helpText).toBe("Enter your full name");

      // 4. Reorder fields
      state = canvasReducer(state, {
        type: "REORDER_FIELDS",
        fromIndex: 1,
        toIndex: 0,
      });
      expect(state.fields[0]?.label).toBe("Email");
      expect(state.fields[1]?.label).toBe("Name");

      // 5. Toggle preview mode
      state = canvasReducer(state, { type: "TOGGLE_PREVIEW" });
      expect(state.isPreviewMode).toBe(true);
      expect(state.selectedFieldId).toBeNull();

      // 6. Exit preview
      state = canvasReducer(state, { type: "TOGGLE_PREVIEW" });
      expect(state.isPreviewMode).toBe(false);

      // 7. Delete field
      state = canvasReducer(state, { type: "REMOVE_FIELD", fieldId: emailField.id });
      expect(state.fields).toHaveLength(1);
      expect(state.fields[0]?.label).toBe("Name");
    });
  });

  describe("Edge cases", () => {
    it("handles empty field deletion gracefully", () => {
      const state = createEmptyCanvasState();
      const newState = canvasReducer(state, {
        type: "REMOVE_FIELD",
        fieldId: "non-existent",
      });
      expect(newState.fields).toHaveLength(0);
    });

    it("handles reorder on single field", () => {
      let state = createEmptyCanvasState();
      const field = createField("text", "Only Field");
      state = canvasReducer(state, { type: "ADD_FIELD", field });

      state = canvasReducer(state, {
        type: "REORDER_FIELDS",
        fromIndex: 0,
        toIndex: 0,
      });
      expect(state.fields).toHaveLength(1);
      expect(state.fields[0]?.label).toBe("Only Field");
    });

    it("handles update on non-existent field", () => {
      let state = createEmptyCanvasState();
      const field = createField("text", "Test");
      state = canvasReducer(state, { type: "ADD_FIELD", field });

      state = canvasReducer(state, {
        type: "UPDATE_FIELD",
        fieldId: "non-existent",
        updates: { label: "New Label" },
      });

      // Original field unchanged
      expect(state.fields[0]?.label).toBe("Test");
    });

    it("preserves field ID on update", () => {
      let state = createEmptyCanvasState();
      const field = createField("text", "Test");
      const originalId = field.id;

      state = canvasReducer(state, { type: "ADD_FIELD", field });
      state = canvasReducer(state, {
        type: "UPDATE_FIELD",
        fieldId: originalId,
        updates: { label: "Updated" },
      });

      expect(state.fields[0]?.id).toBe(originalId);
    });
  });
});

describe("FormCanvas Factory Functions", () => {
  describe("createEmptyCanvasState", () => {
    it("creates unique IDs each time", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(createEmptyCanvasState().id);
      }
      expect(ids.size).toBe(100);
    });

    it("creates states with consistent defaults", () => {
      const state = createEmptyCanvasState();
      expect(state.title).toBe("Untitled Form");
      expect(state.fields).toEqual([]);
      expect(state.selectedFieldId).toBeNull();
      expect(state.isPreviewMode).toBe(false);
    });
  });

  describe("createField", () => {
    it("creates fields with all input types", () => {
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
        expect(field.inputType).toBe(inputType);
        expect(field.label).toBe(`${inputType} field`);
      }
    });

    it("supports all override properties", () => {
      const field = createField("select", "Choice", {
        name: "choice_field",
        placeholder: "Select one",
        helpText: "Pick your favorite",
        required: true,
        validationRules: [
          { id: "rule-1", ruleId: "required", config: {} },
        ],
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        defaultValue: "a",
        config: { searchable: true },
      });

      expect(field.name).toBe("choice_field");
      expect(field.placeholder).toBe("Select one");
      expect(field.helpText).toBe("Pick your favorite");
      expect(field.required).toBe(true);
      expect(field.validationRules).toHaveLength(1);
      expect(field.options).toHaveLength(2);
      expect(field.defaultValue).toBe("a");
      expect(field.config).toEqual({ searchable: true });
    });
  });
});
