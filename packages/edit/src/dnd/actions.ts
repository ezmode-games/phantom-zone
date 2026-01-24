/**
 * Drag and Drop Actions
 *
 * Actions for modifying drag-drop state and executing drop operations.
 * Implements PZ-209: Drag and Drop
 */

import { uuidv7 } from "uuidv7";
import {
  $document,
  findBlockById,
  findParentBlock,
  findBlockIndex,
  moveBlockAction,
  insertBlockAction,
  getBlockPath,
} from "../model/document";
import { getComponentBlockRegistry } from "../registry/blocks";
import { err, ok, type Block, type BlockTypeId } from "../model/types";
import { $dragState, getBlockDragInfo, resetDragState } from "./state";
import {
  createDragError,
  createInitialDragState,
  isDocumentDrag,
  isSidebarDrag,
  type DragItem,
  type DragOperation,
  type DragPoint,
  type DragResult,
  type DropPosition,
  type DropTarget,
  type DropValidationContext,
  type DropValidationResult,
  type HitTestResult,
} from "./types";

/**
 * Start a drag operation from the document (existing block)
 */
export function startDocumentDrag(
  blockId: string,
  pointerPosition: DragPoint,
  isTouch = false
): DragResult<void> {
  const info = getBlockDragInfo(blockId);
  if (!info) {
    return err(
      createDragError("BLOCK_NOT_FOUND", `Block not found: ${blockId}`)
    );
  }

  const item: DragItem = {
    source: "document",
    blockId,
    block: info.block,
    originalParentId: info.parentId,
    originalIndex: info.index,
  };

  applyDragOperation({
    type: "START_DRAG",
    item,
    pointerPosition,
    isTouch,
  });

  return ok(undefined);
}

/**
 * Start a drag operation from the sidebar (new block type)
 */
export function startSidebarDrag(
  blockTypeId: BlockTypeId,
  displayName: string,
  icon: string,
  pointerPosition: DragPoint,
  isTouch = false
): DragResult<void> {
  const registry = getComponentBlockRegistry();
  if (!registry.has(blockTypeId)) {
    return err(
      createDragError("BLOCK_NOT_FOUND", `Block type not found: ${blockTypeId}`)
    );
  }

  const item: DragItem = {
    source: "sidebar",
    blockTypeId,
    displayName,
    icon,
  };

  applyDragOperation({
    type: "START_DRAG",
    item,
    pointerPosition,
    isTouch,
  });

  return ok(undefined);
}

/**
 * Update the drag position and compute drop target
 */
export function updateDrag(
  pointerPosition: DragPoint,
  dropTarget: DropTarget | null
): DragResult<void> {
  const state = $dragState.get();
  if (state.status !== "dragging") {
    return err(createDragError("NOT_DRAGGING", "No drag operation in progress"));
  }

  applyDragOperation({
    type: "UPDATE_DRAG",
    pointerPosition,
    dropTarget,
  });

  return ok(undefined);
}

/**
 * End the drag operation and execute the drop
 */
export function endDrag(): DragResult<void> {
  const state = $dragState.get();
  if (state.status !== "dragging") {
    return err(createDragError("NOT_DRAGGING", "No drag operation in progress"));
  }

  if (!state.dropTarget) {
    // No valid target, cancel instead
    cancelDrag();
    return ok(undefined);
  }

  if (!state.dropTarget.isValid) {
    return err(
      createDragError(
        "INVALID_DROP_TARGET",
        state.dropTarget.invalidReason ?? "Invalid drop target"
      )
    );
  }

  // Execute the drop
  const result = executeDrop(state.item!, state.dropTarget);
  if (!result.ok) {
    cancelDrag();
    return result;
  }

  resetDragState();
  return ok(undefined);
}

/**
 * Cancel the current drag operation
 */
export function cancelDrag(): void {
  resetDragState();
}

/**
 * Execute the drop operation
 */
function executeDrop(
  item: DragItem,
  target: DropTarget
): DragResult<void> {
  if (isDocumentDrag(item)) {
    return executeDocumentDrop(item, target);
  }
  if (isSidebarDrag(item)) {
    return executeSidebarDrop(item, target);
  }
  return err(createDragError("INVALID_DROP_TARGET", "Unknown drag source"));
}

