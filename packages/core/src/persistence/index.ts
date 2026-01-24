/**
 * Form State Persistence (PZ-005)
 *
 * Provides localStorage-based form state persistence with:
 * - Debounced auto-save on form changes
 * - Restore on page reload
 * - Clear on successful submit
 * - Optional R2 backup hook for long forms
 *
 * @example
 * ```tsx
 * import { useFormPersistence } from "@phantom-zone/core";
 *
 * function MyForm() {
 *   const { save, clear, isRestored } = useFormPersistence({
 *     config: { formId: "my-form", debounceMs: 500 },
 *     onRestore: (data) => form.reset(data),
 *   });
 *
 *   const handleChange = (data) => save(data);
 *   const handleSubmit = async (data) => {
 *     await submitForm(data);
 *     await clear();
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */

// Types
export type {
  ClearResult,
  CreateFormPersistenceOptions,
  FormPersistence,
  PersistenceConfig,
  PersistenceConfigInput,
  PersistenceError,
  PersistenceErrorCode,
  R2BackupFunction,
  RestoreResult,
  SaveResult,
  StorageAdapter,
  StoredFormState,
  UseFormPersistenceOptions,
  UseFormPersistenceReturn,
} from "./types";

// Schemas
export {
  PersistenceConfigSchema,
  StoredFormStateSchema,
  createPersistenceError,
} from "./types";

// Storage
export {
  createFormPersistence,
  createMemoryStorageAdapter,
} from "./storage";

// React Hooks
export {
  useFormPersistence,
  useFormPersistenceHandler,
  useHasPersistedData,
} from "./hooks";
