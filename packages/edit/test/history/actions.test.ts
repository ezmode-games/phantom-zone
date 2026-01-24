import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import {
  $document,
  initializeDocument,
  insertBlockAction,
  deleteBlockAction,
  updateBlockPropsAction,
} from "../../src/model/document";
import type { Block } from "../../src/model/types";
import {
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
} from "../../src/history/actions";
import {
  $canRedo,
  $canUndo,
  $history,
  $historySize,
  $isBatching,
  resetHistoryState,
} from "../../src/history/state";
import { HISTORY_LIMIT } from "../../src/history/types";

// Helper to create a test block
function createTestBlock(
  type: string,
  props: Record<string, unknown> = {}
): Block {
  return {
    id: uuidv7(),
    type,
    props,
  };
}

describe("History Actions", () => {
  beforeEach(() => {
    initializeDocument();
    resetHistoryState();
    // Initialize history to capture the base state (empty document)
    initializeHistory();
  });

  afterEach(() => {
    initializeDocument();
    resetHistoryState();
  });

  describe("pushHistory", () => {
    it("adds entry to history", () => {
      const block = createTestBlock("paragraph", { text: "Hello" });
      insertBlockAction(block);
      const result = pushHistory("Add paragraph");

      expect(result.ok).toBe(true);
      expect($historySize.get()).toBe(1);
    });

    it("stores snapshot of current state", () => {
      const block = createTestBlock("paragraph", { text: "Hello" });
      insertBlockAction(block);
      pushHistory("Add paragraph");

      const state = $history.get();
      expect(state.entries[0]?.snapshot.document.blocks).toHaveLength(1);
    });

    it("stores description", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Custom description");

      const state = $history.get();
      expect(state.entries[0]?.description).toBe("Custom description");
    });

    it("stores timestamp", () => {
      const before = new Date();
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");
      const after = new Date();

      const state = $history.get();
      const timestamp = state.entries[0]?.timestamp;
      expect(timestamp).toBeDefined();
      expect(timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("updates currentIndex", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("First");

      expect($history.get().currentIndex).toBe(0);

      const block2 = createTestBlock("heading");
      insertBlockAction(block2);
      pushHistory("Second");

      expect($history.get().currentIndex).toBe(1);
    });

    it("truncates future entries when pushing after undo", () => {
      // Create initial state with blocks
      const block1 = createTestBlock("paragraph", { text: "One" });
      insertBlockAction(block1);
      pushHistory("Add first");

      const block2 = createTestBlock("paragraph", { text: "Two" });
      insertBlockAction(block2);
      pushHistory("Add second");

      const block3 = createTestBlock("paragraph", { text: "Three" });
      insertBlockAction(block3);
      pushHistory("Add third");

      expect($historySize.get()).toBe(3);

      // Undo twice
      undo();
      undo();

      expect($history.get().currentIndex).toBe(0);

      // Push new entry - should truncate "Add third" and "Add second"
      const block4 = createTestBlock("heading", { level: 1 });
      insertBlockAction(block4);
      pushHistory("Add heading");

      expect($historySize.get()).toBe(2);
      expect($history.get().entries[1]?.description).toBe("Add heading");
    });

    it("enforces history limit", () => {
      // Add more than HISTORY_LIMIT entries
      for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
        const block = createTestBlock("paragraph", { index: i });
        insertBlockAction(block);
        pushHistory(`Add block ${i}`);
      }

      expect($historySize.get()).toBe(HISTORY_LIMIT);
    });

    it("does not push when batching is active", () => {
      startBatch("Batch operation");

      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Should be ignored");

      expect($historySize.get()).toBe(0);
    });
  });

  describe("undo", () => {
    it("returns error when nothing to undo", () => {
      const result = undo();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOTHING_TO_UNDO");
      }
    });

    it("restores previous document state", () => {
      // Initial state with one block
      const block1 = createTestBlock("paragraph", { text: "Original" });
      insertBlockAction(block1);
      pushHistory("Add first block");

      // Add second block
      const block2 = createTestBlock("heading", { level: 1 });
      insertBlockAction(block2);
      pushHistory("Add second block");

      expect($document.get().blocks).toHaveLength(2);

      // Undo should restore to one block
      const result = undo();

      expect(result.ok).toBe(true);
      expect($document.get().blocks).toHaveLength(1);
    });

    it("decrements currentIndex", () => {
      const block1 = createTestBlock("paragraph");
      insertBlockAction(block1);
      pushHistory("First");

      const block2 = createTestBlock("heading");
      insertBlockAction(block2);
      pushHistory("Second");

      expect($history.get().currentIndex).toBe(1);

      undo();

      expect($history.get().currentIndex).toBe(0);
    });

    it("enables redo after undo", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      expect($canRedo.get()).toBe(false);

      undo();

      expect($canRedo.get()).toBe(true);
    });

    it("can undo multiple times", () => {
      const block1 = createTestBlock("paragraph", { text: "First" });
      insertBlockAction(block1);
      pushHistory("Add first");

      const block2 = createTestBlock("paragraph", { text: "Second" });
      insertBlockAction(block2);
      pushHistory("Add second");

      const block3 = createTestBlock("paragraph", { text: "Third" });
      insertBlockAction(block3);
      pushHistory("Add third");

      expect($document.get().blocks).toHaveLength(3);

      undo();
      expect($document.get().blocks).toHaveLength(2);

      undo();
      expect($document.get().blocks).toHaveLength(1);

      undo();
      expect($document.get().blocks).toHaveLength(0);
    });
  });

  describe("redo", () => {
    it("returns error when nothing to redo", () => {
      const result = redo();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOTHING_TO_REDO");
      }
    });

    it("returns error when at end of history", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      const result = redo();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOTHING_TO_REDO");
      }
    });

    it("restores next document state", () => {
      const block1 = createTestBlock("paragraph", { text: "First" });
      insertBlockAction(block1);
      pushHistory("Add first");

      const block2 = createTestBlock("heading", { level: 1 });
      insertBlockAction(block2);
      pushHistory("Add second");

      undo();
      expect($document.get().blocks).toHaveLength(1);

      const result = redo();

      expect(result.ok).toBe(true);
      expect($document.get().blocks).toHaveLength(2);
    });

    it("increments currentIndex", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      undo();
      expect($history.get().currentIndex).toBe(-1);

      redo();
      expect($history.get().currentIndex).toBe(0);
    });

    it("can redo multiple times", () => {
      const block1 = createTestBlock("paragraph");
      insertBlockAction(block1);
      pushHistory("First");

      const block2 = createTestBlock("paragraph");
      insertBlockAction(block2);
      pushHistory("Second");

      const block3 = createTestBlock("paragraph");
      insertBlockAction(block3);
      pushHistory("Third");

      undo();
      undo();
      undo();

      expect($document.get().blocks).toHaveLength(0);

      redo();
      expect($document.get().blocks).toHaveLength(1);

      redo();
      expect($document.get().blocks).toHaveLength(2);

      redo();
      expect($document.get().blocks).toHaveLength(3);
    });
  });

  describe("clearHistory", () => {
    it("removes all history entries", () => {
      const block1 = createTestBlock("paragraph");
      insertBlockAction(block1);
      pushHistory("First");

      const block2 = createTestBlock("heading");
      insertBlockAction(block2);
      pushHistory("Second");

      expect($historySize.get()).toBe(2);

      clearHistory();

      expect($historySize.get()).toBe(0);
      expect($canUndo.get()).toBe(false);
      expect($canRedo.get()).toBe(false);
    });
  });

  describe("batch operations", () => {
    describe("startBatch", () => {
      it("sets isBatching to true", () => {
        const result = startBatch("Test batch");

        expect(result.ok).toBe(true);
        expect($isBatching.get()).toBe(true);
      });

      it("stores batch description", () => {
        startBatch("My batch description");

        const state = $history.get();
        expect(state.batchDescription).toBe("My batch description");
      });

      it("stores start snapshot", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);

        startBatch("Test batch");

        const state = $history.get();
        expect(state.batchStartSnapshot).not.toBeNull();
        expect(state.batchStartSnapshot?.document.blocks).toHaveLength(1);
      });

      it("returns error if batch already active", () => {
        startBatch("First batch");
        const result = startBatch("Second batch");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("BATCH_ALREADY_ACTIVE");
        }
      });
    });

    describe("commitBatch", () => {
      it("creates single history entry for all changes", () => {
        startBatch("Multiple changes");

        const block1 = createTestBlock("paragraph");
        insertBlockAction(block1);

        const block2 = createTestBlock("heading");
        insertBlockAction(block2);

        const result = commitBatch();

        expect(result.ok).toBe(true);
        expect($historySize.get()).toBe(1);
        expect($history.get().entries[0]?.description).toBe("Multiple changes");
      });

      it("sets isBatching to false", () => {
        startBatch("Test batch");
        commitBatch();

        expect($isBatching.get()).toBe(false);
      });

      it("clears batch state", () => {
        startBatch("Test batch");
        commitBatch();

        const state = $history.get();
        expect(state.batchDescription).toBeNull();
        expect(state.batchStartSnapshot).toBeNull();
      });

      it("returns error if no batch active", () => {
        const result = commitBatch();

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("NO_BATCH_ACTIVE");
        }
      });
    });

    describe("rollbackBatch", () => {
      it("restores document to state before batch", () => {
        const block1 = createTestBlock("paragraph");
        insertBlockAction(block1);

        startBatch("Rollback test");

        const block2 = createTestBlock("heading");
        insertBlockAction(block2);
        const block3 = createTestBlock("list");
        insertBlockAction(block3);

        expect($document.get().blocks).toHaveLength(3);

        const result = rollbackBatch();

        expect(result.ok).toBe(true);
        expect($document.get().blocks).toHaveLength(1);
      });

      it("sets isBatching to false", () => {
        startBatch("Test batch");
        rollbackBatch();

        expect($isBatching.get()).toBe(false);
      });

      it("does not add history entry", () => {
        startBatch("Rollback test");
        const block = createTestBlock("paragraph");
        insertBlockAction(block);
        rollbackBatch();

        expect($historySize.get()).toBe(0);
      });

      it("returns error if no batch active", () => {
        const result = rollbackBatch();

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("NO_BATCH_ACTIVE");
        }
      });
    });

    describe("batchChanges", () => {
      it("wraps function in batch", () => {
        const result = batchChanges("Add multiple blocks", () => {
          const block1 = createTestBlock("paragraph");
          insertBlockAction(block1);

          const block2 = createTestBlock("heading");
          insertBlockAction(block2);

          return "done";
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe("done");
        }
        expect($historySize.get()).toBe(1);
        expect($isBatching.get()).toBe(false);
      });

      it("rolls back on error", () => {
        const block1 = createTestBlock("paragraph");
        insertBlockAction(block1);

        expect(() => {
          batchChanges("Failing batch", () => {
            const block2 = createTestBlock("heading");
            insertBlockAction(block2);
            throw new Error("Intentional error");
          });
        }).toThrow("Intentional error");

        // Should have rolled back to state before batch
        expect($document.get().blocks).toHaveLength(1);
        expect($isBatching.get()).toBe(false);
      });

      it("returns error if batch already active", () => {
        startBatch("First batch");

        const result = batchChanges("Second batch", () => {
          return "value";
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("BATCH_ALREADY_ACTIVE");
        }
      });
    });
  });

  describe("getUndoSnapshot", () => {
    it("returns null when undo not available", () => {
      expect(getUndoSnapshot()).toBeNull();
    });

    it("returns snapshot that would be restored", () => {
      const block = createTestBlock("paragraph", { text: "Test" });
      insertBlockAction(block);
      pushHistory("Add block");

      const snapshot = getUndoSnapshot();
      expect(snapshot).not.toBeNull();
    });
  });

  describe("getRedoSnapshot", () => {
    it("returns null when redo not available", () => {
      expect(getRedoSnapshot()).toBeNull();
    });

    it("returns snapshot that would be restored", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      undo();

      const snapshot = getRedoSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot?.document.blocks).toHaveLength(1);
    });
  });

  describe("undo/redo integration", () => {
    it("handles complex undo/redo sequence", () => {
      // Add three blocks
      const block1 = createTestBlock("paragraph", { text: "One" });
      insertBlockAction(block1);
      pushHistory("Add first");

      const block2 = createTestBlock("paragraph", { text: "Two" });
      insertBlockAction(block2);
      pushHistory("Add second");

      const block3 = createTestBlock("paragraph", { text: "Three" });
      insertBlockAction(block3);
      pushHistory("Add third");

      expect($document.get().blocks).toHaveLength(3);

      // Undo twice
      undo();
      undo();
      expect($document.get().blocks).toHaveLength(1);

      // Redo once
      redo();
      expect($document.get().blocks).toHaveLength(2);

      // Add new block (should truncate history)
      const block4 = createTestBlock("heading", { level: 1 });
      insertBlockAction(block4);
      pushHistory("Add heading");

      expect($document.get().blocks).toHaveLength(3);
      expect($canRedo.get()).toBe(false);

      // Undo should work
      undo();
      expect($document.get().blocks).toHaveLength(2);
    });

    it("preserves selection state in snapshots", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      // Selection is included in the snapshot
      pushHistory("Add block");

      const snapshot = $history.get().entries[0]?.snapshot;
      expect(snapshot?.selection).toBeDefined();
    });
  });
});
