/**
 * Selection & Focus State Management
 *
 * Nanostores atoms and computed values for selection state.
 * Implements PZ-207: Block Selection & Focus
 */

import { atom, computed, type ReadableAtom, type WritableAtom } from "nanostores";
import { $blocks, $document, findBlockById } from "../model/document";
import type { Block } from "../model/types";
import {
  createInitialFocus,
  createInitialMultiSelection,
  type FocusState,
  type MultiSelectionState,
} from "./types";

// Multi-selection state atom
export const $multiSelection: WritableAtom<MultiSelectionState> = atom<MultiSelectionState>(
  createInitialMultiSelection()
);

// Focus state atom
export const $focus: WritableAtom<FocusState> = atom<FocusState>(createInitialFocus());

/**
 * Computed: Set of selected block IDs
 */
export const $selectedIds: ReadableAtom<Set<string>> = computed(
  $multiSelection,
  (state) => state.selectedIds
);

/**
 * Computed: Number of selected blocks
 */
export const $selectionCount: ReadableAtom<number> = computed(
  $multiSelection,
  (state) => state.selectedIds.size
);

/**
 * Computed: Whether any blocks are selected
 */
export const $hasSelection: ReadableAtom<boolean> = computed(
  $multiSelection,
  (state) => state.selectedIds.size > 0
);

/**
 * Computed: Whether multiple blocks are selected
 */
export const $hasMultiSelection: ReadableAtom<boolean> = computed(
  $multiSelection,
  (state) => state.selectedIds.size > 1
);

/**
 * Computed: The anchor block (first selected in range)
 */
export const $anchorBlock: ReadableAtom<Block | null> = computed(
  [$document, $multiSelection],
  (doc, selection) => {
    if (!selection.anchorId) return null;
    return findBlockById(doc.blocks, selection.anchorId);
  }
);

/**
 * Computed: The last selected block
 */
export const $lastSelectedBlock: ReadableAtom<Block | null> = computed(
  [$document, $multiSelection],
  (doc, selection) => {
    if (!selection.lastSelectedId) return null;
    return findBlockById(doc.blocks, selection.lastSelectedId);
  }
);

/**
 * Computed: Array of all selected blocks (in document order)
 */
export const $selectedBlocks: ReadableAtom<Block[]> = computed(
  [$document, $multiSelection],
  (doc, selection) => {
    if (selection.selectedIds.size === 0) return [];

    const result: Block[] = [];

    function collectSelected(blocks: Block[]): void {
      for (const block of blocks) {
        if (selection.selectedIds.has(block.id)) {
          result.push(block);
        }
        if (block.children) {
          collectSelected(block.children);
        }
      }
    }

    collectSelected(doc.blocks);
    return result;
  }
);

/**
 * Computed: Currently focused block ID
 */
export const $focusedBlockId: ReadableAtom<string | null> = computed(
  $focus,
  (state) => state.focusedId
);

/**
 * Computed: Currently focused block
 */
export const $focusedBlock: ReadableAtom<Block | null> = computed(
  [$document, $focus],
  (doc, focus) => {
    if (!focus.focusedId) return null;
    return findBlockById(doc.blocks, focus.focusedId);
  }
);

/**
 * Computed: Whether the focused block is in edit mode
 */
export const $isEditing: ReadableAtom<boolean> = computed(
  $focus,
  (state) => state.isEditing
);

/**
 * Computed: Whether a specific block is selected
 * Returns a function that checks if a block ID is selected
 */
export function isBlockSelected(blockId: string): boolean {
  return $multiSelection.get().selectedIds.has(blockId);
}

/**
 * Computed: Whether a specific block is focused
 */
export function isBlockFocused(blockId: string): boolean {
  return $focus.get().focusedId === blockId;
}

/**
 * Get a flattened list of all block IDs in document order
 * Used for navigation calculations
 */
export function getFlatBlockList(): string[] {
  const blocks = $blocks.get();
  const result: string[] = [];

  function collectIds(blockList: Block[]): void {
    for (const block of blockList) {
      result.push(block.id);
      if (block.children) {
        collectIds(block.children);
      }
    }
  }

  collectIds(blocks);
  return result;
}

/**
 * Get the index of a block in the flattened list
 */
export function getBlockFlatIndex(blockId: string): number {
  return getFlatBlockList().indexOf(blockId);
}

/**
 * Get block ID at a specific flat index
 */
export function getBlockAtFlatIndex(index: number): string | null {
  const list = getFlatBlockList();
  if (index < 0 || index >= list.length) {
    return null;
  }
  return list[index] ?? null;
}

/**
 * Get the next block ID in document order
 */
export function getNextBlockId(currentId: string): string | null {
  const list = getFlatBlockList();
  const currentIndex = list.indexOf(currentId);
  if (currentIndex === -1 || currentIndex >= list.length - 1) {
    return null;
  }
  return list[currentIndex + 1] ?? null;
}

/**
 * Get the previous block ID in document order
 */
export function getPrevBlockId(currentId: string): string | null {
  const list = getFlatBlockList();
  const currentIndex = list.indexOf(currentId);
  if (currentIndex <= 0) {
    return null;
  }
  return list[currentIndex - 1] ?? null;
}

/**
 * Get the first block ID in the document
 */
export function getFirstBlockId(): string | null {
  const list = getFlatBlockList();
  return list[0] ?? null;
}

/**
 * Get the last block ID in the document
 */
export function getLastBlockId(): string | null {
  const list = getFlatBlockList();
  return list[list.length - 1] ?? null;
}

/**
 * Get all block IDs between two blocks (inclusive) in document order
 */
export function getBlockRange(startId: string, endId: string): string[] {
  const list = getFlatBlockList();
  const startIndex = list.indexOf(startId);
  const endIndex = list.indexOf(endId);

  if (startIndex === -1 || endIndex === -1) {
    return [];
  }

  const minIndex = Math.min(startIndex, endIndex);
  const maxIndex = Math.max(startIndex, endIndex);

  return list.slice(minIndex, maxIndex + 1);
}

/**
 * Reset selection state to initial values
 */
export function resetSelectionState(): void {
  $multiSelection.set(createInitialMultiSelection());
  $focus.set(createInitialFocus());
}
