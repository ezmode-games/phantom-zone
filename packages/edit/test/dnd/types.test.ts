import { describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import {
  createDragError,
  createInitialDragState,
  isDragging,
  isDropping,
  isDocumentDrag,
  isSidebarDrag,
  DEFAULT_DROP_ZONE_CONFIG,
  DragPointSchema,
  DragSourceSchema,
  DragStatusSchema,
  DropPositionSchema,
  DropTargetSchema,
  type DragItem,
  type DragState,
} from "../../src/dnd/types";

describe("DnD Types", () => {
  describe("createDragError", () => {
    it("creates error with code and message", () => {
      const error = createDragError("NOT_DRAGGING", "No drag in progress");

      expect(error.code).toBe("NOT_DRAGGING");
      expect(error.message).toBe("No drag in progress");
      expect(error.cause).toBeUndefined();
    });

    it("creates error with cause", () => {
      const cause = new Error("Original error");
      const error = createDragError("BLOCK_NOT_FOUND", "Block missing", cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe("createInitialDragState", () => {
    it("creates idle state", () => {
      const state = createInitialDragState();

      expect(state.status).toBe("idle");
      expect(state.item).toBeNull();
      expect(state.dropTarget).toBeNull();
      expect(state.pointerPosition).toBeNull();
      expect(state.isTouch).toBe(false);
    });
  });

  describe("isDragging", () => {
    it("returns true when status is dragging", () => {
      const state: DragState = {
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

      expect(isDragging(state)).toBe(true);
    });

    it("returns false when status is idle", () => {
      const state = createInitialDragState();
      expect(isDragging(state)).toBe(false);
    });

    it("returns false when status is dropping", () => {
      const state: DragState = {
        status: "dropping",
        item: null,
        dropTarget: null,
        pointerPosition: null,
        isTouch: false,
      };

      expect(isDragging(state)).toBe(false);
    });
  });

  describe("isDropping", () => {
    it("returns true when status is dropping", () => {
      const state: DragState = {
        status: "dropping",
        item: null,
        dropTarget: null,
        pointerPosition: null,
        isTouch: false,
      };

      expect(isDropping(state)).toBe(true);
    });

    it("returns false when status is idle", () => {
      const state = createInitialDragState();
      expect(isDropping(state)).toBe(false);
    });
  });

  describe("isDocumentDrag", () => {
    it("returns true for document drag items", () => {
      const item: DragItem = {
        source: "document",
        blockId: uuidv7(),
        block: { id: uuidv7(), type: "paragraph", props: {} },
        originalParentId: undefined,
        originalIndex: 0,
      };

      expect(isDocumentDrag(item)).toBe(true);
    });

    it("returns false for sidebar drag items", () => {
      const item: DragItem = {
        source: "sidebar",
        blockTypeId: "paragraph",
        displayName: "Paragraph",
        icon: "text",
      };

      expect(isDocumentDrag(item)).toBe(false);
    });
  });

  describe("isSidebarDrag", () => {
    it("returns true for sidebar drag items", () => {
      const item: DragItem = {
        source: "sidebar",
        blockTypeId: "paragraph",
        displayName: "Paragraph",
        icon: "text",
      };

      expect(isSidebarDrag(item)).toBe(true);
    });

    it("returns false for document drag items", () => {
      const item: DragItem = {
        source: "document",
        blockId: uuidv7(),
        block: { id: uuidv7(), type: "paragraph", props: {} },
        originalParentId: undefined,
        originalIndex: 0,
      };

      expect(isSidebarDrag(item)).toBe(false);
    });
  });

  describe("DEFAULT_DROP_ZONE_CONFIG", () => {
    it("has expected default values", () => {
      expect(DEFAULT_DROP_ZONE_CONFIG.edgeThreshold).toBe(8);
      expect(DEFAULT_DROP_ZONE_CONFIG.allowInside).toBe(false);
      expect(DEFAULT_DROP_ZONE_CONFIG.allowedChildren).toEqual([]);
    });
  });

  describe("Zod Schemas", () => {
    describe("DragPointSchema", () => {
      it("validates valid point", () => {
        const result = DragPointSchema.safeParse({ x: 100, y: 200 });
        expect(result.success).toBe(true);
      });

      it("rejects invalid point", () => {
        const result = DragPointSchema.safeParse({ x: "100", y: 200 });
        expect(result.success).toBe(false);
      });
    });

    describe("DragSourceSchema", () => {
      it("validates document source", () => {
        const result = DragSourceSchema.safeParse("document");
        expect(result.success).toBe(true);
      });

      it("validates sidebar source", () => {
        const result = DragSourceSchema.safeParse("sidebar");
        expect(result.success).toBe(true);
      });

      it("rejects invalid source", () => {
        const result = DragSourceSchema.safeParse("unknown");
        expect(result.success).toBe(false);
      });
    });

    describe("DragStatusSchema", () => {
      it("validates all status values", () => {
        expect(DragStatusSchema.safeParse("idle").success).toBe(true);
        expect(DragStatusSchema.safeParse("dragging").success).toBe(true);
        expect(DragStatusSchema.safeParse("dropping").success).toBe(true);
      });

      it("rejects invalid status", () => {
        expect(DragStatusSchema.safeParse("invalid").success).toBe(false);
      });
    });

    describe("DropPositionSchema", () => {
      it("validates all position values", () => {
        expect(DropPositionSchema.safeParse("before").success).toBe(true);
        expect(DropPositionSchema.safeParse("after").success).toBe(true);
        expect(DropPositionSchema.safeParse("inside").success).toBe(true);
      });

      it("rejects invalid position", () => {
        expect(DropPositionSchema.safeParse("left").success).toBe(false);
      });
    });

    describe("DropTargetSchema", () => {
      it("validates valid drop target", () => {
        const target = {
          targetBlockId: uuidv7(),
          position: "after",
          parentId: null,
          index: 1,
          isValid: true,
        };

        const result = DropTargetSchema.safeParse(target);
        expect(result.success).toBe(true);
      });

      it("validates drop target with invalid reason", () => {
        const target = {
          targetBlockId: uuidv7(),
          position: "inside",
          parentId: uuidv7(),
          index: 0,
          isValid: false,
          invalidReason: "Cannot drop here",
        };

        const result = DropTargetSchema.safeParse(target);
        expect(result.success).toBe(true);
      });

      it("rejects negative index", () => {
        const target = {
          targetBlockId: uuidv7(),
          position: "after",
          parentId: null,
          index: -1,
          isValid: true,
        };

        const result = DropTargetSchema.safeParse(target);
        expect(result.success).toBe(false);
      });
    });
  });
});
