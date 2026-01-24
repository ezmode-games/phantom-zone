/**
 * Schema Export/Import (PZ-105)
 *
 * Export form designs as JSON and import existing schemas.
 * Features:
 * - Export canvas state to downloadable JSON file
 * - Import JSON file and validate before loading
 * - Version field for future compatibility
 * - Documented schema format with metadata
 */

import { z } from "zod";
import {
  type ReactNode,
  useState,
  useCallback,
  useMemo,
  useRef,
  createContext,
  useContext,
} from "react";
import {
  CanvasStateSchema,
  type CanvasState,
  type CanvasField,
} from "./types";

// -----------------------------------------------------------------------------
// Schema Version
// -----------------------------------------------------------------------------

/**
 * Current schema version.
 * Increment when making breaking changes to the schema format.
 *
 * Version history:
 * - 1.0.0: Initial schema format
 */
export const SCHEMA_VERSION = "1.0.0";

/**
 * Minimum supported schema version for import.
 * Older versions will be rejected.
 */
export const MIN_SUPPORTED_VERSION = "1.0.0";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Metadata about the exported schema.
 */
export interface ExportMetadata {
  /** When the schema was exported (ISO 8601) */
  exportedAt: string;
  /** Optional name of the application that exported the schema */
  exportedBy?: string;
  /** Optional description or notes about this export */
  notes?: string;
}

/**
 * The exportable schema format that wraps the canvas state.
 * This is the JSON structure that gets exported/imported.
 */
export interface ExportableSchema {
  /** Schema format version for compatibility checking */
  version: string;
  /** Metadata about this export */
  metadata: ExportMetadata;
  /** The form definition (canvas state without UI-specific fields) */
  form: {
    /** Form identifier */
    id: string;
    /** Form title */
    title: string;
    /** Form description */
    description?: string;
    /** Ordered list of fields */
    fields: CanvasField[];
  };
}

/**
 * Result of schema validation.
 */
export type SchemaValidationResult =
  | { valid: true; schema: ExportableSchema }
  | { valid: false; errors: SchemaValidationError[] };

/**
 * A validation error with details.
 */
export interface SchemaValidationError {
  /** Error code for programmatic handling */
  code: "INVALID_JSON" | "INVALID_SCHEMA" | "UNSUPPORTED_VERSION" | "VALIDATION_ERROR";
  /** Human-readable error message */
  message: string;
  /** Optional path to the problematic field */
  path?: string;
}

/**
 * Event emitted when a schema is imported.
 */
export interface SchemaImportEvent {
  /** The imported schema */
  schema: ExportableSchema;
  /** The canvas state derived from the schema */
  canvasState: CanvasState;
}

/**
 * Event emitted when import fails.
 */
export interface SchemaImportErrorEvent {
  /** Validation errors */
  errors: SchemaValidationError[];
  /** The raw content that failed to import */
  rawContent?: string;
}

// -----------------------------------------------------------------------------
// Zod Schemas for Validation
// -----------------------------------------------------------------------------

/**
 * Schema for validating the metadata portion of an export.
 */
export const ExportMetadataSchema = z.object({
  exportedAt: z.string(),
  exportedBy: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Schema for validating the form portion of an export.
 * This is a subset of CanvasState without UI-specific fields.
 */
export const ExportedFormSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  fields: CanvasStateSchema.shape.fields,
});

/**
 * Complete schema for validating an exportable schema.
 */
export const ExportableSchemaSchema = z.object({
  version: z.string(),
  metadata: ExportMetadataSchema,
  form: ExportedFormSchema,
});

// -----------------------------------------------------------------------------
// Version Utilities
// -----------------------------------------------------------------------------

/**
 * Parses a semver-like version string into its components.
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1] as string, 10),
    minor: parseInt(match[2] as string, 10),
    patch: parseInt(match[3] as string, 10),
  };
}

/**
 * Compares two version strings.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return 0;

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

/**
 * Checks if a version is supported for import.
 */
export function isVersionSupported(version: string): boolean {
  const current = parseVersion(SCHEMA_VERSION);
  const target = parseVersion(version);
  const min = parseVersion(MIN_SUPPORTED_VERSION);

  if (!current || !target || !min) return false;

  // Version must be >= minimum and <= current
  return compareVersions(version, MIN_SUPPORTED_VERSION) >= 0 &&
         compareVersions(version, SCHEMA_VERSION) <= 0;
}

