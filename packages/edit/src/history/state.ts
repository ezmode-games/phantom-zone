/**
 * History State Management
 *
 * Nanostores atoms and computed values for undo/redo history.
 * Implements PZ-210: Undo/Redo History
 */

import { atom, computed, type ReadableAtom, type WritableAtom } from "nanostores";
import {
  canRedo,
  canUndo,
  createInitialHistoryState,
  getRedoDescription,
  getUndoDescription,
  type HistoryState,
} from "./types";

/**
 * Main history state atom
 */
export const $history: WritableAtom<HistoryState> = atom<HistoryState>(
  createInitialHistoryState()
);

/**
 * Computed: Whether undo is available
 */
export const $canUndo: ReadableAtom<boolean> = computed($history, (state) =>
  canUndo(state)
);

/**
 * Computed: Whether redo is available
 */
export const $canRedo: ReadableAtom<boolean> = computed($history, (state) =>
  canRedo(state)
);

/**
 * Computed: Description of the action that would be undone
 */
export const $undoDescription: ReadableAtom<string | null> = computed(
  $history,
  (state) => getUndoDescription(state)
);

/**
 * Computed: Description of the action that would be redone
 */
export const $redoDescription: ReadableAtom<string | null> = computed(
  $history,
  (state) => getRedoDescription(state)
);

/**
 * Computed: Whether a batch operation is currently active
 */
export const $isBatching: ReadableAtom<boolean> = computed(
  $history,
  (state) => state.isBatching
);

/**
 * Computed: Number of entries in the history stack
 */
export const $historySize: ReadableAtom<number> = computed(
  $history,
  (state) => state.entries.length
);

/**
 * Computed: Current position in the history stack
 */
export const $currentHistoryIndex: ReadableAtom<number> = computed(
  $history,
  (state) => state.currentIndex
);

/**
 * Reset history state to initial values
 */
export function resetHistoryState(): void {
  $history.set(createInitialHistoryState());
}
