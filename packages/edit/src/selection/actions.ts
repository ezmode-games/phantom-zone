/**
 * Selection & Focus Actions
 *
 * Actions for modifying selection and focus state.
 * Implements PZ-207: Block Selection & Focus
 */

import { findBlockById, $document, $selectedBlockId, $selection } from "../model/document";
import { ok, err } from "../model/types";
import {
  $focus,
  $multiSelection,
  getBlockRange,
  getFirstBlockId,
  getLastBlockId,
  getNextBlockId,
  getPrevBlockId,
  getFlatBlockList,
} from "./state";
import {
  createSelectionError,
  type FocusDirection,
  type SelectionResult,
} from "./types";

/**
 * Select a single block, clearing any previous selection
 */
export function selectBlock(blockId: string): SelectionResult<void> {
  const doc = $document.get();
  const block = findBlockById(doc.blocks, blockId);

  if (!block) {
    return err(
      createSelectionError("BLOCK_NOT_FOUND", `Block not found: ${blockId}`)
    );
  }

  // Update multi-selection state
  $multiSelection.set({
    selectedIds: new Set([blockId]),
    anchorId: blockId,
    lastSelectedId: blockId,
  });

  // Also update the legacy single selection for compatibility
  $selectedBlockId.set(blockId);
  $selection.set({ blockId });

  // Focus the selected block (but not in edit mode)
  $focus.set({
    focusedId: blockId,
    isEditing: false,
  });

  return ok(undefined);
}

/**
 * Deselect a specific block
 */
export function deselectBlock(blockId: string): SelectionResult<void> {
  const selection = $multiSelection.get();

  if (!selection.selectedIds.has(blockId)) {
    return ok(undefined); // Already not selected, no error
  }

  const newSelectedIds = new Set(selection.selectedIds);
  newSelectedIds.delete(blockId);

  // Update anchor if we're removing it
  let newAnchorId = selection.anchorId;
  if (selection.anchorId === blockId) {
    // Set new anchor to first remaining selected block, or null
    newAnchorId = newSelectedIds.size > 0 ? [...newSelectedIds][0] ?? null : null;
  }

  // Update last selected if we're removing it
  let newLastSelectedId = selection.lastSelectedId;
  if (selection.lastSelectedId === blockId) {
    newLastSelectedId = newSelectedIds.size > 0
      ? [...newSelectedIds][newSelectedIds.size - 1] ?? null
      : null;
  }

  $multiSelection.set({
    selectedIds: newSelectedIds,
    anchorId: newAnchorId,
    lastSelectedId: newLastSelectedId,
  });

  // Update legacy selection
  if (newLastSelectedId) {
    $selectedBlockId.set(newLastSelectedId);
    $selection.set({ blockId: newLastSelectedId });
  } else {
    $selectedBlockId.set(null);
    $selection.set({ blockId: null });
  }

  return ok(undefined);
}

/**
 * Toggle selection of a block (for Cmd/Ctrl+Click)
 */
export function toggleSelection(blockId: string): SelectionResult<void> {
  const doc = $document.get();
  const block = findBlockById(doc.blocks, blockId);

  if (!block) {
    return err(
      createSelectionError("BLOCK_NOT_FOUND", `Block not found: ${blockId}`)
    );
  }

  const selection = $multiSelection.get();

  if (selection.selectedIds.has(blockId)) {
    return deselectBlock(blockId);
  }

  // Add to selection
  const newSelectedIds = new Set(selection.selectedIds);
  newSelectedIds.add(blockId);

  $multiSelection.set({
    selectedIds: newSelectedIds,
    anchorId: selection.anchorId ?? blockId,
    lastSelectedId: blockId,
  });

  // Update legacy selection to point to the newly added block
  $selectedBlockId.set(blockId);
  $selection.set({ blockId });

  // Focus the toggled block
  $focus.set({
    focusedId: blockId,
    isEditing: false,
  });

  return ok(undefined);
}

/**
 * Select a range of blocks (for Shift+Click)
 * Selects all blocks between the anchor and the target block
 */
