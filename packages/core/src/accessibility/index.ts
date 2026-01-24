/**
 * Accessibility utilities for phantom-zone forms.
 *
 * Provides utilities for building accessible form components
 * following WCAG 2.1 AA guidelines.
 *
 * @module accessibility
 *
 * @example
 * ```tsx
 * import {
 *   createFieldAccessibilityIds,
 *   joinIds,
 *   focusFirstInvalidElement,
 *   announce,
 *   Keys,
 * } from "@phantom-zone/core";
 *
 * function AccessibleInput({ name, label, error, description }) {
 *   const ids = createFieldAccessibilityIds(name, "my-form");
 *
 *   return (
 *     <div>
 *       <label id={ids.labelId} htmlFor={ids.inputId}>
 *         {label}
 *       </label>
 *       <input
 *         id={ids.inputId}
 *         name={name}
 *         aria-invalid={!!error}
 *         aria-describedby={joinIds([
 *           description ? ids.descriptionId : undefined,
 *           error ? ids.errorId : undefined,
 *         ])}
 *       />
 *       {description && (
 *         <p id={ids.descriptionId}>{description}</p>
 *       )}
 *       {error && (
 *         <p id={ids.errorId} role="alert">
 *           {error}
 *         </p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

// Live region announcements
export {
  announce,
  announceAssertive,
  announcePolite,
  cleanupLiveRegions,
  clearAnnouncements,
  FormAnnouncements,
} from "./announce";
// Color contrast utilities
export {
  ContrastThresholds,
  calculateContrastRatio,
  calculateLuminance,
  checkContrast,
  formatContrastRatio,
  getMinimumContrast,
  parseHexColor,
  suggestTextColor,
} from "./contrast";

// Focus management utilities
export {
  createFocusTrap,
  FOCUSABLE_SELECTOR,
  focusById,
  focusByName,
  focusElement,
  focusFirstInvalidElement,
  getFirstFocusableElement,
  getFocusableElements,
  getLastFocusableElement,
  isFocusable,
  isVisible,
  restoreFocus,
  saveFocus,
  TABBABLE_SELECTOR,
} from "./focus";
// ID generation utilities
export {
  createAccessibleId,
  createFieldAccessibilityIds,
  getIdCounter,
  joinIds,
  resetIdCounter,
  sanitizeIdPart,
} from "./ids";
// Keyboard navigation utilities
export {
  calculateNextIndex,
  createListKeyHandler,
  createRovingTabindexState,
  getNavigationDirection,
  getRovingTabindex,
  isActivationKey,
  isArrowKey,
  isEscapeKey,
  type KeyName,
  Keys,
  matchesShortcut,
  preventDefaultForKeys,
} from "./keyboard";
// Types
export type {
  AccessibleInputProps,
  AnnounceOptions,
  AriaErrorProps,
  AriaExpandedProps,
  AriaFormRole,
  AriaInteractiveProps,
  AriaLabelProps,
  AriaLive,
  AriaSelectedProps,
  ContrastResult,
  CreateAccessibleIdOptions,
  FieldAccessibilityIds,
  FocusOptions,
  KeyboardNavigationOptions,
  RovingTabindexState,
  ScreenReaderOnlyStyles,
} from "./types";

/**
 * Screen reader-only CSS styles.
 * Apply these styles to make content visible only to screen readers.
 *
 * @example
 * ```tsx
 * // As inline styles
 * <span style={SCREEN_READER_ONLY_STYLES}>
 *   Additional context for screen readers
 * </span>
 *
 * // Or use in CSS/Tailwind
 * // .sr-only { ...SCREEN_READER_ONLY_STYLES }
 * ```
 */
export const SCREEN_READER_ONLY_STYLES = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden" as const,
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: "0",
};
