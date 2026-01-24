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
