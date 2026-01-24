import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uuidv7 } from "uuidv7";
import { initializeDocument, insertBlockAction } from "../../src/model/document";
import type { Block } from "../../src/model/types";
import { pushHistory, clearHistory } from "../../src/history/actions";
import {
  $canRedo,
  $canUndo,
  $currentHistoryIndex,
  $history,
  $historySize,
  $isBatching,
  $redoDescription,
  $undoDescription,
  resetHistoryState,
} from "../../src/history/state";

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

describe("History State", () => {
  beforeEach(() => {
    initializeDocument();
    resetHistoryState();
  });

  afterEach(() => {
    initializeDocument();
    resetHistoryState();
  });

  describe("$history atom", () => {
    it("has initial state", () => {
      const state = $history.get();

      expect(state.entries).toEqual([]);
      expect(state.currentIndex).toBe(-1);
      expect(state.isBatching).toBe(false);
    });
  });

  describe("$canUndo computed", () => {
    it("returns false initially", () => {
      expect($canUndo.get()).toBe(false);
    });

    it("returns true after pushing history", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      expect($canUndo.get()).toBe(true);
    });
  });

  describe("$canRedo computed", () => {
    it("returns false initially", () => {
      expect($canRedo.get()).toBe(false);
    });

    it("returns false when at end of history", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      expect($canRedo.get()).toBe(false);
    });
  });

  describe("$undoDescription computed", () => {
    it("returns null initially", () => {
      expect($undoDescription.get()).toBeNull();
    });

    it("returns description after pushing history", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add paragraph block");

      expect($undoDescription.get()).toBe("Add paragraph block");
    });
  });

  describe("$redoDescription computed", () => {
    it("returns null initially", () => {
      expect($redoDescription.get()).toBeNull();
    });
  });

  describe("$isBatching computed", () => {
    it("returns false initially", () => {
      expect($isBatching.get()).toBe(false);
    });
  });

  describe("$historySize computed", () => {
    it("returns 0 initially", () => {
      expect($historySize.get()).toBe(0);
    });

    it("increases as history is added", () => {
      const block1 = createTestBlock("paragraph");
      insertBlockAction(block1);
      pushHistory("First");

      expect($historySize.get()).toBe(1);

      const block2 = createTestBlock("heading");
      insertBlockAction(block2);
      pushHistory("Second");

      expect($historySize.get()).toBe(2);
    });
  });

  describe("$currentHistoryIndex computed", () => {
    it("returns -1 initially", () => {
      expect($currentHistoryIndex.get()).toBe(-1);
    });

    it("returns correct index after pushing history", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("First");

      expect($currentHistoryIndex.get()).toBe(0);
    });
  });

  describe("resetHistoryState", () => {
    it("resets history to initial state", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("First");

      expect($historySize.get()).toBe(1);

      resetHistoryState();

      expect($historySize.get()).toBe(0);
      expect($currentHistoryIndex.get()).toBe(-1);
      expect($canUndo.get()).toBe(false);
    });
  });
});
