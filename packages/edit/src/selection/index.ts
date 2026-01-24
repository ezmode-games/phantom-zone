/**
 * Selection & Focus Module
 *
 * Block selection and keyboard focus management for the editor.
 * Implements PZ-207: Block Selection & Focus
 */

// Types
export {
  type ClickAction,
  type FocusDirection,
  type FocusState,
  type KeyboardAction,
  type MultiSelectionState,
  type SelectionError,
  type SelectionErrorCode,
  type SelectionFocusState,
  type SelectionMode,
  type SelectionResult,
  // Schemas
  FocusStateSchema,
  MultiSelectionStateSchema,
  SelectionFocusStateSchema,
  // Utility functions
  createInitialFocus,
  createInitialMultiSelection,
  createInitialSelectionFocus,
  createSelectionError,
} from "./types";

// State atoms and computed values
export {
  // Atoms
  $focus,
  $multiSelection,
  // Computed - Selection
  $anchorBlock,
  $hasMultiSelection,
  $hasSelection,
  $lastSelectedBlock,
  $selectedBlocks,
  $selectedIds,
  $selectionCount,
  // Computed - Focus
  $focusedBlock,
  $focusedBlockId,
  $isEditing,
  // Utility functions
  getBlockAtFlatIndex,
  getBlockFlatIndex,
  getBlockRange,
  getFirstBlockId,
  getFlatBlockList,
  getLastBlockId,
  getNextBlockId,
  getPrevBlockId,
  isBlockFocused,
  isBlockSelected,
  resetSelectionState,
} from "./state";

// Actions
export {
  // Selection actions
  clearSelection,
  deselectBlock,
  selectAll,
  selectBlock,
  selectRange,
  toggleSelection,
  // Focus actions
  clearFocus,
  enterEditMode,
  escape,
  exitEditMode,
  extendSelectionDown,
  extendSelectionUp,
  focusBlock,
  focusDirection,
  focusNext,
  focusPrev,
  selectFocused,
  toggleFocused,
} from "./actions";

// Keyboard handling
export {
  type KeyboardConfig,
  createKeyboardHandler,
  defaultKeyboardConfig,
  executeKeyboardAction,
  handleKeyboardEvent,
  parseKeyboardEvent,
  shouldHandleKeyboardEvent,
} from "./keyboard";
