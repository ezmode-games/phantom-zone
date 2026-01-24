import { describe, expect, it } from "vitest";
import {
  PersistenceConfigSchema,
  StoredFormStateSchema,
  createPersistenceError,
} from "../../src/persistence/types";

describe("Persistence Types", () => {
  describe("PersistenceConfigSchema", () => {
    it("parses minimal valid config", () => {
      const config = PersistenceConfigSchema.parse({
        formId: "test-form",
      });

      expect(config.formId).toBe("test-form");
      expect(config.debounceMs).toBe(1000); // default
      expect(config.storageKeyPrefix).toBe("phantom-zone-form"); // default
      expect(config.enabled).toBe(true); // default
    });

    it("parses full config with all options", () => {
      const config = PersistenceConfigSchema.parse({
        formId: "test-form",
        debounceMs: 500,
        storageKeyPrefix: "my-app",
        enabled: false,
        version: 2,
        maxAgeMs: 86400000, // 24 hours
      });

      expect(config.formId).toBe("test-form");
      expect(config.debounceMs).toBe(500);
      expect(config.storageKeyPrefix).toBe("my-app");
      expect(config.enabled).toBe(false);
      expect(config.version).toBe(2);
      expect(config.maxAgeMs).toBe(86400000);
    });

    it("requires non-empty formId", () => {
      expect(() =>
        PersistenceConfigSchema.parse({ formId: "" })
      ).toThrow();
    });

    it("requires non-negative debounceMs", () => {
      expect(() =>
        PersistenceConfigSchema.parse({ formId: "test", debounceMs: -1 })
      ).toThrow();
    });

    it("requires positive version when provided", () => {
      expect(() =>
        PersistenceConfigSchema.parse({ formId: "test", version: 0 })
      ).toThrow();

      expect(() =>
        PersistenceConfigSchema.parse({ formId: "test", version: -1 })
      ).toThrow();
    });

    it("requires positive maxAgeMs when provided", () => {
      expect(() =>
        PersistenceConfigSchema.parse({ formId: "test", maxAgeMs: 0 })
      ).toThrow();
    });

    it("accepts zero debounceMs (no debounce)", () => {
      const config = PersistenceConfigSchema.parse({
        formId: "test",
        debounceMs: 0,
      });

      expect(config.debounceMs).toBe(0);
    });
  });

  describe("StoredFormStateSchema", () => {
    it("parses valid stored state", () => {
      const state = StoredFormStateSchema.parse({
        data: { name: "John", age: 30 },
        savedAt: "2024-01-15T10:30:00.000Z",
        formId: "test-form",
      });

      expect(state.data).toEqual({ name: "John", age: 30 });
      expect(state.savedAt).toBe("2024-01-15T10:30:00.000Z");
      expect(state.formId).toBe("test-form");
      expect(state.version).toBeUndefined();
    });

    it("parses stored state with version", () => {
      const state = StoredFormStateSchema.parse({
        data: { email: "test@example.com" },
        savedAt: "2024-01-15T10:30:00.000Z",
        formId: "test-form",
        version: 3,
      });

      expect(state.version).toBe(3);
    });

    it("requires non-empty formId", () => {
      expect(() =>
        StoredFormStateSchema.parse({
          data: {},
          savedAt: "2024-01-15T10:30:00.000Z",
          formId: "",
        })
      ).toThrow();
    });

    it("requires valid datetime for savedAt", () => {
      expect(() =>
        StoredFormStateSchema.parse({
          data: {},
          savedAt: "not-a-date",
          formId: "test",
        })
      ).toThrow();
    });

    it("accepts empty data object", () => {
      const state = StoredFormStateSchema.parse({
        data: {},
        savedAt: "2024-01-15T10:30:00.000Z",
        formId: "test",
      });

      expect(state.data).toEqual({});
    });

    it("accepts nested data", () => {
      const state = StoredFormStateSchema.parse({
        data: {
          user: {
            name: "John",
            address: {
              city: "NYC",
              zip: "10001",
            },
          },
          items: [1, 2, 3],
        },
        savedAt: "2024-01-15T10:30:00.000Z",
        formId: "test",
      });

      expect(state.data.user).toEqual({
        name: "John",
        address: { city: "NYC", zip: "10001" },
      });
      expect(state.data.items).toEqual([1, 2, 3]);
    });
  });

  describe("createPersistenceError", () => {
    it("creates error with code and message", () => {
      const error = createPersistenceError(
        "STORAGE_UNAVAILABLE",
        "localStorage not available"
      );

      expect(error.code).toBe("STORAGE_UNAVAILABLE");
      expect(error.message).toBe("localStorage not available");
      expect(error.cause).toBeUndefined();
    });

    it("creates error with cause", () => {
      const originalError = new Error("Original error");
      const error = createPersistenceError(
        "QUOTA_EXCEEDED",
        "Storage quota exceeded",
        originalError
      );

      expect(error.code).toBe("QUOTA_EXCEEDED");
      expect(error.message).toBe("Storage quota exceeded");
      expect(error.cause).toBe(originalError);
    });

    it("creates errors with all error codes", () => {
      const codes = [
        "STORAGE_UNAVAILABLE",
        "QUOTA_EXCEEDED",
        "SERIALIZATION_ERROR",
        "PARSE_ERROR",
        "VALIDATION_ERROR",
        "UNKNOWN",
      ] as const;

      for (const code of codes) {
        const error = createPersistenceError(code, "Test message");
        expect(error.code).toBe(code);
      }
    });
  });
});
