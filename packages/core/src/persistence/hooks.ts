/**
 * React Hooks for Form State Persistence (PZ-005)
 *
 * Provides hooks for easy integration with React forms.
 * Handles auto-save on changes, restore on mount, and clear on submit.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { createFormPersistence } from "./storage";
import type {
  ClearResult,
  FormPersistence,
  PersistenceConfig,
  PersistenceError,
  RestoreResult,
  SaveResult,
  UseFormPersistenceOptions,
  UseFormPersistenceReturn,
} from "./types";

/**
 * Hook for form state persistence.
 *
 * Provides debounced auto-save, restore on mount, and clear functionality.
 *
 * @example
 * ```tsx
 * const { save, restore, clear, isRestored } = useFormPersistence({
 *   config: { formId: "my-form", debounceMs: 500 },
 *   onRestore: (data) => form.reset(data),
 * });
 *
 * // Call save on form change
 * const handleChange = (data) => {
 *   save(data);
 * };
 *
 * // Clear on successful submit
 * const handleSubmit = async (data) => {
 *   await submitForm(data);
 *   await clear();
 * };
 * ```
 */
export function useFormPersistence(
  options: UseFormPersistenceOptions
): UseFormPersistenceReturn {
  const {
    config: configInput,
    onRestore,
    onRestoreError,
    onSave,
    onSaveError,
    onClear,
    autoRestore = true,
    r2Backup,
  } = options;

  // Create persistence instance (memoized)
  const persistence = useMemo(
    () => createFormPersistence({ config: configInput }),
    // Only recreate if formId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configInput.formId]
  );

  // State
  const [isRestored, setIsRestored] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<PersistenceError | null>(null);

  // Track mount state to avoid state updates after unmount
  const isMountedRef = useRef(true);

  // Track if restore has been attempted
  const restoreAttemptedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Flush any pending saves before unmount
      void persistence.flushPendingSave();
    };
  }, [persistence]);

  // Auto-restore on mount
  useEffect(() => {
    if (!autoRestore || restoreAttemptedRef.current) {
      return;
    }

    restoreAttemptedRef.current = true;

    void (async () => {
      const result = await persistence.restore();

      if (!isMountedRef.current) return;

      if (result.status === "restored") {
        setIsRestored(true);
        onRestore?.(result.data, result.savedAt);
      } else if (result.status === "stale") {
        // Still restore stale data but let the callback decide what to do
        setIsRestored(true);
        onRestore?.(result.data, result.savedAt);
      } else if (result.status === "error") {
        setError(result.error);
        onRestoreError?.(result.error);
      } else if (result.status === "not_found") {
        // No data to restore, mark as restored anyway
        setIsRestored(true);
      }
      // version_mismatch: don't restore, don't set error
    })();
  }, [autoRestore, persistence, onRestore, onRestoreError]);

  // Save function (debounced)
  const save = useCallback(
    (data: Record<string, unknown>) => {
      setIsSaving(true);
      setError(null);

      void (async () => {
        const result = await persistence.save(data);

        if (!isMountedRef.current) return;

        setIsSaving(false);

        if (result.status === "saved") {
          setLastSavedAt(result.savedAt);
          onSave?.(result.savedAt);

          // Optional R2 backup
          if (r2Backup) {
            try {
              await r2Backup(
                {
                  data,
                  savedAt: result.savedAt.toISOString(),
                  formId: persistence.config.formId,
                  version: persistence.config.version,
                },
                persistence.config
              );
            } catch (backupError) {
              // R2 backup failures are non-critical
              console.warn("R2 backup failed:", backupError);
            }
          }
        } else if (result.status === "error") {
          setError(result.error);
          onSaveError?.(result.error);
        }
      })();
    },
    [persistence, onSave, onSaveError, r2Backup]
  );

  // Save immediate function
  const saveImmediate = useCallback(
    async (data: Record<string, unknown>): Promise<SaveResult> => {
      setIsSaving(true);
      setError(null);

      const result = await persistence.saveImmediate(data);

      if (isMountedRef.current) {
        setIsSaving(false);

        if (result.status === "saved") {
          setLastSavedAt(result.savedAt);
          onSave?.(result.savedAt);
        } else if (result.status === "error") {
          setError(result.error);
          onSaveError?.(result.error);
        }
      }

      return result;
    },
    [persistence, onSave, onSaveError]
  );

  // Restore function
  const restore = useCallback(async (): Promise<RestoreResult> => {
    const result = await persistence.restore();

    if (isMountedRef.current) {
      if (result.status === "restored" || result.status === "stale") {
        setIsRestored(true);
        onRestore?.(result.data, result.savedAt);
      } else if (result.status === "error") {
        setError(result.error);
        onRestoreError?.(result.error);
      }
    }

    return result;
  }, [persistence, onRestore, onRestoreError]);

  // Clear function
  const clear = useCallback(async (): Promise<ClearResult> => {
    const result = await persistence.clear();

    if (isMountedRef.current) {
      if (result.status === "cleared" || result.status === "not_found") {
        setLastSavedAt(null);
        setError(null);
        onClear?.();
      } else if (result.status === "error") {
        setError(result.error);
      }
    }

    return result;
  }, [persistence, onClear]);

  // Check for stored data
  const hasStoredData = persistence.hasStoredData();

  return {
    persistence,
    isRestored,
    isSaving,
    lastSavedAt,
    error,
    hasStoredData,
    save,
    saveImmediate,
    restore,
    clear,
  };
}

/**
 * Hook that returns whether there is persisted data for a form.
 * Useful for showing "restore draft?" UI.
 *
 * @example
 * ```tsx
 * const hasDraft = useHasPersistedData("my-form");
 *
 * if (hasDraft) {
 *   return <button onClick={restoreDraft}>Restore Draft</button>;
 * }
 * ```
 */
export function useHasPersistedData(
  formId: string,
  storageKeyPrefix = "phantom-zone-form"
): boolean {
  // Create a minimal persistence instance just to check for data
  const persistence = useMemo(
    () =>
      createFormPersistence({
        config: { formId, storageKeyPrefix, debounceMs: 0 },
      }),
    [formId, storageKeyPrefix]
  );

  // Subscribe to storage changes using useSyncExternalStore
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Listen for storage events (cross-tab)
      const handleStorage = (event: StorageEvent) => {
        if (event.key === persistence.storageKey) {
          onStoreChange();
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
      }

      return () => {};
    },
    [persistence.storageKey]
  );

  const getSnapshot = useCallback(
    () => persistence.hasStoredData(),
    [persistence]
  );

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Creates a form change handler that auto-saves form state.
 *
 * @example
 * ```tsx
 * const { save } = useFormPersistence({ config: { formId: "my-form" } });
 * const handleChange = useFormPersistenceHandler(save);
 *
 * // In your form:
 * <form onChange={(e) => handleChange(getFormValues())}>
 * ```
 */
export function useFormPersistenceHandler(
  save: (data: Record<string, unknown>) => void
): (data: Record<string, unknown>) => void {
  const saveRef = useRef(save);

  // Keep ref updated
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  return useCallback((data: Record<string, unknown>) => {
    saveRef.current(data);
  }, []);
}
