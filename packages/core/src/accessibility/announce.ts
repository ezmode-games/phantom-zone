/**
 * Live region announcement utilities for phantom-zone forms.
 *
 * Provides utilities for announcing dynamic content changes to
 * screen reader users via ARIA live regions.
 */

import type { AnnounceOptions, AriaLive } from "./types";

/** Store reference to live region elements */
let politeRegion: HTMLElement | null = null;
let assertiveRegion: HTMLElement | null = null;

/**
 * Default delay before announcement (allows for rendering).
 */
const DEFAULT_ANNOUNCE_DELAY = 100;

/**
 * Creates the screen reader-only styles as CSS text.
 */
function getScreenReaderOnlyStyles(): string {
  return `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
}

/**
 * Creates a live region element if it doesn't exist.
 *
 * @param politeness - The politeness level for the region
 * @returns The live region element
 */
function getOrCreateLiveRegion(politeness: AriaLive): HTMLElement {
  // Return existing region if available
  if (politeness === "polite" && politeRegion) {
    return politeRegion;
  }
  if (politeness === "assertive" && assertiveRegion) {
    return assertiveRegion;
  }

  // Create new region
  const region = document.createElement("div");
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", politeness);
  region.setAttribute("aria-atomic", "true");
  region.setAttribute("data-a11y-live-region", politeness);
  region.style.cssText = getScreenReaderOnlyStyles();

  document.body.appendChild(region);

  // Store reference
  if (politeness === "polite") {
    politeRegion = region;
  } else {
    assertiveRegion = region;
  }

  return region;
}

/**
 * Announces a message to screen readers via a live region.
 * Use this for dynamic content changes that need to be announced.
 *
 * @param message - The message to announce
 * @param options - Announcement options
 *
 * @example
 * ```ts
 * // Announce form submission success
 * announce("Form submitted successfully!", { politeness: "assertive" });
 *
 * // Announce loading state
 * announce("Loading...", { politeness: "polite" });
 *
 * // Announce error count
 * announce(`${errorCount} validation errors found. Please fix them before submitting.`);
 * ```
 */
export function announce(message: string, options: AnnounceOptions = {}): void {
  const {
    politeness = "polite",
    clearPrevious = true,
    delay = DEFAULT_ANNOUNCE_DELAY,
  } = options;

  // Check if we're in a browser environment
  if (typeof document === "undefined") {
    return;
  }

  const region = getOrCreateLiveRegion(politeness);

  // Clear previous content if requested
  if (clearPrevious) {
    region.textContent = "";
  }

  // Announce after a short delay to ensure screen readers pick it up
  setTimeout(() => {
    // Use textContent for security (no HTML injection)
    region.textContent = message;
  }, delay);
}

/**
 * Announces an assertive message (interrupts current speech).
 * Use for critical errors or urgent information.
 *
 * @param message - The message to announce
 *
 * @example
 * ```ts
 * // Announce critical error
 * announceAssertive("Error: Your session has expired. Please log in again.");
 * ```
 */
export function announceAssertive(message: string): void {
  announce(message, { politeness: "assertive" });
}

/**
 * Announces a polite message (waits for idle speech).
 * Use for non-critical status updates.
 *
 * @param message - The message to announce
 *
 * @example
 * ```ts
 * // Announce status update
 * announcePolite("3 items selected");
 * ```
 */
export function announcePolite(message: string): void {
  announce(message, { politeness: "polite" });
}

/**
 * Clears all live region content.
 * Useful when navigating away or resetting state.
 */
export function clearAnnouncements(): void {
  if (politeRegion) {
    politeRegion.textContent = "";
  }
  if (assertiveRegion) {
    assertiveRegion.textContent = "";
  }
}

/**
 * Removes all live region elements from the DOM.
 * Call this during cleanup (e.g., when your app unmounts).
 */
export function cleanupLiveRegions(): void {
  if (politeRegion) {
    politeRegion.remove();
    politeRegion = null;
  }
  if (assertiveRegion) {
    assertiveRegion.remove();
    assertiveRegion = null;
  }
}

/**
 * Creates announcement messages for common form scenarios.
 */
export const FormAnnouncements = {
  /**
   * Creates an error count announcement.
   *
   * @param count - Number of errors
   * @returns Formatted announcement message
   */
  errorCount(count: number): string {
    if (count === 0) {
      return "No validation errors.";
    }
    if (count === 1) {
      return "1 validation error found. Please fix it before submitting.";
    }
    return `${count} validation errors found. Please fix them before submitting.`;
  },

  /**
   * Creates a field error announcement.
   *
   * @param fieldLabel - The field label
   * @param errorMessage - The error message
   * @returns Formatted announcement message
   */
  fieldError(fieldLabel: string, errorMessage: string): string {
    return `${fieldLabel}: ${errorMessage}`;
  },

  /**
   * Creates a form submission status announcement.
   *
   * @param status - The submission status
   * @returns Formatted announcement message
   */
  submissionStatus(status: "submitting" | "success" | "error"): string {
    switch (status) {
      case "submitting":
        return "Submitting form. Please wait.";
      case "success":
        return "Form submitted successfully.";
      case "error":
        return "Form submission failed. Please try again.";
    }
  },

  /**
   * Creates a loading state announcement.
   *
   * @param isLoading - Whether loading is in progress
   * @param context - Optional context (e.g., "options", "data")
   * @returns Formatted announcement message
   */
  loading(isLoading: boolean, context = "content"): string {
    if (isLoading) {
      return `Loading ${context}. Please wait.`;
    }
    return `${context.charAt(0).toUpperCase() + context.slice(1)} loaded.`;
  },

  /**
   * Creates a selection change announcement.
   *
   * @param count - Number of selected items
   * @param itemType - Type of items (e.g., "file", "option")
   * @returns Formatted announcement message
   */
  selectionChange(count: number, itemType = "item"): string {
    const plural = count === 1 ? itemType : `${itemType}s`;
    if (count === 0) {
      return `No ${plural} selected.`;
    }
    return `${count} ${plural} selected.`;
  },

  /**
   * Creates a character count announcement for text inputs.
   *
   * @param current - Current character count
   * @param max - Maximum allowed characters
   * @returns Formatted announcement message
   */
  characterCount(current: number, max: number): string {
    const remaining = max - current;
    if (remaining <= 0) {
      return `Character limit reached. Maximum ${max} characters.`;
    }
    if (remaining <= 10) {
      return `${remaining} characters remaining.`;
    }
    return `${current} of ${max} characters used.`;
  },
} as const;
