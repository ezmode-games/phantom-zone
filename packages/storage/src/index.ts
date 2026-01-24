/**
 * @phantom-zone/storage
 *
 * Storage services for Cloudflare Workers and R2 including:
 * - R2 storage client (PZ-300)
 * - Schema storage service (PZ-301)
 * - Content storage service (PZ-302)
 * - Response storage service (PZ-303)
 * - Asset storage service (PZ-304)
 */

export const VERSION = "0.0.1";

// R2 Client (PZ-300)
export { R2Client, createR2Client } from "./r2-client";

// Types
export type {
  // Result type
  Result,
  // Error types
  R2StorageError,
  R2StorageErrorCode,
  // Metadata
  StorageMetadata,
  // Options
  PutOptions,
  GetOptions,
  ListOptions,
  RangeOptions,
  // Results
  StoredObject,
  StoredObjectInfo,
  ListResult,
  PutResult,
  StreamResult,
  // Config
  RetryConfig,
  R2ClientConfig,
} from "./types";

// Type utilities
export { ok, err, createError, DEFAULT_RETRY_CONFIG, StorageMetadataSchema } from "./types";

// Placeholder types for future services (PZ-301 through PZ-304)
// These will be implemented in subsequent issues

export interface SchemaStorageService {
  saveSchema(formId: string, schema: unknown): Promise<void>;
  getSchema(formId: string): Promise<unknown>;
  listSchemas(): Promise<string[]>;
}

export interface ContentStorageService {
  saveContent(formId: string, content: unknown): Promise<void>;
  getContent(formId: string): Promise<unknown>;
}

export interface ResponseStorageService {
  saveResponse(formId: string, responseId: string, data: unknown): Promise<void>;
  getResponse(formId: string, responseId: string): Promise<unknown>;
  listResponses(formId: string): Promise<string[]>;
}

export interface AssetStorageService {
  uploadAsset(formId: string, file: Blob): Promise<string>;
  getAsset(formId: string, assetId: string): Promise<Blob | null>;
  deleteAsset(formId: string, assetId: string): Promise<void>;
}
