/**
 * @phantom-zone/edit
 *
 * Block-based content editor including:
 * - Block document model (PZ-200)
 * - Block registry system (PZ-201)
 * - Typography blocks (PZ-202)
 * - Layout blocks (PZ-203)
 * - Media blocks (PZ-204)
 * - Form blocks (PZ-205)
 * - Block sidebar (PZ-206)
 * - Block selection & focus (PZ-207)
 * - Block property editor (PZ-208)
 * - Drag and drop (PZ-209)
 * - Undo/redo history (PZ-210)
 * - Clipboard operations (PZ-211)
 * - MDX serialization (PZ-212)
 * - Auto-save & versioning (PZ-213)
 * - Multi-page management (PZ-214)
 * - Slash commands (PZ-215)
 * - Preview modes (PZ-218)
 * - Collaborative editing indicators (PZ-219)
 * - Mobile editor (PZ-220)
 */

export const VERSION = "0.0.1";

// Block Document Model (PZ-200)
export {
  // Types
  type Block,
  type BlockCategory,
  type BlockDefinition,
  type BlockProps,
  type BlockRegistry,
  type BlockTypeId,
  type ClipboardContent,
  type Document,
  type DocumentError,
  type DocumentErrorCode,
  type DocumentMeta,
  type DocumentOperation,
  type DocumentSnapshot,
  type HistoryEntry,
  type Result,
  type SelectionState,
  type BaseBlockProps,
  // Type utilities
  ok,
  err,
  createDocumentError,
  // Schemas
  BaseBlockPropsSchema,
  BlockSchema,
  ClipboardContentSchema,
  DocumentMetaSchema,
  DocumentOperationSchema,
  DocumentSchema,
  SelectionStateSchema,
  UUIDv7Schema,
  // Registry
  createBlockRegistry,
  createDefaultBlockRegistry,
  getBlockRegistry,
  resetGlobalBlockRegistry,
  // Document state and operations
  $blocks,
  $blockCount,
  $clipboard,
  $document,
  $documentId,
  $meta,
  $selectedBlock,
  $selectedBlockId,
  $selection,
  createEmptyDocument,
  createInitialMeta,
  createInitialSelection,
  copyTextToClipboard,
  copyToClipboard,
  deleteBlockAction,
  initializeDocument,
  insertBlockAction,
  moveBlockAction,
  pasteFromClipboard,
  selectBlock,
  setBlockChildrenAction,
  setSelection,
  updateBlockPropsAction,
  updateMetaAction,
  applyOperation,
  cloneBlock,
  createSnapshot,
  findBlockById,
  findBlockIndex,
  findParentBlock,
  getBlockPath,
  restoreSnapshot,
  validateDocument,
  // Default block definitions
  calloutBlockDefinition,
  codeBlockDefinition,
  columnsBlockDefinition,
  defaultBlockDefinitions,
  dividerBlockDefinition,
  embedBlockDefinition,
  formBlockDefinition,
  headingBlockDefinition,
  imageBlockDefinition,
  listBlockDefinition,
  paragraphBlockDefinition,
  quoteBlockDefinition,
  sectionBlockDefinition,
  tableBlockDefinition,
  videoBlockDefinition,
  // Props schemas
  CalloutBlockPropsSchema,
  CodeBlockPropsSchema,
  ColumnsBlockPropsSchema,
  DividerBlockPropsSchema,
  EmbedBlockPropsSchema,
  FormBlockPropsSchema,
  HeadingBlockPropsSchema,
  ImageBlockPropsSchema,
  ListBlockPropsSchema,
  ParagraphBlockPropsSchema,
  QuoteBlockPropsSchema,
  SectionBlockPropsSchema,
  TableBlockPropsSchema,
  VideoBlockPropsSchema,
  // Props types
  type CalloutBlockProps,
  type CodeBlockProps,
  type ColumnsBlockProps,
  type DividerBlockProps,
  type EmbedBlockProps,
  type FormBlockProps,
  type HeadingBlockProps,
  type ImageBlockProps,
  type ListBlockProps,
  type ParagraphBlockProps,
  type QuoteBlockProps,
  type SectionBlockProps,
  type TableBlockProps,
  type VideoBlockProps,
} from "./model";

// Block Registry System with Components (PZ-201)
export {
  // Types
  type BaseComponentBlockDefinition,
  type BlockCategoryMeta,
  type BlockComponentProps,
  type BlockDefinition as ComponentBlockDefinition,
  type BlockLoader,
  type BlockRegistrationResult,
  type ComponentBlockRegistry,
  type ComponentBlockRegistryOptions,
  type BlockCategory as ExtendedBlockCategory,
  // Category metadata
  BLOCK_CATEGORIES,
  // Registry factory and utilities
  createComponentBlockRegistry,
  createDefaultComponentBlockRegistry,
  getComponentBlockRegistry,
  resetGlobalComponentBlockRegistry,
  // Default block definitions with components
  calloutComponentBlockDefinition,
  codeComponentBlockDefinition,
  columnsComponentBlockDefinition,
  defaultComponentBlockDefinitions,
  dividerComponentBlockDefinition,
  embedComponentBlockDefinition,
  formComponentBlockDefinition,
  headingComponentBlockDefinition,
  imageComponentBlockDefinition,
  listComponentBlockDefinition,
  paragraphComponentBlockDefinition,
  quoteComponentBlockDefinition,
  sectionComponentBlockDefinition,
  tableComponentBlockDefinition,
  videoComponentBlockDefinition,
} from "./registry";

