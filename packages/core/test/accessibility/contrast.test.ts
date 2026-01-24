/**
 * Tests for color contrast utilities.
 */

import { describe, expect, it } from "vitest";
import {
  parseHexColor,
  calculateLuminance,
  calculateContrastRatio,
  checkContrast,
  formatContrastRatio,
  getMinimumContrast,
  suggestTextColor,
  ContrastThresholds,
} from "../../src/accessibility/contrast";

describe("parseHexColor", () => {
  it("parses 6-digit hex with #", () => {
    expect(parseHexColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHexColor("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(parseHexColor("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("parses 6-digit hex without #", () => {
    expect(parseHexColor("ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses 3-digit shorthand hex", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor("#000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseHexColor("#f00")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses mixed case", () => {
    expect(parseHexColor("#FF0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHexColor("#Ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("returns null for invalid hex", () => {
    expect(parseHexColor("invalid")).toBeNull();
    expect(parseHexColor("#gg0000")).toBeNull();
    expect(parseHexColor("#ff00")).toBeNull();
    expect(parseHexColor("#ff00000")).toBeNull();
  });
});

describe("calculateLuminance", () => {
  it("returns 0 for black", () => {
    expect(calculateLuminance(0, 0, 0)).toBe(0);
  });

  it("returns 1 for white", () => {
    expect(calculateLuminance(255, 255, 255)).toBe(1);
  });

  it("calculates luminance for colors", () => {
    // Red has lower luminance than green
    const redLuminance = calculateLuminance(255, 0, 0);
    const greenLuminance = calculateLuminance(0, 255, 0);
    expect(greenLuminance).toBeGreaterThan(redLuminance);

    // Gray is in the middle
    const grayLuminance = calculateLuminance(128, 128, 128);
    expect(grayLuminance).toBeGreaterThan(0);
    expect(grayLuminance).toBeLessThan(1);
  });
});

describe("calculateContrastRatio", () => {
  it("returns 21 for black and white", () => {
    const blackLuminance = 0;
    const whiteLuminance = 1;
    expect(calculateContrastRatio(blackLuminance, whiteLuminance)).toBe(21);
    expect(calculateContrastRatio(whiteLuminance, blackLuminance)).toBe(21);
  });

  it("returns 1 for same colors", () => {
    const luminance = 0.5;
    expect(calculateContrastRatio(luminance, luminance)).toBe(1);
  });

  it("handles order of arguments", () => {
    const light = 0.8;
    const dark = 0.2;
    expect(calculateContrastRatio(light, dark)).toBe(
      calculateContrastRatio(dark, light)
    );
  });
});

describe("checkContrast", () => {
  it("returns maximum contrast for black and white", () => {
    const result = checkContrast("#000000", "#ffffff");

    expect(result).not.toBeNull();
    expect(result?.ratio).toBe(21);
    expect(result?.passesAA).toBe(true);
    expect(result?.passesAAA).toBe(true);
    expect(result?.passesAALarge).toBe(true);
    expect(result?.passesAAALarge).toBe(true);
  });

  it("detects insufficient contrast", () => {
    // Light gray on white - very low contrast
    const result = checkContrast("#cccccc", "#ffffff");

    expect(result).not.toBeNull();
    expect(result?.ratio).toBeLessThan(4.5);
    expect(result?.passesAA).toBe(false);
    expect(result?.passesAAA).toBe(false);
  });

  it("returns null for invalid colors", () => {
    expect(checkContrast("invalid", "#ffffff")).toBeNull();
    expect(checkContrast("#000000", "invalid")).toBeNull();
  });

  it("rounds ratio to 2 decimal places", () => {
    const result = checkContrast("#767676", "#ffffff");
    // #767676 on white is approximately 4.54:1
    expect(result?.ratio.toString()).toMatch(/^\d+\.\d{1,2}$/);
  });
});

describe("formatContrastRatio", () => {
  it("formats ratio with 2 decimal places", () => {
    expect(formatContrastRatio(21)).toBe("21.00:1");
    expect(formatContrastRatio(4.5)).toBe("4.50:1");
    expect(formatContrastRatio(1.5)).toBe("1.50:1");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatContrastRatio(4.567)).toBe("4.57:1");
    expect(formatContrastRatio(4.564)).toBe("4.56:1");
  });
});

describe("getMinimumContrast", () => {
  it("returns correct thresholds", () => {
    expect(getMinimumContrast("normal")).toBe(ContrastThresholds.AA_NORMAL);
    expect(getMinimumContrast("large")).toBe(ContrastThresholds.AA_LARGE);
    expect(getMinimumContrast("ui")).toBe(ContrastThresholds.AA_UI);
    expect(getMinimumContrast("aaa-normal")).toBe(ContrastThresholds.AAA_NORMAL);
    expect(getMinimumContrast("aaa-large")).toBe(ContrastThresholds.AAA_LARGE);
  });
});

describe("suggestTextColor", () => {
  it("suggests black for light backgrounds", () => {
    expect(suggestTextColor("#ffffff")).toBe("black");
    expect(suggestTextColor("#f0f0f0")).toBe("black");
    expect(suggestTextColor("#ffff00")).toBe("black"); // yellow
  });

  it("suggests white for dark backgrounds", () => {
    expect(suggestTextColor("#000000")).toBe("white");
    expect(suggestTextColor("#333333")).toBe("white");
    expect(suggestTextColor("#0000ff")).toBe("white"); // blue
  });

  it("returns black for invalid colors", () => {
    expect(suggestTextColor("invalid")).toBe("black");
  });
});

describe("ContrastThresholds", () => {
  it("has correct WCAG values", () => {
    expect(ContrastThresholds.AA_NORMAL).toBe(4.5);
    expect(ContrastThresholds.AAA_NORMAL).toBe(7);
    expect(ContrastThresholds.AA_LARGE).toBe(3);
    expect(ContrastThresholds.AAA_LARGE).toBe(4.5);
    expect(ContrastThresholds.AA_UI).toBe(3);
  });
});
