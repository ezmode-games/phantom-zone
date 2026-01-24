import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uuidv7 } from "uuidv7";
import {
  $document,
  initializeDocument,
  insertBlockAction,
} from "../../src/model/document";
import type { Block } from "../../src/model/types";
import { initializeHistory, pushHistory, undo } from "../../src/history/actions";
import {
  createHistoryKeyboardHandler,
  defaultHistoryKeyboardConfig,
  executeHistoryKeyboardAction,
  handleHistoryKeyboardEvent,
  parseHistoryKeyboardEvent,
  shouldHandleHistoryKeyboardEvent,
  type HistoryKeyboardConfig,
} from "../../src/history/keyboard";
import { resetHistoryState } from "../../src/history/state";

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

// Mock keyboard event interface for testing in Node environment
interface MockKeyboardEvent {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  preventDefault: () => void;
}

// Helper to create a mock keyboard event
function createKeyboardEvent(
  key: string,
  options: {
    shiftKey?: boolean;
    metaKey?: boolean;
    ctrlKey?: boolean;
  } = {}
): KeyboardEvent {
  const mock: MockKeyboardEvent = {
    key,
    shiftKey: options.shiftKey ?? false,
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    preventDefault: vi.fn(),
  };
  return mock as unknown as KeyboardEvent;
}

