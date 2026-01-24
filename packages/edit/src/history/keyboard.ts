/**
 * Keyboard Event Handlers for History
 *
 * Keyboard shortcuts for undo/redo operations.
 * Implements PZ-210: Undo/Redo History
 */

import { redo, undo } from "./actions";
import type { HistoryKeyboardAction, HistoryResult } from "./types";

/**
 * Keyboard configuration for history
 */
export interface HistoryKeyboardConfig {
  /** Enable Cmd/Ctrl+Z for undo */
  enableUndo: boolean;
  /** Enable Cmd/Ctrl+Shift+Z for redo */
  enableRedo: boolean;
}

/**
 * Default keyboard configuration
 */
export const defaultHistoryKeyboardConfig: HistoryKeyboardConfig = {
  enableUndo: true,
  enableRedo: true,
};

/**
 * Parse a keyboard event into a history action
 */
export function parseHistoryKeyboardEvent(
  event: KeyboardEvent,
  config: HistoryKeyboardConfig = defaultHistoryKeyboardConfig
): HistoryKeyboardAction | null {
  const { key, shiftKey, metaKey, ctrlKey } = event;
  const cmdOrCtrl = metaKey || ctrlKey;

  // Cmd/Ctrl+Z - Undo
  if (key === "z" && cmdOrCtrl && !shiftKey && config.enableUndo) {
    return { type: "UNDO" };
  }

  // Cmd/Ctrl+Shift+Z - Redo
  if (key === "z" && cmdOrCtrl && shiftKey && config.enableRedo) {
    return { type: "REDO" };
  }

  // Cmd/Ctrl+Y - Redo (Windows convention)
  if (key === "y" && cmdOrCtrl && config.enableRedo) {
    return { type: "REDO" };
  }

  return null;
}

/**
 * Execute a history keyboard action
 */
export function executeHistoryKeyboardAction(
  action: HistoryKeyboardAction
): HistoryResult<void> {
  switch (action.type) {
    case "UNDO":
      return undo();

    case "REDO":
      return redo();

    default: {
      // Exhaustive type check
      const _exhaustive: never = action;
      return { ok: true, value: undefined };
    }
  }
}

/**
 * Handle a keyboard event for history
 * Returns true if the event was handled
 */
export function handleHistoryKeyboardEvent(
  event: KeyboardEvent,
  config: HistoryKeyboardConfig = defaultHistoryKeyboardConfig
): boolean {
  const action = parseHistoryKeyboardEvent(event, config);

  if (!action) {
    return false;
  }

  const result = executeHistoryKeyboardAction(action);

  // Prevent default even if the action failed (e.g., nothing to undo)
  // This prevents browser default behavior like undoing text input
  event.preventDefault();
  return true;
}

/**
 * Create a keyboard event listener for history
 * Use this to attach to a container element
 */
export function createHistoryKeyboardHandler(
  config: HistoryKeyboardConfig = defaultHistoryKeyboardConfig
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    handleHistoryKeyboardEvent(event, config);
  };
}

/**
 * Check if a keyboard event should be handled by the history system
 * Useful for determining whether to let events bubble
 */
export function shouldHandleHistoryKeyboardEvent(
  event: KeyboardEvent,
  config: HistoryKeyboardConfig = defaultHistoryKeyboardConfig
): boolean {
  return parseHistoryKeyboardEvent(event, config) !== null;
}