// -----------------------------------------------------------------------------
// Export Functions
// -----------------------------------------------------------------------------

/**
 * Converts a canvas state to an exportable schema.
 *
 * @param canvasState - The current canvas state
 * @param options - Optional export options
 * @returns The exportable schema
 */
export function exportSchema(
  canvasState: CanvasState,
  options?: {
    exportedBy?: string;
    notes?: string;
  }
): ExportableSchema {
  return {
    version: SCHEMA_VERSION,
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: options?.exportedBy,
      notes: options?.notes,
    },
    form: {
      id: canvasState.id,
      title: canvasState.title,
      description: canvasState.description,
      fields: canvasState.fields,
    },
  };
}

/**
 * Converts an exportable schema to a JSON string.
 *
 * @param schema - The schema to serialize
 * @param prettyPrint - Whether to format the JSON with indentation
 * @returns The JSON string
 */
export function serializeSchema(schema: ExportableSchema, prettyPrint = true): string {
  return JSON.stringify(schema, null, prettyPrint ? 2 : undefined);
}

/**
 * Creates a downloadable file from the schema.
 *
 * @param schema - The schema to download
 * @param filename - Optional custom filename
 */
export function downloadSchema(schema: ExportableSchema, filename?: string): void {
  const json = serializeSchema(schema);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${sanitizeFilename(schema.form.title)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sanitizes a string for use as a filename.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "form-schema";
}

// -----------------------------------------------------------------------------
// Import/Validation Functions
// -----------------------------------------------------------------------------

/**
 * Validates and parses a JSON string into an exportable schema.
 *
 * @param jsonString - The JSON string to validate
 * @returns Validation result with parsed schema or errors
 */
export function validateSchema(jsonString: string): SchemaValidationResult {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    return {
      valid: false,
      errors: [{
        code: "INVALID_JSON",
        message: error instanceof Error ? error.message : "Invalid JSON format",
      }],
    };
  }

  // Step 2: Validate against Zod schema
  const result = ExportableSchemaSchema.safeParse(parsed);
  if (!result.success) {
    // Zod v4 uses .issues instead of .errors
    const errors: SchemaValidationError[] = result.error.issues.map((issue) => ({
      code: "VALIDATION_ERROR" as const,
      message: issue.message,
      path: issue.path.join("."),
    }));
    return { valid: false, errors };
  }

  // Step 3: Check version compatibility
  if (!isVersionSupported(result.data.version)) {
    return {
      valid: false,
      errors: [{
        code: "UNSUPPORTED_VERSION",
        message: `Schema version ${result.data.version} is not supported. ` +
                 `Supported versions: ${MIN_SUPPORTED_VERSION} to ${SCHEMA_VERSION}`,
      }],
    };
  }

  return { valid: true, schema: result.data };
}

/**
 * Converts an imported schema to a canvas state.
 *
 * @param schema - The validated schema
 * @returns A canvas state ready for use
 */
export function schemaToCanvasState(schema: ExportableSchema): CanvasState {
  return {
    id: schema.form.id,
    title: schema.form.title,
    description: schema.form.description,
    fields: schema.form.fields,
    selectedFieldId: null,
    isPreviewMode: false,
  };
}

/**
 * Reads a file and returns its content as a string.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface ExportImportContextValue {
  /** Whether an import operation is in progress */
  isImporting: boolean;
  /** Current import errors, if any */
  importErrors: SchemaValidationError[];
  /** Export the current canvas state */
  exportCanvas: () => void;
  /** Trigger file selection for import */
  triggerImport: () => void;
  /** Clear import errors */
  clearErrors: () => void;
}

const ExportImportContext = createContext<ExportImportContextValue | null>(null);

/**
 * Hook to access the ExportImport context.
 * Must be used within an ExportImport component.
 */
export function useExportImport(): ExportImportContextValue {
  const context = useContext(ExportImportContext);
  if (!context) {
    throw new Error("useExportImport must be used within an ExportImport component");
  }
  return context;
}

// -----------------------------------------------------------------------------
// Icons
// -----------------------------------------------------------------------------

function ExportIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M8 2v8M4 6l4-4 4 4M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M8 10V2M4 6l4 4 4-4M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Component Props
// -----------------------------------------------------------------------------

export interface ExportImportProps {
  /** Current canvas state to export */
  canvasState: CanvasState;
  /** Callback when a schema is successfully imported */
  onImport?: (event: SchemaImportEvent) => void;
  /** Callback when import fails */
  onImportError?: (event: SchemaImportErrorEvent) => void;
  /** Callback when export is triggered */
  onExport?: (schema: ExportableSchema) => void;
  /** Optional name to include in export metadata */
  exportedBy?: string;
  /** Additional class name */
  className?: string;
  /** Children to render (e.g., custom layout) */
  children?: ReactNode;
}

// -----------------------------------------------------------------------------
// ExportImport Component
// -----------------------------------------------------------------------------

/**
 * ExportImport provides export and import functionality for form schemas.
 *
 * Features:
 * - Export canvas state as downloadable JSON
 * - Import JSON files with validation
 * - Version compatibility checking
 * - Error handling and display
 */
export function ExportImport({
  canvasState,
  onImport,
  onImportError,
  onExport,
  exportedBy,
  className,
  children,
}: ExportImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<SchemaValidationError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle export
  const handleExport = useCallback(() => {
    const schema = exportSchema(canvasState, { exportedBy });
    onExport?.(schema);
    downloadSchema(schema);
  }, [canvasState, exportedBy, onExport]);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      setImportErrors([]);

      try {
        const content = await readFileAsText(file);
        const result = validateSchema(content);

        if (result.valid) {
          const importedCanvasState = schemaToCanvasState(result.schema);
          onImport?.({
            schema: result.schema,
            canvasState: importedCanvasState,
          });
        } else {
          setImportErrors(result.errors);
          onImportError?.({
            errors: result.errors,
            rawContent: content,
          });
        }
      } catch (error) {
        const errorResult: SchemaValidationError[] = [{
          code: "INVALID_JSON",
          message: error instanceof Error ? error.message : "Failed to read file",
        }];
        setImportErrors(errorResult);
        onImportError?.({ errors: errorResult });
      } finally {
        setIsImporting(false);
        // Reset file input to allow re-selecting the same file
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onImport, onImportError]
  );

  // Trigger file input click
  const triggerImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setImportErrors([]);
  }, []);

  // Context value
  const contextValue = useMemo<ExportImportContextValue>(
    () => ({
      isImporting,
      importErrors,
      exportCanvas: handleExport,
      triggerImport,
      clearErrors,
    }),
    [isImporting, importErrors, handleExport, triggerImport, clearErrors]
  );

  return (
    <ExportImportContext.Provider value={contextValue}>
      <div
        data-testid="export-import"
        className={className}
        role="group"
        aria-label="Export and import form schema"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          data-testid="import-file-input"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          aria-hidden="true"
        />

        {children ? (
          children
        ) : (
          <div data-testid="export-import-buttons">
            <button
              type="button"
              data-testid="export-button"
              onClick={handleExport}
              aria-label="Export form schema as JSON"
            >
              <ExportIcon />
              <span>Export</span>
            </button>

            <button
              type="button"
              data-testid="import-button"
              onClick={triggerImport}
              disabled={isImporting}
              aria-label="Import form schema from JSON file"
            >
              <ImportIcon />
              <span>{isImporting ? "Importing..." : "Import"}</span>
            </button>
          </div>
        )}

        {/* Error display */}
        {importErrors.length > 0 && (
          <div
            data-testid="import-errors"
            role="alert"
            aria-live="polite"
          >
            <p data-testid="import-error-title">Import failed:</p>
            <ul data-testid="import-error-list">
              {importErrors.map((error, index) => (
                <li key={index} data-testid={`import-error-${index}`}>
                  {error.path ? `${error.path}: ` : ""}
                  {error.message}
                </li>
              ))}
            </ul>
            <button
              type="button"
              data-testid="clear-errors-button"
              onClick={clearErrors}
              aria-label="Dismiss import errors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </ExportImportContext.Provider>
  );
}

// Export sub-components for flexibility
ExportImport.ExportIcon = ExportIcon;
ExportImport.ImportIcon = ImportIcon;
