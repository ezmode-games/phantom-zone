/**
 * Drag and Drop Module
 *
 * Exports for drag-drop functionality in the block editor.
 * Implements PZ-209: Drag and Drop
 */

// Types
export {
  // Core types
  type DragSource,
  type DragItem,
  type DropPosition,
  type DropTarget,
  type DragPoint,
  type DragStatus,
  type DragState,
  type DragOperation,
  // Validation types
  type DropValidationContext,
  type DropValidationResult,
  // Error types
  type DragErrorCode,
  type DragError,
  type DragResult,
  // Configuration types
  type DropZoneConfig,
  type HitTestResult,
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
} from "./types";

// State
export {
  // Atoms
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
  // Utility functions
  isBlockBeingDragged,
  isBlockDropTarget,
  getBlockDropPosition,
  getBlockDragInfo,
  resetDragState,
  getDragStateSnapshot,
} from "./state";

// Actions
export {
  // Start operations
  startDocumentDrag,
  startSidebarDrag,
  // Update operations
  updateDrag,
  // End operations
  endDrag,
  cancelDrag,
  // Target computation
  computeDropTarget,
  computeRootDropTarget,
  // Validation
  validateDrop,
  wouldCreateCircularReference,
} from "./actions";

// Hooks
export {
  // Drag hooks
  useDragBlock,
  useDragSidebar,
  // Drop hooks
  useDropTarget,
  useRootDropZone,
  // State hook
  useDragState,
  // Hook types
  type UseDragBlockOptions,
  type UseDragBlockReturn,
  type UseDragSidebarOptions,
  type UseDragSidebarReturn,
  type UseDropTargetOptions,
  type UseDropTargetReturn,
  type UseRootDropZoneOptions,
  type UseRootDropZoneReturn,
} from "./hooks";
