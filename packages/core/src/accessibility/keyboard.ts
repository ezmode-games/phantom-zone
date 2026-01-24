/**
 * Keyboard navigation utilities for phantom-zone forms.
 *
 * Provides utilities for handling keyboard interactions in
 * accessible form components and composite widgets.
 */

import type { KeyboardNavigationOptions, RovingTabindexState } from "./types";

/**
 * Common keyboard key names for consistent handling.
 */
export const Keys = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
  PAGE_UP: "PageUp",
  PAGE_DOWN: "PageDown",
  BACKSPACE: "Backspace",
  DELETE: "Delete",
} as const;

/**
 * Key type for type safety.
 */
export type KeyName = (typeof Keys)[keyof typeof Keys];

/**
 * Checks if a keyboard event is an activation key (Enter or Space).
 * Use this for button-like elements that need keyboard activation.
 *
 * @param event - The keyboard event to check
 * @returns True if the key is Enter or Space
 *
 * @example
 * ```tsx
 * <div
 *   role="button"
 *   tabIndex={0}
 *   onKeyDown={(e) => {
 *     if (isActivationKey(e)) {
 *       e.preventDefault();
 *       handleClick();
 *     }
 *   }}
 * >
 *   Click me
 * </div>
 * ```
 */
export function isActivationKey(
  event: KeyboardEvent | React.KeyboardEvent,
): boolean {
  return event.key === Keys.ENTER || event.key === Keys.SPACE;
}

/**
 * Checks if a keyboard event is an arrow key.
 *
 * @param event - The keyboard event to check
 * @returns True if the key is an arrow key
 */
export function isArrowKey(
  event: KeyboardEvent | React.KeyboardEvent,
): boolean {
  return (
    event.key === Keys.ARROW_UP ||
    event.key === Keys.ARROW_DOWN ||
    event.key === Keys.ARROW_LEFT ||
    event.key === Keys.ARROW_RIGHT
  );
}

/**
 * Checks if a keyboard event is the Escape key.
 *
 * @param event - The keyboard event to check
 * @returns True if the key is Escape
 */
export function isEscapeKey(
  event: KeyboardEvent | React.KeyboardEvent,
): boolean {
  return event.key === Keys.ESCAPE;
}

/**
 * Gets the navigation direction from a keyboard event.
 * Returns -1 for "previous", 1 for "next", or 0 for no navigation.
 *
 * @param event - The keyboard event
 * @param orientation - The navigation orientation
 * @returns Navigation direction (-1, 0, or 1)
 *
 * @example
 * ```ts
 * const direction = getNavigationDirection(event, "vertical");
 * if (direction !== 0) {
 *   setFocusedIndex((prev) => prev + direction);
 * }
 * ```
 */
export function getNavigationDirection(
  event: KeyboardEvent | React.KeyboardEvent,
  orientation: KeyboardNavigationOptions["orientation"] = "both",
): -1 | 0 | 1 {
  switch (event.key) {
    case Keys.ARROW_UP:
      if (orientation === "vertical" || orientation === "both") {
        return -1;
      }
      break;
    case Keys.ARROW_DOWN:
      if (orientation === "vertical" || orientation === "both") {
        return 1;
      }
      break;
    case Keys.ARROW_LEFT:
      if (orientation === "horizontal" || orientation === "both") {
        return -1;
      }
      break;
    case Keys.ARROW_RIGHT:
      if (orientation === "horizontal" || orientation === "both") {
        return 1;
      }
      break;
  }
  return 0;
}

/**
 * Calculates the next index for keyboard navigation.
 * Handles wrapping, Home/End keys, and boundary conditions.
 *
 * @param event - The keyboard event
 * @param currentIndex - The current focused index
 * @param itemCount - The total number of items
 * @param options - Navigation options
 * @returns The next index, or current index if no change
 *
 * @example
 * ```tsx
 * function TabList({ tabs }) {
 *   const [focusedIndex, setFocusedIndex] = useState(0);
 *
 *   const handleKeyDown = (event: KeyboardEvent) => {
 *     const nextIndex = calculateNextIndex(
 *       event,
 *       focusedIndex,
 *       tabs.length,
 *       { wrap: true, orientation: "horizontal" }
 *     );
 *     if (nextIndex !== focusedIndex) {
 *       event.preventDefault();
 *       setFocusedIndex(nextIndex);
 *     }
 *   };
 *
 *   return (
 *     <div role="tablist" onKeyDown={handleKeyDown}>
 *       {tabs.map((tab, i) => (
 *         <button
 *           key={tab.id}
 *           role="tab"
 *           tabIndex={i === focusedIndex ? 0 : -1}
 *         >
 *           {tab.label}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function calculateNextIndex(
  event: KeyboardEvent | React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  options: KeyboardNavigationOptions = {},
): number {
  const { wrap = true, orientation = "both", homeEndKeys = true } = options;

  if (itemCount === 0) {
    return 0;
  }

  // Handle Home/End keys
  if (homeEndKeys) {
    if (event.key === Keys.HOME) {
      return 0;
    }
    if (event.key === Keys.END) {
      return itemCount - 1;
    }
  }

  // Get navigation direction
  const direction = getNavigationDirection(event, orientation);
  if (direction === 0) {
    return currentIndex;
  }

  let nextIndex = currentIndex + direction;

  // Handle wrapping
  if (wrap) {
    if (nextIndex < 0) {
      nextIndex = itemCount - 1;
    } else if (nextIndex >= itemCount) {
      nextIndex = 0;
    }
  } else {
    // Clamp to bounds without wrapping
    nextIndex = Math.max(0, Math.min(itemCount - 1, nextIndex));
  }

  return nextIndex;
}

/**
 * Creates a keyboard handler for list-like navigation.
 * Handles arrow keys, Home, End, and type-ahead search.
 *
 * @param onNavigate - Callback when navigation occurs
 * @param options - Navigation options
 * @returns Keyboard event handler
 *
 * @example
 * ```tsx
 * const handleKeyDown = createListKeyHandler(
 *   (index) => {
 *     setFocusedIndex(index);
 *     itemRefs.current[index]?.focus();
 *   },
 *   { itemCount: items.length, orientation: "vertical" }
 * );
 *
 * <ul role="listbox" onKeyDown={handleKeyDown}>
 *   {items.map((item, i) => (
 *     <li key={item.id} role="option" tabIndex={i === focusedIndex ? 0 : -1}>
 *       {item.label}
 *     </li>
 *   ))}
 * </ul>
 * ```
 */
