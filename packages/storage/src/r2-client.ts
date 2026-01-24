/**
 * R2 Storage Client for Cloudflare Workers
 *
 * Provides typed operations for R2 bucket storage with:
 * - Put/Get/Delete/List objects
 * - Stream large files
 * - Metadata handling
 * - Retry logic for transient errors
 */

import type { z } from "zod/v4";
import {
  type GetOptions,
  type ListOptions,
  type ListResult,
  type PutOptions,
  type PutResult,
  type R2ClientConfig,
  type R2StorageError,
  type Result,
  type RetryConfig,
  type StorageMetadata,
  type StoredObject,
  type StoredObjectInfo,
  type StreamResult,
  DEFAULT_RETRY_CONFIG,
  createError,
  err,
  ok,
} from "./types";

/**
 * R2 Storage Client
 *
 * Type-safe client for R2 bucket operations with automatic
 * JSON serialization, metadata handling, and retry logic.
 */
export class R2Client {
  private readonly bucket: R2Bucket;
  private readonly retryConfig: RetryConfig;
  private readonly defaultMetadata: Partial<StorageMetadata>;

  constructor(bucket: R2Bucket, config?: R2ClientConfig) {
    this.bucket = bucket;
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config?.retry,
    };
    this.defaultMetadata = config?.defaultMetadata ?? {};
  }

  /**
   * Store a value in R2 with automatic JSON serialization.
   *
   * @param key - The object key
   * @param value - The value to store (will be JSON serialized)
   * @param options - Put options including metadata
   */
  async put<T>(
    key: string,
    value: T,
    options?: PutOptions,
  ): Promise<Result<PutResult>> {
    const keyValidation = this.validateKey(key);
    if (!keyValidation.ok) return keyValidation;

    // Serialize value to JSON - catch serialization errors (circular refs, BigInt, etc.)
    let body: string;
    try {
      body = JSON.stringify(value);
    } catch (cause) {
      return err(
        createError("SERIALIZATION_ERROR", `Failed to serialize value for key: ${key}`, cause),
      );
    }

    const httpMetadata = this.buildHttpMetadata(options?.metadata);
    const customMetadata = options?.metadata?.customMetadata;

    const operation = async (): Promise<Result<PutResult>> => {
      try {
        const object = await this.bucket.put(key, body, {
          httpMetadata,
          customMetadata,
          onlyIf: options?.onlyIf,
        });

        return ok({
          key: object.key,
          etag: object.etag,
          uploaded: object.uploaded,
        });
      } catch (cause) {
        return err(
          createError("BUCKET_ERROR", `Failed to put object: ${key}`, cause),
        );
      }
    };

    return this.withRetry(operation);
  }

  /**
   * Store raw bytes in R2.
   *
   * @param key - The object key
   * @param value - Raw bytes to store
   * @param options - Put options including metadata
   */
  async putRaw(
    key: string,
    value: ArrayBuffer | ReadableStream<Uint8Array> | Uint8Array | string,
    options?: PutOptions,
  ): Promise<Result<PutResult>> {
    const keyValidation = this.validateKey(key);
    if (!keyValidation.ok) return keyValidation;

    const httpMetadata = this.buildHttpMetadata(options?.metadata);
    const customMetadata = options?.metadata?.customMetadata;

    const operation = async (): Promise<Result<PutResult>> => {
      try {
        const object = await this.bucket.put(key, value, {
          httpMetadata,
          customMetadata,
          onlyIf: options?.onlyIf,
        });

        return ok({
          key: object.key,
          etag: object.etag,
          uploaded: object.uploaded,
        });
      } catch (cause) {
        return err(
          createError("BUCKET_ERROR", `Failed to put raw object: ${key}`, cause),
        );
      }
    };

    return this.withRetry(operation);
  }

  /**
   * Retrieve a value from R2 with automatic JSON parsing.
   *
   * @param key - The object key
   * @param options - Get options
   */
  async get<T>(key: string, options?: GetOptions): Promise<Result<StoredObject<T> | null>> {
    const keyValidation = this.validateKey(key);
    if (!keyValidation.ok) return keyValidation;

    const operation = async (): Promise<Result<StoredObject<T> | null>> => {
      try {
        const object = await this.bucket.get(key, {
          onlyIf: options?.onlyIf,
          range: options?.range,
        });

        if (object === null) {
          return ok(null);
        }

        const text = await object.text();
        let value: T;
        try {
          value = JSON.parse(text) as T;
        } catch (cause) {
          return err(
            createError("PARSE_ERROR", `Failed to parse JSON for key: ${key}`, cause),
          );
        }

        return ok({
          key: object.key,
          value,
          etag: object.etag,
          size: object.size,
          uploaded: object.uploaded,
          httpMetadata: this.extractHttpMetadata(object),
          customMetadata: object.customMetadata,
        });
      } catch (cause) {
        return err(
          createError("BUCKET_ERROR", `Failed to get object: ${key}`, cause),
        );
      }
    };

    return this.withRetry(operation);
  }

  /**
   * Retrieve a value from R2 and validate it against a Zod schema.
   *
   * @param key - The object key
   * @param schema - Zod schema to validate against
   * @param options - Get options
   */
  async getValidated<T extends z.ZodType>(
    key: string,
    schema: T,
    options?: GetOptions,
  ): Promise<Result<StoredObject<z.infer<T>> | null>> {
    const result = await this.get<unknown>(key, options);
    if (!result.ok) return result;
    if (result.value === null) return ok(null);

    const parseResult = schema.safeParse(result.value.value);
    if (!parseResult.success) {
      return err(
        createError(
          "VALIDATION_ERROR",
          `Validation failed for key: ${key}`,
          parseResult.error,
        ),
      );
    }

    return ok({
      ...result.value,
      value: parseResult.data as z.infer<T>,
    });
  }

  /**
   * Get raw bytes from R2 as a stream.
   *
   * @param key - The object key
   * @param options - Get options
   */
  async getStream(key: string, options?: GetOptions): Promise<Result<StreamResult | null>> {
    const keyValidation = this.validateKey(key);
    if (!keyValidation.ok) return keyValidation;

    const operation = async (): Promise<Result<StreamResult | null>> => {
      try {
        const object = await this.bucket.get(key, {
          onlyIf: options?.onlyIf,
          range: options?.range,
        });

        if (object === null) {
          return ok(null);
        }

        return ok({
          key: object.key,
          etag: object.etag,
          size: object.size,
          uploaded: object.uploaded,
          body: object.body,
          httpMetadata: this.extractHttpMetadata(object),
          customMetadata: object.customMetadata,
        });
      } catch (cause) {
        return err(
          createError("BUCKET_ERROR", `Failed to get stream: ${key}`, cause),
        );
      }
    };

    return this.withRetry(operation);
  }

  /**
   * Get object metadata without downloading the body.
   *
   * @param key - The object key
   */
  async head(key: string): Promise<Result<StoredObjectInfo | null>> {
    const keyValidation = this.validateKey(key);
    if (!keyValidation.ok) return keyValidation;

    const operation = async (): Promise<Result<StoredObjectInfo | null>> => {
      try {
        const object = await this.bucket.head(key);

        if (object === null) {
          return ok(null);
        }

        return ok({
          key: object.key,
          etag: object.etag,
          size: object.size,
          uploaded: object.uploaded,
          httpMetadata: this.extractHttpMetadata(object),
          customMetadata: object.customMetadata,
        });
      } catch (cause) {
        return err(
          createError("BUCKET_ERROR", `Failed to head object: ${key}`, cause),
        );
      }
    };

    return this.withRetry(operation);
  }

  /**
   * Delete an object from R2.
   *
   * @param key - The object key
   */
  async delete(key: string): Promise<Result<void>> {
    const keyValidation = this.validateKey(key);
    if (!keyValidation.ok) return keyValidation;

    const operation = async (): Promise<Result<void>> => {
      try {
        await this.bucket.delete(key);
        return ok(undefined);
      } catch (cause) {
        return err(
          createError("BUCKET_ERROR", `Failed to delete object: ${key}`, cause),
        );
      }
    };

    return this.withRetry(operation);
  }

  /**
   * Delete multiple objects from R2.
   *
   * @param keys - Array of object keys to delete
   */
  async deleteMany(keys: string[]): Promise<Result<void>> {
    for (const key of keys) {
      const keyValidation = this.validateKey(key);
      if (!keyValidation.ok) return keyValidation;
    }

    const operation = async (): Promise<Result<void>> => {
      try {
        await this.bucket.delete(keys);
        return ok(undefined);
      } catch (cause) {
        return err(
          createError("BUCKET_ERROR", `Failed to delete objects`, cause),
        );
      }
    };

    return this.withRetry(operation);
  }

  /**
   * List objects in R2 with pagination support.
   *
   * @param options - List options including prefix, cursor, and limit
   */
  async list(options?: ListOptions): Promise<Result<ListResult>> {
    const operation = async (): Promise<Result<ListResult>> => {
      try {
        const result = await this.bucket.list({
          prefix: options?.prefix,
          cursor: options?.cursor,
          limit: options?.limit,
          delimiter: options?.delimiter,
          startAfter: options?.startAfter,
        });

        const objects: StoredObjectInfo[] = result.objects.map((obj) => ({
          key: obj.key,
          etag: obj.etag,
          size: obj.size,
          uploaded: obj.uploaded,
          httpMetadata: this.extractHttpMetadata(obj),
          customMetadata: obj.customMetadata,
        }));

        return ok({
          objects,
          truncated: result.truncated,
          cursor: result.truncated ? result.cursor : undefined,
          delimitedPrefixes: result.delimitedPrefixes,
        });
      } catch (cause) {
        return err(
          createError("BUCKET_ERROR", `Failed to list objects`, cause),
        );
      }
    };

    return this.withRetry(operation);
  }

  /**
   * List all objects matching a prefix (handles pagination automatically).
   *
   * @param prefix - The prefix to filter by
   * @param options - Additional list options
   */
  async listAll(
    prefix?: string,
    options?: Omit<ListOptions, "prefix" | "cursor">,
  ): Promise<Result<StoredObjectInfo[]>> {
    const allObjects: StoredObjectInfo[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.list({
        ...options,
        prefix,
        cursor,
      });

      if (!result.ok) return result;

      allObjects.push(...result.value.objects);
      cursor = result.value.cursor;
    } while (cursor !== undefined);

    return ok(allObjects);
  }

  /**
   * Check if an object exists.
   *
   * @param key - The object key
   */
  async exists(key: string): Promise<Result<boolean>> {
    const result = await this.head(key);
    if (!result.ok) return result;
    return ok(result.value !== null);
  }

  // Private helper methods

  private validateKey(key: string): Result<void, R2StorageError> {
    if (key.length === 0) {
      return err(createError("INVALID_KEY", "Key cannot be empty"));
    }
    if (key.length > 1024) {
      return err(createError("INVALID_KEY", "Key cannot exceed 1024 characters"));
    }
    // R2 keys cannot start with a forward slash
    if (key.startsWith("/")) {
      return err(createError("INVALID_KEY", "Key cannot start with a forward slash"));
    }
    return ok(undefined);
  }

  private buildHttpMetadata(
    metadata?: StorageMetadata,
  ): R2HTTPMetadata | undefined {
    const merged = { ...this.defaultMetadata, ...metadata };
    if (Object.keys(merged).length === 0) return undefined;

    const result: R2HTTPMetadata = {};
    if (merged.contentType) result.contentType = merged.contentType;
    if (merged.cacheControl) result.cacheControl = merged.cacheControl;
    if (merged.contentDisposition) result.contentDisposition = merged.contentDisposition;
    if (merged.contentEncoding) result.contentEncoding = merged.contentEncoding;
    if (merged.contentLanguage) result.contentLanguage = merged.contentLanguage;

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private extractHttpMetadata(
    object: R2Object | R2ObjectBody,
  ): StorageMetadata | undefined {
    const http = object.httpMetadata;
    if (!http) return undefined;

    const metadata: StorageMetadata = {};
    if (http.contentType) metadata.contentType = http.contentType;
    if (http.cacheControl) metadata.cacheControl = http.cacheControl;
    if (http.contentDisposition) metadata.contentDisposition = http.contentDisposition;
    if (http.contentEncoding) metadata.contentEncoding = http.contentEncoding;
    if (http.contentLanguage) metadata.contentLanguage = http.contentLanguage;

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  private async withRetry<T>(
    operation: () => Promise<Result<T>>,
  ): Promise<Result<T>> {
    let lastError: R2StorageError | undefined;
    let delay = this.retryConfig.baseDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const result = await operation();

      if (result.ok) {
        return result;
      }

      lastError = result.error;

      // Only retry on retryable errors
      if (!result.error.retryable || attempt === this.retryConfig.maxRetries) {
        return result;
      }

      // Wait before retrying with exponential backoff
      await this.sleep(delay);
      delay = Math.min(
        delay * this.retryConfig.backoffMultiplier,
        this.retryConfig.maxDelayMs,
      );
    }

    // This should never happen, but TypeScript needs it
    return err(
      lastError ?? createError("UNKNOWN", "Unknown error during retry"),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create an R2 storage client.
 *
 * @param bucket - The R2Bucket binding from Cloudflare Workers
 * @param config - Optional client configuration
 */
export function createR2Client(
  bucket: R2Bucket,
  config?: R2ClientConfig,
): R2Client {
  return new R2Client(bucket, config);
}
