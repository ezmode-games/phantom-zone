/**
 * Type definitions for R2 storage operations
 */

import { z } from "zod/v4";

// Result type for explicit error handling
export type Result<T, E = R2StorageError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Error types for R2 operations
export type R2StorageErrorCode =
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "INVALID_KEY"
  | "INVALID_METADATA"
  | "BUCKET_ERROR"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "SERIALIZATION_ERROR"
  | "UNKNOWN";

export interface R2StorageError {
  code: R2StorageErrorCode;
  message: string;
  cause?: unknown;
  retryable: boolean;
}

export function createError(
  code: R2StorageErrorCode,
  message: string,
  cause?: unknown,
): R2StorageError {
  const retryable = code === "NETWORK_ERROR" || code === "BUCKET_ERROR";
  return { code, message, cause, retryable };
}

// Metadata schema for stored objects
export const StorageMetadataSchema = z.object({
  contentType: z.string().optional(),
  customMetadata: z.record(z.string(), z.string()).optional(),
  cacheControl: z.string().optional(),
  contentDisposition: z.string().optional(),
  contentEncoding: z.string().optional(),
  contentLanguage: z.string().optional(),
  expiresAt: z.date().optional(),
});

export type StorageMetadata = z.infer<typeof StorageMetadataSchema>;

// Options for put operations
export interface PutOptions {
  metadata?: StorageMetadata;
  onlyIf?: {
    etagMatches?: string;
    etagDoesNotMatch?: string;
  };
}

/**
 * Range options matching R2Range union type.
 * Must specify one of:
 * - offset (with optional length)
 * - length (with optional offset)
 * - suffix
 */
export type RangeOptions =
  | { offset: number; length?: number }
  | { offset?: number; length: number }
  | { suffix: number };

// Options for get operations
export interface GetOptions {
  /** Only return if etag matches */
  onlyIf?: {
    etagMatches?: string;
    etagDoesNotMatch?: string;
  };
  /** Range request for partial content */
  range?: RangeOptions;
}

// Options for list operations
export interface ListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
  delimiter?: string;
  /** Start listing after this key */
  startAfter?: string;
}

// Result types for operations
export interface StoredObject<T = unknown> {
  key: string;
  value: T;
  etag: string;
  size: number;
  uploaded: Date;
  httpMetadata?: StorageMetadata;
  customMetadata?: Record<string, string>;
}

export interface StoredObjectInfo {
  key: string;
  etag: string;
  size: number;
  uploaded: Date;
  httpMetadata?: StorageMetadata;
  customMetadata?: Record<string, string>;
}

