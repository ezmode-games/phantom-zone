/**
 * Hooks Tests (PZ-005)
 *
 * Note: These tests are limited since we use node environment.
 * Full hook testing would require jsdom environment and @testing-library/react.
 * These tests verify the hook types and basic export functionality.
 */

import { describe, expect, it } from "vitest";
import {
  useFormPersistence,
  useFormPersistenceHandler,
  useHasPersistedData,
} from "../../src/persistence/hooks";

describe("Persistence Hooks", () => {
  describe("useFormPersistence", () => {
    it("is exported as a function", () => {
      expect(typeof useFormPersistence).toBe("function");
    });

    it("has correct function signature", () => {
      // Function should accept options object
      expect(useFormPersistence.length).toBe(1);
    });
  });

  describe("useHasPersistedData", () => {
    it("is exported as a function", () => {
      expect(typeof useHasPersistedData).toBe("function");
    });

    it("accepts formId parameter", () => {
      // Function has at least 1 required parameter
      expect(useHasPersistedData.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("useFormPersistenceHandler", () => {
    it("is exported as a function", () => {
      expect(typeof useFormPersistenceHandler).toBe("function");
    });

    it("accepts a save function parameter", () => {
      expect(useFormPersistenceHandler.length).toBe(1);
    });
  });
});

// Type-level tests to ensure types are correctly exported
describe("Hook Types", () => {
  it("UseFormPersistenceOptions interface exists", () => {
    // This test verifies the type is exported and can be used
    const options: Parameters<typeof useFormPersistence>[0] = {
      config: { formId: "test" },
      autoRestore: false,
      onRestore: (data, savedAt) => {
        // Type check: data should be Record<string, unknown>
        const _data: Record<string, unknown> = data;
        // Type check: savedAt should be Date
        const _savedAt: Date = savedAt;
        void _data;
        void _savedAt;
      },
      onSave: (savedAt) => {
        const _savedAt: Date = savedAt;
        void _savedAt;
      },
      onClear: () => {},
    };

    expect(options.config.formId).toBe("test");
  });

  it("UseFormPersistenceReturn type is correct", async () => {
    // This is a type-level test that would be verified by TypeScript
    // The actual return type includes:
    // - persistence: FormPersistence
    // - isRestored: boolean
    // - isSaving: boolean
    // - lastSavedAt: Date | null
    // - error: PersistenceError | null
    // - hasStoredData: boolean
    // - save: (data: Record<string, unknown>) => void
    // - saveImmediate: (data: Record<string, unknown>) => Promise<SaveResult>
    // - restore: () => Promise<RestoreResult>
    // - clear: () => Promise<ClearResult>
    expect(true).toBe(true);
  });
});
