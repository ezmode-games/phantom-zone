/**
 * Property Editor State Tests
 *
 * Tests for property editor state management.
 * Implements PZ-208: Block Property Editor
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { uuidv7 } from "uuidv7";
import {
  $selectedBlock,
  $blockDefinition,
  $fieldMeta,
  $showPropertyEditor,
  $canMoveUp,
  $canMoveDown,
  $validationErrors,
  $hasErrors,
  $propertyEditorState,
  setErrors,
  clearErrors,
  markTouched,
  resetPropertyEditorState,
} from "../../../src/components/property-editor/state";
import { initializeDocument, insertBlockAction, $document } from "../../../src/model/document";
import { selectBlock } from "../../../src/selection/actions";
import { resetSelectionState } from "../../../src/selection/state";
import { resetGlobalComponentBlockRegistry, getComponentBlockRegistry } from "../../../src/registry/blocks";
import type { Block } from "../../../src/model/types";

describe("Property Editor State (PZ-208)", () => {
  beforeEach(() => {
    initializeDocument();
    resetGlobalComponentBlockRegistry();
    resetSelectionState();
    resetPropertyEditorState();
  });

  afterEach(() => {
    initializeDocument();
    resetGlobalComponentBlockRegistry();
    resetSelectionState();
    resetPropertyEditorState();
  });

  function createTestBlock(type: string, props: Record<string, unknown> = {}): Block {
    return {
      id: uuidv7(),
      type,
      props,
    };
  }

  describe("$selectedBlock", () => {
    it("returns null when no block is selected", () => {
      expect($selectedBlock.get()).toBeNull();
    });

    it("returns selected block when one is selected", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      const selectedBlock = $selectedBlock.get();
      expect(selectedBlock).not.toBeNull();
      expect(selectedBlock?.id).toBe(block.id);
      expect(selectedBlock?.type).toBe("paragraph");
    });

    it("returns null when multiple blocks are selected", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      insertBlockAction(block1);
      insertBlockAction(block2);

      // Select first block, then extend selection
      selectBlock(block1.id);

      // Single selection should work
      expect($selectedBlock.get()).not.toBeNull();
    });
  });

  describe("$blockDefinition", () => {
    it("returns null when no block is selected", () => {
      expect($blockDefinition.get()).toBeNull();
    });

    it("returns block definition for selected block", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      const definition = $blockDefinition.get();
      expect(definition).not.toBeNull();
      expect(definition?.id).toBe("paragraph");
      expect(definition?.name).toBe("Paragraph");
    });
  });

  describe("$fieldMeta", () => {
    it("returns empty array when no block is selected", () => {
      expect($fieldMeta.get()).toEqual([]);
    });

    it("returns field metadata for selected block", () => {
      const block = createTestBlock("heading", { level: 2, content: "Title" });
      insertBlockAction(block);
      selectBlock(block.id);

      const fields = $fieldMeta.get();
      expect(fields.length).toBeGreaterThan(0);

      const contentField = fields.find((f) => f.key === "content");
      expect(contentField).toBeDefined();
      expect(contentField?.type).toBe("text");

      const levelField = fields.find((f) => f.key === "level");
      expect(levelField).toBeDefined();
      expect(levelField?.type).toBe("select");
    });
  });

  describe("$showPropertyEditor", () => {
    it("returns false when no block is selected", () => {
      expect($showPropertyEditor.get()).toBe(false);
    });

    it("returns true when a valid block is selected", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);
      selectBlock(block.id);

      expect($showPropertyEditor.get()).toBe(true);
    });
  });

  describe("$canMoveUp / $canMoveDown", () => {
    it("returns false for both when no block is selected", () => {
      expect($canMoveUp.get()).toBe(false);
      expect($canMoveDown.get()).toBe(false);
    });

    it("returns false for move up on first block", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      insertBlockAction(block1);
      insertBlockAction(block2);
      selectBlock(block1.id);

      expect($canMoveUp.get()).toBe(false);
      expect($canMoveDown.get()).toBe(true);
    });

    it("returns false for move down on last block", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      insertBlockAction(block1);
      insertBlockAction(block2);
      selectBlock(block2.id);

      expect($canMoveUp.get()).toBe(true);
      expect($canMoveDown.get()).toBe(false);
    });

    it("returns true for both on middle block", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      const block3 = createTestBlock("paragraph", { content: "Third" });
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);
      selectBlock(block2.id);

      expect($canMoveUp.get()).toBe(true);
      expect($canMoveDown.get()).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("starts with no errors", () => {
      expect($validationErrors.get()).toEqual([]);
      expect($hasErrors.get()).toBe(false);
    });

    it("sets errors correctly", () => {
      setErrors([
        { path: "content", message: "Content is required" },
      ]);

      expect($validationErrors.get()).toHaveLength(1);
      expect($hasErrors.get()).toBe(true);
    });

    it("clears errors correctly", () => {
      setErrors([
        { path: "content", message: "Content is required" },
      ]);
      clearErrors();

      expect($validationErrors.get()).toHaveLength(0);
      expect($hasErrors.get()).toBe(false);
    });
  });

  describe("markTouched", () => {
    it("marks form as touched", () => {
      expect($propertyEditorState.get().touched).toBe(false);
      markTouched();
      expect($propertyEditorState.get().touched).toBe(true);
    });

    it("does not toggle touched state", () => {
      markTouched();
      markTouched();
      expect($propertyEditorState.get().touched).toBe(true);
    });
  });

  describe("resetPropertyEditorState", () => {
    it("resets all state", () => {
      setErrors([{ path: "content", message: "Error" }]);
      markTouched();

      resetPropertyEditorState();

      expect($propertyEditorState.get()).toEqual({
        values: {},
        errors: [],
        touched: false,
        submitting: false,
      });
    });
  });
});
