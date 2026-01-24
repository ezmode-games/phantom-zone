/**
 * Asset Storage Service for Cloudflare Workers
 *
 * Stores and retrieves guild assets (images, files) in R2 with:
 * - File type validation
 * - Metadata tracking (type, size, uploader)
 * - Listing by asset type
 * - Delete operations
 *
 * R2 Path Format: {guild_id}/assets/{asset_type}/{asset_id}
 *
 * Note: Signed URLs and WebP conversion are handled at the API layer,
 * not in this service. This service focuses on storage operations.
 */

import type { R2Client } from "./r2-client";
import {
  type AssetMetadata,
  type AssetStorageConfig,
  type AssetType,
  type Result,
  type R2StorageError,
  type StoredAssetInfo,
  AssetMetadataSchema,
  StoredAssetInfoSchema,
  createError,
  err,
  ok,
} from "./types";

/**
 * Error codes specific to asset storage operations
 */
export type AssetStorageErrorCode =
  | R2StorageError["code"]
  | "ASSET_NOT_FOUND"
  | "INVALID_ASSET_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE";

export interface AssetStorageError {
  code: AssetStorageErrorCode;
  message: string;
  cause?: unknown;
  retryable: boolean;
}

function createAssetError(
  code: AssetStorageErrorCode,
  message: string,
  cause?: unknown,
): AssetStorageError {
  const retryable = code === "NETWORK_ERROR" || code === "BUCKET_ERROR";
  return { code, message, cause, retryable };
}

function wrapR2Error(error: R2StorageError): AssetStorageError {
  return {
    code: error.code,
    message: error.message,
    cause: error.cause,
    retryable: error.retryable,
  };
}

/**
 * Valid content types per asset type
 */
const ALLOWED_CONTENT_TYPES: Record<AssetType, string[]> = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/avif",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/ogg",
  ],
  audio: [
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
  ],
  other: [], // No restrictions for "other" type
};

/**
 * Result of uploading an asset
 */
export interface UploadAssetResult {
  /** The asset ID */
  assetId: string;
  /** R2 key where asset is stored */
  key: string;
  /** Size in bytes */
  size: number;
  /** Content type */
  contentType: string;
  /** Asset type category */
  assetType: AssetType;
  /** Timestamp when uploaded */
  uploadedAt: Date;
}

/**
 * Input for uploading an asset
 */
export interface UploadAssetInput {
  /** The guild ID */
  guildId: string;
  /** Unique asset ID (usually UUIDv7) */
  assetId: string;
  /** The raw file data */
  data: ArrayBuffer | Uint8Array | ReadableStream<Uint8Array>;
  /** Content type of the file */
  contentType: string;
  /** Asset type category */
  assetType: AssetType;
  /** Optional original filename */
  filename?: string;
  /** Optional uploader ID */
  uploaderId?: string;
}

/**
 * Options for listing assets
 */
export interface ListAssetsOptions {
  /** Filter by asset type */
  assetType?: AssetType;
  /** Pagination cursor */
  cursor?: string;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Result of listing assets
 */
export interface ListAssetsResult {
  /** The assets */
  assets: StoredAssetInfo[];
  /** Pagination cursor for next page */
  cursor?: string;
  /** Whether there are more results */
  hasMore: boolean;
}

/**
 * Asset Storage Service
 *
 * Manages asset storage in R2 with type validation and metadata tracking.
 */
export class AssetStorageService {
  private readonly client: R2Client;
  private readonly pathPrefix: string;
  private readonly maxFileSizeBytes: number;

  constructor(client: R2Client, config?: AssetStorageConfig) {
    this.client = client;
    this.pathPrefix = config?.pathPrefix ?? "";
    this.maxFileSizeBytes = config?.maxFileSizeBytes ?? 50 * 1024 * 1024; // 50MB default
  }

  /**
   * Build the R2 key path for an asset.
   */
  private buildAssetPath(guildId: string, assetType: AssetType, assetId: string): string {
    const prefix = this.pathPrefix ? `${this.pathPrefix}/` : "";
    return `${prefix}${guildId}/assets/${assetType}/${assetId}`;
  }

  /**
   * Build the prefix for listing assets.
   */
  private buildAssetsPrefix(guildId: string, assetType?: AssetType): string {
    const prefix = this.pathPrefix ? `${this.pathPrefix}/` : "";
    if (assetType) {
      return `${prefix}${guildId}/assets/${assetType}/`;
    }
    return `${prefix}${guildId}/assets/`;
  }

  /**
   * Extract asset info from a key path.
   */
  private extractAssetInfo(key: string): { assetType: AssetType; assetId: string } | null {
    const pattern = /assets\/(image|document|video|audio|other)\/([^/]+)$/;
    const match = key.match(pattern);
    if (!match || !match[1] || !match[2]) return null;
    return {
      assetType: match[1] as AssetType,
      assetId: match[2],
    };
  }

