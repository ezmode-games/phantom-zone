/**
 * Tests for keyboard navigation utilities.
 */

import { describe, expect, it } from "vitest";
import {
  Keys,
  isActivationKey,
  isArrowKey,
  isEscapeKey,
  getNavigationDirection,
  calculateNextIndex,
  createRovingTabindexState,
  getRovingTabindex,
  matchesShortcut,
} from "../../src/accessibility/keyboard";

/**
 * Creates a mock keyboard event for testing.
 */
function createKeyEvent(
  key: string,
  options: {
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
  } = {}
): KeyboardEvent {
  return {
    key,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    shiftKey: options.shiftKey ?? false,
    metaKey: options.metaKey ?? false,
    preventDefault: () => {},
  } as KeyboardEvent;
}

describe("Keys", () => {
  it("has correct key values", () => {
    expect(Keys.ENTER).toBe("Enter");
    expect(Keys.SPACE).toBe(" ");
    expect(Keys.ESCAPE).toBe("Escape");
    expect(Keys.TAB).toBe("Tab");
    expect(Keys.ARROW_UP).toBe("ArrowUp");
    expect(Keys.ARROW_DOWN).toBe("ArrowDown");
    expect(Keys.ARROW_LEFT).toBe("ArrowLeft");
    expect(Keys.ARROW_RIGHT).toBe("ArrowRight");
    expect(Keys.HOME).toBe("Home");
    expect(Keys.END).toBe("End");
  });
});

describe("isActivationKey", () => {
  it("returns true for Enter", () => {
    expect(isActivationKey(createKeyEvent("Enter"))).toBe(true);
  });

  it("returns true for Space", () => {
    expect(isActivationKey(createKeyEvent(" "))).toBe(true);
  });

  it("returns false for other keys", () => {
    expect(isActivationKey(createKeyEvent("a"))).toBe(false);
    expect(isActivationKey(createKeyEvent("Tab"))).toBe(false);
    expect(isActivationKey(createKeyEvent("Escape"))).toBe(false);
  });
});

describe("isArrowKey", () => {
  it("returns true for arrow keys", () => {
    expect(isArrowKey(createKeyEvent("ArrowUp"))).toBe(true);
    expect(isArrowKey(createKeyEvent("ArrowDown"))).toBe(true);
    expect(isArrowKey(createKeyEvent("ArrowLeft"))).toBe(true);
    expect(isArrowKey(createKeyEvent("ArrowRight"))).toBe(true);
  });

  it("returns false for non-arrow keys", () => {
    expect(isArrowKey(createKeyEvent("Enter"))).toBe(false);
    expect(isArrowKey(createKeyEvent("Tab"))).toBe(false);
    expect(isArrowKey(createKeyEvent("a"))).toBe(false);
  });
});

describe("isEscapeKey", () => {
  it("returns true for Escape", () => {
    expect(isEscapeKey(createKeyEvent("Escape"))).toBe(true);
  });

  it("returns false for other keys", () => {
    expect(isEscapeKey(createKeyEvent("Enter"))).toBe(false);
    expect(isEscapeKey(createKeyEvent("Tab"))).toBe(false);
  });
});

describe("getNavigationDirection", () => {
  describe("vertical orientation", () => {
    it("returns -1 for ArrowUp", () => {
      expect(
        getNavigationDirection(createKeyEvent("ArrowUp"), "vertical")
      ).toBe(-1);
    });

    it("returns 1 for ArrowDown", () => {
      expect(
        getNavigationDirection(createKeyEvent("ArrowDown"), "vertical")
      ).toBe(1);
    });

    it("returns 0 for horizontal arrows", () => {
      expect(
        getNavigationDirection(createKeyEvent("ArrowLeft"), "vertical")
      ).toBe(0);
      expect(
        getNavigationDirection(createKeyEvent("ArrowRight"), "vertical")
      ).toBe(0);
    });
  });

  describe("horizontal orientation", () => {
    it("returns -1 for ArrowLeft", () => {
      expect(
        getNavigationDirection(createKeyEvent("ArrowLeft"), "horizontal")
      ).toBe(-1);
    });

    it("returns 1 for ArrowRight", () => {
      expect(
        getNavigationDirection(createKeyEvent("ArrowRight"), "horizontal")
      ).toBe(1);
    });

    it("returns 0 for vertical arrows", () => {
      expect(
        getNavigationDirection(createKeyEvent("ArrowUp"), "horizontal")
      ).toBe(0);
      expect(
        getNavigationDirection(createKeyEvent("ArrowDown"), "horizontal")
      ).toBe(0);
    });
  });

  describe("both orientation (default)", () => {
    it("handles all arrow keys", () => {
      expect(getNavigationDirection(createKeyEvent("ArrowUp"))).toBe(-1);
      expect(getNavigationDirection(createKeyEvent("ArrowLeft"))).toBe(-1);
      expect(getNavigationDirection(createKeyEvent("ArrowDown"))).toBe(1);
      expect(getNavigationDirection(createKeyEvent("ArrowRight"))).toBe(1);
    });
  });

  it("returns 0 for non-arrow keys", () => {
    expect(getNavigationDirection(createKeyEvent("Enter"))).toBe(0);
    expect(getNavigationDirection(createKeyEvent("Tab"))).toBe(0);
  });
});

