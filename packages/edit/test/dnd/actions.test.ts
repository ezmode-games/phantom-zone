import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import {
  $document,
  initializeDocument,
  insertBlockAction,
} from "../../src/model/document";
import type { Block } from "../../src/model/types";
import {
  createComponentBlockRegistry,
  resetGlobalComponentBlockRegistry,
} from "../../src/registry/blocks";
import { defaultComponentBlockDefinitions } from "../../src/registry/default-blocks";
import { $dragState, resetDragState } from "../../src/dnd/state";
import {
  startDocumentDrag,
  startSidebarDrag,
  updateDrag,
  endDrag,
  cancelDrag,
  computeDropTarget,
  computeRootDropTarget,
  validateDrop,
  wouldCreateCircularReference,
} from "../../src/dnd/actions";
import type { DragPoint, DropValidationContext } from "../../src/dnd/types";

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

describe("DnD Actions", () => {
  beforeEach(() => {
    initializeDocument();
    resetDragState();
    resetGlobalComponentBlockRegistry();
  });

  afterEach(() => {
    initializeDocument();
    resetDragState();
    resetGlobalComponentBlockRegistry();
  });

  describe("startDocumentDrag", () => {
    it("starts drag for existing block", () => {
      const block = createTestBlock("paragraph", { content: "Hello" });
      insertBlockAction(block);

      const position: DragPoint = { x: 100, y: 100 };
      const result = startDocumentDrag(block.id, position, false);

      expect(result.ok).toBe(true);

      const state = $dragState.get();
      expect(state.status).toBe("dragging");
      expect(state.item?.source).toBe("document");
      if (state.item?.source === "document") {
        expect(state.item.blockId).toBe(block.id);
        expect(state.item.block.id).toBe(block.id);
      }
      expect(state.pointerPosition).toEqual(position);
      expect(state.isTouch).toBe(false);
    });

    it("starts touch drag", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      const position: DragPoint = { x: 100, y: 100 };
      startDocumentDrag(block.id, position, true);

      expect($dragState.get().isTouch).toBe(true);
    });

    it("includes original position info", () => {
      const child = createTestBlock("paragraph");
      const parent = createTestBlock("section", {}, [child]);
      insertBlockAction(parent);

      startDocumentDrag(child.id, { x: 0, y: 0 }, false);

      const state = $dragState.get();
      if (state.item?.source === "document") {
        expect(state.item.originalParentId).toBe(parent.id);
        expect(state.item.originalIndex).toBe(0);
      }
    });

    it("returns error for non-existent block", () => {
      const result = startDocumentDrag("nonexistent", { x: 0, y: 0 }, false);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("BLOCK_NOT_FOUND");
      }
    });
  });

  describe("startSidebarDrag", () => {
    it("starts drag for block type", () => {
      const position: DragPoint = { x: 100, y: 100 };
      const result = startSidebarDrag("paragraph", "Paragraph", "text", position, false);

      expect(result.ok).toBe(true);

      const state = $dragState.get();
      expect(state.status).toBe("dragging");
      expect(state.item?.source).toBe("sidebar");
      if (state.item?.source === "sidebar") {
        expect(state.item.blockTypeId).toBe("paragraph");
        expect(state.item.displayName).toBe("Paragraph");
        expect(state.item.icon).toBe("text");
      }
    });

    it("returns error for unknown block type", () => {
      const result = startSidebarDrag("unknown-type", "Unknown", "help", { x: 0, y: 0 }, false);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("BLOCK_NOT_FOUND");
      }
    });
  });

  describe("updateDrag", () => {
    it("updates pointer position and drop target", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      startDocumentDrag(block.id, { x: 0, y: 0 }, false);

      const newPosition: DragPoint = { x: 200, y: 300 };
      const result = updateDrag(newPosition, {
        targetBlockId: block.id,
        position: "after",
        parentId: null,
        index: 1,
        isValid: true,
      });

      expect(result.ok).toBe(true);

      const state = $dragState.get();
      expect(state.pointerPosition).toEqual(newPosition);
      expect(state.dropTarget?.position).toBe("after");
    });

    it("returns error when not dragging", () => {
      const result = updateDrag({ x: 100, y: 100 }, null);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_DRAGGING");
      }
    });
  });

  describe("endDrag", () => {
    it("moves document block to new position", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      insertBlockAction(block1);
      insertBlockAction(block2);

      startDocumentDrag(block2.id, { x: 0, y: 0 }, false);
      updateDrag({ x: 0, y: 0 }, {
        targetBlockId: block1.id,
        position: "before",
        parentId: null,
        index: 0,
        isValid: true,
      });

      const result = endDrag();

      expect(result.ok).toBe(true);

      const doc = $document.get();
      expect(doc.blocks[0]?.props.content).toBe("Second");
      expect(doc.blocks[1]?.props.content).toBe("First");
    });

    it("inserts new block from sidebar", () => {
      const existingBlock = createTestBlock("paragraph");
      insertBlockAction(existingBlock);

      startSidebarDrag("heading", "Heading", "heading", { x: 0, y: 0 }, false);
      updateDrag({ x: 0, y: 0 }, {
        targetBlockId: existingBlock.id,
        position: "before",
        parentId: null,
        index: 0,
        isValid: true,
      });

      const result = endDrag();

      expect(result.ok).toBe(true);

      const doc = $document.get();
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0]?.type).toBe("heading");
    });

    it("resets drag state after successful drop", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      startSidebarDrag("paragraph", "Paragraph", "text", { x: 0, y: 0 }, false);
      updateDrag({ x: 0, y: 0 }, {
        targetBlockId: block.id,
        position: "after",
        parentId: null,
        index: 1,
        isValid: true,
      });

      endDrag();

      const state = $dragState.get();
      expect(state.status).toBe("idle");
      expect(state.item).toBeNull();
    });

    it("cancels when no drop target", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      startDocumentDrag(block.id, { x: 0, y: 0 }, false);
      // No updateDrag call, so dropTarget is null

      const result = endDrag();

      expect(result.ok).toBe(true);
      expect($dragState.get().status).toBe("idle");
    });

    it("returns error for invalid drop target", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      startDocumentDrag(block.id, { x: 0, y: 0 }, false);
      updateDrag({ x: 0, y: 0 }, {
        targetBlockId: block.id,
        position: "inside",
        parentId: block.id,
        index: 0,
        isValid: false,
        invalidReason: "Cannot drop inside itself",
      });

      const result = endDrag();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_DROP_TARGET");
      }
    });

    it("returns error when not dragging", () => {
      const result = endDrag();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_DRAGGING");
      }
    });
  });

  describe("cancelDrag", () => {
    it("resets drag state", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);

      startDocumentDrag(block.id, { x: 0, y: 0 }, false);
      updateDrag({ x: 100, y: 100 }, {
        targetBlockId: block.id,
        position: "after",
        parentId: null,
        index: 1,
        isValid: true,
      });

      cancelDrag();

      const state = $dragState.get();
      expect(state.status).toBe("idle");
      expect(state.item).toBeNull();
      expect(state.dropTarget).toBeNull();
    });
  });

  describe("computeDropTarget", () => {
    it("computes before position near top edge", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      startSidebarDrag("paragraph", "Paragraph", "text", { x: 0, y: 0 }, false);

      const target = computeDropTarget(
        105, // Near top (100 + 5)
        block.id,
        { top: 100, bottom: 200, height: 100 },
        10 // edge threshold
      );

      expect(target).not.toBeNull();
      expect(target?.position).toBe("before");
    });

    it("computes after position near bottom edge", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      startSidebarDrag("paragraph", "Paragraph", "text", { x: 0, y: 0 }, false);

      const target = computeDropTarget(
        195, // Near bottom (200 - 5)
        block.id,
        { top: 100, bottom: 200, height: 100 },
        10
      );

      expect(target).not.toBeNull();
      expect(target?.position).toBe("after");
    });

    it("computes inside position for containers", () => {
      const container = createTestBlock("section", {}, []);
      insertBlockAction(container);
      startSidebarDrag("paragraph", "Paragraph", "text", { x: 0, y: 0 }, false);

      const target = computeDropTarget(
        150, // Middle
        container.id,
        { top: 100, bottom: 200, height: 100 },
        10
      );

      expect(target).not.toBeNull();
      expect(target?.position).toBe("inside");
      expect(target?.parentId).toBe(container.id);
    });

    it("returns null when not dragging", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      // Not starting drag

      const target = computeDropTarget(
        150,
        block.id,
        { top: 100, bottom: 200, height: 100 },
        10
      );

      expect(target).toBeNull();
    });

    it("returns null for non-existent block", () => {
      startSidebarDrag("paragraph", "Paragraph", "text", { x: 0, y: 0 }, false);

      const target = computeDropTarget(
        150,
        "nonexistent",
        { top: 100, bottom: 200, height: 100 },
        10
      );

      expect(target).toBeNull();
    });
  });

  describe("computeRootDropTarget", () => {
    it("computes root drop target", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      startSidebarDrag("paragraph", "Paragraph", "text", { x: 0, y: 0 }, false);

      const target = computeRootDropTarget();

      expect(target).not.toBeNull();
      expect(target?.targetBlockId).toBeNull();
      expect(target?.parentId).toBeNull();
      expect(target?.index).toBe(1); // After existing block
      expect(target?.isValid).toBe(true);
    });

    it("returns null when not dragging", () => {
      const target = computeRootDropTarget();
      expect(target).toBeNull();
    });
  });

  describe("validateDrop", () => {
    describe("document drags", () => {
      it("allows dropping at root level", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        const context: DropValidationContext = {
          item: {
            source: "document",
            blockId: block.id,
            block,
            originalParentId: undefined,
            originalIndex: 0,
          },
          targetParentId: null,
          targetParentType: null,
        };

        const result = validateDrop(context);
        expect(result.isValid).toBe(true);
      });

      it("prevents dropping into self", () => {
        const block = createTestBlock("section", {}, []);
        insertBlockAction(block);

        const context: DropValidationContext = {
          item: {
            source: "document",
            blockId: block.id,
            block,
            originalParentId: undefined,
            originalIndex: 0,
          },
          targetParentId: block.id,
          targetParentType: "section",
        };

        const result = validateDrop(context);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain("inside itself");
      });

      it("prevents dropping into own children", () => {
        const child = createTestBlock("section", {}, []);
        const parent = createTestBlock("section", {}, [child]);
        insertBlockAction(parent);

        const context: DropValidationContext = {
          item: {
            source: "document",
            blockId: parent.id,
            block: parent,
            originalParentId: undefined,
            originalIndex: 0,
          },
          targetParentId: child.id,
          targetParentType: "section",
        };

        const result = validateDrop(context);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain("children");
      });
    });

    describe("sidebar drags", () => {
      it("allows dropping at root level", () => {
        const context: DropValidationContext = {
          item: {
            source: "sidebar",
            blockTypeId: "paragraph",
            displayName: "Paragraph",
            icon: "text",
          },
          targetParentId: null,
          targetParentType: null,
        };

        const result = validateDrop(context);
        expect(result.isValid).toBe(true);
      });

      it("allows dropping into container", () => {
        const container = createTestBlock("section", {}, []);
        insertBlockAction(container);

        const context: DropValidationContext = {
          item: {
            source: "sidebar",
            blockTypeId: "paragraph",
            displayName: "Paragraph",
            icon: "text",
          },
          targetParentId: container.id,
          targetParentType: "section",
        };

        const result = validateDrop(context);
        expect(result.isValid).toBe(true);
      });

      it("prevents dropping into non-container", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        const context: DropValidationContext = {
          item: {
            source: "sidebar",
            blockTypeId: "paragraph",
            displayName: "Paragraph",
            icon: "text",
          },
          targetParentId: block.id,
          targetParentType: "paragraph",
        };

        const result = validateDrop(context);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain("cannot contain");
      });
    });
  });

  describe("wouldCreateCircularReference", () => {
    it("returns true for direct self-drop", () => {
      const block = createTestBlock("section", {}, []);
      insertBlockAction(block);

      expect(wouldCreateCircularReference(block.id, block.id)).toBe(true);
    });

    it("returns true for ancestor drop", () => {
      const grandchild = createTestBlock("paragraph");
      const child = createTestBlock("section", {}, [grandchild]);
      const parent = createTestBlock("section", {}, [child]);
      insertBlockAction(parent);

      expect(wouldCreateCircularReference(parent.id, grandchild.id)).toBe(true);
    });

    it("returns false for valid drop target", () => {
      const block1 = createTestBlock("section", {}, []);
      const block2 = createTestBlock("section", {}, []);
      insertBlockAction(block1);
      insertBlockAction(block2);

      expect(wouldCreateCircularReference(block1.id, block2.id)).toBe(false);
    });

    it("returns false for null parent", () => {
      const block = createTestBlock("section", {}, []);
      insertBlockAction(block);

      expect(wouldCreateCircularReference(block.id, null)).toBe(false);
    });
  });

  describe("move within same parent", () => {
    it("adjusts index when moving down", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      const block3 = createTestBlock("paragraph", { content: "Third" });
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);

      // Move block1 to after block2 (index 2, but should become 1 after removal)
      startDocumentDrag(block1.id, { x: 0, y: 0 }, false);
      updateDrag({ x: 0, y: 0 }, {
        targetBlockId: block2.id,
        position: "after",
        parentId: null,
        index: 2,
        isValid: true,
      });

      endDrag();

      const doc = $document.get();
      expect(doc.blocks[0]?.props.content).toBe("Second");
      expect(doc.blocks[1]?.props.content).toBe("First");
      expect(doc.blocks[2]?.props.content).toBe("Third");
    });

    it("preserves index when moving up", () => {
      const block1 = createTestBlock("paragraph", { content: "First" });
      const block2 = createTestBlock("paragraph", { content: "Second" });
      const block3 = createTestBlock("paragraph", { content: "Third" });
      insertBlockAction(block1);
      insertBlockAction(block2);
      insertBlockAction(block3);

      // Move block3 to before block2 (index 1)
      startDocumentDrag(block3.id, { x: 0, y: 0 }, false);
      updateDrag({ x: 0, y: 0 }, {
        targetBlockId: block2.id,
        position: "before",
        parentId: null,
        index: 1,
        isValid: true,
      });

      endDrag();

      const doc = $document.get();
      expect(doc.blocks[0]?.props.content).toBe("First");
      expect(doc.blocks[1]?.props.content).toBe("Third");
      expect(doc.blocks[2]?.props.content).toBe("Second");
    });
  });

  describe("move between parents", () => {
    it("moves block from root to container", () => {
      const block = createTestBlock("paragraph", { content: "Move me" });
      const container = createTestBlock("section", {}, []);
      insertBlockAction(block);
      insertBlockAction(container);

      startDocumentDrag(block.id, { x: 0, y: 0 }, false);
      updateDrag({ x: 0, y: 0 }, {
        targetBlockId: container.id,
        position: "inside",
        parentId: container.id,
        index: 0,
        isValid: true,
      });

      endDrag();

      const doc = $document.get();
      expect(doc.blocks).toHaveLength(1); // Only container at root
      expect(doc.blocks[0]?.children).toHaveLength(1);
      expect(doc.blocks[0]?.children?.[0]?.props.content).toBe("Move me");
    });

    it("moves block from container to root", () => {
      const child = createTestBlock("paragraph", { content: "Move me" });
      const container = createTestBlock("section", {}, [child]);
      insertBlockAction(container);

      startDocumentDrag(child.id, { x: 0, y: 0 }, false);
      updateDrag({ x: 0, y: 0 }, {
        targetBlockId: container.id,
        position: "after",
        parentId: null,
        index: 1,
        isValid: true,
      });

      endDrag();

      const doc = $document.get();
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0]?.children).toHaveLength(0);
      expect(doc.blocks[1]?.props.content).toBe("Move me");
    });
  });
});