// Block Selection & Focus (PZ-207)
export {
  // Types
  type ClickAction,
  type FocusDirection,
  type FocusState,
  type KeyboardAction,
  type KeyboardConfig,
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
  // State factories
  createInitialFocus,
  createInitialMultiSelection,
  createInitialSelectionFocus,
  createSelectionError,
  // State atoms
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
  // State utilities
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
  // Selection actions
  clearSelection,
  deselectBlock,
  selectAll,
  selectBlock as selectBlockMulti,
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
  // Keyboard handling
  createKeyboardHandler,
  defaultKeyboardConfig,
  executeKeyboardAction,
  handleKeyboardEvent,
  parseKeyboardEvent,
  shouldHandleKeyboardEvent,
} from "./selection";

// Drag and Drop (PZ-209)
export {
  // Types
  type DragSource,
  type DragItem,
  type DropPosition,
  type DropTarget,
  type DragPoint,
  type DragStatus,
  type DragState,
  type DragOperation,
  type DropValidationContext,
  type DropValidationResult,
  type DragErrorCode,
  type DragError,
  type DragResult,
  type DropZoneConfig,
  type HitTestResult,
  type UseDragBlockOptions,
  type UseDragBlockReturn,
  type UseDragSidebarOptions,
  type UseDragSidebarReturn,
  type UseDropTargetOptions,
  type UseDropTargetReturn,
  type UseRootDropZoneOptions,
  type UseRootDropZoneReturn,
  // Factory functions
  createDragError,
  createInitialDragState,
  // Type guards
  isDragging,
  isDropping,
  isDocumentDrag,
  isSidebarDrag,
  // Constants
  DEFAULT_DROP_ZONE_CONFIG,
  // Schemas
  DragPointSchema,
  DragSourceSchema,
  DragStatusSchema,
  DropPositionSchema,
  DropTargetSchema,
  // State atoms
  $dragState,
  $dragStatus,
  $isDragging,
  $isDropping,
  $dragItem,
  $dropTarget,
  $pointerPosition,
  $isTouch,
  $hasValidDropTarget,
  $draggedBlock,
  $draggedBlockType,
  $targetBlock,
  $targetParentBlock,
  // State utilities
  isBlockBeingDragged,
  isBlockDropTarget,
  getBlockDropPosition,
  getBlockDragInfo,
  resetDragState,
  getDragStateSnapshot,
  // Actions
  startDocumentDrag,
  startSidebarDrag,
  updateDrag,
  endDrag,
  cancelDrag,
  computeDropTarget,
  computeRootDropTarget,
  validateDrop,
  wouldCreateCircularReference,
  // Hooks
  useDragBlock,
  useDragSidebar,
  useDropTarget,
  useRootDropZone,
  useDragState,
} from "./dnd";

// Undo/Redo History (PZ-210)
export {
  // Types
  type HistoryEntry as HistoryStackEntry,
  type HistoryError,
  type HistoryErrorCode,
  type HistoryFlags,
  type HistoryKeyboardAction,
  type HistoryKeyboardConfig,
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
  // State atoms
  $history,
  $canRedo,
  $canUndo,
  $currentHistoryIndex,
  $historySize,
  $isBatching,
  $redoDescription,
  $undoDescription,
  resetHistoryState,
  // Actions
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
  // Keyboard handling
  createHistoryKeyboardHandler,
  defaultHistoryKeyboardConfig,
  executeHistoryKeyboardAction,
  handleHistoryKeyboardEvent,
  parseHistoryKeyboardEvent,
  shouldHandleHistoryKeyboardEvent,
} from "./history";

// Block Sidebar (PZ-206)
export {
  // Components
  BlockSidebar,
  BlockItem,
  CategorySection,
  SearchInput,
  RecentlyUsedSection,
  // Types
  type BlockSidebarProps,
  type BlockItemProps,
  type CategorySectionProps,
  type SearchInputProps,
  type RecentlyUsedSectionProps,
  type GroupedBlocks,
  // State atoms
  $recentlyUsedBlocks,
  $sidebarSearchQuery,
  $collapsedCategories,
  $hasSearch,
  // State actions
  addToRecentlyUsed,
  clearRecentlyUsed,
  setSearchQuery,
  clearSearchQuery,
  toggleCategory,
  isCategoryCollapsed,
  expandAllCategories,
  collapseAllCategories,
  resetSidebarState,
  // Constants
  MAX_RECENTLY_USED,
} from "./components";

// Placeholder - to be implemented in Phase 2
export function BlockEditor(): never {
  throw new Error("Not implemented - see PZ-200: https://github.com/ezmode-games/phantom-zone/issues/41");
}
