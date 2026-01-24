/**
 * Tests for accessibility ID generation utilities.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  createAccessibleId,
  createFieldAccessibilityIds,
  joinIds,
  sanitizeIdPart,
  resetIdCounter,
  getIdCounter,
} from "../../src/accessibility/ids";

describe("sanitizeIdPart", () => {
  it("converts to lowercase", () => {
    expect(sanitizeIdPart("Email")).toBe("email");
    expect(sanitizeIdPart("UserName")).toBe("username");
  });

  it("replaces dots with dashes", () => {
    expect(sanitizeIdPart("address.city")).toBe("address-city");
    expect(sanitizeIdPart("a.b.c")).toBe("a-b-c");
  });

  it("handles array notation", () => {
    expect(sanitizeIdPart("items[0]")).toBe("items-0");
    expect(sanitizeIdPart("data[0][1]")).toBe("data-0-1");
  });

  it("replaces spaces with dashes", () => {
    expect(sanitizeIdPart("my field")).toBe("my-field");
    expect(sanitizeIdPart("first  name")).toBe("first-name");
  });

  it("removes special characters", () => {
    expect(sanitizeIdPart("email!")).toBe("email");
    expect(sanitizeIdPart("field@name")).toBe("fieldname");
    expect(sanitizeIdPart("test#123")).toBe("test123");
  });

  it("collapses multiple dashes", () => {
    expect(sanitizeIdPart("a--b")).toBe("a-b");
    expect(sanitizeIdPart("a...b")).toBe("a-b");
  });

  it("removes leading and trailing dashes", () => {
    expect(sanitizeIdPart("-test-")).toBe("test");
    expect(sanitizeIdPart("--test--")).toBe("test");
  });
});

describe("createAccessibleId", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("creates ID from base ID", () => {
    expect(createAccessibleId("email")).toBe("email");
  });

  it("adds suffix to ID", () => {
    expect(createAccessibleId("email", { suffix: "error" })).toBe("email-error");
  });

  it("adds prefix to ID", () => {
    expect(createAccessibleId("email", { prefix: "form" })).toBe("form-email");
  });

  it("combines prefix, base, and suffix", () => {
    expect(
      createAccessibleId("email", { prefix: "signup", suffix: "error" })
    ).toBe("signup-email-error");
  });

  it("generates unique ID without base", () => {
    expect(createAccessibleId(undefined, { prefix: "field" })).toBe("field-1");
    expect(createAccessibleId(undefined, { prefix: "field" })).toBe("field-2");
    expect(createAccessibleId(undefined, { prefix: "field" })).toBe("field-3");
  });

  it("uses custom separator", () => {
    expect(
      createAccessibleId("email", { prefix: "form", suffix: "error", separator: "_" })
    ).toBe("form_email_error");
  });

  it("sanitizes all parts", () => {
    expect(
      createAccessibleId("address.city", { prefix: "My Form", suffix: "Error!" })
    ).toBe("my-form-address-city-error");
  });
});

describe("createFieldAccessibilityIds", () => {
  it("creates all required IDs", () => {
    const ids = createFieldAccessibilityIds("email");

    expect(ids.inputId).toBe("email");
    expect(ids.labelId).toBe("email-label");
    expect(ids.errorId).toBe("email-error");
    expect(ids.descriptionId).toBe("email-description");
    expect(ids.hintId).toBe("email-hint");
  });

  it("includes prefix when provided", () => {
    const ids = createFieldAccessibilityIds("email", "contact-form");

    expect(ids.inputId).toBe("contact-form-email");
    expect(ids.labelId).toBe("contact-form-email-label");
    expect(ids.errorId).toBe("contact-form-email-error");
    expect(ids.descriptionId).toBe("contact-form-email-description");
    expect(ids.hintId).toBe("contact-form-email-hint");
  });

  it("sanitizes field names", () => {
    const ids = createFieldAccessibilityIds("address.city");

    expect(ids.inputId).toBe("address-city");
    expect(ids.labelId).toBe("address-city-label");
    expect(ids.errorId).toBe("address-city-error");
  });

  it("handles array notation in field names", () => {
    const ids = createFieldAccessibilityIds("items[0].name");

    expect(ids.inputId).toBe("items-0-name");
    expect(ids.errorId).toBe("items-0-name-error");
  });
});

describe("joinIds", () => {
  it("joins valid IDs with space", () => {
    expect(joinIds(["id1", "id2", "id3"])).toBe("id1 id2 id3");
  });

  it("filters out undefined values", () => {
    expect(joinIds(["id1", undefined, "id2"])).toBe("id1 id2");
  });

  it("filters out null values", () => {
    expect(joinIds(["id1", null, "id2"])).toBe("id1 id2");
  });

  it("filters out false values", () => {
    expect(joinIds(["id1", false, "id2"])).toBe("id1 id2");
  });

  it("filters out empty strings", () => {
    expect(joinIds(["id1", "", "id2"])).toBe("id1 id2");
  });

  it("returns undefined for empty array", () => {
    expect(joinIds([])).toBeUndefined();
  });

  it("returns undefined when all values filtered", () => {
    expect(joinIds([undefined, null, false, ""])).toBeUndefined();
  });

  it("works with conditional IDs", () => {
    const hasError = true;
    const hasHint = false;

    expect(
      joinIds([
        "description",
        hasError ? "error" : undefined,
        hasHint ? "hint" : undefined,
      ])
    ).toBe("description error");
  });
});

describe("resetIdCounter and getIdCounter", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("starts at 0", () => {
    expect(getIdCounter()).toBe(0);
  });

  it("increments when creating IDs without base", () => {
    createAccessibleId();
    expect(getIdCounter()).toBe(1);

    createAccessibleId();
    expect(getIdCounter()).toBe(2);
  });

  it("does not increment when using base ID", () => {
    createAccessibleId("email");
    expect(getIdCounter()).toBe(0);
  });

  it("resets counter to 0", () => {
    createAccessibleId();
    createAccessibleId();
    expect(getIdCounter()).toBe(2);

    resetIdCounter();
    expect(getIdCounter()).toBe(0);
  });
});
