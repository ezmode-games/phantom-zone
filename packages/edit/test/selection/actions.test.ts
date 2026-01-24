import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import {
  initializeDocument,
  insertBlockAction,
  $selectedBlockId,
} from "../../src/model/document";
import type { Block } from "../../src/model/types";
import {
  clearFocus,
  clearSelection,
  deselectBlock,
  enterEditMode,
  escape,
  exitEditMode,
  extendSelectionDown,
  extendSelectionUp,
  focusBlock,
  focusDirection,
  focusNext,
  focusPrev,
  selectAll,
  selectBlock,
  selectFocused,
  selectRange,
  toggleFocused,
  toggleSelection,
} from "../../src/selection/actions";
import {
  $focus,
  $multiSelection,
  resetSelectionState,
} from "../../src/selection/state";

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

describe("Selection Actions", () => {
  beforeEach(() => {
    initializeDocument();
    resetSelectionState();
  });

  afterEach(() => {
    initializeDocument();
    resetSelectionState();
  });

  describe("selectBlock", () => {
    it("selects a single block", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      const result = selectBlock(block.id);

      expect(result.ok).toBe(true);
      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(1);
      expect(state.selectedIds.has(block.id)).toBe(true);
    });

    it("clears previous selection", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block1.id);
      selectBlock(block2.id);

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(1);
      expect(state.selectedIds.has(block2.id)).toBe(true);
      expect(state.selectedIds.has(block1.id)).toBe(false);
    });

    it("sets anchor and last selected", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);

      const state = $multiSelection.get();
      expect(state.anchorId).toBe(block.id);
      expect(state.lastSelectedId).toBe(block.id);
    });

    it("updates legacy selection state", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);

      expect($selectedBlockId.get()).toBe(block.id);
    });

    it("focuses the selected block", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);

      expect($focus.get().focusedId).toBe(block.id);
      expect($focus.get().isEditing).toBe(false);
    });

    it("returns error for non-existent block", () => {
      const result = selectBlock("nonexistent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("BLOCK_NOT_FOUND");
      }
    });
  });

  describe("deselectBlock", () => {
    it("removes block from selection", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block1.id);
      toggleSelection(block2.id);
      deselectBlock(block1.id);

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(1);
      expect(state.selectedIds.has(block2.id)).toBe(true);
    });

    it("updates anchor if deselecting anchor", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block1.id);
      toggleSelection(block2.id);
      deselectBlock(block1.id);

      const state = $multiSelection.get();
      expect(state.anchorId).toBe(block2.id);
    });

    it("succeeds silently for unselected block", () => {
      const result = deselectBlock("nonexistent");
      expect(result.ok).toBe(true);
    });

    it("clears legacy selection when empty", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      deselectBlock(block.id);

      expect($selectedBlockId.get()).toBeNull();
    });
  });

  describe("toggleSelection", () => {
    it("adds unselected block to selection", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block1.id);
      toggleSelection(block2.id);

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(2);
      expect(state.selectedIds.has(block1.id)).toBe(true);
      expect(state.selectedIds.has(block2.id)).toBe(true);
    });

    it("removes selected block from selection", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      toggleSelection(block.id);

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(0);
    });

    it("updates last selected on toggle add", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block1.id);
      toggleSelection(block2.id);

      expect($multiSelection.get().lastSelectedId).toBe(block2.id);
    });

    it("returns error for non-existent block", () => {
      const result = toggleSelection("nonexistent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("BLOCK_NOT_FOUND");
      }
    });
  });

  describe("selectRange", () => {
    it("selects all blocks between anchor and target", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      const block3 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);

      selectBlock(block1.id);
      selectRange(block3.id);

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(3);
      expect(state.selectedIds.has(block1.id)).toBe(true);
      expect(state.selectedIds.has(block2.id)).toBe(true);
      expect(state.selectedIds.has(block3.id)).toBe(true);
    });

    it("keeps original anchor", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block1.id);
      selectRange(block2.id);

      expect($multiSelection.get().anchorId).toBe(block1.id);
    });

    it("updates last selected to target", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block1.id);
      selectRange(block2.id);

      expect($multiSelection.get().lastSelectedId).toBe(block2.id);
    });

    it("works when target is before anchor", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      const block3 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);

      selectBlock(block3.id);
      selectRange(block1.id);

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(3);
    });

    it("falls back to single select when no anchor", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      const result = selectRange(block.id);

      expect(result.ok).toBe(true);
      expect($multiSelection.get().selectedIds.size).toBe(1);
    });

    it("returns error for non-existent block", () => {
      const result = selectRange("nonexistent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("BLOCK_NOT_FOUND");
      }
    });
  });

  describe("clearSelection", () => {
    it("clears all selection", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      clearSelection();

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(0);
      expect(state.anchorId).toBeNull();
      expect(state.lastSelectedId).toBeNull();
    });

    it("updates legacy selection", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      clearSelection();

      expect($selectedBlockId.get()).toBeNull();
    });

    it("exits edit mode but keeps focus", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      enterEditMode();
      clearSelection();

      expect($focus.get().isEditing).toBe(false);
      expect($focus.get().focusedId).toBe(block.id);
    });
  });

  describe("selectAll", () => {
    it("selects all blocks in document", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      const block3 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);

      const result = selectAll();

      expect(result.ok).toBe(true);
      expect($multiSelection.get().selectedIds.size).toBe(3);
    });

    it("includes nested blocks", () => {
      const child = createTestBlock("paragraph");
      const parent = createTestBlock("section", {}, [child]);
      insertBlockAction(parent);

      selectAll();

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(2);
      expect(state.selectedIds.has(parent.id)).toBe(true);
      expect(state.selectedIds.has(child.id)).toBe(true);
    });

    it("returns error for empty document", () => {
      const result = selectAll();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NO_BLOCKS_AVAILABLE");
      }
    });
  });

  describe("focusBlock", () => {
    it("focuses a block without selecting", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      const result = focusBlock(block.id);

      expect(result.ok).toBe(true);
      expect($focus.get().focusedId).toBe(block.id);
      expect($multiSelection.get().selectedIds.size).toBe(0);
    });

    it("does not enter edit mode", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);

      expect($focus.get().isEditing).toBe(false);
    });

    it("returns error for non-existent block", () => {
      const result = focusBlock("nonexistent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("BLOCK_NOT_FOUND");
      }
    });
  });

  describe("focusNext", () => {
    it("moves focus to next block", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      focusBlock(block1.id);
      focusNext();

      expect($focus.get().focusedId).toBe(block2.id);
    });

    it("starts at first block when no focus", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusNext();

      expect($focus.get().focusedId).toBe(block.id);
    });

    it("stays at end when already at last block", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      const result = focusNext();

      expect(result.ok).toBe(true);
      expect($focus.get().focusedId).toBe(block.id);
    });

    it("returns error when in edit mode", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      enterEditMode();
      const result = focusNext();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ALREADY_EDITING");
      }
    });

    it("returns error for empty document", () => {
      const result = focusNext();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NO_BLOCKS_AVAILABLE");
      }
    });
  });

  describe("focusPrev", () => {
    it("moves focus to previous block", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      focusBlock(block2.id);
      focusPrev();

      expect($focus.get().focusedId).toBe(block1.id);
    });

    it("starts at last block when no focus", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusPrev();

      expect($focus.get().focusedId).toBe(block.id);
    });

    it("stays at beginning when already at first block", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      const result = focusPrev();

      expect(result.ok).toBe(true);
      expect($focus.get().focusedId).toBe(block.id);
    });
  });

  describe("focusDirection", () => {
    it("handles up direction", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      focusBlock(block2.id);
      focusDirection("up");

      expect($focus.get().focusedId).toBe(block1.id);
    });

    it("handles down direction", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      focusBlock(block1.id);
      focusDirection("down");

      expect($focus.get().focusedId).toBe(block2.id);
    });

    it("handles first direction", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      focusBlock(block2.id);
      focusDirection("first");

      expect($focus.get().focusedId).toBe(block1.id);
    });

    it("handles last direction", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      focusBlock(block1.id);
      focusDirection("last");

      expect($focus.get().focusedId).toBe(block2.id);
    });
  });

  describe("selectFocused", () => {
    it("selects the focused block", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      selectFocused();

      expect($multiSelection.get().selectedIds.has(block.id)).toBe(true);
    });

    it("returns error when no focus", () => {
      const result = selectFocused();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NO_BLOCKS_AVAILABLE");
      }
    });
  });

  describe("toggleFocused", () => {
    it("toggles selection of focused block", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      toggleFocused();

      expect($multiSelection.get().selectedIds.has(block.id)).toBe(true);

      toggleFocused();

      expect($multiSelection.get().selectedIds.size).toBe(0);
    });

    it("returns error when no focus", () => {
      const result = toggleFocused();

      expect(result.ok).toBe(false);
    });
  });

  describe("extendSelectionDown", () => {
    it("extends selection to next block", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block1.id);
      extendSelectionDown();

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(2);
      expect(state.selectedIds.has(block1.id)).toBe(true);
      expect(state.selectedIds.has(block2.id)).toBe(true);
    });

    it("does nothing when at end", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      const result = extendSelectionDown();

      expect(result.ok).toBe(true);
      expect($multiSelection.get().selectedIds.size).toBe(1);
    });
  });

  describe("extendSelectionUp", () => {
    it("extends selection to previous block", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      selectBlock(block2.id);
      extendSelectionUp();

      const state = $multiSelection.get();
      expect(state.selectedIds.size).toBe(2);
    });

    it("does nothing when at beginning", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      const result = extendSelectionUp();

      expect(result.ok).toBe(true);
      expect($multiSelection.get().selectedIds.size).toBe(1);
    });
  });

  describe("enterEditMode", () => {
    it("enters edit mode for focused block", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      const result = enterEditMode();

      expect(result.ok).toBe(true);
      expect($focus.get().isEditing).toBe(true);
    });

    it("returns error when no focus", () => {
      const result = enterEditMode();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NO_BLOCKS_AVAILABLE");
      }
    });

    it("succeeds silently when already editing", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      enterEditMode();
      const result = enterEditMode();

      expect(result.ok).toBe(true);
    });
  });

  describe("exitEditMode", () => {
    it("exits edit mode", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      enterEditMode();
      exitEditMode();

      expect($focus.get().isEditing).toBe(false);
      expect($focus.get().focusedId).toBe(block.id); // Focus maintained
    });

    it("succeeds silently when not editing", () => {
      const result = exitEditMode();
      expect(result.ok).toBe(true);
    });
  });

  describe("clearFocus", () => {
    it("clears focus entirely", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      clearFocus();

      expect($focus.get().focusedId).toBeNull();
      expect($focus.get().isEditing).toBe(false);
    });
  });

  describe("escape", () => {
    it("exits edit mode first", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      enterEditMode();
      escape();

      expect($focus.get().isEditing).toBe(false);
      expect($multiSelection.get().selectedIds.size).toBe(1); // Still selected
    });

    it("clears selection second", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      selectBlock(block.id);
      escape();

      expect($multiSelection.get().selectedIds.size).toBe(0);
      expect($focus.get().focusedId).toBe(block.id); // Still focused
    });

    it("clears focus third", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      focusBlock(block.id);
      escape();

      expect($focus.get().focusedId).toBeNull();
    });

    it("does nothing when nothing to clear", () => {
      escape(); // Should not throw
    });
  });
});
