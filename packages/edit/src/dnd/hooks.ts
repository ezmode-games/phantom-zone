/**
 * Drag and Drop React Hooks
 *
 * React hooks for integrating drag-drop with components.
 * Implements PZ-209: Drag and Drop
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import type { BlockTypeId } from "../model/types";
import {
  startDocumentDrag,
  startSidebarDrag,
  updateDrag,
  endDrag,
  cancelDrag,
  computeDropTarget,
  computeRootDropTarget,
} from "./actions";
import {
  $dragState,
  $isDragging,
  $dropTarget,
  $dragItem,
  isBlockBeingDragged,
  isBlockDropTarget,
  getBlockDropPosition,
} from "./state";
import type { DragPoint, DropTarget, DropPosition } from "./types";

/**
 * Hook for making a block draggable
 */
export interface UseDragBlockOptions {
  /** Block ID to drag */
  blockId: string;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: (dropped: boolean) => void;
}

export interface UseDragBlockReturn {
  /** Whether this block is currently being dragged */
  isDragging: boolean;
  /** Props to spread on the drag handle element */
  dragHandleProps: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

/**
 * Hook for making a block draggable
 */
export function useDragBlock(options: UseDragBlockOptions): UseDragBlockReturn {
  const { blockId, disabled = false, onDragStart, onDragEnd } = options;
  const isDraggingGlobal = useStore($isDragging);
  const isDraggingThis = isBlockBeingDragged(blockId);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (disabled) {
        e.preventDefault();
        return;
      }

      const position: DragPoint = { x: e.clientX, y: e.clientY };
      const result = startDocumentDrag(blockId, position, false);

      if (result.ok) {
        // Set drag image to empty to use custom preview
        const img = new Image();
        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(img, 0, 0);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      } else {
        e.preventDefault();
      }
    },
    [blockId, disabled, onDragStart]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      const state = $dragState.get();
      const dropped = state.dropTarget?.isValid ?? false;

