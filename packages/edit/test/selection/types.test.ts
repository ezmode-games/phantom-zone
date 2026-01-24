import { describe, expect, it } from "vitest";
import {
  createInitialFocus,
  createInitialMultiSelection,
  createInitialSelectionFocus,
  createSelectionError,
  FocusStateSchema,
  MultiSelectionStateSchema,
  SelectionFocusStateSchema,
} from "../../src/selection/types";

describe("Selection Types", () => {
  describe("createInitialMultiSelection", () => {
    it("creates state with empty selected ids", () => {
      const state = createInitialMultiSelection();
      expect(state.selectedIds.size).toBe(0);
    });

    it("creates state with null anchor", () => {
      const state = createInitialMultiSelection();
      expect(state.anchorId).toBeNull();
    });

    it("creates state with null last selected", () => {
      const state = createInitialMultiSelection();
      expect(state.lastSelectedId).toBeNull();
    });
  });

  describe("createInitialFocus", () => {
    it("creates state with null focused id", () => {
      const state = createInitialFocus();
      expect(state.focusedId).toBeNull();
    });

    it("creates state with isEditing false", () => {
      const state = createInitialFocus();
      expect(state.isEditing).toBe(false);
    });
  });

  describe("createInitialSelectionFocus", () => {
    it("creates combined state with initial selection", () => {
      const state = createInitialSelectionFocus();
      expect(state.selection.selectedIds.size).toBe(0);
      expect(state.selection.anchorId).toBeNull();
    });

    it("creates combined state with initial focus", () => {
      const state = createInitialSelectionFocus();
      expect(state.focus.focusedId).toBeNull();
      expect(state.focus.isEditing).toBe(false);
    });
  });

  describe("createSelectionError", () => {
    it("creates error with code and message", () => {
      const error = createSelectionError(
        "BLOCK_NOT_FOUND",
        "Block not found: abc123"
      );
      expect(error.code).toBe("BLOCK_NOT_FOUND");
      expect(error.message).toBe("Block not found: abc123");
    });

    it("creates error with optional cause", () => {
      const cause = new Error("underlying error");
      const error = createSelectionError(
        "INVALID_RANGE",
        "Invalid range",
        cause
      );
      expect(error.cause).toBe(cause);
    });
  });

  describe("FocusStateSchema", () => {
    it("validates valid focus state", () => {
      const result = FocusStateSchema.safeParse({
        focusedId: "block-123",
        isEditing: true,
      });
      expect(result.success).toBe(true);
    });

    it("validates null focused id", () => {
      const result = FocusStateSchema.safeParse({
        focusedId: null,
        isEditing: false,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid focus state", () => {
      const result = FocusStateSchema.safeParse({
        focusedId: 123, // Should be string or null
        isEditing: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("MultiSelectionStateSchema", () => {
    it("validates valid multi-selection state", () => {
      const result = MultiSelectionStateSchema.safeParse({
        selectedIds: ["id1", "id2"],
        anchorId: "id1",
        lastSelectedId: "id2",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectedIds).toBeInstanceOf(Set);
        expect(result.data.selectedIds.size).toBe(2);
      }
    });

    it("transforms array to Set", () => {
      const result = MultiSelectionStateSchema.safeParse({
        selectedIds: ["a", "b", "c"],
        anchorId: null,
        lastSelectedId: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectedIds.has("a")).toBe(true);
        expect(result.data.selectedIds.has("b")).toBe(true);
        expect(result.data.selectedIds.has("c")).toBe(true);
      }
    });
  });

  describe("SelectionFocusStateSchema", () => {
    it("validates valid combined state", () => {
      const result = SelectionFocusStateSchema.safeParse({
        selection: {
          selectedIds: ["id1"],
          anchorId: "id1",
          lastSelectedId: "id1",
        },
        focus: {
          focusedId: "id1",
          isEditing: false,
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
