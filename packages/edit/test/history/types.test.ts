import { describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  createHistoryError,
  createInitialHistoryState,
  getRedoDescription,
  getUndoDescription,
  HISTORY_LIMIT,
  type HistoryState,
} from "../../src/history/types";

describe("History Types", () => {
  describe("HISTORY_LIMIT", () => {
    it("is set to 100", () => {
      expect(HISTORY_LIMIT).toBe(100);
    });
  });

  describe("createInitialHistoryState", () => {
    it("creates empty history state", () => {
      const state = createInitialHistoryState();

      expect(state.baseSnapshot).toBeNull();
      expect(state.entries).toEqual([]);
      expect(state.currentIndex).toBe(-1);
      expect(state.isBatching).toBe(false);
      expect(state.batchDescription).toBeNull();
      expect(state.batchStartSnapshot).toBeNull();
    });
  });

  describe("createHistoryError", () => {
    it("creates error with code and message", () => {
      const error = createHistoryError("NOTHING_TO_UNDO", "No changes to undo");

      expect(error.code).toBe("NOTHING_TO_UNDO");
      expect(error.message).toBe("No changes to undo");
      expect(error.cause).toBeUndefined();
    });

    it("creates error with cause", () => {
      const cause = new Error("Original error");
      const error = createHistoryError(
        "BATCH_ALREADY_ACTIVE",
        "Batch in progress",
        cause
      );

      expect(error.code).toBe("BATCH_ALREADY_ACTIVE");
      expect(error.message).toBe("Batch in progress");
      expect(error.cause).toBe(cause);
    });
  });

  describe("canUndo", () => {
    it("returns false when history is empty", () => {
      const state = createInitialHistoryState();
      expect(canUndo(state)).toBe(false);
    });

    it("returns false when currentIndex is -1", () => {
      const state: HistoryState = {
        ...createInitialHistoryState(),
        entries: [
          {
            snapshot: { document: {} as never, selection: { blockId: null } },
            description: "Test",
            timestamp: new Date(),
          },
        ],
        currentIndex: -1,
      };
      expect(canUndo(state)).toBe(false);
    });

    it("returns true when currentIndex is 0 or greater", () => {
      const state: HistoryState = {
        ...createInitialHistoryState(),
        entries: [
          {
            snapshot: { document: {} as never, selection: { blockId: null } },
            description: "Test",
            timestamp: new Date(),
          },
        ],
        currentIndex: 0,
      };
      expect(canUndo(state)).toBe(true);
    });
  });

  describe("canRedo", () => {
    it("returns false when history is empty", () => {
      const state = createInitialHistoryState();
      expect(canRedo(state)).toBe(false);
    });

    it("returns false when at end of history", () => {
      const state: HistoryState = {
        ...createInitialHistoryState(),
        entries: [
          {
            snapshot: { document: {} as never, selection: { blockId: null } },
            description: "Test",
            timestamp: new Date(),
          },
        ],
        currentIndex: 0,
      };
      expect(canRedo(state)).toBe(false);
    });

    it("returns true when there are entries after current index", () => {
      const state: HistoryState = {
        ...createInitialHistoryState(),
        entries: [
          {
            snapshot: { document: {} as never, selection: { blockId: null } },
            description: "First",
            timestamp: new Date(),
          },
          {
            snapshot: { document: {} as never, selection: { blockId: null } },
            description: "Second",
            timestamp: new Date(),
          },
        ],
        currentIndex: 0,
      };
      expect(canRedo(state)).toBe(true);
    });
  });

  describe("getUndoDescription", () => {
    it("returns null when undo is not available", () => {
      const state = createInitialHistoryState();
      expect(getUndoDescription(state)).toBeNull();
    });

    it("returns description of current entry", () => {
      const state: HistoryState = {
        ...createInitialHistoryState(),
        entries: [
          {
            snapshot: { document: {} as never, selection: { blockId: null } },
            description: "Add block",
            timestamp: new Date(),
          },
        ],
        currentIndex: 0,
      };
      expect(getUndoDescription(state)).toBe("Add block");
    });
  });

  describe("getRedoDescription", () => {
    it("returns null when redo is not available", () => {
      const state = createInitialHistoryState();
      expect(getRedoDescription(state)).toBeNull();
    });

    it("returns description of next entry", () => {
      const state: HistoryState = {
        ...createInitialHistoryState(),
        entries: [
          {
            snapshot: { document: {} as never, selection: { blockId: null } },
            description: "First",
            timestamp: new Date(),
          },
          {
            snapshot: { document: {} as never, selection: { blockId: null } },
            description: "Second",
            timestamp: new Date(),
          },
        ],
        currentIndex: 0,
      };
      expect(getRedoDescription(state)).toBe("Second");
    });
  });
});