  /**
   * Validate content type for asset type.
   */
  private validateContentType(assetType: AssetType, contentType: string): boolean {
    const allowed = ALLOWED_CONTENT_TYPES[assetType];
    // "other" type allows any content type
    if (assetType === "other" || allowed.length === 0) {
      return true;
    }
    return allowed.includes(contentType.toLowerCase());
  }

  /**
   * Upload an asset.
   */
  async upload(input: UploadAssetInput): Promise<Result<UploadAssetResult, AssetStorageError>> {
    // Validate inputs
    if (!input.guildId || input.guildId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!input.assetId || input.assetId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "assetId cannot be empty"));
    }
    if (!input.contentType || input.contentType.trim().length === 0) {
      return err(createAssetError("INVALID_FILE_TYPE", "contentType cannot be empty"));
    }

    // Validate asset type
    const validAssetTypes: AssetType[] = ["image", "document", "video", "audio", "other"];
    if (!validAssetTypes.includes(input.assetType)) {
      return err(
        createAssetError(
          "INVALID_ASSET_TYPE",
          `Invalid asset type: ${input.assetType}. Must be one of: ${validAssetTypes.join(", ")}`,
        ),
      );
    }

    // Validate content type for asset type
    if (!this.validateContentType(input.assetType, input.contentType)) {
      return err(
        createAssetError(
          "INVALID_FILE_TYPE",
          `Content type ${input.contentType} is not allowed for asset type ${input.assetType}`,
        ),
      );
    }

    // Check file size for ArrayBuffer/Uint8Array (can't check streams)
    let size: number | undefined;
    if (input.data instanceof ArrayBuffer) {
      size = input.data.byteLength;
    } else if (input.data instanceof Uint8Array) {
      size = input.data.length;
    }

    if (size !== undefined && size > this.maxFileSizeBytes) {
      return err(
        createAssetError(
          "FILE_TOO_LARGE",
          `File size ${size} exceeds maximum allowed size of ${this.maxFileSizeBytes} bytes`,
        ),
      );
    }

    const key = this.buildAssetPath(input.guildId, input.assetType, input.assetId);
    const uploadedAt = new Date();

    // Build metadata
    const metadata: AssetMetadata = {
      guildId: input.guildId,
      assetId: input.assetId,
      assetType: input.assetType,
      contentType: input.contentType,
      uploadedAt,
      filename: input.filename,
      uploaderId: input.uploaderId,
    };

    // Validate metadata
    const validation = AssetMetadataSchema.safeParse(metadata);
    if (!validation.success) {
      return err(
        createAssetError("VALIDATION_ERROR", "Invalid asset metadata", validation.error),
      );
    }

    // Store in R2
    const putResult = await this.client.putRaw(key, input.data, {
      metadata: {
        contentType: input.contentType,
        customMetadata: {
          guildId: input.guildId,
          assetId: input.assetId,
          assetType: input.assetType,
          filename: input.filename ?? "",
          uploaderId: input.uploaderId ?? "",
          uploadedAt: uploadedAt.toISOString(),
        },
      },
    });

    if (!putResult.ok) {
      return err(wrapR2Error(putResult.error));
    }

