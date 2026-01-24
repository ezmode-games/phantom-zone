/**
 * Selection & Focus Types
 *
 * Type definitions for block selection and focus management.
 * Implements PZ-207: Block Selection & Focus
 */

import { z } from "zod/v4";
import type { Result } from "../model/types";

/**
 * Selection mode indicating how selection is being performed
 */
export type SelectionMode = "single" | "multi" | "range";

/**
 * Focus direction for keyboard navigation
 */
export type FocusDirection = "up" | "down" | "first" | "last";

/**
 * Selection error codes
 */
export type SelectionErrorCode =
  | "BLOCK_NOT_FOUND"
  | "INVALID_RANGE"
  | "NO_BLOCKS_AVAILABLE"
  | "ALREADY_EDITING";

/**
 * Selection error type
 */
export interface SelectionError {
  code: SelectionErrorCode;
  message: string;
  cause?: unknown;
}

/**
 * Create a selection error
 */
export function createSelectionError(
  code: SelectionErrorCode,
  message: string,
  cause?: unknown
): SelectionError {
  return { code, message, cause };
}

/**
 * Result type for selection operations
 */
export type SelectionResult<T> = Result<T, SelectionError>;

/**
 * Multi-selection state
 * Tracks which blocks are selected and in what order they were selected
 */
export interface MultiSelectionState {
  /** Set of selected block IDs */
  selectedIds: Set<string>;
  /** The anchor block ID for range selection (first selected) */
  anchorId: string | null;
  /** The most recently selected block ID */
  lastSelectedId: string | null;
}

/**
 * Focus state for keyboard navigation
 * Focus is separate from selection - a block can be focused but not selected
 */
export interface FocusState {
  /** Currently focused block ID */
  focusedId: string | null;
  /** Whether the focused block is in edit mode (text input active) */
  isEditing: boolean;
}

/**
 * Combined selection and focus state
 */
export interface SelectionFocusState {
  selection: MultiSelectionState;
  focus: FocusState;
}

/**
 * Keyboard navigation action
 */
export type KeyboardAction =
  | { type: "FOCUS_NEXT" }
  | { type: "FOCUS_PREV" }
  | { type: "FOCUS_FIRST" }
  | { type: "FOCUS_LAST" }
  | { type: "SELECT_FOCUSED" }
  | { type: "TOGGLE_FOCUSED" }
  | { type: "EXTEND_SELECTION_UP" }
  | { type: "EXTEND_SELECTION_DOWN" }
  | { type: "ENTER_EDIT_MODE" }
  | { type: "EXIT_EDIT_MODE" }
  | { type: "CLEAR_SELECTION" }
  | { type: "SELECT_ALL" };

/**
 * Click action for mouse interactions
 */
export type ClickAction =
  | { type: "SELECT"; blockId: string }
  | { type: "TOGGLE"; blockId: string }
  | { type: "RANGE"; blockId: string }
  | { type: "DESELECT_ALL" };

/**
 * Zod schema for multi-selection state (for serialization)
 */
export const MultiSelectionStateSchema = z.object({
  selectedIds: z.array(z.string()).transform((arr) => new Set(arr)),
  anchorId: z.string().nullable(),
  lastSelectedId: z.string().nullable(),
});

/**
 * Zod schema for focus state
 */
export const FocusStateSchema = z.object({
  focusedId: z.string().nullable(),
  isEditing: z.boolean(),
});

/**
 * Zod schema for combined state
 */
export const SelectionFocusStateSchema = z.object({
  selection: MultiSelectionStateSchema,
  focus: FocusStateSchema,
});

/**
 * Create initial multi-selection state
 */
export function createInitialMultiSelection(): MultiSelectionState {
  return {
    selectedIds: new Set(),
    anchorId: null,
    lastSelectedId: null,
  };
}

/**
 * Create initial focus state
 */
export function createInitialFocus(): FocusState {
  return {
    focusedId: null,
    isEditing: false,
  };
}

/**
 * Create initial combined state
 */
export function createInitialSelectionFocus(): SelectionFocusState {
  return {
    selection: createInitialMultiSelection(),
    focus: createInitialFocus(),
  };
}
