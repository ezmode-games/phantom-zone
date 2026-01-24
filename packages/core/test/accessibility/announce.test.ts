/**
 * Tests for live region announcement utilities.
 */

import { describe, expect, it } from "vitest";
import {
  cleanupLiveRegions,
  FormAnnouncements,
} from "../../src/accessibility/announce";

describe("FormAnnouncements", () => {
  describe("errorCount", () => {
    it("returns message for no errors", () => {
      expect(FormAnnouncements.errorCount(0)).toBe("No validation errors.");
    });

    it("returns singular message for 1 error", () => {
      expect(FormAnnouncements.errorCount(1)).toBe(
        "1 validation error found. Please fix it before submitting."
      );
    });

    it("returns plural message for multiple errors", () => {
      expect(FormAnnouncements.errorCount(3)).toBe(
        "3 validation errors found. Please fix them before submitting."
      );
    });
  });

  describe("fieldError", () => {
    it("formats field error message", () => {
      expect(FormAnnouncements.fieldError("Email", "This field is required.")).toBe(
        "Email: This field is required."
      );
    });
  });

  describe("submissionStatus", () => {
    it("returns submitting message", () => {
      expect(FormAnnouncements.submissionStatus("submitting")).toBe(
        "Submitting form. Please wait."
      );
    });

    it("returns success message", () => {
      expect(FormAnnouncements.submissionStatus("success")).toBe(
        "Form submitted successfully."
      );
    });

    it("returns error message", () => {
      expect(FormAnnouncements.submissionStatus("error")).toBe(
        "Form submission failed. Please try again."
      );
    });
  });

  describe("loading", () => {
    it("returns loading message", () => {
      expect(FormAnnouncements.loading(true)).toBe(
        "Loading content. Please wait."
      );
    });

    it("returns loaded message", () => {
      expect(FormAnnouncements.loading(false)).toBe("Content loaded.");
    });

    it("includes custom context", () => {
      expect(FormAnnouncements.loading(true, "options")).toBe(
        "Loading options. Please wait."
      );
      expect(FormAnnouncements.loading(false, "data")).toBe("Data loaded.");
    });
  });

  describe("selectionChange", () => {
    it("returns message for no selection", () => {
      expect(FormAnnouncements.selectionChange(0)).toBe("No items selected.");
    });

    it("returns singular message for 1 item", () => {
      expect(FormAnnouncements.selectionChange(1)).toBe("1 item selected.");
    });

    it("returns plural message for multiple items", () => {
      expect(FormAnnouncements.selectionChange(5)).toBe("5 items selected.");
    });

    it("uses custom item type", () => {
      expect(FormAnnouncements.selectionChange(0, "file")).toBe(
        "No files selected."
      );
      expect(FormAnnouncements.selectionChange(1, "file")).toBe(
        "1 file selected."
      );
      expect(FormAnnouncements.selectionChange(3, "option")).toBe(
        "3 options selected."
      );
    });
  });

  describe("characterCount", () => {
    it("returns limit reached message", () => {
      expect(FormAnnouncements.characterCount(100, 100)).toBe(
        "Character limit reached. Maximum 100 characters."
      );
      expect(FormAnnouncements.characterCount(150, 100)).toBe(
        "Character limit reached. Maximum 100 characters."
      );
    });

    it("returns remaining message when low", () => {
      expect(FormAnnouncements.characterCount(95, 100)).toBe(
        "5 characters remaining."
      );
      expect(FormAnnouncements.characterCount(91, 100)).toBe(
        "9 characters remaining."
      );
    });

    it("returns usage message when plenty remaining", () => {
      expect(FormAnnouncements.characterCount(50, 100)).toBe(
        "50 of 100 characters used."
      );
    });
  });
});

describe("cleanupLiveRegions", () => {
  it("does not throw when no regions exist", () => {
    // This tests that cleanup doesn't throw when no regions exist
    expect(() => cleanupLiveRegions()).not.toThrow();
  });
});
