import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import {
  initializeDocument,
  insertBlockAction,
} from "../../src/model/document";
import type { Block } from "../../src/model/types";
import {
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
  isBlockBeingDragged,
  isBlockDropTarget,
  getBlockDropPosition,
  getBlockDragInfo,
  resetDragState,
  getDragStateSnapshot,
} from "../../src/dnd/state";
import type { DragItem, DragState, DropTarget } from "../../src/dnd/types";

function createTestBlock(
  type: string,
  props: Record<string, unknown> = {},
  children?: Block[]
): Block {
  const block: Block = {
    id: uuidv7(),
    type,
    props,
  };
  if (children !== undefined) {
    block.children = children;
  }
  return block;
}

describe("DnD State", () => {
  beforeEach(() => {
    initializeDocument();
    resetDragState();
  });

  afterEach(() => {
    initializeDocument();
    resetDragState();
  });

  describe("$dragState atom", () => {
    it("starts with initial state", () => {
      const state = $dragState.get();

      expect(state.status).toBe("idle");
      expect(state.item).toBeNull();
      expect(state.dropTarget).toBeNull();
      expect(state.pointerPosition).toBeNull();
      expect(state.isTouch).toBe(false);
    });

    it("can be updated directly", () => {
      const newState: DragState = {
        status: "dragging",
        item: {
          source: "sidebar",
          blockTypeId: "paragraph",
          displayName: "Paragraph",
          icon: "text",
        },
        dropTarget: null,
        pointerPosition: { x: 100, y: 100 },
        isTouch: false,
      };

      $dragState.set(newState);

      expect($dragState.get()).toEqual(newState);
    });
  });

  describe("computed atoms", () => {
    describe("$dragStatus", () => {
      it("reflects status from drag state", () => {
        expect($dragStatus.get()).toBe("idle");

        $dragState.set({
          ...$dragState.get(),
          status: "dragging",
        });

        expect($dragStatus.get()).toBe("dragging");
      });
    });

    describe("$isDragging", () => {
      it("is true when status is dragging", () => {
        expect($isDragging.get()).toBe(false);

        $dragState.set({
          ...$dragState.get(),
          status: "dragging",
        });

        expect($isDragging.get()).toBe(true);
      });
    });

    describe("$isDropping", () => {
      it("is true when status is dropping", () => {
        expect($isDropping.get()).toBe(false);

        $dragState.set({
          ...$dragState.get(),
          status: "dropping",
        });

        expect($isDropping.get()).toBe(true);
      });
    });

    describe("$dragItem", () => {
      it("reflects item from drag state", () => {
        expect($dragItem.get()).toBeNull();

        const item: DragItem = {
          source: "sidebar",
          blockTypeId: "paragraph",
          displayName: "Paragraph",
          icon: "text",
        };

        $dragState.set({
          ...$dragState.get(),
          item,
        });

        expect($dragItem.get()).toEqual(item);
      });
    });

    describe("$dropTarget", () => {
      it("reflects dropTarget from drag state", () => {
        expect($dropTarget.get()).toBeNull();

        const target: DropTarget = {
          targetBlockId: uuidv7(),
          position: "after",
          parentId: null,
          index: 0,
          isValid: true,
        };

        $dragState.set({
          ...$dragState.get(),
          dropTarget: target,
        });

        expect($dropTarget.get()).toEqual(target);
      });
    });

    describe("$pointerPosition", () => {
      it("reflects pointerPosition from drag state", () => {
        expect($pointerPosition.get()).toBeNull();

        $dragState.set({
          ...$dragState.get(),
          pointerPosition: { x: 150, y: 250 },
        });

        expect($pointerPosition.get()).toEqual({ x: 150, y: 250 });
      });
    });

    describe("$isTouch", () => {
      it("reflects isTouch from drag state", () => {
        expect($isTouch.get()).toBe(false);

        $dragState.set({
          ...$dragState.get(),
          isTouch: true,
        });

        expect($isTouch.get()).toBe(true);
      });
    });

    describe("$hasValidDropTarget", () => {
      it("is false when no drop target", () => {
        expect($hasValidDropTarget.get()).toBe(false);
      });

      it("is false when drop target is invalid", () => {
        $dragState.set({
          ...$dragState.get(),
          dropTarget: {
            targetBlockId: uuidv7(),
            position: "after",
            parentId: null,
            index: 0,
            isValid: false,
            invalidReason: "Cannot drop here",
          },
        });

        expect($hasValidDropTarget.get()).toBe(false);
      });

      it("is true when drop target is valid", () => {
        $dragState.set({
          ...$dragState.get(),
          dropTarget: {
            targetBlockId: uuidv7(),
            position: "after",
            parentId: null,
            index: 0,
            isValid: true,
          },
        });

        expect($hasValidDropTarget.get()).toBe(true);
      });
    });

    describe("$draggedBlock", () => {
      it("returns null for sidebar drag", () => {
        $dragState.set({
          status: "dragging",
          item: {
            source: "sidebar",
            blockTypeId: "paragraph",
            displayName: "Paragraph",
            icon: "text",
          },
          dropTarget: null,
          pointerPosition: { x: 100, y: 100 },
          isTouch: false,
        });

        expect($draggedBlock.get()).toBeNull();
      });

      it("returns block for document drag", () => {
        const block = createTestBlock("paragraph", { content: "Hello" });
        insertBlockAction(block);

        $dragState.set({
          status: "dragging",
          item: {
            source: "document",
            blockId: block.id,
            block,
            originalParentId: undefined,
            originalIndex: 0,
          },
          dropTarget: null,
          pointerPosition: { x: 100, y: 100 },
          isTouch: false,
        });

        const draggedBlock = $draggedBlock.get();
        expect(draggedBlock).not.toBeNull();
        expect(draggedBlock?.id).toBe(block.id);
      });
    });

    describe("$draggedBlockType", () => {
      it("returns block type for sidebar drag", () => {
        $dragState.set({
          status: "dragging",
          item: {
            source: "sidebar",
            blockTypeId: "heading",
            displayName: "Heading",
            icon: "heading",
          },
          dropTarget: null,
          pointerPosition: { x: 100, y: 100 },
          isTouch: false,
        });

        expect($draggedBlockType.get()).toBe("heading");
      });

      it("returns null for document drag", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        $dragState.set({
          status: "dragging",
          item: {
            source: "document",
            blockId: block.id,
            block,
            originalParentId: undefined,
            originalIndex: 0,
          },
          dropTarget: null,
          pointerPosition: { x: 100, y: 100 },
          isTouch: false,
        });

        expect($draggedBlockType.get()).toBeNull();
      });
    });

    describe("$targetBlock", () => {
      it("returns target block when set", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        $dragState.set({
          ...$dragState.get(),
          dropTarget: {
            targetBlockId: block.id,
            position: "after",
            parentId: null,
            index: 1,
            isValid: true,
          },
        });

        const target = $targetBlock.get();
        expect(target).not.toBeNull();
        expect(target?.id).toBe(block.id);
      });

      it("returns null when no target", () => {
        expect($targetBlock.get()).toBeNull();
      });
    });

    describe("$targetParentBlock", () => {
      it("returns parent block when set", () => {
        const child = createTestBlock("paragraph");
        const parent = createTestBlock("section", {}, [child]);
        insertBlockAction(parent);

        $dragState.set({
          ...$dragState.get(),
          dropTarget: {
            targetBlockId: child.id,
            position: "inside",
            parentId: parent.id,
            index: 1,
            isValid: true,
          },
        });

        const targetParent = $targetParentBlock.get();
        expect(targetParent).not.toBeNull();
        expect(targetParent?.id).toBe(parent.id);
      });

      it("returns null for root level target", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        $dragState.set({
          ...$dragState.get(),
          dropTarget: {
            targetBlockId: block.id,
            position: "after",
            parentId: null,
            index: 1,
            isValid: true,
          },
        });

        expect($targetParentBlock.get()).toBeNull();
      });
    });
  });

  describe("utility functions", () => {
    describe("isBlockBeingDragged", () => {
      it("returns true for dragged block", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        $dragState.set({
          status: "dragging",
          item: {
            source: "document",
            blockId: block.id,
            block,
            originalParentId: undefined,
            originalIndex: 0,
          },
          dropTarget: null,
          pointerPosition: { x: 100, y: 100 },
          isTouch: false,
        });

        expect(isBlockBeingDragged(block.id)).toBe(true);
      });

      it("returns false for non-dragged block", () => {
        const block1 = createTestBlock("paragraph");
        const block2 = createTestBlock("paragraph");
        insertBlockAction(block1);
        insertBlockAction(block2);

        $dragState.set({
          status: "dragging",
          item: {
            source: "document",
            blockId: block1.id,
            block: block1,
            originalParentId: undefined,
            originalIndex: 0,
          },
          dropTarget: null,
          pointerPosition: { x: 100, y: 100 },
          isTouch: false,
        });

        expect(isBlockBeingDragged(block2.id)).toBe(false);
      });

      it("returns false when not dragging", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        expect(isBlockBeingDragged(block.id)).toBe(false);
      });
    });

    describe("isBlockDropTarget", () => {
      it("returns true for drop target block", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        $dragState.set({
          ...$dragState.get(),
          dropTarget: {
            targetBlockId: block.id,
            position: "after",
            parentId: null,
            index: 1,
            isValid: true,
          },
        });

        expect(isBlockDropTarget(block.id)).toBe(true);
      });

      it("returns false for non-target block", () => {
        const block1 = createTestBlock("paragraph");
        const block2 = createTestBlock("paragraph");
        insertBlockAction(block1);
        insertBlockAction(block2);

        $dragState.set({
          ...$dragState.get(),
          dropTarget: {
            targetBlockId: block1.id,
            position: "after",
            parentId: null,
            index: 1,
            isValid: true,
          },
        });

        expect(isBlockDropTarget(block2.id)).toBe(false);
      });
    });

    describe("getBlockDropPosition", () => {
      it("returns position for target block", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        $dragState.set({
          ...$dragState.get(),
          dropTarget: {
            targetBlockId: block.id,
            position: "before",
            parentId: null,
            index: 0,
            isValid: true,
          },
        });

        expect(getBlockDropPosition(block.id)).toBe("before");
      });

      it("returns null for non-target block", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        expect(getBlockDropPosition(block.id)).toBeNull();
      });
    });

    describe("getBlockDragInfo", () => {
      it("returns info for root-level block", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        const info = getBlockDragInfo(block.id);

        expect(info).not.toBeNull();
        expect(info?.block.id).toBe(block.id);
        expect(info?.parentId).toBeUndefined();
        expect(info?.index).toBe(0);
      });

      it("returns info for nested block", () => {
        const child = createTestBlock("paragraph");
        const parent = createTestBlock("section", {}, [child]);
        insertBlockAction(parent);

        const info = getBlockDragInfo(child.id);

        expect(info).not.toBeNull();
        expect(info?.block.id).toBe(child.id);
        expect(info?.parentId).toBe(parent.id);
        expect(info?.index).toBe(0);
      });

      it("returns correct index for multiple siblings", () => {
        const block1 = createTestBlock("paragraph");
        const block2 = createTestBlock("paragraph");
        const block3 = createTestBlock("paragraph");
        insertBlockAction(block1);
        insertBlockAction(block2);
        insertBlockAction(block3);

        const info = getBlockDragInfo(block2.id);

        expect(info?.index).toBe(1);
      });

      it("returns null for non-existent block", () => {
        const info = getBlockDragInfo("nonexistent");
        expect(info).toBeNull();
      });
    });

    describe("resetDragState", () => {
      it("resets to initial state", () => {
        $dragState.set({
          status: "dragging",
          item: {
            source: "sidebar",
            blockTypeId: "paragraph",
            displayName: "Paragraph",
            icon: "text",
          },
          dropTarget: {
            targetBlockId: uuidv7(),
            position: "after",
            parentId: null,
            index: 0,
            isValid: true,
          },
          pointerPosition: { x: 100, y: 100 },
          isTouch: true,
        });

        resetDragState();

        const state = $dragState.get();
        expect(state.status).toBe("idle");
        expect(state.item).toBeNull();
        expect(state.dropTarget).toBeNull();
        expect(state.pointerPosition).toBeNull();
        expect(state.isTouch).toBe(false);
      });
    });

    describe("getDragStateSnapshot", () => {
      it("returns current state", () => {
        const expectedState: DragState = {
          status: "dragging",
          item: {
            source: "sidebar",
            blockTypeId: "paragraph",
            displayName: "Paragraph",
            icon: "text",
          },
          dropTarget: null,
          pointerPosition: { x: 100, y: 100 },
          isTouch: false,
        };

        $dragState.set(expectedState);

        const snapshot = getDragStateSnapshot();
        expect(snapshot).toEqual(expectedState);
      });
    });
  });
});
