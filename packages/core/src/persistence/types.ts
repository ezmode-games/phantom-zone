/**
 * Form State Persistence Types (PZ-005)
 *
 * Type definitions for form state persistence functionality.
 * Supports localStorage with optional R2 backup for long forms.
 */

import { z } from "zod/v4";

/**
 * Configuration for form persistence behavior.
 */
export const PersistenceConfigSchema = z.object({
  /** Unique identifier for the form (used as storage key component) */
  formId: z.string().min(1),

  /** Debounce delay in milliseconds for save operations (default: 1000) */
  debounceMs: z.number().int().nonnegative().default(1000),

  /** Storage key prefix (default: "phantom-zone-form") */
  storageKeyPrefix: z.string().default("phantom-zone-form"),

  /** Whether persistence is enabled (default: true) */
  enabled: z.boolean().default(true),

  /** Version identifier for form schema (used for migration) */
  version: z.number().int().positive().optional(),

  /** Maximum age of stored data in milliseconds before considered stale */
  maxAgeMs: z.number().int().positive().optional(),
});

export type PersistenceConfig = z.infer<typeof PersistenceConfigSchema>;

/**
 * Input type for creating persistence config (with defaults applied).
 */
export type PersistenceConfigInput = z.input<typeof PersistenceConfigSchema>;

/**
 * Stored form state data structure.
 */
export const StoredFormStateSchema = z.object({
  /** The form data as key-value pairs */
  data: z.record(z.string(), z.unknown()),

  /** Timestamp when data was last saved (ISO 8601) */
  savedAt: z.string().datetime(),

  /** Form schema version when data was saved */
  version: z.number().int().positive().optional(),

  /** Form ID this data belongs to */
  formId: z.string().min(1),
});

export type StoredFormState = z.infer<typeof StoredFormStateSchema>;

/**
 * Result of a restore operation.
 */
export type RestoreResult =
  | { status: "restored"; data: Record<string, unknown>; savedAt: Date }
  | { status: "not_found" }
  | { status: "stale"; data: Record<string, unknown>; savedAt: Date }
  | { status: "version_mismatch"; storedVersion: number; currentVersion: number }
  | { status: "error"; error: PersistenceError };

/**
 * Result of a save operation.
 */
export type SaveResult =
  | { status: "saved"; savedAt: Date }
  | { status: "disabled" }
  | { status: "error"; error: PersistenceError };

/**
 * Result of a clear operation.
 */
export type ClearResult =
  | { status: "cleared" }
  | { status: "not_found" }
  | { status: "error"; error: PersistenceError };

/**
 * Error codes for persistence operations.
 */
export type PersistenceErrorCode =
  | "STORAGE_UNAVAILABLE"
  | "QUOTA_EXCEEDED"
  | "SERIALIZATION_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN";

/**
 * Error type for persistence operations.
 */
export interface PersistenceError {
  code: PersistenceErrorCode;
  message: string;
  cause?: unknown;
}

/**
 * Creates a persistence error object.
 */
export function createPersistenceError(
  code: PersistenceErrorCode,
  message: string,
  cause?: unknown
): PersistenceError {
  return { code, message, cause };
}

/**
 * Interface for form persistence operations.
 * Can be implemented with different storage backends.
 */
export interface FormPersistence {
  /** Get the storage key used for this form */
  readonly storageKey: string;

  /** Get the current configuration */
  readonly config: PersistenceConfig;

  /**
   * Save form data to storage.
   * Uses debouncing if configured.
   */
  save(data: Record<string, unknown>): Promise<SaveResult>;

  /**
   * Immediately save form data without debouncing.
   */
  saveImmediate(data: Record<string, unknown>): Promise<SaveResult>;

  /**
   * Restore form data from storage.
   */
  restore(): Promise<RestoreResult>;

  /**
   * Clear stored form data.
   * Typically called after successful form submission.
   */
  clear(): Promise<ClearResult>;

  /**
   * Cancel any pending debounced save operations.
   */
  cancelPendingSave(): void;

  /**
   * Flush any pending save immediately.
   */
  flushPendingSave(): Promise<void>;

  /**
   * Check if there is stored data for this form.
   */
  hasStoredData(): boolean;
}

/**
 * Options for the useFormPersistence hook.
 */
export interface UseFormPersistenceOptions {
  /** Persistence configuration */
  config: PersistenceConfigInput;

  /** Callback when data is restored */
  onRestore?: (data: Record<string, unknown>, savedAt: Date) => void;

  /** Callback when restore fails */
  onRestoreError?: (error: PersistenceError) => void;

  /** Callback when data is saved */
  onSave?: (savedAt: Date) => void;

  /** Callback when save fails */
  onSaveError?: (error: PersistenceError) => void;

  /** Callback when data is cleared */
  onClear?: () => void;

  /** Whether to auto-restore on mount (default: true) */
  autoRestore?: boolean;

  /** Optional R2 backup function for long forms */
  r2Backup?: R2BackupFunction;
}

/**
 * Return type of useFormPersistence hook.
 */
export interface UseFormPersistenceReturn {
  /** The underlying persistence instance */
  persistence: FormPersistence;

  /** Whether data has been restored */
  isRestored: boolean;

  /** Whether a save is in progress */
  isSaving: boolean;

  /** The last saved timestamp */
  lastSavedAt: Date | null;

  /** Any persistence error */
  error: PersistenceError | null;

  /** Whether there is stored data available */
  hasStoredData: boolean;

  /** Save form data (debounced) */
  save: (data: Record<string, unknown>) => void;

  /** Save form data immediately */
  saveImmediate: (data: Record<string, unknown>) => Promise<SaveResult>;

  /** Restore form data */
  restore: () => Promise<RestoreResult>;

  /** Clear stored data (typically after successful submit) */
  clear: () => Promise<ClearResult>;
}

/**
 * Function type for optional R2 backup.
 * Receives the form data and persistence config, returns a promise.
 * This is a hook point for users who want to backup long form data to R2.
 */
export type R2BackupFunction = (
  data: StoredFormState,
  config: PersistenceConfig
) => Promise<void>;

/**
 * Storage adapter interface for abstracting storage backends.
 * Allows localStorage to be swapped for other storage mechanisms.
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Options for creating a form persistence instance.
 */
export interface CreateFormPersistenceOptions {
  /** Persistence configuration */
  config: PersistenceConfigInput;

  /** Storage adapter (defaults to localStorage) */
  storage?: StorageAdapter;
}
