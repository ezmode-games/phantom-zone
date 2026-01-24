/**
 * Focus management utilities for phantom-zone forms.
 *
 * Provides utilities for managing focus in forms, including:
 * - Focusing elements safely
 * - Finding focusable elements
 * - Managing focus within containers (focus trap)
 */

import type { FocusOptions as A11yFocusOptions } from "./types";

/**
 * Selector for all focusable elements.
 * Includes elements that can receive focus via tabbing.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'area[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[contenteditable]:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Selector for tabbable elements (focusable via Tab key).
 * Excludes elements with negative tabindex.
 */
export const TABBABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Checks if an element is focusable.
 *
 * @param element - The element to check
 * @returns True if the element can receive focus
 *
 * @example
 * ```ts
 * if (isFocusable(element)) {
 *   element.focus();
 * }
 * ```
 */
export function isFocusable(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  // Check if element matches focusable selector
  if (!element.matches(FOCUSABLE_SELECTOR)) {
    return false;
  }

  // Check if element or any ancestor has display: none or visibility: hidden
  if (!isVisible(element)) {
    return false;
  }

  return true;
}

/**
 * Checks if an element is visible (not hidden by CSS).
 *
 * @param element - The element to check
 * @returns True if the element is visible
 */
export function isVisible(element: HTMLElement): boolean {
  // Check if element is in the DOM
  if (!element.isConnected) {
    return false;
  }

  // Check computed styles
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  // Check parent chain for hidden elements
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === "none" || parentStyle.visibility === "hidden") {
      return false;
    }
    parent = parent.parentElement;
  }

  return true;
}

/**
 * Gets all focusable elements within a container.
 *
 * @param container - The container element to search within
 * @param options - Options for filtering elements
 * @returns Array of focusable elements in DOM order
 *
 * @example
 * ```ts
 * const focusableElements = getFocusableElements(formRef.current);
 * const firstElement = focusableElements[0];
 * ```
 */
export function getFocusableElements(
  container: HTMLElement,
  options: { tabbableOnly?: boolean } = {},
): HTMLElement[] {
  const { tabbableOnly = false } = options;
  const selector = tabbableOnly ? TABBABLE_SELECTOR : FOCUSABLE_SELECTOR;
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(selector),
  );

  // Filter to only visible elements
  return elements.filter(isVisible);
}

/**
 * Gets the first focusable element within a container.
 *
 * @param container - The container element to search within
 * @returns The first focusable element, or null if none found
 *
 * @example
 * ```ts
 * const firstFocusable = getFirstFocusableElement(dialogRef.current);
 * firstFocusable?.focus();
 * ```
 */
export function getFirstFocusableElement(
  container: HTMLElement,
): HTMLElement | null {
  const elements = getFocusableElements(container, { tabbableOnly: true });
  return elements[0] ?? null;
}

/**
 * Gets the last focusable element within a container.
 *
 * @param container - The container element to search within
 * @returns The last focusable element, or null if none found
 */
export function getLastFocusableElement(
  container: HTMLElement,
): HTMLElement | null {
  const elements = getFocusableElements(container, { tabbableOnly: true });
  return elements[elements.length - 1] ?? null;
}

/**
 * Safely focuses an element with optional configuration.
 *
 * @param element - The element to focus
 * @param options - Focus options
 * @returns True if focus was successful
 *
 * @example
 * ```ts
 * // Focus without scrolling
 * focusElement(inputRef.current, { preventScroll: true });
 *
 * // Focus and scroll into view
 * focusElement(inputRef.current);
 * ```
 */
export function focusElement(
  element: HTMLElement | null | undefined,
  options: A11yFocusOptions = {},
): boolean {
  if (!element || !isFocusable(element)) {
    return false;
  }

  const { preventScroll = false, focusVisible = false } = options;

  try {
    element.focus({ preventScroll });

    // Apply focus-visible class if requested (useful for keyboard-only focus)
    if (focusVisible && document.activeElement === element) {
      element.classList.add("focus-visible");

      // Remove on blur
      const handleBlur = () => {
        element.classList.remove("focus-visible");
        element.removeEventListener("blur", handleBlur);
      };
      element.addEventListener("blur", handleBlur);
    }

    return document.activeElement === element;
  } catch {
    return false;
  }
}

