/**
 * History Module
 *
 * Undo/redo history management for the editor.
 * Implements PZ-210: Undo/Redo History
 */

// Types
export {
  type HistoryEntry,
  type HistoryError,
  type HistoryErrorCode,
  type HistoryFlags,
  type HistoryKeyboardAction,
  type HistoryResult,
  type HistoryState,
  // Constants
  HISTORY_LIMIT,
  // Utility functions
  canRedo,
  canUndo,
  createHistoryError,
  createInitialHistoryState,
  getRedoDescription,
  getUndoDescription,
} from "./types";

// State atoms and computed values
export {
  // Atoms
  $history,
  // Computed
  $canRedo,
  $canUndo,
  $currentHistoryIndex,
  $historySize,
  $isBatching,
  $redoDescription,
  $undoDescription,
  // Utility functions
  resetHistoryState,
} from "./state";

// Actions
export {
  batchChanges,
  clearHistory,
  commitBatch,
  getRedoSnapshot,
  getUndoSnapshot,
  initializeHistory,
  pushHistory,
  redo,
  rollbackBatch,
  startBatch,
  undo,
} from "./actions";

// Keyboard handling
export {
  type HistoryKeyboardConfig,
  createHistoryKeyboardHandler,
  defaultHistoryKeyboardConfig,
  executeHistoryKeyboardAction,
  handleHistoryKeyboardEvent,
  parseHistoryKeyboardEvent,
  shouldHandleHistoryKeyboardEvent,
} from "./keyboard";
