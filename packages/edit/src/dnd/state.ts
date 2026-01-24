/**
 * Drag and Drop State Management
 *
 * Nanostores atoms and computed values for drag-drop state.
 * Implements PZ-209: Drag and Drop
 */

import { atom, computed, type ReadableAtom, type WritableAtom } from "nanostores";
import { $document, findBlockById, findParentBlock, findBlockIndex } from "../model/document";
import type { Block } from "../model/types";
import {
  createInitialDragState,
  type DragItem,
  type DragPoint,
  type DragState,
  type DropTarget,
  isDragging as checkIsDragging,
  isDropping as checkIsDropping,
  isDocumentDrag,
  isSidebarDrag,
} from "./types";

// Main drag state atom
export const $dragState: WritableAtom<DragState> = atom<DragState>(
  createInitialDragState()
);

/**
 * Computed: Current drag status
 */
export const $dragStatus: ReadableAtom<DragState["status"]> = computed(
  $dragState,
  (state) => state.status
);

/**
 * Computed: Whether a drag is currently active
 */
export const $isDragging: ReadableAtom<boolean> = computed(
  $dragState,
  checkIsDragging
);

/**
 * Computed: Whether a drop is in progress
 */
export const $isDropping: ReadableAtom<boolean> = computed(
  $dragState,
  checkIsDropping
);

/**
 * Computed: The current drag item (null when idle)
 */
export const $dragItem: ReadableAtom<DragItem | null> = computed(
  $dragState,
  (state) => state.item
);

/**
 * Computed: The current drop target (null when not over a valid target)
 */
export const $dropTarget: ReadableAtom<DropTarget | null> = computed(
  $dragState,
  (state) => state.dropTarget
);

/**
 * Computed: Current pointer position during drag
 */
export const $pointerPosition: ReadableAtom<DragPoint | null> = computed(
  $dragState,
  (state) => state.pointerPosition
);

/**
 * Computed: Whether using touch input
 */
export const $isTouch: ReadableAtom<boolean> = computed(
  $dragState,
  (state) => state.isTouch
);

/**
 * Computed: Whether the drop target is valid
 */
export const $hasValidDropTarget: ReadableAtom<boolean> = computed(
  $dragState,
  (state) => state.dropTarget?.isValid ?? false
);

/**
 * Computed: The block being dragged (for document drags)
 */
export const $draggedBlock: ReadableAtom<Block | null> = computed(
  [$dragState, $document],
  (state, doc) => {
    if (!state.item) return null;
    if (!isDocumentDrag(state.item)) return null;
    return findBlockById(doc.blocks, state.item.blockId);
  }
);

/**
 * Computed: The block type being dragged (for sidebar drags)
 */
export const $draggedBlockType: ReadableAtom<string | null> = computed(
  $dragState,
  (state) => {
    if (!state.item) return null;
    if (!isSidebarDrag(state.item)) return null;
    return state.item.blockTypeId;
  }
);

/**
 * Computed: Target block for drop indicator
 */
export const $targetBlock: ReadableAtom<Block | null> = computed(
  [$dragState, $document],
  (state, doc) => {
    if (!state.dropTarget?.targetBlockId) return null;
    return findBlockById(doc.blocks, state.dropTarget.targetBlockId);
  }
);

/**
 * Computed: Parent block for the drop target
 */
export const $targetParentBlock: ReadableAtom<Block | null> = computed(
  [$dragState, $document],
  (state, doc) => {
    if (!state.dropTarget?.parentId) return null;
    return findBlockById(doc.blocks, state.dropTarget.parentId);
  }
);

/**
 * Check if a specific block is being dragged
 */
export function isBlockBeingDragged(blockId: string): boolean {
  const state = $dragState.get();
  if (!state.item) return false;
  if (!isDocumentDrag(state.item)) return false;
  return state.item.blockId === blockId;
}

/**
 * Check if a specific block is the drop target
 */
export function isBlockDropTarget(blockId: string): boolean {
  const state = $dragState.get();
  return state.dropTarget?.targetBlockId === blockId;
}

/**
 * Get the drop position for a specific block
 * Returns null if the block is not a drop target
 */
export function getBlockDropPosition(blockId: string): DropTarget["position"] | null {
  const state = $dragState.get();
  if (state.dropTarget?.targetBlockId !== blockId) return null;
  return state.dropTarget.position;
}

/**
 * Get block info needed to create a document drag item
 */
export function getBlockDragInfo(
  blockId: string
): { block: Block; parentId: string | undefined; index: number } | null {
  const doc = $document.get();
  const block = findBlockById(doc.blocks, blockId);
  if (!block) return null;

  const parent = findParentBlock(doc.blocks, blockId);
  const siblings = parent ? parent.children ?? [] : doc.blocks;
  const index = findBlockIndex(siblings, blockId);

  return {
    block,
    parentId: parent?.id,
    index,
  };
}

/**
 * Reset drag state to initial values
 */
export function resetDragState(): void {
  $dragState.set(createInitialDragState());
}

/**
 * Get the current drag state snapshot
 */
export function getDragStateSnapshot(): DragState {
  return $dragState.get();
}
