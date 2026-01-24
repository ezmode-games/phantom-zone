/**
 * History Actions
 *
 * Actions for manipulating undo/redo history.
 * Implements PZ-210: Undo/Redo History
 *
 * The history model works as follows:
 * - baseSnapshot: stores the document state before any history entries
 * - entries[i].snapshot: stores the document state AFTER change i was made
 * - currentIndex: points to the last applied change (-1 means at base state)
 *
 * When undoing: restore the previous entry's snapshot (or base if at index 0)
 * When redoing: restore the next entry's snapshot
 */

import { createSnapshot, restoreSnapshot } from "../model/document";
import type { DocumentSnapshot } from "../model/types";
import { $history, resetHistoryState } from "./state";
import {
  canRedo,
  canUndo,
  createHistoryError,
  HISTORY_LIMIT,
  type HistoryEntry,
  type HistoryResult,
} from "./types";

/**
 * Push a new entry onto the history stack
 *
 * This should be called AFTER making a change. The current state (post-change)
 * will be stored in the entry. If this is the first entry, the pre-change state
 * is inferred from the base snapshot.
 *
 * If we are not at the end of the history stack, truncates future entries.
 * Enforces the history limit by removing oldest entries when necessary.
 */
export function pushHistory(description: string): HistoryResult<void> {
  const state = $history.get();

  // If batching is active, do not push individual entries
  if (state.isBatching) {
    return { ok: true, value: undefined };
  }

  const currentSnapshot = createSnapshot();

  // Keep the existing base snapshot - it should have been set by initializeHistory()
  // If no base exists, we won't be able to undo back to initial state
  const baseSnapshot = state.baseSnapshot;

  const entry: HistoryEntry = {
    snapshot: currentSnapshot,
    description,
    timestamp: new Date(),
  };

  // Create new entries array
  let newEntries: HistoryEntry[];

  if (state.currentIndex < state.entries.length - 1) {
    // We are in the middle of history - truncate future entries
    newEntries = [...state.entries.slice(0, state.currentIndex + 1), entry];
  } else {
    // We are at the end - just append
    newEntries = [...state.entries, entry];
  }

  // Enforce history limit by removing oldest entries
  if (newEntries.length > HISTORY_LIMIT) {
    newEntries = newEntries.slice(newEntries.length - HISTORY_LIMIT);
  }

  $history.set({
    ...state,
    baseSnapshot,
    entries: newEntries,
    currentIndex: newEntries.length - 1,
  });

  return { ok: true, value: undefined };
}

/**
 * Initialize history with a base snapshot
 *
 * This should be called at the start of editing, before any changes are made.
 * The current document state will be stored as the base snapshot, which is
 * the state that will be restored when all changes are undone.
 */
export function initializeHistory(): void {
  const baseSnapshot = createSnapshot();
  $history.set({
    baseSnapshot,
    entries: [],
    currentIndex: -1,
    isBatching: false,
    batchDescription: null,
    batchStartSnapshot: null,
  });
}

/**
 * Undo the last change
 *
 * Restores the document to the state before the current history entry.
 */
export function undo(): HistoryResult<void> {
  const state = $history.get();

  if (!canUndo(state)) {
    return {
      ok: false,
      error: createHistoryError("NOTHING_TO_UNDO", "No changes to undo"),
    };
  }

  // Determine which snapshot to restore
  let snapshotToRestore: DocumentSnapshot | null;

  if (state.currentIndex === 0) {
    // Undoing the first entry - restore to base snapshot
    snapshotToRestore = state.baseSnapshot;
    if (!snapshotToRestore) {
      // If no base snapshot, we cannot undo properly
      // This happens if initializeHistory() was not called
      // Fall back to creating an empty document state
      return {
        ok: false,
        error: createHistoryError(
          "NOTHING_TO_UNDO",
          "No base snapshot available - call initializeHistory() before making changes"
        ),
      };
    }
  } else {
    // Undoing entry N (N > 0) - restore to entry N-1's snapshot
    snapshotToRestore = state.entries[state.currentIndex - 1]?.snapshot ?? null;
    if (!snapshotToRestore) {
      return {
        ok: false,
        error: createHistoryError("NOTHING_TO_UNDO", "Previous history entry not found"),
      };
    }
  }

  restoreSnapshot(snapshotToRestore);

  $history.set({
    ...state,
    currentIndex: state.currentIndex - 1,
  });

  return { ok: true, value: undefined };
}

/**
 * Redo the last undone change
 *
 * Restores the document to the state after the next history entry.
 */
export function redo(): HistoryResult<void> {
  const state = $history.get();

  if (!canRedo(state)) {
    return {
      ok: false,
      error: createHistoryError("NOTHING_TO_REDO", "No changes to redo"),
    };
  }

  const nextIndex = state.currentIndex + 1;
  const entryToRedo = state.entries[nextIndex];
  if (!entryToRedo) {
    return {
      ok: false,
      error: createHistoryError("NOTHING_TO_REDO", "History entry not found"),
    };
  }

  // Restore the snapshot from the next entry
  restoreSnapshot(entryToRedo.snapshot);

  $history.set({
    ...state,
    currentIndex: nextIndex,
  });

  return { ok: true, value: undefined };
}