export function selectRange(blockId: string): SelectionResult<void> {
  const doc = $document.get();
  const block = findBlockById(doc.blocks, blockId);

  if (!block) {
    return err(
      createSelectionError("BLOCK_NOT_FOUND", `Block not found: ${blockId}`)
    );
  }

  const selection = $multiSelection.get();

  // If no anchor, treat as single select
  if (!selection.anchorId) {
    return selectBlock(blockId);
  }

  // Get all blocks in range
  const rangeIds = getBlockRange(selection.anchorId, blockId);

  if (rangeIds.length === 0) {
    return err(
      createSelectionError(
        "INVALID_RANGE",
        `Cannot create range between ${selection.anchorId} and ${blockId}`
      )
    );
  }

  $multiSelection.set({
    selectedIds: new Set(rangeIds),
    anchorId: selection.anchorId, // Keep the original anchor
    lastSelectedId: blockId,
  });

  // Update legacy selection
  $selectedBlockId.set(blockId);
  $selection.set({ blockId });

  // Focus the target block
  $focus.set({
    focusedId: blockId,
    isEditing: false,
  });

  return ok(undefined);
}

/**
 * Clear all selection
 */
export function clearSelection(): void {
  $multiSelection.set({
    selectedIds: new Set(),
    anchorId: null,
    lastSelectedId: null,
  });

  // Update legacy selection
  $selectedBlockId.set(null);
  $selection.set({ blockId: null });

  // Exit edit mode but keep focus
  const focus = $focus.get();
  if (focus.isEditing) {
    $focus.set({
      focusedId: focus.focusedId,
      isEditing: false,
    });
  }
}

/**
 * Select all blocks in the document
 */
export function selectAll(): SelectionResult<void> {
  const allIds = getFlatBlockList();

  if (allIds.length === 0) {
    return err(
      createSelectionError("NO_BLOCKS_AVAILABLE", "No blocks to select")
    );
  }

  const firstId = allIds[0];
  const lastId = allIds[allIds.length - 1];

  $multiSelection.set({
    selectedIds: new Set(allIds),
    anchorId: firstId ?? null,
    lastSelectedId: lastId ?? null,
  });

  // Update legacy selection
  $selectedBlockId.set(lastId ?? null);
  $selection.set({ blockId: lastId ?? null });

  return ok(undefined);
}

/**
 * Focus a specific block without selecting it
 */
export function focusBlock(blockId: string): SelectionResult<void> {
  const doc = $document.get();
  const block = findBlockById(doc.blocks, blockId);

  if (!block) {
    return err(
      createSelectionError("BLOCK_NOT_FOUND", `Block not found: ${blockId}`)
    );
  }

  $focus.set({
    focusedId: blockId,
    isEditing: false,
  });

  return ok(undefined);
}

/**
 * Focus the next block in document order
 */
export function focusNext(): SelectionResult<void> {
  const focus = $focus.get();

  if (focus.isEditing) {
    return err(
      createSelectionError("ALREADY_EDITING", "Cannot navigate while editing")
    );
  }

  let nextId: string | null;

  if (focus.focusedId) {
    nextId = getNextBlockId(focus.focusedId);
    // If at end, stay on current block
    if (!nextId) {
      return ok(undefined);
    }
  } else {
    // No focus, start at first block
    nextId = getFirstBlockId();
  }

  if (!nextId) {
    return err(
      createSelectionError("NO_BLOCKS_AVAILABLE", "No blocks to focus")
    );
  }

  $focus.set({
    focusedId: nextId,
    isEditing: false,
  });

  return ok(undefined);
}

/**
 * Focus the previous block in document order
 */
export function focusPrev(): SelectionResult<void> {
  const focus = $focus.get();

  if (focus.isEditing) {
    return err(
      createSelectionError("ALREADY_EDITING", "Cannot navigate while editing")
    );
  }

  let prevId: string | null;

  if (focus.focusedId) {
    prevId = getPrevBlockId(focus.focusedId);
    // If at beginning, stay on current block
    if (!prevId) {
      return ok(undefined);
    }
  } else {
    // No focus, start at last block
    prevId = getLastBlockId();
  }

  if (!prevId) {
    return err(
      createSelectionError("NO_BLOCKS_AVAILABLE", "No blocks to focus")
    );
  }

  $focus.set({
    focusedId: prevId,
    isEditing: false,
  });

  return ok(undefined);
}

/**
 * Focus a block in a specific direction
 */
