import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uuidv7 } from "uuidv7";
import { initializeDocument, insertBlockAction } from "../../src/model/document";
import type { Block } from "../../src/model/types";
import { focusBlock, enterEditMode, selectBlock } from "../../src/selection/actions";
import {
  createKeyboardHandler,
  defaultKeyboardConfig,
  executeKeyboardAction,
  handleKeyboardEvent,
  parseKeyboardEvent,
  shouldHandleKeyboardEvent,
  type KeyboardConfig,
} from "../../src/selection/keyboard";
import { $focus, $multiSelection, resetSelectionState } from "../../src/selection/state";

// Helper to create a test block
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

// Mock keyboard event interface for testing in Node environment
interface MockKeyboardEvent {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  preventDefault: () => void;
}

// Helper to create a mock keyboard event
// Cast to KeyboardEvent for compatibility with the keyboard module functions
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
  // Cast to KeyboardEvent - the keyboard module only uses these properties
  return mock as unknown as KeyboardEvent;
}

describe("Keyboard Handling", () => {
  beforeEach(() => {
    initializeDocument();
    resetSelectionState();
  });

  afterEach(() => {
    initializeDocument();
    resetSelectionState();
  });

  describe("parseKeyboardEvent", () => {
    describe("Escape key", () => {
      it("returns EXIT_EDIT_MODE when editing", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);
        focusBlock(block.id);
        enterEditMode();

        const event = createKeyboardEvent("Escape");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "EXIT_EDIT_MODE" });
      });

      it("returns CLEAR_SELECTION when not editing", () => {
        const event = createKeyboardEvent("Escape");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "CLEAR_SELECTION" });
      });

      it("returns null when escape is disabled", () => {
        const config: KeyboardConfig = {
          ...defaultKeyboardConfig,
          enableEscape: false,
        };
        const event = createKeyboardEvent("Escape");
        const action = parseKeyboardEvent(event, config);

        expect(action).toBeNull();
      });
    });

    describe("Enter key", () => {
      it("returns ENTER_EDIT_MODE when not editing", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);
        focusBlock(block.id);

        const event = createKeyboardEvent("Enter");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "ENTER_EDIT_MODE" });
      });

      it("returns null when editing (let block handle it)", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);
        focusBlock(block.id);
        enterEditMode();

        const event = createKeyboardEvent("Enter");
        const action = parseKeyboardEvent(event);

        expect(action).toBeNull();
      });

      it("returns null for Shift+Enter", () => {
        const event = createKeyboardEvent("Enter", { shiftKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toBeNull();
      });

      it("returns null when disabled", () => {
        const config: KeyboardConfig = {
          ...defaultKeyboardConfig,
          enableEnterToEdit: false,
        };
        const event = createKeyboardEvent("Enter");
        const action = parseKeyboardEvent(event, config);

        expect(action).toBeNull();
      });
    });

    describe("Arrow keys", () => {
      it("returns FOCUS_NEXT for ArrowDown", () => {
        const event = createKeyboardEvent("ArrowDown");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "FOCUS_NEXT" });
      });

      it("returns FOCUS_NEXT for ArrowRight", () => {
        const event = createKeyboardEvent("ArrowRight");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "FOCUS_NEXT" });
      });

      it("returns FOCUS_PREV for ArrowUp", () => {
        const event = createKeyboardEvent("ArrowUp");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "FOCUS_PREV" });
      });

      it("returns FOCUS_PREV for ArrowLeft", () => {
        const event = createKeyboardEvent("ArrowLeft");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "FOCUS_PREV" });
      });

      it("returns EXTEND_SELECTION_DOWN for Shift+ArrowDown", () => {
        const event = createKeyboardEvent("ArrowDown", { shiftKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "EXTEND_SELECTION_DOWN" });
      });

      it("returns EXTEND_SELECTION_UP for Shift+ArrowUp", () => {
        const event = createKeyboardEvent("ArrowUp", { shiftKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "EXTEND_SELECTION_UP" });
      });

      it("returns null for arrow keys when editing", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);
        focusBlock(block.id);
        enterEditMode();

        const event = createKeyboardEvent("ArrowDown");
        const action = parseKeyboardEvent(event);

        expect(action).toBeNull();
      });

      it("returns null when arrow keys disabled", () => {
        const config: KeyboardConfig = {
          ...defaultKeyboardConfig,
          enableArrowKeys: false,
        };
        const event = createKeyboardEvent("ArrowDown");
        const action = parseKeyboardEvent(event, config);

        expect(action).toBeNull();
      });
    });

    describe("Home/End keys", () => {
      it("returns FOCUS_FIRST for Home", () => {
        const event = createKeyboardEvent("Home");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "FOCUS_FIRST" });
      });

      it("returns FOCUS_LAST for End", () => {
        const event = createKeyboardEvent("End");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "FOCUS_LAST" });
      });
    });

    describe("Tab key", () => {
      it("returns FOCUS_NEXT for Tab", () => {
        const event = createKeyboardEvent("Tab");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "FOCUS_NEXT" });
      });

      it("returns FOCUS_PREV for Shift+Tab", () => {
        const event = createKeyboardEvent("Tab", { shiftKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "FOCUS_PREV" });
      });

      it("returns null for Tab when editing", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);
        focusBlock(block.id);
        enterEditMode();

        const event = createKeyboardEvent("Tab");
        const action = parseKeyboardEvent(event);

        expect(action).toBeNull();
      });

      it("returns null when tab navigation disabled", () => {
        const config: KeyboardConfig = {
          ...defaultKeyboardConfig,
          enableTabNavigation: false,
        };
        const event = createKeyboardEvent("Tab");
        const action = parseKeyboardEvent(event, config);

        expect(action).toBeNull();
      });
    });

    describe("Cmd/Ctrl+A", () => {
      it("returns SELECT_ALL for Cmd+A", () => {
        const event = createKeyboardEvent("a", { metaKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "SELECT_ALL" });
      });

      it("returns SELECT_ALL for Ctrl+A", () => {
        const event = createKeyboardEvent("a", { ctrlKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "SELECT_ALL" });
      });

      it("returns null when editing", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);
        focusBlock(block.id);
        enterEditMode();

        const event = createKeyboardEvent("a", { metaKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toBeNull();
      });

      it("returns null when disabled", () => {
        const config: KeyboardConfig = {
          ...defaultKeyboardConfig,
          enableSelectAll: false,
        };
        const event = createKeyboardEvent("a", { metaKey: true });
        const action = parseKeyboardEvent(event, config);

        expect(action).toBeNull();
      });
    });

    describe("Space key", () => {
      it("returns SELECT_FOCUSED for Space", () => {
        const event = createKeyboardEvent(" ");
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "SELECT_FOCUSED" });
      });

      it("returns TOGGLE_FOCUSED for Shift+Space", () => {
        const event = createKeyboardEvent(" ", { shiftKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "TOGGLE_FOCUSED" });
      });

      it("returns TOGGLE_FOCUSED for Cmd+Space", () => {
        const event = createKeyboardEvent(" ", { metaKey: true });
        const action = parseKeyboardEvent(event);

        expect(action).toEqual({ type: "TOGGLE_FOCUSED" });
      });

      it("returns null when editing", () => {
        const block = createTestBlock("paragraph");
        insertBlockAction(block);
        focusBlock(block.id);
        enterEditMode();

        const event = createKeyboardEvent(" ");
        const action = parseKeyboardEvent(event);

        expect(action).toBeNull();
      });
    });

    describe("unhandled keys", () => {
      it("returns null for regular letters", () => {
        const event = createKeyboardEvent("x");
        const action = parseKeyboardEvent(event);

        expect(action).toBeNull();
      });

      it("returns null for numbers", () => {
        const event = createKeyboardEvent("5");
        const action = parseKeyboardEvent(event);

        expect(action).toBeNull();
      });
    });
  });

  describe("executeKeyboardAction", () => {
    it("executes FOCUS_NEXT action", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      focusBlock(block1.id);

      const result = executeKeyboardAction({ type: "FOCUS_NEXT" });

      expect(result.ok).toBe(true);
      expect($focus.get().focusedId).toBe(block2.id);
    });

    it("executes FOCUS_PREV action", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      focusBlock(block2.id);

      const result = executeKeyboardAction({ type: "FOCUS_PREV" });

      expect(result.ok).toBe(true);
      expect($focus.get().focusedId).toBe(block1.id);
    });

    it("executes ENTER_EDIT_MODE action", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      focusBlock(block.id);

      const result = executeKeyboardAction({ type: "ENTER_EDIT_MODE" });

      expect(result.ok).toBe(true);
      expect($focus.get().isEditing).toBe(true);
    });

    it("executes EXIT_EDIT_MODE action", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      focusBlock(block.id);
      enterEditMode();

      const result = executeKeyboardAction({ type: "EXIT_EDIT_MODE" });

      expect(result.ok).toBe(true);
      expect($focus.get().isEditing).toBe(false);
    });

    it("executes CLEAR_SELECTION action", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      selectBlock(block.id);

      const result = executeKeyboardAction({ type: "CLEAR_SELECTION" });

      expect(result.ok).toBe(true);
      expect($multiSelection.get().selectedIds.size).toBe(0);
    });

    it("executes SELECT_ALL action", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);

      const result = executeKeyboardAction({ type: "SELECT_ALL" });

      expect(result.ok).toBe(true);
      expect($multiSelection.get().selectedIds.size).toBe(2);
    });

    it("executes EXTEND_SELECTION_DOWN action", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      selectBlock(block1.id);

      const result = executeKeyboardAction({ type: "EXTEND_SELECTION_DOWN" });

      expect(result.ok).toBe(true);
      expect($multiSelection.get().selectedIds.size).toBe(2);
    });

    it("executes EXTEND_SELECTION_UP action", () => {
      const block1 = createTestBlock("paragraph");
      const block2 = createTestBlock("paragraph");
      insertBlockAction(block1);
      insertBlockAction(block2);
      selectBlock(block2.id);

      const result = executeKeyboardAction({ type: "EXTEND_SELECTION_UP" });

      expect(result.ok).toBe(true);
      expect($multiSelection.get().selectedIds.size).toBe(2);
    });
  });

  describe("handleKeyboardEvent", () => {
    it("returns true and prevents default for handled events", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      focusBlock(block.id);

      const event = createKeyboardEvent("ArrowDown");
      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(true);
      // Access the mock function through the cast event
      expect((event as unknown as MockKeyboardEvent).preventDefault).toHaveBeenCalled();
    });

    it("returns false for unhandled events", () => {
      const event = createKeyboardEvent("x");
      const handled = handleKeyboardEvent(event);

      expect(handled).toBe(false);
    });

    it("prevents default for expected failures", () => {
      // Empty document, no blocks to focus
      const event = createKeyboardEvent("ArrowDown");
      const handled = handleKeyboardEvent(event);

      // Returns true because we handled it (even though there are no blocks)
      expect(handled).toBe(true);
      expect((event as unknown as MockKeyboardEvent).preventDefault).toHaveBeenCalled();
    });
  });

  describe("shouldHandleKeyboardEvent", () => {
    it("returns true for handled keys", () => {
      expect(shouldHandleKeyboardEvent(createKeyboardEvent("ArrowDown"))).toBe(true);
      expect(shouldHandleKeyboardEvent(createKeyboardEvent("ArrowUp"))).toBe(true);
      expect(shouldHandleKeyboardEvent(createKeyboardEvent("Tab"))).toBe(true);
      expect(shouldHandleKeyboardEvent(createKeyboardEvent("Escape"))).toBe(true);
      expect(shouldHandleKeyboardEvent(createKeyboardEvent("Enter"))).toBe(true);
    });

    it("returns false for unhandled keys", () => {
      expect(shouldHandleKeyboardEvent(createKeyboardEvent("x"))).toBe(false);
      expect(shouldHandleKeyboardEvent(createKeyboardEvent("5"))).toBe(false);
    });
  });

  describe("createKeyboardHandler", () => {
    it("creates a handler function", () => {
      const handler = createKeyboardHandler();
      expect(typeof handler).toBe("function");
    });

    it("handler processes keyboard events", () => {
      const block = createTestBlock("paragraph");
      insertBlockAction(block);
      focusBlock(block.id);

      const handler = createKeyboardHandler();
      const event = createKeyboardEvent("ArrowDown");

      // Should not throw
      handler(event);
    });

    it("handler respects custom config", () => {
      const config: KeyboardConfig = {
        ...defaultKeyboardConfig,
        enableArrowKeys: false,
      };

      const handler = createKeyboardHandler(config);
      const event = createKeyboardEvent("ArrowDown");

      // With arrows disabled, handler should not process the event
      // (no state change expected)
      handler(event);
    });
  });

  describe("defaultKeyboardConfig", () => {
    it("has all options enabled by default", () => {
      expect(defaultKeyboardConfig.enableArrowKeys).toBe(true);
      expect(defaultKeyboardConfig.enableTabNavigation).toBe(true);
      expect(defaultKeyboardConfig.enableEnterToEdit).toBe(true);
      expect(defaultKeyboardConfig.enableEscape).toBe(true);
      expect(defaultKeyboardConfig.enableSelectAll).toBe(true);
      expect(defaultKeyboardConfig.enableShiftArrows).toBe(true);
    });
  });
});