/**
 * Clear all history entries
 */
export function clearHistory(): void {
  resetHistoryState();
}

/**
 * Start a batch operation
 *
 * All changes within a batch will be grouped into a single undo step.
 * Call commitBatch() to finalize or rollbackBatch() to cancel.
 */
export function startBatch(description: string): HistoryResult<void> {
  const state = $history.get();

  if (state.isBatching) {
    return {
      ok: false,
      error: createHistoryError(
        "BATCH_ALREADY_ACTIVE",
        "A batch operation is already in progress"
      ),
    };
  }

  const snapshot = createSnapshot();

  // If no base snapshot exists, set it now
  const baseSnapshot = state.baseSnapshot ?? snapshot;

  $history.set({
    ...state,
    baseSnapshot,
    isBatching: true,
    batchDescription: description,
    batchStartSnapshot: snapshot,
  });

  return { ok: true, value: undefined };
}

/**
 * Commit a batch operation
 *
 * Creates a single history entry for all changes made since startBatch().
 */
export function commitBatch(): HistoryResult<void> {
  const state = $history.get();

  if (!state.isBatching) {
    return {
      ok: false,
      error: createHistoryError(
        "NO_BATCH_ACTIVE",
        "No batch operation is in progress"
      ),
    };
  }

  if (!state.batchStartSnapshot || !state.batchDescription) {
    return {
      ok: false,
      error: createHistoryError(
        "NO_BATCH_ACTIVE",
        "Batch state is incomplete"
      ),
    };
  }

  // Create entry with the CURRENT state (after all batch changes)
  const currentSnapshot = createSnapshot();
  const entry: HistoryEntry = {
    snapshot: currentSnapshot,
    description: state.batchDescription,
    timestamp: new Date(),
  };

  // If this is the first entry and we had no base, use the batch start as base
  let baseSnapshot = state.baseSnapshot;
  if (!baseSnapshot) {
    baseSnapshot = state.batchStartSnapshot;
  }

  // Create new entries array (truncate future entries if needed)
  let newEntries: HistoryEntry[];

  if (state.currentIndex < state.entries.length - 1) {
    newEntries = [...state.entries.slice(0, state.currentIndex + 1), entry];
  } else {
    newEntries = [...state.entries, entry];
  }

  // Enforce history limit
  if (newEntries.length > HISTORY_LIMIT) {
    newEntries = newEntries.slice(newEntries.length - HISTORY_LIMIT);
  }

  $history.set({
    baseSnapshot,
    entries: newEntries,
    currentIndex: newEntries.length - 1,
    isBatching: false,
    batchDescription: null,
    batchStartSnapshot: null,
  });

  return { ok: true, value: undefined };
}

/**
 * Rollback a batch operation
 *
 * Restores the document to the state before startBatch() was called.
 */
export function rollbackBatch(): HistoryResult<void> {
  const state = $history.get();

  if (!state.isBatching) {
    return {
      ok: false,
      error: createHistoryError(
        "NO_BATCH_ACTIVE",
        "No batch operation is in progress"
      ),
    };
  }

  if (!state.batchStartSnapshot) {
    return {
      ok: false,
      error: createHistoryError(
        "NO_BATCH_ACTIVE",
        "Batch start snapshot is missing"
      ),
    };
  }

  // Restore the snapshot from before the batch started
  restoreSnapshot(state.batchStartSnapshot);

  $history.set({
    ...state,
    isBatching: false,
    batchDescription: null,
    batchStartSnapshot: null,
  });

  return { ok: true, value: undefined };
}

/**
 * Execute a function within a batch
 *
 * Convenience wrapper that handles startBatch/commitBatch automatically.
 * If the function throws, the batch is rolled back.
 */
export function batchChanges<T>(
  description: string,
  fn: () => T
): HistoryResult<T> {
  const startResult = startBatch(description);
  if (!startResult.ok) {
    return startResult;
  }

  try {
    const result = fn();
    const commitResult = commitBatch();
    if (!commitResult.ok) {
      return commitResult;
    }
    return { ok: true, value: result };
  } catch (error) {
    rollbackBatch();
    throw error;
  }
}

/**
 * Get the current snapshot that would be restored on undo
 */
export function getUndoSnapshot(): DocumentSnapshot | null {
  const state = $history.get();
  if (!canUndo(state)) return null;

  if (state.currentIndex === 0) {
    return state.baseSnapshot;
  }

  return state.entries[state.currentIndex - 1]?.snapshot ?? null;
}

/**
 * Get the snapshot that would be restored on redo
 */
export function getRedoSnapshot(): DocumentSnapshot | null {
  const state = $history.get();
  if (!canRedo(state)) return null;

  return state.entries[state.currentIndex + 1]?.snapshot ?? null;
}