export function focusDirection(direction: FocusDirection): SelectionResult<void> {
  switch (direction) {
    case "up":
      return focusPrev();
    case "down":
      return focusNext();
    case "first": {
      const firstId = getFirstBlockId();
      if (!firstId) {
        return err(
          createSelectionError("NO_BLOCKS_AVAILABLE", "No blocks to focus")
        );
      }
      return focusBlock(firstId);
    }
    case "last": {
      const lastId = getLastBlockId();
      if (!lastId) {
        return err(
          createSelectionError("NO_BLOCKS_AVAILABLE", "No blocks to focus")
        );
      }
      return focusBlock(lastId);
    }
  }
}

/**
 * Select the currently focused block
 */
export function selectFocused(): SelectionResult<void> {
  const focus = $focus.get();

  if (!focus.focusedId) {
    return err(
      createSelectionError("NO_BLOCKS_AVAILABLE", "No block is focused")
    );
  }

  return selectBlock(focus.focusedId);
}

/**
 * Toggle selection of the currently focused block
 */
export function toggleFocused(): SelectionResult<void> {
  const focus = $focus.get();

  if (!focus.focusedId) {
    return err(
      createSelectionError("NO_BLOCKS_AVAILABLE", "No block is focused")
    );
  }

  return toggleSelection(focus.focusedId);
}

/**
 * Extend selection to the next block
 */
export function extendSelectionDown(): SelectionResult<void> {
  const focus = $focus.get();
  const selection = $multiSelection.get();

  if (focus.isEditing) {
    return err(
      createSelectionError("ALREADY_EDITING", "Cannot extend selection while editing")
    );
  }

  // If nothing is focused or selected, start from first block
  const currentId = focus.focusedId ?? selection.lastSelectedId ?? getFirstBlockId();

  if (!currentId) {
    return err(
      createSelectionError("NO_BLOCKS_AVAILABLE", "No blocks available")
    );
  }

  const nextId = getNextBlockId(currentId);

  if (!nextId) {
    // Already at the end
    return ok(undefined);
  }

  // Extend selection to include the next block
  return selectRange(nextId);
}

/**
 * Extend selection to the previous block
 */
export function extendSelectionUp(): SelectionResult<void> {
  const focus = $focus.get();
  const selection = $multiSelection.get();

  if (focus.isEditing) {
    return err(
      createSelectionError("ALREADY_EDITING", "Cannot extend selection while editing")
    );
  }

  // If nothing is focused or selected, start from last block
  const currentId = focus.focusedId ?? selection.lastSelectedId ?? getLastBlockId();

  if (!currentId) {
    return err(
      createSelectionError("NO_BLOCKS_AVAILABLE", "No blocks available")
    );
  }

  const prevId = getPrevBlockId(currentId);

  if (!prevId) {
    // Already at the beginning
    return ok(undefined);
  }

  // Extend selection to include the previous block
  return selectRange(prevId);
}

/**
 * Enter edit mode for the focused block
 */
export function enterEditMode(): SelectionResult<void> {
  const focus = $focus.get();

  if (!focus.focusedId) {
    return err(
      createSelectionError("NO_BLOCKS_AVAILABLE", "No block is focused")
    );
  }

  if (focus.isEditing) {
    return ok(undefined); // Already in edit mode
  }

  $focus.set({
    focusedId: focus.focusedId,
    isEditing: true,
  });

  return ok(undefined);
}

/**
 * Exit edit mode (but keep focus on the block)
 */
export function exitEditMode(): SelectionResult<void> {
  const focus = $focus.get();

  if (!focus.isEditing) {
    return ok(undefined); // Already not in edit mode
  }

  $focus.set({
    focusedId: focus.focusedId,
    isEditing: false,
  });

  return ok(undefined);
}

/**
 * Clear focus entirely
 */
export function clearFocus(): void {
  $focus.set({
    focusedId: null,
    isEditing: false,
  });
}

/**
 * Deselect all and clear focus (Escape behavior)
 */
export function escape(): void {
  const focus = $focus.get();

  if (focus.isEditing) {
    // First escape exits edit mode
    exitEditMode();
  } else if ($multiSelection.get().selectedIds.size > 0) {
    // Second escape clears selection
    clearSelection();
  } else if (focus.focusedId) {
    // Third escape clears focus
    clearFocus();
  }
}
