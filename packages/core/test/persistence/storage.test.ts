import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFormPersistence,
  createMemoryStorageAdapter,
} from "../../src/persistence/storage";
import type { FormPersistence, StorageAdapter } from "../../src/persistence/types";

describe("Form Persistence Storage", () => {
  let storage: StorageAdapter;
  let persistence: FormPersistence;

  beforeEach(() => {
    storage = createMemoryStorageAdapter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createFormPersistence", () => {
    it("creates persistence with minimal config", () => {
      persistence = createFormPersistence({
        config: { formId: "test-form" },
        storage,
      });

      expect(persistence.storageKey).toBe("phantom-zone-form:test-form");
      expect(persistence.config.formId).toBe("test-form");
      expect(persistence.config.debounceMs).toBe(1000);
      expect(persistence.config.enabled).toBe(true);
    });

    it("creates persistence with custom config", () => {
      persistence = createFormPersistence({
        config: {
          formId: "my-form",
          debounceMs: 500,
          storageKeyPrefix: "my-app",
          version: 2,
        },
        storage,
      });

      expect(persistence.storageKey).toBe("my-app:my-form");
      expect(persistence.config.debounceMs).toBe(500);
      expect(persistence.config.version).toBe(2);
    });

    it("creates persistence with disabled flag", () => {
      persistence = createFormPersistence({
        config: { formId: "test", enabled: false },
        storage,
      });

      expect(persistence.config.enabled).toBe(false);
    });
  });

  describe("saveImmediate", () => {
    beforeEach(() => {
      persistence = createFormPersistence({
        config: { formId: "test-form" },
        storage,
      });
    });

    it("saves data immediately", async () => {
      const result = await persistence.saveImmediate({ name: "John", age: 30 });

      expect(result.status).toBe("saved");
      if (result.status === "saved") {
        expect(result.savedAt).toBeInstanceOf(Date);
      }
    });

    it("stores data that can be restored", async () => {
      await persistence.saveImmediate({ email: "test@example.com" });

      const restoreResult = await persistence.restore();
      expect(restoreResult.status).toBe("restored");
      if (restoreResult.status === "restored") {
        expect(restoreResult.data).toEqual({ email: "test@example.com" });
      }
    });

    it("returns disabled status when persistence is disabled", async () => {
      persistence = createFormPersistence({
        config: { formId: "test", enabled: false },
        storage,
      });

      const result = await persistence.saveImmediate({ name: "John" });
      expect(result.status).toBe("disabled");
    });

    it("handles nested data structures", async () => {
      const data = {
        user: {
          name: "John",
          address: {
            city: "NYC",
            zip: "10001",
          },
        },
        items: [1, 2, 3],
      };

      await persistence.saveImmediate(data);
      const result = await persistence.restore();

      expect(result.status).toBe("restored");
      if (result.status === "restored") {
        expect(result.data).toEqual(data);
      }
    });

    it("overwrites previous data", async () => {
      await persistence.saveImmediate({ name: "John" });
      await persistence.saveImmediate({ name: "Jane" });

      const result = await persistence.restore();
      expect(result.status).toBe("restored");
      if (result.status === "restored") {
        expect(result.data).toEqual({ name: "Jane" });
      }
    });

    it("stores version when configured", async () => {
      persistence = createFormPersistence({
        config: { formId: "test", version: 3 },
        storage,
      });

      await persistence.saveImmediate({ name: "John" });

      const stored = storage.getItem("phantom-zone-form:test");
      expect(stored).toContain('"version":3');
    });
  });

  describe("save (debounced)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("debounces multiple saves", async () => {
      persistence = createFormPersistence({
        config: { formId: "test", debounceMs: 100 },
        storage,
      });

      // Make multiple save calls rapidly
      void persistence.save({ name: "A" });
      await vi.advanceTimersByTimeAsync(10);
      void persistence.save({ name: "B" });
      await vi.advanceTimersByTimeAsync(10);
      void persistence.save({ name: "C" });

      // Advance past debounce time from last save
      await vi.advanceTimersByTimeAsync(150);

      const result = await persistence.restore();
      expect(result.status).toBe("restored");
      if (result.status === "restored") {
        // Only the last value should be saved
        expect(result.data).toEqual({ name: "C" });
      }
    });

    it("saves immediately when debounceMs is 0", async () => {
      persistence = createFormPersistence({
        config: { formId: "test", debounceMs: 0 },
        storage,
      });

      const result = await persistence.save({ name: "John" });
      expect(result.status).toBe("saved");

      const restored = await persistence.restore();
      expect(restored.status).toBe("restored");
    });

    it("can be flushed", async () => {
      persistence = createFormPersistence({
        config: { formId: "test", debounceMs: 1000 },
        storage,
      });

      void persistence.save({ name: "John" });

      // Flush immediately instead of waiting for debounce
      await persistence.flushPendingSave();

      const result = await persistence.restore();
      expect(result.status).toBe("restored");
      if (result.status === "restored") {
        expect(result.data).toEqual({ name: "John" });
      }
    });

    it("can be cancelled", async () => {
      persistence = createFormPersistence({
        config: { formId: "test", debounceMs: 100 },
        storage,
      });

      void persistence.save({ name: "John" });
      persistence.cancelPendingSave();

      await vi.advanceTimersByTimeAsync(200);

      const result = await persistence.restore();
      expect(result.status).toBe("not_found");
    });
  });

  describe("restore", () => {
    beforeEach(() => {
      persistence = createFormPersistence({
        config: { formId: "test-form" },
        storage,
      });
    });

    it("returns not_found when no data exists", async () => {
      const result = await persistence.restore();
      expect(result.status).toBe("not_found");
    });

    it("restores saved data with savedAt timestamp", async () => {
      await persistence.saveImmediate({ name: "John" });

      const result = await persistence.restore();
      expect(result.status).toBe("restored");
      if (result.status === "restored") {
        expect(result.data).toEqual({ name: "John" });
        expect(result.savedAt).toBeInstanceOf(Date);
      }
    });

    it("detects version mismatch", async () => {
      // Save with version 1
      const v1Persistence = createFormPersistence({
        config: { formId: "test-form", version: 1 },
        storage,
      });
      await v1Persistence.saveImmediate({ name: "John" });

      // Try to restore with version 2
      const v2Persistence = createFormPersistence({
        config: { formId: "test-form", version: 2 },
        storage,
      });
      const result = await v2Persistence.restore();

      expect(result.status).toBe("version_mismatch");
      if (result.status === "version_mismatch") {
        expect(result.storedVersion).toBe(1);
        expect(result.currentVersion).toBe(2);
      }
    });

    it("detects stale data", async () => {
      vi.useFakeTimers();

      // Save data
      await persistence.saveImmediate({ name: "John" });

      // Create persistence with short maxAge
      const shortMaxAge = createFormPersistence({
        config: { formId: "test-form", maxAgeMs: 1000 },
        storage,
      });

      // Advance time past maxAge
      vi.advanceTimersByTime(2000);

      const result = await shortMaxAge.restore();
      expect(result.status).toBe("stale");
      if (result.status === "stale") {
        expect(result.data).toEqual({ name: "John" });
      }

      vi.useRealTimers();
    });

    it("returns error for corrupted data", async () => {
      storage.setItem("phantom-zone-form:test-form", "invalid json");

      const result = await persistence.restore();
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.code).toBe("PARSE_ERROR");
      }
    });

    it("returns error for invalid schema", async () => {
      storage.setItem(
        "phantom-zone-form:test-form",
        JSON.stringify({ invalid: true })
      );

      const result = await persistence.restore();
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("clear", () => {
    beforeEach(() => {
      persistence = createFormPersistence({
        config: { formId: "test-form" },
        storage,
      });
    });

    it("clears stored data", async () => {
      await persistence.saveImmediate({ name: "John" });

      const clearResult = await persistence.clear();
      expect(clearResult.status).toBe("cleared");

      const restoreResult = await persistence.restore();
      expect(restoreResult.status).toBe("not_found");
    });

    it("returns not_found when no data exists", async () => {
      const result = await persistence.clear();
      expect(result.status).toBe("not_found");
    });

    it("cancels pending saves", async () => {
      vi.useFakeTimers();

      persistence = createFormPersistence({
        config: { formId: "test", debounceMs: 100 },
        storage,
      });

      void persistence.save({ name: "John" });
      await persistence.clear();

      vi.advanceTimersByTime(200);

      const result = await persistence.restore();
      expect(result.status).toBe("not_found");

      vi.useRealTimers();
    });
  });

  describe("hasStoredData", () => {
    beforeEach(() => {
      persistence = createFormPersistence({
        config: { formId: "test-form" },
        storage,
      });
    });

    it("returns false when no data exists", () => {
      expect(persistence.hasStoredData()).toBe(false);
    });

    it("returns true after saving data", async () => {
      await persistence.saveImmediate({ name: "John" });
      expect(persistence.hasStoredData()).toBe(true);
    });

    it("returns false after clearing data", async () => {
      await persistence.saveImmediate({ name: "John" });
      await persistence.clear();
      expect(persistence.hasStoredData()).toBe(false);
    });
  });

  describe("createMemoryStorageAdapter", () => {
    it("implements storage interface", () => {
      const memoryStorage = createMemoryStorageAdapter();

      memoryStorage.setItem("key1", "value1");
      expect(memoryStorage.getItem("key1")).toBe("value1");

      memoryStorage.removeItem("key1");
      expect(memoryStorage.getItem("key1")).toBeNull();
    });

    it("isolates data between instances", () => {
      const storage1 = createMemoryStorageAdapter();
      const storage2 = createMemoryStorageAdapter();

      storage1.setItem("key", "value1");
      storage2.setItem("key", "value2");

      expect(storage1.getItem("key")).toBe("value1");
      expect(storage2.getItem("key")).toBe("value2");
    });

    it("returns null for non-existent keys", () => {
      const memoryStorage = createMemoryStorageAdapter();
      expect(memoryStorage.getItem("nonexistent")).toBeNull();
    });
  });

  describe("error handling", () => {
    it("handles storage unavailable on restore", async () => {
      const brokenStorage: StorageAdapter = {
        getItem: () => {
          throw new Error("Storage unavailable");
        },
        setItem: () => {},
        removeItem: () => {},
      };

      persistence = createFormPersistence({
        config: { formId: "test" },
        storage: brokenStorage,
      });

      const result = await persistence.restore();
      expect(result.status).toBe("error");
    });

    it("handles storage unavailable on clear", async () => {
      const brokenStorage: StorageAdapter = {
        getItem: () => "{}",
        setItem: () => {},
        removeItem: () => {
          throw new Error("Storage unavailable");
        },
      };

      persistence = createFormPersistence({
        config: { formId: "test" },
        storage: brokenStorage,
      });

      const result = await persistence.clear();
      expect(result.status).toBe("error");
    });
  });
});
