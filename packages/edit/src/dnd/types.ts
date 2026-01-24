/**
 * Drag and Drop Types
 *
 * Type definitions for drag-drop operations in the block editor.
 * Implements PZ-209: Drag and Drop
 */

import { z } from "zod/v4";
import type { Block, BlockTypeId, Result } from "../model/types";

/**
 * Source of a drag operation
 */
export type DragSource =
  | "document" // Dragging an existing block from the document
  | "sidebar"; // Dragging a new block type from the sidebar palette

/**
 * Item being dragged - either an existing block or a new block type
 */
export type DragItem =
  | {
      source: "document";
      /** The block ID being dragged */
      blockId: string;
      /** The block data (for preview) */
      block: Block;
      /** Original parent ID (undefined if root level) */
      originalParentId: string | undefined;
      /** Original index in parent's children */
      originalIndex: number;
    }
  | {
      source: "sidebar";
      /** The block type ID to create */
      blockTypeId: BlockTypeId;
      /** Display name for the preview */
      displayName: string;
      /** Icon name for the preview */
      icon: string;
    };

/**
 * Position relative to a target block for drop indicator
 */
export type DropPosition = "before" | "after" | "inside";

/**
 * Target location for a drop operation
 */
export interface DropTarget {
  /** The target block ID (null for root-level drop at end) */
  targetBlockId: string | null;
  /** Position relative to the target */
  position: DropPosition;
  /** Parent block ID (null for root level) */
  parentId: string | null;
  /** Index in the parent's children array where the item will be inserted */
  index: number;
  /** Whether this drop target is valid (passes constraint validation) */
  isValid: boolean;
  /** Reason if invalid */
  invalidReason?: string;
}

/**
 * Point coordinates for tracking drag position
 */
export interface DragPoint {
  x: number;
  y: number;
}

/**
 * Drag operation states
 */
export type DragStatus = "idle" | "dragging" | "dropping";

/**
 * Complete drag state
 */
export interface DragState {
  /** Current drag status */
  status: DragStatus;
  /** Item being dragged (null when idle) */
  item: DragItem | null;
  /** Current drop target (null when not over a valid target) */
  dropTarget: DropTarget | null;
  /** Current pointer position */
  pointerPosition: DragPoint | null;
  /** Whether touch input is being used */
  isTouch: boolean;
}

/**
 * Drag operation discriminated union for actions
 */
export type DragOperation =
  | {
      type: "START_DRAG";
      item: DragItem;
      pointerPosition: DragPoint;
      isTouch: boolean;
    }
  | {
      type: "UPDATE_DRAG";
      pointerPosition: DragPoint;
      dropTarget: DropTarget | null;
    }
  | {
      type: "END_DRAG";
      dropTarget: DropTarget;
    }
  | {
      type: "CANCEL_DRAG";
    };

/**
 * Drop validation context
 */
export interface DropValidationContext {
  /** The item being dragged */
  item: DragItem;
  /** The target parent block ID (null for root) */
  targetParentId: string | null;
  /** The target parent block type (null for root) */
  targetParentType: BlockTypeId | null;
}

/**
 * Drop validation result
 */
export interface DropValidationResult {
  /** Whether the drop is valid */
  isValid: boolean;
  /** Reason if invalid */
  reason?: string;
}

/**
 * Error codes for drag-drop operations
 */
export type DragErrorCode =
  | "NOT_DRAGGING"
  | "INVALID_DROP_TARGET"
  | "CONSTRAINT_VIOLATION"
  | "BLOCK_NOT_FOUND"
  | "SELF_DROP"
  | "ANCESTOR_DROP";

/**
 * Drag-drop error type
 */
export interface DragError {
  code: DragErrorCode;
  message: string;
  cause?: unknown;
}

/**
 * Create a drag error
 */
export function createDragError(
  code: DragErrorCode,
  message: string,
  cause?: unknown
): DragError {
  return { code, message, cause };
}

/**
 * Result type for drag-drop operations
 */
export type DragResult<T> = Result<T, DragError>;

/**
 * Zod schema for drag point
 */
export const DragPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * Zod schema for drop position
 */
export const DropPositionSchema = z.enum(["before", "after", "inside"]);

/**
 * Zod schema for drag source
 */
export const DragSourceSchema = z.enum(["document", "sidebar"]);

/**
 * Zod schema for drag status
 */
export const DragStatusSchema = z.enum(["idle", "dragging", "dropping"]);

/**
 * Zod schema for drop target
 */
export const DropTargetSchema = z.object({
  targetBlockId: z.string().nullable(),
  position: DropPositionSchema,
  parentId: z.string().nullable(),
  index: z.number().int().nonnegative(),
  isValid: z.boolean(),
  invalidReason: z.string().optional(),
});

/**
 * Create initial drag state
 */
export function createInitialDragState(): DragState {
  return {
    status: "idle",
    item: null,
    dropTarget: null,
    pointerPosition: null,
    isTouch: false,
  };
}

/**
 * Check if a drag is currently active
 */
export function isDragging(state: DragState): boolean {
  return state.status === "dragging";
}

/**
 * Check if a drop is in progress
 */
export function isDropping(state: DragState): boolean {
  return state.status === "dropping";
}

/**
 * Check if the drag item is from the document
 */
export function isDocumentDrag(
  item: DragItem
): item is DragItem & { source: "document" } {
  return item.source === "document";
}

/**
 * Check if the drag item is from the sidebar
 */
export function isSidebarDrag(
  item: DragItem
): item is DragItem & { source: "sidebar" } {
  return item.source === "sidebar";
}

/**
 * Configuration for drop zone behavior
 */
export interface DropZoneConfig {
  /** Vertical threshold (in pixels) to determine before/after vs inside */
  edgeThreshold: number;
  /** Whether to allow dropping inside this zone */
  allowInside: boolean;
  /** Allowed child types (empty = all allowed) */
  allowedChildren: BlockTypeId[];
}

/**
 * Default drop zone configuration
 */
export const DEFAULT_DROP_ZONE_CONFIG: DropZoneConfig = {
  edgeThreshold: 8,
  allowInside: false,
  allowedChildren: [],
};

/**
 * Hit test result for determining drop position
 */
export interface HitTestResult {
  /** The position determined by hit test */
  position: DropPosition;
  /** Relative Y position (0-1) within the target */
  relativeY: number;
}
