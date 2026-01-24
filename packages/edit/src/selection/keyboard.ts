/**
 * Keyboard Event Handlers for Selection & Focus
 *
 * Keyboard navigation and shortcuts for block selection.
 * Implements PZ-207: Block Selection & Focus
 */

import {
  clearSelection,
  enterEditMode,
  escape,
  exitEditMode,
  extendSelectionDown,
  extendSelectionUp,
  focusNext,
  focusPrev,
  selectAll,
  selectFocused,
} from "./actions";
import { $focus, $multiSelection } from "./state";
import type { KeyboardAction, SelectionResult } from "./types";

/**
 * Keyboard event configuration
 */
export interface KeyboardConfig {
  /** Enable arrow key navigation */
  enableArrowKeys: boolean;
  /** Enable Tab/Shift+Tab navigation */
  enableTabNavigation: boolean;
  /** Enable Enter to edit */
  enableEnterToEdit: boolean;
  /** Enable Escape to deselect */
  enableEscape: boolean;
  /** Enable Cmd/Ctrl+A to select all */
  enableSelectAll: boolean;
  /** Enable Shift+Arrow for range selection */
  enableShiftArrows: boolean;
}

/**
 * Default keyboard configuration
 */
export const defaultKeyboardConfig: KeyboardConfig = {
  enableArrowKeys: true,
  enableTabNavigation: true,
  enableEnterToEdit: true,
  enableEscape: true,
  enableSelectAll: true,
  enableShiftArrows: true,
};

/**
 * Parse a keyboard event into a keyboard action
 */
export function parseKeyboardEvent(
  event: KeyboardEvent,
  config: KeyboardConfig = defaultKeyboardConfig
): KeyboardAction | null {
  const { key, shiftKey, metaKey, ctrlKey } = event;
  const cmdOrCtrl = metaKey || ctrlKey;

  // Escape - clear selection or exit edit mode
  if (key === "Escape" && config.enableEscape) {
    const focus = $focus.get();
    if (focus.isEditing) {
      return { type: "EXIT_EDIT_MODE" };
    }
    return { type: "CLEAR_SELECTION" };
  }

  // Enter - enter edit mode
  if (key === "Enter" && config.enableEnterToEdit && !shiftKey) {
    const focus = $focus.get();
    if (!focus.isEditing) {
      return { type: "ENTER_EDIT_MODE" };
    }
    return null; // Let the block handle Enter in edit mode
  }

  // Arrow keys (when not in edit mode)
  const focus = $focus.get();
  if (!focus.isEditing && config.enableArrowKeys) {
    if (key === "ArrowDown" || key === "ArrowRight") {
      if (shiftKey && config.enableShiftArrows) {
        return { type: "EXTEND_SELECTION_DOWN" };
      }
      return { type: "FOCUS_NEXT" };
    }

    if (key === "ArrowUp" || key === "ArrowLeft") {
      if (shiftKey && config.enableShiftArrows) {
        return { type: "EXTEND_SELECTION_UP" };
      }
      return { type: "FOCUS_PREV" };
    }

    // Home/End for first/last
    if (key === "Home") {
      return { type: "FOCUS_FIRST" };
    }

    if (key === "End") {
      return { type: "FOCUS_LAST" };
    }
  }

  // Tab navigation (when not in edit mode)
  if (key === "Tab" && config.enableTabNavigation && !focus.isEditing) {
    if (shiftKey) {
      return { type: "FOCUS_PREV" };
    }
    return { type: "FOCUS_NEXT" };
  }

  // Cmd/Ctrl+A to select all (when not in edit mode)
  if (key === "a" && cmdOrCtrl && config.enableSelectAll && !focus.isEditing) {
    return { type: "SELECT_ALL" };
  }

  // Space to select/toggle when focused but not editing
  if (key === " " && !focus.isEditing) {
    if (shiftKey || cmdOrCtrl) {
      return { type: "TOGGLE_FOCUSED" };
    }
    return { type: "SELECT_FOCUSED" };
  }

  return null;
}

/**
 * Execute a keyboard action
 */
export function executeKeyboardAction(action: KeyboardAction): SelectionResult<void> {
  switch (action.type) {
    case "FOCUS_NEXT":
      return focusNext();

    case "FOCUS_PREV":
      return focusPrev();

    case "FOCUS_FIRST": {
      const { focusDirection } = require("./actions");
      return focusDirection("first");
    }

    case "FOCUS_LAST": {
      const { focusDirection } = require("./actions");
      return focusDirection("last");
    }

    case "SELECT_FOCUSED": {
      const { selectFocused } = require("./actions");
      return selectFocused();
    }

    case "TOGGLE_FOCUSED": {
      const { toggleFocused } = require("./actions");
      return toggleFocused();
    }

    case "EXTEND_SELECTION_UP":
      return extendSelectionUp();

    case "EXTEND_SELECTION_DOWN":
      return extendSelectionDown();

    case "ENTER_EDIT_MODE":
      return enterEditMode();

    case "EXIT_EDIT_MODE":
      return exitEditMode();

    case "CLEAR_SELECTION": {
      escape();
      return { ok: true, value: undefined };
    }

    case "SELECT_ALL":
      return selectAll();

    default: {
      // Exhaustive type check
      const _exhaustive: never = action;
      return { ok: true, value: undefined };
    }
  }
}

/**
 * Handle a keyboard event for selection
 * Returns true if the event was handled
 */
export function handleKeyboardEvent(
  event: KeyboardEvent,
  config: KeyboardConfig = defaultKeyboardConfig
): boolean {
  const action = parseKeyboardEvent(event, config);

  if (!action) {
    return false;
  }

  const result = executeKeyboardAction(action);

  // Only prevent default if the action was handled successfully
  // or if it's an expected failure (like trying to go past the end)
  if (result.ok) {
    event.preventDefault();
    return true;
  }

  // For some errors, we still want to prevent default
  if (!result.ok) {
    const errorCode = result.error.code;
    // These are expected failures that still mean we handled the event
    if (
      errorCode === "NO_BLOCKS_AVAILABLE" ||
      errorCode === "ALREADY_EDITING"
    ) {
      event.preventDefault();
      return true;
    }
  }

  return false;
}

/**
 * Create a keyboard event listener for selection
 * Use this to attach to a container element
 */
export function createKeyboardHandler(
  config: KeyboardConfig = defaultKeyboardConfig
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    handleKeyboardEvent(event, config);
  };
}

/**
 * Check if a keyboard event should be handled by the selection system
 * Useful for determining whether to let events bubble
 */
export function shouldHandleKeyboardEvent(
  event: KeyboardEvent,
  config: KeyboardConfig = defaultKeyboardConfig
): boolean {
  return parseKeyboardEvent(event, config) !== null;
}