/**
 * Execute drop for document drag (move existing block)
 */
function executeDocumentDrop(
  item: DragItem & { source: "document" },
  target: DropTarget
): DragResult<void> {
  const { blockId, originalParentId, originalIndex } = item;
  const { parentId: targetParentId, index: targetIndex } = target;

  // Calculate adjusted index accounting for the block being moved
  let adjustedIndex = targetIndex;

  // Normalize parent IDs for comparison (undefined and null both mean root level)
  const normalizedOriginalParent = originalParentId ?? null;
  const normalizedTargetParent = targetParentId ?? null;

  // If moving within the same parent, account for the removal
  if (normalizedOriginalParent === normalizedTargetParent) {
    if (originalIndex < targetIndex) {
      // Block is being removed from before the target position
      adjustedIndex = targetIndex - 1;
    }
  }

  const result = moveBlockAction(blockId, targetParentId ?? undefined, adjustedIndex);
  if (!result.ok) {
    return err(
      createDragError("BLOCK_NOT_FOUND", result.error.message, result.error)
    );
  }

  return ok(undefined);
}

/**
 * Execute drop for sidebar drag (create new block)
 */
function executeSidebarDrop(
  item: DragItem & { source: "sidebar" },
  target: DropTarget
): DragResult<void> {
  const registry = getComponentBlockRegistry();
  const definition = registry.get(item.blockTypeId);

  if (!definition) {
    return err(
      createDragError("BLOCK_NOT_FOUND", `Block type not found: ${item.blockTypeId}`)
    );
  }

  // Create the new block
  const newBlock: Block = {
    id: uuidv7(),
    type: item.blockTypeId,
    props: { ...definition.defaultProps },
  };

  // Add children array for containers
  if (definition.isContainer) {
    newBlock.children = [];
  }

  const result = insertBlockAction(
    newBlock,
    target.parentId ?? undefined,
    target.index
  );

  if (!result.ok) {
    return err(
      createDragError("BLOCK_NOT_FOUND", result.error.message, result.error)
    );
  }

  return ok(undefined);
}

/**
 * Apply a drag operation to update state
 */
function applyDragOperation(operation: DragOperation): void {
  const state = $dragState.get();

  switch (operation.type) {
    case "START_DRAG": {
      $dragState.set({
        status: "dragging",
        item: operation.item,
        dropTarget: null,
        pointerPosition: operation.pointerPosition,
        isTouch: operation.isTouch,
      });
      break;
    }

    case "UPDATE_DRAG": {
      if (state.status !== "dragging") return;
      $dragState.set({
        ...state,
        pointerPosition: operation.pointerPosition,
        dropTarget: operation.dropTarget,
      });
      break;
    }

    case "END_DRAG": {
      if (state.status !== "dragging") return;
      $dragState.set({
        ...state,
        status: "dropping",
        dropTarget: operation.dropTarget,
      });
      break;
    }

    case "CANCEL_DRAG": {
      $dragState.set(createInitialDragState());
      break;
    }
  }
}

/**
 * Compute drop target from pointer position and target element
 */
export function computeDropTarget(
  pointerY: number,
  targetBlockId: string,
  targetRect: { top: number; bottom: number; height: number },
  edgeThreshold = 8
): DropTarget | null {
  const doc = $document.get();
  const state = $dragState.get();

  if (!state.item) return null;

  // Find the target block
  const targetBlock = findBlockById(doc.blocks, targetBlockId);
  if (!targetBlock) return null;

  // Determine position based on pointer Y
  const hitTest = hitTestDropPosition(pointerY, targetRect, edgeThreshold, targetBlock);

  // Calculate parent and index based on position
  const { parentId, index } = calculateDropLocation(
    targetBlockId,
    hitTest.position,
    doc.blocks
  );

  // Validate the drop
  const validation = validateDrop({
    item: state.item,
    targetParentId: parentId,
    targetParentType: parentId ? findBlockById(doc.blocks, parentId)?.type ?? null : null,
  });

  return {
    targetBlockId,
    position: hitTest.position,
    parentId,
    index,
    isValid: validation.isValid,
    invalidReason: validation.reason,
  };
}

/**
 * Compute drop target for dropping at root level (end of document)
 */