describe("History Keyboard Handling", () => {
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

  describe("parseHistoryKeyboardEvent", () => {
    describe("Cmd/Ctrl+Z (Undo)", () => {
      it("returns UNDO for Cmd+Z", () => {
        const event = createKeyboardEvent("z", { metaKey: true });
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toEqual({ type: "UNDO" });
      });

      it("returns UNDO for Ctrl+Z", () => {
        const event = createKeyboardEvent("z", { ctrlKey: true });
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toEqual({ type: "UNDO" });
      });

      it("returns null when undo is disabled", () => {
        const config: HistoryKeyboardConfig = {
          ...defaultHistoryKeyboardConfig,
          enableUndo: false,
        };
        const event = createKeyboardEvent("z", { metaKey: true });
        const action = parseHistoryKeyboardEvent(event, config);

        expect(action).toBeNull();
      });

      it("returns REDO for Cmd+Shift+Z (not undo)", () => {
        const event = createKeyboardEvent("z", { metaKey: true, shiftKey: true });
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toEqual({ type: "REDO" });
      });
    });

    describe("Cmd/Ctrl+Shift+Z (Redo)", () => {
      it("returns REDO for Cmd+Shift+Z", () => {
        const event = createKeyboardEvent("z", { metaKey: true, shiftKey: true });
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toEqual({ type: "REDO" });
      });

      it("returns REDO for Ctrl+Shift+Z", () => {
        const event = createKeyboardEvent("z", { ctrlKey: true, shiftKey: true });
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toEqual({ type: "REDO" });
      });

      it("returns null when redo is disabled", () => {
        const config: HistoryKeyboardConfig = {
          ...defaultHistoryKeyboardConfig,
          enableRedo: false,
        };
        const event = createKeyboardEvent("z", { metaKey: true, shiftKey: true });
        const action = parseHistoryKeyboardEvent(event, config);

        expect(action).toBeNull();
      });
    });

    describe("Cmd/Ctrl+Y (Redo - Windows)", () => {
      it("returns REDO for Cmd+Y", () => {
        const event = createKeyboardEvent("y", { metaKey: true });
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toEqual({ type: "REDO" });
      });

      it("returns REDO for Ctrl+Y", () => {
        const event = createKeyboardEvent("y", { ctrlKey: true });
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toEqual({ type: "REDO" });
      });

      it("returns null when redo is disabled", () => {
        const config: HistoryKeyboardConfig = {
          ...defaultHistoryKeyboardConfig,
          enableRedo: false,
        };
        const event = createKeyboardEvent("y", { metaKey: true });
        const action = parseHistoryKeyboardEvent(event, config);

        expect(action).toBeNull();
      });
    });

    describe("unhandled keys", () => {
      it("returns null for z without modifier", () => {
        const event = createKeyboardEvent("z");
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toBeNull();
      });

      it("returns null for other keys", () => {
        const event = createKeyboardEvent("x", { metaKey: true });
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toBeNull();
      });

      it("returns null for regular letters", () => {
        const event = createKeyboardEvent("a");
        const action = parseHistoryKeyboardEvent(event);

        expect(action).toBeNull();
      });
    });
  });

  describe("executeHistoryKeyboardAction", () => {
    it("executes UNDO action", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      expect($document.get().blocks).toHaveLength(1);

      const result = executeHistoryKeyboardAction({ type: "UNDO" });

      expect(result.ok).toBe(true);
      expect($document.get().blocks).toHaveLength(0);
    });

    it("executes REDO action", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      undo();
      expect($document.get().blocks).toHaveLength(0);

      const result = executeHistoryKeyboardAction({ type: "REDO" });

      expect(result.ok).toBe(true);
      expect($document.get().blocks).toHaveLength(1);
    });

    it("returns error when nothing to undo", () => {
      const result = executeHistoryKeyboardAction({ type: "UNDO" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOTHING_TO_UNDO");
      }
    });

    it("returns error when nothing to redo", () => {
      const result = executeHistoryKeyboardAction({ type: "REDO" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOTHING_TO_REDO");
      }
    });
  });

  describe("handleHistoryKeyboardEvent", () => {
    it("returns true and prevents default for handled events", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      const event = createKeyboardEvent("z", { metaKey: true });
      const handled = handleHistoryKeyboardEvent(event);

      expect(handled).toBe(true);
      expect((event as unknown as MockKeyboardEvent).preventDefault).toHaveBeenCalled();
    });

    it("returns false for unhandled events", () => {
      const event = createKeyboardEvent("x", { metaKey: true });
      const handled = handleHistoryKeyboardEvent(event);

      expect(handled).toBe(false);
      expect((event as unknown as MockKeyboardEvent).preventDefault).not.toHaveBeenCalled();
    });

    it("prevents default even when undo fails", () => {
      // No history, undo will fail but should still prevent default
      const event = createKeyboardEvent("z", { metaKey: true });
      const handled = handleHistoryKeyboardEvent(event);

      expect(handled).toBe(true);
      expect((event as unknown as MockKeyboardEvent).preventDefault).toHaveBeenCalled();
    });

    it("prevents default even when redo fails", () => {
      // No history, redo will fail but should still prevent default
      const event = createKeyboardEvent("z", { metaKey: true, shiftKey: true });
      const handled = handleHistoryKeyboardEvent(event);

      expect(handled).toBe(true);
      expect((event as unknown as MockKeyboardEvent).preventDefault).toHaveBeenCalled();
    });
  });

  describe("shouldHandleHistoryKeyboardEvent", () => {
    it("returns true for Cmd/Ctrl+Z", () => {
      expect(
        shouldHandleHistoryKeyboardEvent(createKeyboardEvent("z", { metaKey: true }))
      ).toBe(true);
      expect(
        shouldHandleHistoryKeyboardEvent(createKeyboardEvent("z", { ctrlKey: true }))
      ).toBe(true);
    });

    it("returns true for Cmd/Ctrl+Shift+Z", () => {
      expect(
        shouldHandleHistoryKeyboardEvent(
          createKeyboardEvent("z", { metaKey: true, shiftKey: true })
        )
      ).toBe(true);
      expect(
        shouldHandleHistoryKeyboardEvent(
          createKeyboardEvent("z", { ctrlKey: true, shiftKey: true })
        )
      ).toBe(true);
    });

    it("returns true for Cmd/Ctrl+Y", () => {
      expect(
        shouldHandleHistoryKeyboardEvent(createKeyboardEvent("y", { metaKey: true }))
      ).toBe(true);
      expect(
        shouldHandleHistoryKeyboardEvent(createKeyboardEvent("y", { ctrlKey: true }))
      ).toBe(true);
    });

    it("returns false for unhandled keys", () => {
      expect(shouldHandleHistoryKeyboardEvent(createKeyboardEvent("z"))).toBe(false);
      expect(
        shouldHandleHistoryKeyboardEvent(createKeyboardEvent("x", { metaKey: true }))
      ).toBe(false);
      expect(shouldHandleHistoryKeyboardEvent(createKeyboardEvent("a"))).toBe(false);
    });
  });

  describe("createHistoryKeyboardHandler", () => {
    it("creates a handler function", () => {
      const handler = createHistoryKeyboardHandler();
      expect(typeof handler).toBe("function");
    });

    it("handler processes keyboard events", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      const handler = createHistoryKeyboardHandler();
      const event = createKeyboardEvent("z", { metaKey: true });

      expect($document.get().blocks).toHaveLength(1);

      handler(event);

      expect($document.get().blocks).toHaveLength(0);
    });

    it("handler respects custom config", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      pushHistory("Add block");

      const config: HistoryKeyboardConfig = {
        ...defaultHistoryKeyboardConfig,
        enableUndo: false,
      };

      const handler = createHistoryKeyboardHandler(config);
      const event = createKeyboardEvent("z", { metaKey: true });

      handler(event);

      // Undo should not have happened because it's disabled
      expect($document.get().blocks).toHaveLength(1);
    });
  });

  describe("defaultHistoryKeyboardConfig", () => {
    it("has undo enabled by default", () => {
      expect(defaultHistoryKeyboardConfig.enableUndo).toBe(true);
    });

    it("has redo enabled by default", () => {
      expect(defaultHistoryKeyboardConfig.enableRedo).toBe(true);
    });
  });
});
