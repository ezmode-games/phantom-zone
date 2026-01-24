/**
 * History Types
 *
 * Type definitions for undo/redo history management.
 * Implements PZ-210: Undo/Redo History
 */

import type { DocumentSnapshot } from "../model/types";
import type { Result } from "../model/types";

/**
 * Maximum number of history entries to keep
 */
export const HISTORY_LIMIT = 100;

/**
 * A single entry in the history stack
 * Each entry represents a state AFTER a change was made
 */
export interface HistoryEntry {
  /** The document snapshot after the change */
  snapshot: DocumentSnapshot;
  /** Human-readable description of the change */
  description: string;
  /** Timestamp when this entry was created */
  timestamp: Date;
}

/**
 * The complete history state
 */
export interface HistoryState {
  /** The base snapshot (state before any history entries) */
  baseSnapshot: DocumentSnapshot | null;
  /** Stack of history entries (oldest first) - each contains state AFTER a change */
  entries: HistoryEntry[];
  /** Current position in the history stack (-1 means at base state) */
  currentIndex: number;
  /** Whether we are currently in a batch operation */
  isBatching: boolean;
  /** Pending batch description (set when batching starts) */
  batchDescription: string | null;
  /** Snapshot before batch started (for rollback/commit) */
  batchStartSnapshot: DocumentSnapshot | null;
}

/**
 * Computed flags derived from history state
 */
export interface HistoryFlags {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

/**
 * History error codes
 */
export type HistoryErrorCode =
  | "NOTHING_TO_UNDO"
  | "NOTHING_TO_REDO"
  | "BATCH_ALREADY_ACTIVE"
  | "NO_BATCH_ACTIVE"
  | "HISTORY_LIMIT_REACHED";

/**
 * History error type
 */
export interface HistoryError {
  code: HistoryErrorCode;
  message: string;
  cause?: unknown;
}

/**
 * Create a history error
 */
export function createHistoryError(
  code: HistoryErrorCode,
  message: string,
  cause?: unknown
): HistoryError {
  return { code, message, cause };
}

/**
 * Result type for history operations
 */
export type HistoryResult<T> = Result<T, HistoryError>;

/**
 * Create initial history state
 */
export function createInitialHistoryState(): HistoryState {
  return {
    baseSnapshot: null,
    entries: [],
    currentIndex: -1,
    isBatching: false,
    batchDescription: null,
    batchStartSnapshot: null,
  };
}

/**
 * Check if undo is available
 */
export function canUndo(state: HistoryState): boolean {
  return state.currentIndex >= 0;
}

/**
 * Check if redo is available
 */
export function canRedo(state: HistoryState): boolean {
  return state.currentIndex < state.entries.length - 1;
}

/**
 * Get the description of the action that would be undone
 */
export function getUndoDescription(state: HistoryState): string | null {
  if (!canUndo(state)) return null;
  return state.entries[state.currentIndex]?.description ?? null;
}

/**
 * Get the description of the action that would be redone
 */
export function getRedoDescription(state: HistoryState): string | null {
  if (!canRedo(state)) return null;
  return state.entries[state.currentIndex + 1]?.description ?? null;
}

/**
 * Keyboard action for history
 */
export type HistoryKeyboardAction =
  | { type: "UNDO" }
  | { type: "REDO" };
