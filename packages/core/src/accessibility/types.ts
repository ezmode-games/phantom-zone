/**
 * Accessibility types for phantom-zone forms.
 *
 * Provides TypeScript types for building accessible form components
 * following WCAG 2.1 AA guidelines.
 */

/**
 * ARIA live region politeness levels.
 *
 * - "off": Updates are not announced
 * - "polite": Updates announced when user is idle (use for non-urgent updates)
 * - "assertive": Updates announced immediately (use for errors/critical updates)
 */
export type AriaLive = "off" | "polite" | "assertive";

/**
 * Common ARIA roles for form-related elements.
 */
export type AriaFormRole =
  | "alert"
  | "alertdialog"
  | "button"
  | "checkbox"
  | "combobox"
  | "dialog"
  | "form"
  | "grid"
  | "gridcell"
  | "group"
  | "listbox"
  | "menu"
  | "menubar"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "option"
  | "progressbar"
  | "radio"
  | "radiogroup"
  | "searchbox"
  | "slider"
  | "spinbutton"
  | "status"
  | "switch"
  | "tab"
  | "tablist"
  | "tabpanel"
  | "textbox"
  | "tooltip"
  | "tree"
  | "treeitem";

/**
 * Props for elements that need accessible labeling.
 * Use when an element needs to be labeled but may not have visible text.
 */
export interface AriaLabelProps {
  /** Visible label text (preferred over aria-label) */
  label?: string;

  /** Hidden label for screen readers (use when no visible label) */
  "aria-label"?: string;

  /** ID of element that labels this element */
  "aria-labelledby"?: string;
}

/**
 * Props for elements that need error state indication.
 */
export interface AriaErrorProps {
  /** Whether the element has an error */
  "aria-invalid"?: boolean;

  /** ID of element describing the error */
  "aria-errormessage"?: string;

  /** IDs of elements describing this element (space-separated) */
  "aria-describedby"?: string;
}

/**
 * Props for interactive elements.
 */
export interface AriaInteractiveProps {
  /** Whether the element is disabled */
  "aria-disabled"?: boolean;

  /** Whether the element is readonly */
  "aria-readonly"?: boolean;

  /** Whether the element is required */
  "aria-required"?: boolean;

  /** Whether the element is busy/loading */
  "aria-busy"?: boolean;
}

/**
 * Props for expanded/collapsed elements (accordions, dropdowns, etc).
 */
export interface AriaExpandedProps {
  /** Whether the element is expanded */
  "aria-expanded"?: boolean;

  /** ID of the controlled element */
  "aria-controls"?: string;

  /** Whether the element has a popup */
  "aria-haspopup"?: boolean | "menu" | "listbox" | "tree" | "grid" | "dialog";
}

/**
 * Props for selected elements (tabs, options, etc).
 */
export interface AriaSelectedProps {
  /** Whether the element is selected */
  "aria-selected"?: boolean;

  /** Whether the element is pressed (toggle buttons) */
  "aria-pressed"?: boolean | "mixed";

  /** Whether the element is checked */
  "aria-checked"?: boolean | "mixed";
}

/**
 * Combined props for fully accessible form inputs.
 * Use this when building custom form components.
 */
export interface AccessibleInputProps
  extends AriaLabelProps,
    AriaErrorProps,
    AriaInteractiveProps {
  /** Unique identifier for the element */
  id: string;

  /** Name attribute for form submission */
  name: string;
}

/**
 * Options for creating accessible IDs.
 */
export interface CreateAccessibleIdOptions {
  /** Prefix for the generated ID */
  prefix?: string;

  /** Suffix to append (e.g., "error", "description") */
  suffix?: string;

  /** Custom separator between parts (default: "-") */
  separator?: string;
}

/**
 * Result of generating a set of accessible IDs for a form field.
 */
export interface FieldAccessibilityIds {
  /** ID for the input element */
  inputId: string;

  /** ID for the label element */
  labelId: string;

  /** ID for the error message element */
  errorId: string;

  /** ID for the description/help text element */
  descriptionId: string;

  /** ID for any hint text */
  hintId: string;
}

/**
 * Focus management options.
 */
export interface FocusOptions {
  /** Whether to prevent scroll when focusing */
  preventScroll?: boolean;

  /** Focus visibility mode */
  focusVisible?: boolean;
}

/**
 * Options for keyboard navigation.
 */
export interface KeyboardNavigationOptions {
  /** Whether navigation wraps around at boundaries */
  wrap?: boolean;

  /** Orientation of the navigation (affects arrow key behavior) */
  orientation?: "horizontal" | "vertical" | "both";

  /** Whether Home/End keys navigate to first/last item */
  homeEndKeys?: boolean;

  /** Whether to skip disabled items */
  skipDisabled?: boolean;
}

/**
 * Roving tabindex state for composite widgets.
 */
export interface RovingTabindexState {
  /** Currently focused item index */
  focusedIndex: number;

  /** Total number of items */
  itemCount: number;

  /** IDs of all items in order */
  itemIds: string[];
}

/**
 * Live region announcement options.
 */
export interface AnnounceOptions {
  /** Politeness level for the announcement */
  politeness?: AriaLive;

  /** Whether to clear previous announcements */
  clearPrevious?: boolean;

  /** Delay before announcement in milliseconds */
  delay?: number;
}

/**
 * Screen reader-only styles for visually hiding content.
 * Apply these styles to make content visible only to screen readers.
 */
export interface ScreenReaderOnlyStyles {
  position: "absolute";
  width: "1px";
  height: "1px";
  padding: "0";
  margin: "-1px";
  overflow: "hidden";
  clip: "rect(0, 0, 0, 0)";
  whiteSpace: "nowrap";
  border: "0";
}

/**
 * Result of checking color contrast.
 */
export interface ContrastResult {
  /** The calculated contrast ratio */
  ratio: number;

  /** Whether it passes WCAG AA for normal text (4.5:1) */
  passesAA: boolean;

  /** Whether it passes WCAG AAA for normal text (7:1) */
  passesAAA: boolean;

  /** Whether it passes WCAG AA for large text (3:1) */
  passesAALarge: boolean;

  /** Whether it passes WCAG AAA for large text (4.5:1) */
  passesAAALarge: boolean;
}
