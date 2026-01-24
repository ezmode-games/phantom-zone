/**
 * Form State Persistence Storage (PZ-005)
 *
 * localStorage-based persistence service for form state.
 * Supports debounced saves, restore, and clear operations.
 */

import {
  type ClearResult,
  type CreateFormPersistenceOptions,
  type FormPersistence,
  type PersistenceConfig,
  PersistenceConfigSchema,
  type PersistenceError,
  type RestoreResult,
  type SaveResult,
  type StorageAdapter,
  type StoredFormState,
  StoredFormStateSchema,
  createPersistenceError,
} from "./types";

/**
 * Default localStorage adapter.
 * Returns null operations if localStorage is unavailable (SSR).
 */
function createLocalStorageAdapter(): StorageAdapter | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }

  return {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  };
}

/**
 * Check if localStorage is available and working.
 */
function isStorageAvailable(storage: StorageAdapter): boolean {
  const testKey = "__phantom_zone_storage_test__";
  try {
    storage.setItem(testKey, "test");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate the storage key for a form.
 */
function generateStorageKey(config: PersistenceConfig): string {
  return `${config.storageKeyPrefix}:${config.formId}`;
}

/**
 * Serialize form state to JSON string.
 */
function serializeState(state: StoredFormState): string {
  return JSON.stringify(state);
}

/**
 * Parse stored JSON string to form state.
 */
function parseStoredState(json: string): StoredFormState {
  const parsed: unknown = JSON.parse(json);
  return StoredFormStateSchema.parse(parsed);
}

/**
 * Simple debounce implementation for save functions.
 */
function createSaveDebounce(
  fn: (data: Record<string, unknown>) => void,
  delayMs: number
): {
  debounced: (data: Record<string, unknown>) => void;
  cancel: () => void;
  flush: () => void;
  hasPending: () => boolean;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingData: Record<string, unknown> | null = null;

  const clearTimer = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const cancel = () => {
    clearTimer();
    pendingData = null;
  };

  const flush = () => {
    if (pendingData !== null) {
      clearTimer();
      const data = pendingData;
      pendingData = null;
      fn(data);
    }
  };

  const hasPending = () => pendingData !== null;

  const debounced = (data: Record<string, unknown>) => {
    pendingData = data;
    clearTimer();
    timeoutId = setTimeout(() => {
      if (pendingData !== null) {
        const currentData = pendingData;
        pendingData = null;
        timeoutId = null;
        fn(currentData);
      }
    }, delayMs);
  };

  return { debounced, cancel, flush, hasPending };
}

/**
 * Create a form persistence instance.
 */
export function createFormPersistence(
  options: CreateFormPersistenceOptions
): FormPersistence {
  // Parse and validate config with defaults
  const config = PersistenceConfigSchema.parse(options.config);

  // Get storage adapter
  const storage = options.storage ?? createLocalStorageAdapter();
  const storageKey = generateStorageKey(config);

  // Track storage availability
  let storageAvailable = storage !== null && isStorageAvailable(storage);

  // Core save implementation (synchronous for simplicity)
  const saveCoreSync = (data: Record<string, unknown>): SaveResult => {
    if (!config.enabled) {
      return { status: "disabled" };
    }

    if (!storageAvailable || storage === null) {
      return {
        status: "error",
        error: createPersistenceError(
          "STORAGE_UNAVAILABLE",
          "localStorage is not available"
        ),
      };
    }

    try {
      const state: StoredFormState = {
        data,
        savedAt: new Date().toISOString(),
        formId: config.formId,
        ...(config.version !== undefined && { version: config.version }),
      };

      const serialized = serializeState(state);
      storage.setItem(storageKey, serialized);

      return { status: "saved", savedAt: new Date(state.savedAt) };
    } catch (error) {
      return { status: "error", error: mapStorageError(error) };
    }
  };

  // Async wrapper for core save
  const saveCore = async (
    data: Record<string, unknown>
  ): Promise<SaveResult> => {
    return saveCoreSync(data);
  };

  // Create debounced save
  const { debounced: debouncedSave, cancel, flush, hasPending } = createSaveDebounce(
    (data: Record<string, unknown>) => {
      saveCoreSync(data);
    },
    config.debounceMs
  );

  // Debounced save - returns immediately, actual save happens after debounce
  const save = async (data: Record<string, unknown>): Promise<SaveResult> => {
    if (!config.enabled) {
      return { status: "disabled" };
    }

    // If debounce is 0, save immediately
    if (config.debounceMs === 0) {
      return saveCore(data);
    }

    // Queue the debounced save
    debouncedSave(data);

    // Return a placeholder result - actual save happens after debounce
    return { status: "saved", savedAt: new Date() };
  };

  // Restore implementation
  const restore = async (): Promise<RestoreResult> => {
    if (!storageAvailable || storage === null) {
      return {
        status: "error",
        error: createPersistenceError(
          "STORAGE_UNAVAILABLE",
          "localStorage is not available"
        ),
      };
    }

    try {
      const stored = storage.getItem(storageKey);

      if (stored === null) {
        return { status: "not_found" };
      }

      const state = parseStoredState(stored);
      const savedAt = new Date(state.savedAt);

      // Check version mismatch
      if (
        config.version !== undefined &&
        state.version !== undefined &&
        state.version !== config.version
      ) {
        return {
          status: "version_mismatch",
          storedVersion: state.version,
          currentVersion: config.version,
        };
      }

      // Check if data is stale
      if (config.maxAgeMs !== undefined) {
        const age = Date.now() - savedAt.getTime();
        if (age > config.maxAgeMs) {
          return { status: "stale", data: state.data, savedAt };
        }
      }

      return { status: "restored", data: state.data, savedAt };
    } catch (error) {
      return {
        status: "error",
        error: mapParseError(error),
      };
    }
  };

  // Clear implementation
  const clear = async (): Promise<ClearResult> => {
    // Cancel any pending save first
    cancel();

    if (!storageAvailable || storage === null) {
      return {
        status: "error",
        error: createPersistenceError(
          "STORAGE_UNAVAILABLE",
          "localStorage is not available"
        ),
      };
    }

    try {
      const exists = storage.getItem(storageKey) !== null;

      if (!exists) {
        return { status: "not_found" };
      }

      storage.removeItem(storageKey);
      return { status: "cleared" };
    } catch (error) {
      return {
        status: "error",
        error: createPersistenceError(
          "UNKNOWN",
          "Failed to clear stored data",
          error
        ),
      };
    }
  };

  // Check if stored data exists
  const hasStoredData = (): boolean => {
    if (!storageAvailable || storage === null) {
      return false;
    }

    try {
      return storage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  };

  // Cancel pending save
  const cancelPendingSave = (): void => {
    cancel();
  };

  // Flush pending save
  const flushPendingSave = async (): Promise<void> => {
    flush();
  };

  return {
    storageKey,
    config,
    save,
    saveImmediate: saveCore,
    restore,
    clear,
    cancelPendingSave,
    flushPendingSave,
    hasStoredData,
  };
}

/**
 * Map storage errors to PersistenceError.
 */
function mapStorageError(error: unknown): PersistenceError {
  if (error instanceof Error) {
    // Check for quota exceeded
    if (
      error.name === "QuotaExceededError" ||
      error.message.includes("quota")
    ) {
      return createPersistenceError(
        "QUOTA_EXCEEDED",
        "localStorage quota exceeded",
        error
      );
    }

    // Check for serialization errors
    if (error instanceof TypeError && error.message.includes("circular")) {
      return createPersistenceError(
        "SERIALIZATION_ERROR",
        "Cannot serialize circular data structure",
        error
      );
    }
  }

  return createPersistenceError(
    "UNKNOWN",
    "Failed to save form data",
    error
  );
}

/**
 * Map parse errors to PersistenceError.
 */
function mapParseError(error: unknown): PersistenceError {
  if (error instanceof SyntaxError) {
    return createPersistenceError(
      "PARSE_ERROR",
      "Failed to parse stored data as JSON",
      error
    );
  }

  // Zod validation error
  if (error instanceof Error && error.name === "ZodError") {
    return createPersistenceError(
      "VALIDATION_ERROR",
      "Stored data failed validation",
      error
    );
  }

  return createPersistenceError(
    "UNKNOWN",
    "Failed to restore form data",
    error
  );
}

/**
 * Create a memory storage adapter for testing.
 */
export function createMemoryStorageAdapter(): StorageAdapter {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}