    return ok({
      assetId: input.assetId,
      key,
      size: size ?? 0, // Size is 0 for streams
      contentType: input.contentType,
      assetType: input.assetType,
      uploadedAt,
    });
  }

  /**
   * Get asset metadata and stream.
   */
  async get(
    guildId: string,
    assetType: AssetType,
    assetId: string,
  ): Promise<Result<{ stream: ReadableStream<Uint8Array>; info: StoredAssetInfo } | null, AssetStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!assetId || assetId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "assetId cannot be empty"));
    }

    const key = this.buildAssetPath(guildId, assetType, assetId);
    const result = await this.client.getStream(key);

    if (!result.ok) {
      return err(wrapR2Error(result.error));
    }

    if (result.value === null) {
      return ok(null);
    }

    const info: StoredAssetInfo = {
      assetId,
      assetType,
      key: result.value.key,
      size: result.value.size,
      contentType: result.value.httpMetadata?.contentType ?? "application/octet-stream",
      uploadedAt: result.value.uploaded,
      etag: result.value.etag,
      filename: result.value.customMetadata?.filename,
      uploaderId: result.value.customMetadata?.uploaderId,
    };

    return ok({
      stream: result.value.body,
      info,
    });
  }

  /**
   * Get asset metadata without downloading the file.
   */
  async getInfo(
    guildId: string,
    assetType: AssetType,
    assetId: string,
  ): Promise<Result<StoredAssetInfo | null, AssetStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!assetId || assetId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "assetId cannot be empty"));
    }

    const key = this.buildAssetPath(guildId, assetType, assetId);
    const result = await this.client.head(key);

    if (!result.ok) {
      return err(wrapR2Error(result.error));
    }

    if (result.value === null) {
      return ok(null);
    }

    const info: StoredAssetInfo = {
      assetId,
      assetType,
      key: result.value.key,
      size: result.value.size,
      contentType: result.value.httpMetadata?.contentType ?? "application/octet-stream",
      uploadedAt: result.value.uploaded,
      etag: result.value.etag,
      filename: result.value.customMetadata?.filename,
      uploaderId: result.value.customMetadata?.uploaderId,
    };

    return ok(info);
  }

  /**
   * Delete an asset.
   */
  async delete(
    guildId: string,
    assetType: AssetType,
    assetId: string,
  ): Promise<Result<void, AssetStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!assetId || assetId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "assetId cannot be empty"));
    }

    const key = this.buildAssetPath(guildId, assetType, assetId);
    const result = await this.client.delete(key);

    if (!result.ok) {
      return err(wrapR2Error(result.error));
    }

    return ok(undefined);
  }

  /**
   * Check if an asset exists.
   */
  async exists(
    guildId: string,
    assetType: AssetType,
    assetId: string,
  ): Promise<Result<boolean, AssetStorageError>> {
    const key = this.buildAssetPath(guildId, assetType, assetId);
    const result = await this.client.exists(key);

    if (!result.ok) {
      return err(wrapR2Error(result.error));
    }

    return ok(result.value);
  }

  /**
   * List assets for a guild with optional type filter.
   */
  async list(
    guildId: string,
    options?: ListAssetsOptions,
  ): Promise<Result<ListAssetsResult, AssetStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "guildId cannot be empty"));
    }

    const prefix = this.buildAssetsPrefix(guildId, options?.assetType);
    const limit = options?.limit ?? 50;

    const listResult = await this.client.list({
      prefix,
      cursor: options?.cursor,
      limit: limit + 1, // Get one extra to check for more
    });

    if (!listResult.ok) {
      return err(wrapR2Error(listResult.error));
    }

    const assets: StoredAssetInfo[] = [];
    let hasMore = false;
    let cursor: string | undefined;

    for (const obj of listResult.value.objects) {
      if (assets.length >= limit) {
        hasMore = true;
        cursor = obj.key;
        break;
      }

      const assetInfo = this.extractAssetInfo(obj.key);
      if (assetInfo) {
        assets.push({
          assetId: assetInfo.assetId,
          assetType: assetInfo.assetType,
          key: obj.key,
          size: obj.size,
          contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
          uploadedAt: obj.uploaded,
          etag: obj.etag,
          filename: obj.customMetadata?.filename,
          uploaderId: obj.customMetadata?.uploaderId,
        });
      }
    }

    // If we got a truncated result and haven't filled assets yet
    if (!hasMore && listResult.value.truncated) {
      hasMore = true;
      cursor = listResult.value.cursor;
    }

    return ok({
      assets,
      cursor,
      hasMore,
    });
  }

  /**
   * Count assets for a guild with optional type filter.
   */
  async count(
    guildId: string,
    assetType?: AssetType,
  ): Promise<Result<number, AssetStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "guildId cannot be empty"));
    }

    const prefix = this.buildAssetsPrefix(guildId, assetType);
    const listResult = await this.client.listAll(prefix);

    if (!listResult.ok) {
      return err(wrapR2Error(listResult.error));
    }

    return ok(listResult.value.length);
  }

  /**
   * Delete all assets for a guild with optional type filter.
   */
  async deleteAll(
    guildId: string,
    assetType?: AssetType,
  ): Promise<Result<number, AssetStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createAssetError("INVALID_KEY", "guildId cannot be empty"));
    }

    const prefix = this.buildAssetsPrefix(guildId, assetType);
    const listResult = await this.client.listAll(prefix);

    if (!listResult.ok) {
      return err(wrapR2Error(listResult.error));
    }

    if (listResult.value.length === 0) {
      return ok(0);
    }

    const keys = listResult.value.map((obj) => obj.key);
    const deleteResult = await this.client.deleteMany(keys);

    if (!deleteResult.ok) {
      return err(wrapR2Error(deleteResult.error));
    }

    return ok(keys.length);
  }
}

/**
 * Create an Asset Storage Service instance.
 */
export function createAssetStorageService(
  client: R2Client,
  config?: AssetStorageConfig,
): AssetStorageService {
  return new AssetStorageService(client, config);
}