export interface ListResult {
  objects: StoredObjectInfo[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

export interface PutResult {
  key: string;
  etag: string;
  uploaded: Date;
}

// Stream result for large file operations
export interface StreamResult {
  key: string;
  etag: string;
  size: number;
  uploaded: Date;
  body: ReadableStream<Uint8Array>;
  httpMetadata?: StorageMetadata;
  customMetadata?: Record<string, string>;
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

// Client configuration
export interface R2ClientConfig {
  /** Retry configuration for transient errors */
  retry?: Partial<RetryConfig>;
  /** Default metadata to apply to all puts */
  defaultMetadata?: Partial<StorageMetadata>;
}

// Schema Storage Types (PZ-301)

/**
 * Version information for a stored schema
 */
export const VersionInfoSchema = z.object({
  /** Version number (1-indexed) */
  version: z.number().int().positive(),
  /** Timestamp when this version was created */
  createdAt: z.coerce.date(),
  /** Size of the schema JSON in bytes */
  size: z.number().int().nonnegative(),
  /** R2 etag for the stored object */
  etag: z.string(),
});

export type VersionInfo = z.infer<typeof VersionInfoSchema>;

/**
 * Metadata stored alongside each schema version
 */
export const SchemaMetadataSchema = z.object({
  /** The guild this schema belongs to */
  guildId: z.string().min(1),
  /** The form this schema belongs to */
  formId: z.string().min(1),
  /** Version number */
  version: z.number().int().positive(),
  /** Timestamp when created */
  createdAt: z.coerce.date(),
  /** Optional description of changes in this version */
  description: z.string().optional(),
});

export type SchemaMetadata = z.infer<typeof SchemaMetadataSchema>;

/**
 * Serialized representation of a Zod schema stored in R2
 */
export const StoredSchemaSchema = z.object({
  /** Metadata about this schema version */
  metadata: SchemaMetadataSchema,
  /** The serialized schema definition (JSON Schema format) */
  schema: z.record(z.string(), z.unknown()),
});

export type StoredSchema = z.infer<typeof StoredSchemaSchema>;

/**
 * Configuration for SchemaStorageService
 */
export interface SchemaStorageConfig {
  /** Optional prefix for all schema paths (defaults to empty) */
  pathPrefix?: string;
}

// Content Storage Types (PZ-302)

/**
 * Version information for stored content
 */
export const ContentVersionInfoSchema = z.object({
  /** Version number (1-indexed) */
  version: z.number().int().positive(),
  /** Timestamp when this version was created */
  createdAt: z.coerce.date(),
  /** Size of the content in bytes */
  size: z.number().int().nonnegative(),
  /** R2 etag for the stored object */
  etag: z.string(),
});

export type ContentVersionInfo = z.infer<typeof ContentVersionInfoSchema>;

/**
 * Metadata stored alongside each content version
 */
export const ContentMetadataSchema = z.object({
  /** The guild this content belongs to */
  guildId: z.string().min(1),
  /** The page this content belongs to */
  pageId: z.string().min(1),
  /** Version number */
  version: z.number().int().positive(),
  /** Timestamp when created */
  createdAt: z.coerce.date(),
  /** Optional page title */
  title: z.string().optional(),
  /** Optional page description */
  description: z.string().optional(),
  /** Optional author ID */
  authorId: z.string().optional(),
});

export type ContentMetadata = z.infer<typeof ContentMetadataSchema>;

/**
 * Stored content representation
 */
export const StoredContentSchema = z.object({
  /** Metadata about this content version */
  metadata: ContentMetadataSchema,
  /** The MDX content */
  content: z.string(),
});

export type StoredContent = z.infer<typeof StoredContentSchema>;

/**
 * Configuration for ContentStorageService
 */
export interface ContentStorageConfig {
  /** Optional prefix for all content paths (defaults to empty) */
  pathPrefix?: string;
}

// Response Storage Types (PZ-303)

/**
 * Status of a form response
 */
export const ResponseStatusSchema = z.enum(["pending", "accepted", "rejected"]);

export type ResponseStatus = z.infer<typeof ResponseStatusSchema>;

/**
 * Form response data stored in R2
 */
export const FormResponseSchema = z.object({
  /** Unique response ID */
  id: z.string().min(1),
  /** The form this response belongs to */
  formId: z.string().min(1),
  /** The guild this response belongs to */
  guildId: z.string().min(1),
  /** Schema version the response was created against */
  schemaVersion: z.number().int().positive(),
  /** The response data (validated against form schema) */
  data: z.record(z.string(), z.unknown()),
  /** Response status */
  status: ResponseStatusSchema,
  /** Timestamp when response was created */
  createdAt: z.coerce.date(),
  /** Timestamp when response was last updated */
  updatedAt: z.coerce.date(),
  /** Optional submitter identifier */
  submitterId: z.string().optional(),
  /** Optional reviewer identifier (who accepted/rejected) */
  reviewerId: z.string().optional(),
  /** Optional review notes */
  reviewNotes: z.string().optional(),
});

export type FormResponse = z.infer<typeof FormResponseSchema>;

/**
 * Options for listing responses
 */
export interface ResponseListOptions {
  /** Filter by status */
  status?: ResponseStatus;
  /** Maximum number of items to return */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Result of listing responses
 */
export interface ResponseListResult {
  /** The response items */
  items: FormResponse[];
  /** Pagination cursor for next page (undefined if no more pages) */
  cursor?: string;
  /** Whether there are more items */
  hasMore: boolean;
}

/**
 * Configuration for ResponseStorageService
 */
export interface ResponseStorageConfig {
  /** Optional prefix for all response paths (defaults to empty) */
  pathPrefix?: string;
}

// Asset Storage Types (PZ-304)

/**
 * Asset type categories
 */
export const AssetTypeSchema = z.enum(["image", "document", "video", "audio", "other"]);

export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Metadata stored alongside each asset
 */
export const AssetMetadataSchema = z.object({
  /** The guild this asset belongs to */
  guildId: z.string().min(1),
  /** The unique asset ID */
  assetId: z.string().min(1),
  /** Asset type category */
  assetType: AssetTypeSchema,
  /** Content type (MIME type) */
  contentType: z.string().min(1),
  /** Timestamp when uploaded */
  uploadedAt: z.coerce.date(),
  /** Optional original filename */
  filename: z.string().optional(),
  /** Optional uploader ID */
  uploaderId: z.string().optional(),
});

export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;

/**
 * Information about a stored asset
 */
export const StoredAssetInfoSchema = z.object({
  /** The unique asset ID */
  assetId: z.string().min(1),
  /** Asset type category */
  assetType: AssetTypeSchema,
  /** R2 key where asset is stored */
  key: z.string(),
  /** Size in bytes */
  size: z.number().int().nonnegative(),
  /** Content type (MIME type) */
  contentType: z.string(),
  /** Timestamp when uploaded */
  uploadedAt: z.coerce.date(),
  /** R2 etag */
  etag: z.string(),
  /** Optional original filename */
  filename: z.string().optional(),
  /** Optional uploader ID */
  uploaderId: z.string().optional(),
});

export type StoredAssetInfo = z.infer<typeof StoredAssetInfoSchema>;

/**
 * Configuration for AssetStorageService
 */
export interface AssetStorageConfig {
  /** Optional prefix for all asset paths (defaults to empty) */
  pathPrefix?: string;
  /** Maximum file size in bytes (defaults to 50MB) */
  maxFileSizeBytes?: number;
}