export function computeRootDropTarget(): DropTarget | null {
  const doc = $document.get();
  const state = $dragState.get();

  if (!state.item) return null;

  const validation = validateDrop({
    item: state.item,
    targetParentId: null,
    targetParentType: null,
  });

  return {
    targetBlockId: null,
    position: "after",
    parentId: null,
    index: doc.blocks.length,
    isValid: validation.isValid,
    invalidReason: validation.reason,
  };
}

/**
 * Hit test to determine drop position within a target element
 */
function hitTestDropPosition(
  pointerY: number,
  targetRect: { top: number; bottom: number; height: number },
  edgeThreshold: number,
  targetBlock: Block
): HitTestResult {
  const relativeY = (pointerY - targetRect.top) / targetRect.height;
  const edgeRatio = edgeThreshold / targetRect.height;

  // Check if target is a container that can receive children
  const registry = getComponentBlockRegistry();
  const definition = registry.get(targetBlock.type);
  const isContainer = definition?.isContainer ?? false;

  // If near the top edge, position is "before"
  if (relativeY < edgeRatio) {
    return { position: "before", relativeY };
  }

  // If near the bottom edge, position is "after"
  if (relativeY > 1 - edgeRatio) {
    return { position: "after", relativeY };
  }

  // If in the middle and it's a container, position is "inside"
  if (isContainer) {
    return { position: "inside", relativeY };
  }

  // Default to "after" for non-containers in the middle zone
  return { position: relativeY < 0.5 ? "before" : "after", relativeY };
}

/**
 * Calculate the parent and index for a drop based on target and position
 */
function calculateDropLocation(
  targetBlockId: string,
  position: DropPosition,
  blocks: Block[]
): { parentId: string | null; index: number } {
  const targetBlock = findBlockById(blocks, targetBlockId);
  if (!targetBlock) {
    return { parentId: null, index: blocks.length };
  }

  const parent = findParentBlock(blocks, targetBlockId);
  const siblings = parent ? parent.children ?? [] : blocks;
  const targetIndex = findBlockIndex(siblings, targetBlockId);

  switch (position) {
    case "before":
      return {
        parentId: parent?.id ?? null,
        index: targetIndex,
      };

    case "after":
      return {
        parentId: parent?.id ?? null,
        index: targetIndex + 1,
      };

    case "inside":
      return {
        parentId: targetBlockId,
        index: targetBlock.children?.length ?? 0,
      };
  }
}

/**
 * Validate whether a drop operation is allowed
 */
export function validateDrop(context: DropValidationContext): DropValidationResult {
  const { item, targetParentId, targetParentType } = context;
  const doc = $document.get();
  const registry = getComponentBlockRegistry();

  // For document drags, check self-drop and ancestor-drop
  if (isDocumentDrag(item)) {
    // Cannot drop on self
    if (targetParentId === item.blockId) {
      return {
        isValid: false,
        reason: "Cannot drop a block inside itself",
      };
    }

    // Cannot drop into own descendants
    if (targetParentId) {
      const path = getBlockPath(doc.blocks, targetParentId);
      if (path.includes(item.blockId)) {
        return {
          isValid: false,
          reason: "Cannot drop a block inside its own children",
        };
      }
    }
  }

  // Check container constraints
  if (targetParentType) {
    const parentDef = registry.get(targetParentType);
    if (!parentDef) {
      return {
        isValid: false,
        reason: "Unknown parent block type",
      };
    }

    if (!parentDef.isContainer) {
      return {
        isValid: false,
        reason: "Target block cannot contain children",
      };
    }

    // Check allowed children
    const childType = isDocumentDrag(item) ? item.block.type : item.blockTypeId;
    const canContainResult = registry.canContain(targetParentType, childType);

    if (canContainResult.ok && !canContainResult.value) {
      return {
        isValid: false,
        reason: `${parentDef.name} cannot contain ${childType} blocks`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Check if dropping block A into block B would create a circular reference
 */
export function wouldCreateCircularReference(
  draggedBlockId: string,
  targetParentId: string | null
): boolean {
  if (!targetParentId) return false;
  if (draggedBlockId === targetParentId) return true;

  const doc = $document.get();
  const path = getBlockPath(doc.blocks, targetParentId);
  return path.includes(draggedBlockId);
}
