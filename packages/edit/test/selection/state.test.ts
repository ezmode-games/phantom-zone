import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import { initializeDocument, insertBlockAction } from "../../src/model/document";
import type { Block } from "../../src/model/types";
import {
  $anchorBlock,
  $focus,
  $focusedBlock,
  $focusedBlockId,
  $hasMultiSelection,
  $hasSelection,
  $isEditing,
  $lastSelectedBlock,
  $multiSelection,
  $selectedBlocks,
  $selectedIds,
  $selectionCount,
  getBlockAtFlatIndex,
  getBlockFlatIndex,
  getBlockRange,
  getFirstBlockId,
  getFlatBlockList,
  getLastBlockId,
  getNextBlockId,
  getPrevBlockId,
  isBlockFocused,
  isBlockSelected,
  resetSelectionState,
} from "../../src/selection/state";
import { createInitialFocus, createInitialMultiSelection } from "../../src/selection/types";

// Helper to create a test block
function createTestBlock(
  type: string,
  props: Record<string, unknown> = {},
  children?: Block[]
): Block {
  const block: Block = {
    id: uuidv7(),
    type,
    props,
  };
  if (children !== undefined) {
    block.children = children;
  }
  return block;
}

describe("Selection State", () => {
  beforeEach(() => {
    initializeDocument();
    resetSelectionState();
  });

  afterEach(() => {
    initializeDocument();
    resetSelectionState();
  });

  describe("$multiSelection atom", () => {
    it("starts with empty selection", () => {
      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(0);
      expect(state.anchorId).toBeNull();
      expect(state.lastSelectedId).toBeNull();
    });

    it("can be updated with new selection", () => {
      $multiSelection.set({
        selectedIds: new Set(["id1", "id2"]),
        anchorId: "id1",
        lastSelectedId: "id2",
      });

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(2);
      expect(state.anchorId).toBe("id1");
      expect(state.lastSelectedId).toBe("id2");
    });
  });

  describe("$focus atom", () => {
    it("starts with no focus", () => {
      const state = $focus.get();
      expect(state.focusedId).toBeNull();
      expect(state.isEditing).toBe(false);
    });

    it("can be updated with focus", () => {
      $focus.set({
        focusedId: "block-123",
        isEditing: true,
      });

      const state = $focus.get();
      expect(state.focusedId).toBe("block-123");
      expect(state.isEditing).toBe(true);
    });
  });

  describe("computed selection atoms", () => {
    beforeEach(() => {
      $multiSelection.set({
        selectedIds: new Set(["id1", "id2", "id3"]),
        anchorId: "id1",
        lastSelectedId: "id3",
      });
    });

    it("$selectedIds returns the set of selected IDs", () => {
      const ids = $selectedIds.get();
      expect(ids.size).toBe(3);
      expect(ids.has("id1")).toBe(true);
      expect(ids.has("id2")).toBe(true);
      expect(ids.has("id3")).toBe(true);
    });

    it("$selectionCount returns the count", () => {
      expect($selectionCount.get()).toBe(3);
    });

    it("$hasSelection returns true when blocks are selected", () => {
      expect($hasSelection.get()).toBe(true);
    });

    it("$hasSelection returns false when no blocks are selected", () => {
      $multiSelection.set(createInitialMultiSelection());
      expect($hasSelection.get()).toBe(false);
    });

    it("$hasMultiSelection returns true when multiple blocks are selected", () => {
      expect($hasMultiSelection.get()).toBe(true);
    });

    it("$hasMultiSelection returns false for single selection", () => {
      $multiSelection.set({
        selectedIds: new Set(["id1"]),
        anchorId: "id1",
        lastSelectedId: "id1",
      });
      expect($hasMultiSelection.get()).toBe(false);
    });
  });

  describe("computed focus atoms", () => {
    it("$focusedBlockId returns the focused block ID", () => {
      $focus.set({ focusedId: "block-abc", isEditing: false });
      expect($focusedBlockId.get()).toBe("block-abc");
    });

    it("$isEditing returns editing state", () => {
      $focus.set({ focusedId: "block-abc", isEditing: true });
      expect($isEditing.get()).toBe(true);
    });
  });

  describe("$anchorBlock", () => {
    it("returns null when no anchor", () => {
      expect($anchorBlock.get()).toBeNull();
    });

    it("returns the anchor block when set", () => {
      const block = createTestBlock("paragraph", { content: "Anchor" });
      insertBlockAction(block);

      $multiSelection.set({
        selectedIds: new Set([block.id]),
        anchorId: block.id,
        lastSelectedId: block.id,
      });

      const anchor = $anchorBlock.get();
      expect(anchor).not.toBeNull();
      expect(anchor?.id).toBe(block.id);
    });
  });

  describe("$lastSelectedBlock", () => {
    it("returns null when no last selected", () => {
      expect($lastSelectedBlock.get()).toBeNull();
    });

    it("returns the last selected block when set", () => {
      const block = createTestBlock("paragraph", { content: "Last" });
      insertBlockAction(block);

      $multiSelection.set({
        selectedIds: new Set([block.id]),
        anchorId: block.id,
        lastSelectedId: block.id,
      });

      const last = $lastSelectedBlock.get();
      expect(last).not.toBeNull();
      expect(last?.id).toBe(block.id);
    });
  });

  describe("$selectedBlocks", () => {
    it("returns empty array when no selection", () => {
      expect($selectedBlocks.get()).toEqual([]);
    });

    it("returns selected blocks in document order", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      const block3 = createTestBlock("paragraph", { content: "Third" });

      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);

      // Select in reverse order
      $multiSelection.set({
        selectedIds: new Set([block3.id, block1.id]),
        anchorId: block3.id,
        lastSelectedId: block1.id,
      });

      const selected = $selectedBlocks.get();
      expect(selected).toHaveLength(2);
      // Should be in document order, not selection order
      expect(selected[0]?.id).toBe(block1.id);
      expect(selected[1]?.id).toBe(block3.id);
    });

    it("includes nested blocks", () => {
      const child = createTestBlock("paragraph", { content: "Child" });
      const parent = createTestBlock("section", {}, [child]);
      insertBlockAction(parent);

      $multiSelection.set({
        selectedIds: new Set([child.id]),
        anchorId: child.id,
        lastSelectedId: child.id,
      });

      const selected = $selectedBlocks.get();
      expect(selected).toHaveLength(1);
      expect(selected[0]?.id).toBe(child.id);
    });
  });

  describe("$focusedBlock", () => {
    it("returns null when no focus", () => {
      expect($focusedBlock.get()).toBeNull();
    });

    it("returns the focused block", () => {
      const block = createTestBlock("paragraph", { content: "Focused" });
      insertBlockAction(block);

      $focus.set({ focusedId: block.id, isEditing: false });

      const focused = $focusedBlock.get();
      expect(focused).not.toBeNull();
      expect(focused?.id).toBe(block.id);
    });
  });

  describe("isBlockSelected", () => {
    it("returns true for selected block", () => {
      $multiSelection.set({
        selectedIds: new Set(["block-1"]),
        anchorId: "block-1",
        lastSelectedId: "block-1",
      });
      expect(isBlockSelected("block-1")).toBe(true);
    });

    it("returns false for unselected block", () => {
      $multiSelection.set({
        selectedIds: new Set(["block-1"]),
        anchorId: "block-1",
        lastSelectedId: "block-1",
      });
      expect(isBlockSelected("block-2")).toBe(false);
    });
  });

  describe("isBlockFocused", () => {
    it("returns true for focused block", () => {
      $focus.set({ focusedId: "block-1", isEditing: false });
      expect(isBlockFocused("block-1")).toBe(true);
    });

    it("returns false for unfocused block", () => {
      $focus.set({ focusedId: "block-1", isEditing: false });
      expect(isBlockFocused("block-2")).toBe(false);
    });
  });

  describe("getFlatBlockList", () => {
    it("returns empty array for empty document", () => {
      expect(getFlatBlockList()).toEqual([]);
    });

    it("returns block IDs in order", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      const list = getFlatBlockList();
      expect(list).toEqual([block1.id, block2.id]);
    });

    it("includes nested block IDs", () => {
      const child1 = createTestBlock("paragraph");
      const child2 = createTestBlock("paragraph");
      const parent = createTestBlock("section", {}, [child1, child2]);
      const sibling = createTestBlock("paragraph");

      insertBlockAction(parent);
      insertBlockAction(sibling);

      const list = getFlatBlockList();
      expect(list).toEqual([parent.id, child1.id, child2.id, sibling.id]);
    });
  });

  describe("getBlockFlatIndex", () => {
    it("returns -1 for non-existent block", () => {
      expect(getBlockFlatIndex("nonexistent")).toBe(-1);
    });

    it("returns correct index for block", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      expect(getBlockFlatIndex(block1.id)).toBe(0);
      expect(getBlockFlatIndex(block2.id)).toBe(1);
    });
  });

  describe("getBlockAtFlatIndex", () => {
    it("returns null for negative index", () => {
      expect(getBlockAtFlatIndex(-1)).toBeNull();
    });

    it("returns null for out of bounds index", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      expect(getBlockAtFlatIndex(5)).toBeNull();
    });

    it("returns block ID at index", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      expect(getBlockAtFlatIndex(0)).toBe(block1.id);
      expect(getBlockAtFlatIndex(1)).toBe(block2.id);
    });
  });

  describe("getNextBlockId", () => {
    it("returns null when at end", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      expect(getNextBlockId(block.id)).toBeNull();
    });

    it("returns null for non-existent block", () => {
      expect(getNextBlockId("nonexistent")).toBeNull();
    });

    it("returns next block ID", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      expect(getNextBlockId(block1.id)).toBe(block2.id);
    });
  });

  describe("getPrevBlockId", () => {
    it("returns null when at beginning", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      expect(getPrevBlockId(block.id)).toBeNull();
    });

    it("returns null for non-existent block", () => {
      expect(getPrevBlockId("nonexistent")).toBeNull();
    });

    it("returns previous block ID", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      expect(getPrevBlockId(block2.id)).toBe(block1.id);
    });
  });

  describe("getFirstBlockId", () => {
    it("returns null for empty document", () => {
      expect(getFirstBlockId()).toBeNull();
    });

    it("returns first block ID", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      expect(getFirstBlockId()).toBe(block1.id);
    });
  });

  describe("getLastBlockId", () => {
    it("returns null for empty document", () => {
      expect(getLastBlockId()).toBeNull();
    });

    it("returns last block ID", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      expect(getLastBlockId()).toBe(block2.id);
    });

    it("returns deepest last block for nested", () => {
      const child = createTestBlock("paragraph");
      const parent = createTestBlock("section", {}, [child]);
      insertBlockAction(parent);

      // Last in flat list is the child
      expect(getLastBlockId()).toBe(child.id);
    });
  });

  describe("getBlockRange", () => {
    it("returns empty array for non-existent start", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      expect(getBlockRange("nonexistent", block.id)).toEqual([]);
    });

    it("returns empty array for non-existent end", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      expect(getBlockRange(block.id, "nonexistent")).toEqual([]);
    });

    it("returns single block when start equals end", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      const range = getBlockRange(block.id, block.id);
      expect(range).toEqual([block.id]);
    });

    it("returns range in document order (start before end)", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      const block3 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);

      const range = getBlockRange(block1.id, block3.id);
      expect(range).toEqual([block1.id, block2.id, block3.id]);
    });

    it("returns range in document order (end before start)", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      const block3 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);

      // Reversed order
      const range = getBlockRange(block3.id, block1.id);
      expect(range).toEqual([block1.id, block2.id, block3.id]);
    });
  });

  describe("resetSelectionState", () => {
    it("resets selection to initial state", () => {
      $multiSelection.set({
        selectedIds: new Set(["id1"]),
        anchorId: "id1",
        lastSelectedId: "id1",
      });

      resetSelectionState();

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(0);
      expect(state.anchorId).toBeNull();
    });

    it("resets focus to initial state", () => {
      $focus.set({ focusedId: "block-1", isEditing: true });

      resetSelectionState();

      const state = $focus.get();
      expect(state.focusedId).toBeNull();
      expect(state.isEditing).toBe(false);
    });
  });
});
