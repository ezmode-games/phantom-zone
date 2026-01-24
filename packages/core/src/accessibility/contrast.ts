/**
 * Color contrast utilities for phantom-zone forms.
 *
 * Provides utilities for checking WCAG color contrast compliance.
 * These are build-time/testing utilities, not runtime dependencies.
 */

import type { ContrastResult } from "./types";

/**
 * WCAG contrast ratio thresholds.
 */
export const ContrastThresholds = {
  /** WCAG AA for normal text */
  AA_NORMAL: 4.5,
  /** WCAG AAA for normal text */
  AAA_NORMAL: 7,
  /** WCAG AA for large text (18pt+ or 14pt+ bold) */
  AA_LARGE: 3,
  /** WCAG AAA for large text */
  AAA_LARGE: 4.5,
  /** WCAG AA for UI components and graphical objects */
  AA_UI: 3,
} as const;

/**
 * Parses a hex color string to RGB values.
 *
 * @param hex - Hex color string (with or without #)
 * @returns RGB values or null if invalid
 *
 * @example
 * ```ts
 * parseHexColor("#ff0000"); // { r: 255, g: 0, b: 0 }
 * parseHexColor("00ff00"); // { r: 0, g: 255, b: 0 }
 * parseHexColor("#fff"); // { r: 255, g: 255, b: 255 }
 * ```
 */
export function parseHexColor(
  hex: string,
): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Handle shorthand (3 chars) or full (6 chars) hex
  let r: number;
  let g: number;
  let b: number;

  if (cleanHex.length === 3) {
    const c0 = cleanHex[0];
    const c1 = cleanHex[1];
    const c2 = cleanHex[2];
    if (!c0 || !c1 || !c2) return null;
    r = parseInt(c0 + c0, 16);
    g = parseInt(c1 + c1, 16);
    b = parseInt(c2 + c2, 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  } else {
    return null;
  }

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }

  return { r, g, b };
}

/**
 * Calculates the relative luminance of a color.
 * Uses the WCAG 2.1 formula for sRGB colors.
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Relative luminance (0-1)
 *
 * @see https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : ((rsRGB + 0.055) / 1.055) ** 2.4;
  const gLinear =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : ((gsRGB + 0.055) / 1.055) ** 2.4;
  const bLinear =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : ((bsRGB + 0.055) / 1.055) ** 2.4;

  // Calculate luminance using ITU-R BT.709 coefficients
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates the contrast ratio between two colors.
 * Returns the ratio as a number (e.g., 4.5 for 4.5:1).
 *
 * @param luminance1 - Luminance of first color (0-1)
 * @param luminance2 - Luminance of second color (0-1)
 * @returns Contrast ratio (1-21)
 *
 * @see https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function calculateContrastRatio(
  luminance1: number,
  luminance2: number,
): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks the contrast ratio between two hex colors.
 * Returns detailed WCAG compliance information.
 *
 * @param foreground - Foreground (text) color as hex
 * @param background - Background color as hex
 * @returns Contrast result with WCAG compliance flags
 *
 * @example
 * ```ts
 * const result = checkContrast("#000000", "#ffffff");
 * // {
 * //   ratio: 21,
 * //   passesAA: true,
 * //   passesAAA: true,
 * //   passesAALarge: true,
 * //   passesAAALarge: true
 * // }
 *
 * const lowContrast = checkContrast("#777777", "#888888");
 * // {
 * //   ratio: 1.15,
 * //   passesAA: false,
 * //   passesAAA: false,
 * //   passesAALarge: false,
 * //   passesAAALarge: false
 * // }
 * ```
 */
export function checkContrast(
  foreground: string,
  background: string,
): ContrastResult | null {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);

  if (!fg || !bg) {
    return null;
  }

  const fgLuminance = calculateLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = calculateLuminance(bg.r, bg.g, bg.b);
  const ratio = calculateContrastRatio(fgLuminance, bgLuminance);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= ContrastThresholds.AA_NORMAL,
    passesAAA: ratio >= ContrastThresholds.AAA_NORMAL,
    passesAALarge: ratio >= ContrastThresholds.AA_LARGE,
    passesAAALarge: ratio >= ContrastThresholds.AAA_LARGE,
  };
}

/**
 * Formats a contrast ratio for display.
 *
 * @param ratio - The contrast ratio
 * @returns Formatted string (e.g., "4.5:1")
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Gets the minimum required contrast for a given scenario.
 *
 * @param scenario - The contrast scenario
 * @returns Minimum required contrast ratio
 */
export function getMinimumContrast(
  scenario: "normal" | "large" | "ui" | "aaa-normal" | "aaa-large",
): number {
  switch (scenario) {
    case "normal":
      return ContrastThresholds.AA_NORMAL;
    case "large":
      return ContrastThresholds.AA_LARGE;
    case "ui":
      return ContrastThresholds.AA_UI;
    case "aaa-normal":
      return ContrastThresholds.AAA_NORMAL;
    case "aaa-large":
      return ContrastThresholds.AAA_LARGE;
  }
}

/**
 * Suggests whether text would be more readable in black or white
 * against a given background color.
 *
 * @param background - Background color as hex
 * @returns "black" or "white"
 *
 * @example
 * ```ts
 * suggestTextColor("#ffffff"); // "black"
 * suggestTextColor("#000000"); // "white"
 * suggestTextColor("#ff6b35"); // "black" (orange background)
 * ```
 */
export function suggestTextColor(background: string): "black" | "white" {
  const bg = parseHexColor(background);
  if (!bg) {
    return "black";
  }

  const luminance = calculateLuminance(bg.r, bg.g, bg.b);

  // Use 0.179 as threshold (approximates WCAG recommendations)
  return luminance > 0.179 ? "black" : "white";
}