      if (e.dataTransfer.dropEffect === "none") {
        cancelDrag();
        onDragEnd?.(false);
      } else {
        endDrag();
        onDragEnd?.(dropped);
      }
    },
    [onDragEnd]
  );

  // Touch handlers for mobile support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch || !touchStartRef.current) return;

      const position: DragPoint = { x: touch.clientX, y: touch.clientY };

      // Start drag after a small movement threshold
      const dx = position.x - touchStartRef.current.x;
      const dy = position.y - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10 && !isDraggingGlobal) {
        const result = startDocumentDrag(blockId, position, true);
        if (result.ok) {
          e.preventDefault();
          onDragStart?.();
        }
      } else if (isDraggingThis) {
        e.preventDefault();
        // Update drag position - actual target computation happens in drop zone
        updateDrag(position, null);
      }
    },
    [blockId, disabled, isDraggingGlobal, isDraggingThis, onDragStart]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchStartRef.current = null;

      if (isDraggingThis) {
        const state = $dragState.get();
        const dropped = state.dropTarget?.isValid ?? false;

        endDrag();
        onDragEnd?.(dropped);
      }
    },
    [isDraggingThis, onDragEnd]
  );

  return {
    isDragging: isDraggingThis,
    dragHandleProps: {
      draggable: !disabled,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * Hook for making a sidebar item draggable
 */
export interface UseDragSidebarOptions {
  /** Block type ID to create on drop */
  blockTypeId: BlockTypeId;
  /** Display name for the drag preview */
  displayName: string;
  /** Icon name for the drag preview */
  icon: string;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: (dropped: boolean) => void;
}

export interface UseDragSidebarReturn {
  /** Whether this item is currently being dragged */
  isDragging: boolean;
  /** Props to spread on the draggable element */
  dragProps: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

/**
 * Hook for making a sidebar item draggable
 */
export function useDragSidebar(options: UseDragSidebarOptions): UseDragSidebarReturn {
  const { blockTypeId, displayName, icon, disabled = false, onDragStart, onDragEnd } = options;
  const dragItem = useStore($dragItem);
  const isDraggingGlobal = useStore($isDragging);
  const isDraggingThis =
    dragItem?.source === "sidebar" && dragItem.blockTypeId === blockTypeId;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (disabled) {
        e.preventDefault();
        return;
      }

      const position: DragPoint = { x: e.clientX, y: e.clientY };
      const result = startSidebarDrag(blockTypeId, displayName, icon, position, false);

      if (result.ok) {
        const img = new Image();
        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(img, 0, 0);
        e.dataTransfer.effectAllowed = "copy";
        onDragStart?.();
      } else {
        e.preventDefault();
      }
    },
    [blockTypeId, displayName, icon, disabled, onDragStart]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      const state = $dragState.get();
      const dropped = state.dropTarget?.isValid ?? false;

      if (e.dataTransfer.dropEffect === "none") {
        cancelDrag();
        onDragEnd?.(false);
      } else {
        endDrag();
        onDragEnd?.(dropped);
      }
    },
    [onDragEnd]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      if (!touch || !touchStartRef.current) return;

      const position: DragPoint = { x: touch.clientX, y: touch.clientY };
      const dx = position.x - touchStartRef.current.x;
      const dy = position.y - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10 && !isDraggingGlobal) {
        const result = startSidebarDrag(blockTypeId, displayName, icon, position, true);
        if (result.ok) {
          e.preventDefault();
          onDragStart?.();
        }
      } else if (isDraggingThis) {
        e.preventDefault();
        updateDrag(position, null);
      }
    },
    [blockTypeId, displayName, icon, disabled, isDraggingGlobal, isDraggingThis, onDragStart]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchStartRef.current = null;

      if (isDraggingThis) {
        const state = $dragState.get();
        const dropped = state.dropTarget?.isValid ?? false;
        endDrag();
        onDragEnd?.(dropped);
      }
    },
    [isDraggingThis, onDragEnd]
  );

  return {
    isDragging: isDraggingThis,
    dragProps: {
      draggable: !disabled,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * Hook for making an element a drop target
 */
export interface UseDropTargetOptions {
  /** Block ID of this drop target */
  blockId: string;
  /** Whether dropping is disabled */
  disabled?: boolean;
  /** Edge threshold in pixels for before/after detection */
  edgeThreshold?: number;
}

export interface UseDropTargetReturn {
  /** Whether this element is the current drop target */
  isOver: boolean;
  /** The drop position if this is the target */
  dropPosition: DropPosition | null;
  /** Whether the current drop is valid */
  isValidDrop: boolean;
  /** Props to spread on the drop target element */
  dropTargetProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  /** Ref to attach to the drop target element */
  ref: React.RefObject<HTMLElement | null>;
}

/**
 * Hook for making an element a drop target
 */
export function useDropTarget(options: UseDropTargetOptions): UseDropTargetReturn {
  const { blockId, disabled = false, edgeThreshold = 8 } = options;
  const ref = useRef<HTMLElement | null>(null);
  const [isOver, setIsOver] = useState(false);
  const dropTarget = useStore($dropTarget);
  const isDragging = useStore($isDragging);

  const isCurrentTarget = dropTarget?.targetBlockId === blockId;
  const dropPosition = isCurrentTarget ? dropTarget.position : null;
  const isValidDrop = isCurrentTarget && dropTarget.isValid;

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !isDragging) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const target = computeDropTarget(
        e.clientY,
        blockId,
        { top: rect.top, bottom: rect.bottom, height: rect.height },
        edgeThreshold
      );

      if (target) {
        updateDrag({ x: e.clientX, y: e.clientY }, target);
      }
    },
    [blockId, disabled, edgeThreshold, isDragging]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      // Only set isOver to false if leaving the actual element
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        const { clientX, clientY } = e;
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          setIsOver(false);
        }
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      endDrag();
    },
    []
  );

  // Clear isOver when drag ends
  useEffect(() => {
    if (!isDragging) {
      setIsOver(false);
    }
  }, [isDragging]);

  return {
    isOver,
    dropPosition,
    isValidDrop,
    dropTargetProps: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    ref,
  };
}

/**
 * Hook for the root drop zone (end of document)
 */
export interface UseRootDropZoneOptions {
  /** Whether dropping is disabled */
  disabled?: boolean;
}

export interface UseRootDropZoneReturn {
  /** Whether drag is over the root zone */
  isOver: boolean;
  /** Whether the current drop would be valid */
  isValidDrop: boolean;
  /** Props to spread on the root drop zone element */
  dropZoneProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

/**
 * Hook for the root drop zone
 */
export function useRootDropZone(options: UseRootDropZoneOptions = {}): UseRootDropZoneReturn {
  const { disabled = false } = options;
  const [isOver, setIsOver] = useState(false);
  const dropTarget = useStore($dropTarget);
  const isDragging = useStore($isDragging);

  const isRootTarget = dropTarget?.targetBlockId === null && dropTarget?.parentId === null;
  const isValidDrop = isRootTarget && dropTarget.isValid;

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !isDragging) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const target = computeRootDropTarget();
      if (target) {
        updateDrag({ x: e.clientX, y: e.clientY }, target);
      }
    },
    [disabled, isDragging]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      endDrag();
    },
    []
  );

  useEffect(() => {
    if (!isDragging) {
      setIsOver(false);
    }
  }, [isDragging]);

  return {
    isOver,
    isValidDrop,
    dropZoneProps: {
      onDragOver: handleDragOver,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

/**
 * Hook to access global drag state
 */
export function useDragState() {
  return useStore($dragState);
}