export function createListKeyHandler(
  onNavigate: (index: number) => void,
  options: KeyboardNavigationOptions & {
    currentIndex: number;
    itemCount: number;
  },
): (event: KeyboardEvent | React.KeyboardEvent) => void {
  const { currentIndex, itemCount, ...navOptions } = options;

  return (event: KeyboardEvent | React.KeyboardEvent) => {
    // Skip if no items
    if (itemCount === 0) {
      return;
    }

    // Check if this is a navigation key
    const isNavKey =
      isArrowKey(event) || event.key === Keys.HOME || event.key === Keys.END;

    if (!isNavKey) {
      return;
    }

    const nextIndex = calculateNextIndex(
      event,
      currentIndex,
      itemCount,
      navOptions,
    );

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      onNavigate(nextIndex);
    }
  };
}

/**
 * Creates an initial roving tabindex state.
 *
 * @param itemIds - Array of item IDs in order
 * @param initialIndex - Initial focused index (default: 0)
 * @returns Initial roving tabindex state
 */
export function createRovingTabindexState(
  itemIds: string[],
  initialIndex = 0,
): RovingTabindexState {
  return {
    focusedIndex: Math.max(0, Math.min(initialIndex, itemIds.length - 1)),
    itemCount: itemIds.length,
    itemIds,
  };
}

/**
 * Gets the tabindex for an item in a roving tabindex pattern.
 *
 * @param index - The item's index
 * @param focusedIndex - The currently focused index
 * @returns 0 if this item is focused, -1 otherwise
 *
 * @example
 * ```tsx
 * {tabs.map((tab, i) => (
 *   <button
 *     role="tab"
 *     tabIndex={getRovingTabindex(i, focusedIndex)}
 *     onFocus={() => setFocusedIndex(i)}
 *   >
 *     {tab.label}
 *   </button>
 * ))}
 * ```
 */
export function getRovingTabindex(index: number, focusedIndex: number): 0 | -1 {
  return index === focusedIndex ? 0 : -1;
}

/**
 * Handles keyboard shortcuts.
 * Checks for modifier keys and key combinations.
 *
 * @param event - The keyboard event
 * @param shortcut - The shortcut to check (e.g., "ctrl+s", "shift+enter")
 * @returns True if the shortcut matches
 *
 * @example
 * ```ts
 * if (matchesShortcut(event, "ctrl+s")) {
 *   event.preventDefault();
 *   handleSave();
 * }
 * ```
 */
export function matchesShortcut(
  event: KeyboardEvent | React.KeyboardEvent,
  shortcut: string,
): boolean {
  const parts = shortcut.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  // Check key matches
  if (event.key.toLowerCase() !== key) {
    return false;
  }

  // Check modifiers
  const needsCtrl = modifiers.includes("ctrl") || modifiers.includes("control");
  const needsAlt = modifiers.includes("alt");
  const needsShift = modifiers.includes("shift");
  const needsMeta = modifiers.includes("meta") || modifiers.includes("cmd");

  // Handle ControlOrMeta (for cross-platform shortcuts)
  const needsCtrlOrMeta = modifiers.includes("ctrlormeta");
  if (needsCtrlOrMeta) {
    const hasCtrlOrMeta = event.ctrlKey || event.metaKey;
    if (!hasCtrlOrMeta) return false;
  } else {
    if (needsCtrl !== event.ctrlKey) return false;
    if (needsMeta !== event.metaKey) return false;
  }

  if (needsAlt !== event.altKey) return false;
  if (needsShift !== event.shiftKey) return false;

  return true;
}

/**
 * Prevents default behavior for keyboard events that should be handled.
 * Useful for preventing scroll on arrow keys, etc.
 *
 * @param event - The keyboard event
 * @param keys - Array of keys to prevent default for
 *
 * @example
 * ```ts
 * const handleKeyDown = (event: KeyboardEvent) => {
 *   preventDefaultForKeys(event, [Keys.ARROW_UP, Keys.ARROW_DOWN]);
 *   // Handle navigation...
 * };
 * ```
 */
export function preventDefaultForKeys(
  event: KeyboardEvent | React.KeyboardEvent,
  keys: string[],
): void {
  if (keys.includes(event.key)) {
    event.preventDefault();
  }
}