describe("calculateNextIndex", () => {
  const itemCount = 5;

  describe("with wrapping (default)", () => {
    it("navigates forward", () => {
      expect(
        calculateNextIndex(createKeyEvent("ArrowDown"), 0, itemCount)
      ).toBe(1);
      expect(
        calculateNextIndex(createKeyEvent("ArrowDown"), 2, itemCount)
      ).toBe(3);
    });

    it("navigates backward", () => {
      expect(
        calculateNextIndex(createKeyEvent("ArrowUp"), 2, itemCount)
      ).toBe(1);
    });

    it("wraps from end to start", () => {
      expect(
        calculateNextIndex(createKeyEvent("ArrowDown"), 4, itemCount)
      ).toBe(0);
    });

    it("wraps from start to end", () => {
      expect(
        calculateNextIndex(createKeyEvent("ArrowUp"), 0, itemCount)
      ).toBe(4);
    });
  });

  describe("without wrapping", () => {
    it("clamps at boundaries", () => {
      expect(
        calculateNextIndex(createKeyEvent("ArrowDown"), 4, itemCount, {
          wrap: false,
        })
      ).toBe(4);

      expect(
        calculateNextIndex(createKeyEvent("ArrowUp"), 0, itemCount, {
          wrap: false,
        })
      ).toBe(0);
    });
  });

  describe("Home/End keys", () => {
    it("navigates to first item with Home", () => {
      expect(
        calculateNextIndex(createKeyEvent("Home"), 3, itemCount)
      ).toBe(0);
    });

    it("navigates to last item with End", () => {
      expect(
        calculateNextIndex(createKeyEvent("End"), 1, itemCount)
      ).toBe(4);
    });

    it("ignores Home/End when disabled", () => {
      expect(
        calculateNextIndex(createKeyEvent("Home"), 3, itemCount, {
          homeEndKeys: false,
        })
      ).toBe(3);
    });
  });

  it("returns current index for non-navigation keys", () => {
    expect(
      calculateNextIndex(createKeyEvent("Enter"), 2, itemCount)
    ).toBe(2);
  });

  it("handles empty item list", () => {
    expect(calculateNextIndex(createKeyEvent("ArrowDown"), 0, 0)).toBe(0);
  });
});

describe("createRovingTabindexState", () => {
  it("creates initial state", () => {
    const state = createRovingTabindexState(["tab1", "tab2", "tab3"]);

    expect(state.focusedIndex).toBe(0);
    expect(state.itemCount).toBe(3);
    expect(state.itemIds).toEqual(["tab1", "tab2", "tab3"]);
  });

  it("respects initial index", () => {
    const state = createRovingTabindexState(["a", "b", "c"], 2);
    expect(state.focusedIndex).toBe(2);
  });

  it("clamps initial index to valid range", () => {
    const state = createRovingTabindexState(["a", "b"], 10);
    expect(state.focusedIndex).toBe(1);
  });

  it("handles empty items", () => {
    const state = createRovingTabindexState([]);
    expect(state.focusedIndex).toBe(0);
    expect(state.itemCount).toBe(0);
  });
});

describe("getRovingTabindex", () => {
  it("returns 0 for focused index", () => {
    expect(getRovingTabindex(2, 2)).toBe(0);
  });

  it("returns -1 for non-focused indices", () => {
    expect(getRovingTabindex(0, 2)).toBe(-1);
    expect(getRovingTabindex(1, 2)).toBe(-1);
    expect(getRovingTabindex(3, 2)).toBe(-1);
  });
});

describe("matchesShortcut", () => {
  it("matches simple keys", () => {
    expect(matchesShortcut(createKeyEvent("s"), "s")).toBe(true);
    expect(matchesShortcut(createKeyEvent("a"), "s")).toBe(false);
  });

  it("matches Ctrl shortcuts", () => {
    expect(
      matchesShortcut(createKeyEvent("s", { ctrlKey: true }), "ctrl+s")
    ).toBe(true);

    expect(
      matchesShortcut(createKeyEvent("s", { ctrlKey: false }), "ctrl+s")
    ).toBe(false);
  });

  it("matches Shift shortcuts", () => {
    expect(
      matchesShortcut(createKeyEvent("Enter", { shiftKey: true }), "shift+enter")
    ).toBe(true);
  });

  it("matches Alt shortcuts", () => {
    expect(
      matchesShortcut(createKeyEvent("n", { altKey: true }), "alt+n")
    ).toBe(true);
  });

  it("matches Meta shortcuts", () => {
    expect(
      matchesShortcut(createKeyEvent("s", { metaKey: true }), "meta+s")
    ).toBe(true);
  });

  it("matches combined modifiers", () => {
    expect(
      matchesShortcut(
        createKeyEvent("s", { ctrlKey: true, shiftKey: true }),
        "ctrl+shift+s"
      )
    ).toBe(true);
  });

  it("matches ControlOrMeta shortcut", () => {
    // Matches Ctrl
    expect(
      matchesShortcut(createKeyEvent("s", { ctrlKey: true }), "ctrlormeta+s")
    ).toBe(true);

    // Matches Meta
    expect(
      matchesShortcut(createKeyEvent("s", { metaKey: true }), "ctrlormeta+s")
    ).toBe(true);

    // Doesn't match without either
    expect(
      matchesShortcut(createKeyEvent("s"), "ctrlormeta+s")
    ).toBe(false);
  });

  it("is case insensitive for shortcut patterns", () => {
    // Shortcut pattern is normalized to lowercase
    expect(matchesShortcut(createKeyEvent("s"), "S")).toBe(true);
    expect(matchesShortcut(createKeyEvent("s"), "s")).toBe(true);
    // Uppercase key from browser also matches lowercase pattern
    expect(matchesShortcut(createKeyEvent("S"), "s")).toBe(true);
  });
});