/**
 * Focuses the first invalid form element.
 * Useful for focusing the first error after form validation.
 *
 * @param form - The form element to search within
 * @returns True if an invalid element was found and focused
 *
 * @example
 * ```ts
 * const handleSubmit = (e: FormEvent) => {
 *   e.preventDefault();
 *   const result = schema.safeParse(formData);
 *   if (!result.success) {
 *     focusFirstInvalidElement(formRef.current);
 *   }
 * };
 * ```
 */
export function focusFirstInvalidElement(
  form: HTMLFormElement | null,
): boolean {
  if (!form) {
    return false;
  }

  // Find first invalid element using aria-invalid
  const invalidElement = form.querySelector<HTMLElement>(
    '[aria-invalid="true"]',
  );

  if (invalidElement && isFocusable(invalidElement)) {
    return focusElement(invalidElement);
  }

  // Fallback: find first :invalid element (HTML5 validation)
  const html5Invalid = form.querySelector<HTMLElement>(":invalid");
  if (html5Invalid && isFocusable(html5Invalid)) {
    return focusElement(html5Invalid);
  }

  return false;
}

/**
 * Focuses an element by its ID.
 *
 * @param id - The ID of the element to focus
 * @param options - Focus options
 * @returns True if focus was successful
 *
 * @example
 * ```ts
 * // Focus the email input
 * focusById("email-input");
 * ```
 */
export function focusById(id: string, options: A11yFocusOptions = {}): boolean {
  const element = document.getElementById(id);
  if (element instanceof HTMLElement) {
    return focusElement(element, options);
  }
  return false;
}

/**
 * Focuses an element by form field name.
 *
 * @param name - The name attribute of the form element
 * @param form - Optional form element to search within
 * @param options - Focus options
 * @returns True if focus was successful
 *
 * @example
 * ```ts
 * // Focus the email field
 * focusByName("email");
 *
 * // Focus within a specific form
 * focusByName("email", formRef.current);
 * ```
 */
export function focusByName(
  name: string,
  form?: HTMLFormElement | null,
  options: A11yFocusOptions = {},
): boolean {
  const container = form ?? document;
  const element = container.querySelector<HTMLElement>(`[name="${name}"]`);
  if (element) {
    return focusElement(element, options);
  }
  return false;
}

/**
 * Saves the currently focused element.
 * Used for restoring focus after modal dialogs.
 *
 * @returns The currently focused element, or null
 *
 * @example
 * ```ts
 * // Save focus before opening dialog
 * const previousFocus = saveFocus();
 *
 * // ... dialog interactions ...
 *
 * // Restore focus when closing
 * restoreFocus(previousFocus);
 * ```
 */
export function saveFocus(): Element | null {
  return document.activeElement;
}

/**
 * Restores focus to a previously focused element.
 *
 * @param element - The element to restore focus to
 * @param options - Focus options
 * @returns True if focus was restored
 */
export function restoreFocus(
  element: Element | null,
  options: A11yFocusOptions = {},
): boolean {
  if (element instanceof HTMLElement) {
    return focusElement(element, options);
  }
  return false;
}

/**
 * Creates a focus trap configuration for a container.
 * Returns handlers to trap focus within the container.
 *
 * @param container - The container element to trap focus within
 * @returns Object with keydown handler for focus trapping
 *
 * @example
 * ```tsx
 * function Dialog({ children }: { children: ReactNode }) {
 *   const dialogRef = useRef<HTMLDivElement>(null);
 *
 *   useEffect(() => {
 *     if (dialogRef.current) {
 *       const trap = createFocusTrap(dialogRef.current);
 *       document.addEventListener("keydown", trap.handleKeyDown);
 *       return () => document.removeEventListener("keydown", trap.handleKeyDown);
 *     }
 *   }, []);
 *
 *   return <div ref={dialogRef} role="dialog">{children}</div>;
 * }
 * ```
 */
export function createFocusTrap(container: HTMLElement): {
  handleKeyDown: (event: KeyboardEvent) => void;
  focusFirst: () => boolean;
  focusLast: () => boolean;
} {
  const focusFirst = () => {
    const first = getFirstFocusableElement(container);
    return focusElement(first);
  };

  const focusLast = () => {
    const last = getLastFocusableElement(container);
    return focusElement(last);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements(container, {
      tabbableOnly: true,
    });

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    // Shift+Tab from first element -> focus last element
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
      return;
    }

    // Tab from last element -> focus first element
    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
      return;
    }
  };

  return {
    handleKeyDown,
    focusFirst,
    focusLast,
  };
}
