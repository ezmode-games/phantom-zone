/**
 * Content Storage Service for Cloudflare Workers
 *
 * Stores and retrieves versioned MDX content in R2 with:
 * - Auto-incrementing version numbers per page
 * - Content metadata (title, description, etc.)
 * - Version history management
 * - Page listing per guild
 *
 * R2 Path Format: {guild_id}/pages/{page_id}/content/v{n}.mdx
 */

import type { R2Client } from "./r2-client";
import {
  type ContentMetadata,
  type ContentStorageConfig,
  type ContentVersionInfo,
  type Result,
  type R2StorageError,
  type StoredContent,
  ContentMetadataSchema,
  StoredContentSchema,
  createError,
  err,
  ok,
} from "./types";

/**
 * Error codes specific to content storage operations
 */
export type ContentStorageErrorCode =
  | R2StorageError["code"]
  | "CONTENT_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "PAGE_NOT_FOUND"
  | "INVALID_CONTENT";

export interface ContentStorageError {
  code: ContentStorageErrorCode;
  message: string;
  cause?: unknown;
  retryable: boolean;
}

function createContentError(
  code: ContentStorageErrorCode,
  message: string,
  cause?: unknown,
): ContentStorageError {
  const retryable = code === "NETWORK_ERROR" || code === "BUCKET_ERROR";
  return { code, message, cause, retryable };
}

function wrapR2Error(error: R2StorageError): ContentStorageError {
  return {
    code: error.code,
    message: error.message,
    cause: error.cause,
    retryable: error.retryable,
  };
}

/**
 * Result of storing content (includes assigned version)
 */
export interface PutContentResult {
  /** The version number assigned */
  version: number;
  /** R2 key where content is stored */
  key: string;
  /** Timestamp when stored */
  createdAt: Date;
}

/**
 * Result of getting content
 */
export interface GetContentResult {
  /** The MDX content */
  content: string;
  /** Metadata about this version */
  metadata: ContentMetadata;
}

/**
 * Input for storing new content
 */
export interface PutContentInput {
  /** The guild ID */
  guildId: string;
  /** The page ID */
  pageId: string;
  /** The MDX content */
  content: string;
  /** Optional title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Optional author ID */
  authorId?: string;
}

/**
 * Page info for listing
 */
export interface PageInfo {
  /** The page ID */
  pageId: string;
  /** Current version number */
  currentVersion: number;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Content Storage Service
 *
 * Manages versioned MDX content storage in R2.
 */
export class ContentStorageService {
  private readonly client: R2Client;
  private readonly pathPrefix: string;

  constructor(client: R2Client, config?: ContentStorageConfig) {
    this.client = client;
    this.pathPrefix = config?.pathPrefix ?? "";
  }

  /**
   * Build the R2 key path for a content version.
   */
  private buildContentPath(guildId: string, pageId: string, version: number): string {
    const prefix = this.pathPrefix ? `${this.pathPrefix}/` : "";
    return `${prefix}${guildId}/pages/${pageId}/content/v${version}.json`;
  }

  /**
   * Build the prefix for listing all content versions of a page.
   */
  private buildContentPrefix(guildId: string, pageId: string): string {
    const prefix = this.pathPrefix ? `${this.pathPrefix}/` : "";
    return `${prefix}${guildId}/pages/${pageId}/content/`;
  }

  /**
   * Build the prefix for listing all pages of a guild.
   */
  private buildPagesPrefix(guildId: string): string {
    const prefix = this.pathPrefix ? `${this.pathPrefix}/` : "";
    return `${prefix}${guildId}/pages/`;
  }

  /**
   * Extract version number from a content key path.
   */
  private extractVersion(key: string): number | null {
    const match = key.match(/v(\d+)\.json$/);
    if (!match || !match[1]) return null;
    return parseInt(match[1], 10);
  }

  /**
   * Extract page ID from a key path.
   */
  private extractPageId(key: string): string | null {
    const match = key.match(/pages\/([^/]+)\/content\//);
    if (!match || !match[1]) return null;
    return match[1];
  }

  /**
   * Get the current (latest) version number for a page's content.
   * Returns 0 if no versions exist.
   */
  private async getCurrentVersionNumber(
    guildId: string,
    pageId: string,
  ): Promise<Result<number, ContentStorageError>> {
    const prefix = this.buildContentPrefix(guildId, pageId);
    const listResult = await this.client.listAll(prefix);

    if (!listResult.ok) {
      return err(wrapR2Error(listResult.error));
    }

    if (listResult.value.length === 0) {
      return ok(0);
    }

    let maxVersion = 0;
    for (const obj of listResult.value) {
      const version = this.extractVersion(obj.key);
      if (version !== null && version > maxVersion) {
        maxVersion = version;
      }
    }

    return ok(maxVersion);
  }

  /**
   * Store a new version of content.
   *
   * Automatically increments the version number with retry logic to handle
   * concurrent writes. Uses optimistic concurrency - if another write claims
   * the version first, this will retry with the next version.
   */
  async putContent(
    input: PutContentInput,
  ): Promise<Result<PutContentResult, ContentStorageError>> {
    // Validate inputs
    if (!input.guildId || input.guildId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!input.pageId || input.pageId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "pageId cannot be empty"));
    }
    if (input.content === undefined || input.content === null) {
      return err(createContentError("INVALID_CONTENT", "content cannot be null or undefined"));
    }

    // Retry loop for concurrent write handling
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Get the next version number
      const versionResult = await this.getCurrentVersionNumber(input.guildId, input.pageId);
      if (!versionResult.ok) {
        return versionResult;
      }

      const nextVersion = versionResult.value + 1;
      const key = this.buildContentPath(input.guildId, input.pageId, nextVersion);
      const createdAt = new Date();

      // Check if version already exists (someone else claimed it)
      const existsResult = await this.client.exists(key);
      if (!existsResult.ok) {
        return err(wrapR2Error(existsResult.error));
      }
      if (existsResult.value) {
        // Version was claimed by another writer, retry with next version
        continue;
      }

      // Build the stored content object
      const storedContent: StoredContent = {
        metadata: {
          guildId: input.guildId,
          pageId: input.pageId,
          version: nextVersion,
          createdAt,
          title: input.title,
          description: input.description,
          authorId: input.authorId,
        },
        content: input.content,
      };

      // Validate
      const validation = StoredContentSchema.safeParse(storedContent);
      if (!validation.success) {
        return err(
          createContentError("INVALID_CONTENT", "Invalid content data", validation.error),
        );
      }

      // Store in R2
      const putResult = await this.client.put(key, storedContent, {
        metadata: {
          contentType: "application/json",
          customMetadata: {
            guildId: input.guildId,
            pageId: input.pageId,
            version: String(nextVersion),
          },
        },
      });

      if (!putResult.ok) {
        return err(wrapR2Error(putResult.error));
      }

      // Verify we won the race by checking the stored data matches ours
      const verifyResult = await this.client.getValidated(key, StoredContentSchema);
      if (!verifyResult.ok) {
        return err(wrapR2Error(verifyResult.error));
      }

      if (verifyResult.value === null) {
        // Extremely rare: object was deleted between put and get
        continue;
      }

      const storedMetadata = verifyResult.value.value.metadata;
      // Compare to verify we're the one who wrote it
      if (
        storedMetadata.guildId === input.guildId &&
        storedMetadata.pageId === input.pageId &&
        storedMetadata.version === nextVersion &&
        storedMetadata.title === input.title &&
        storedMetadata.description === input.description
      ) {
        // Success - we wrote this version
        return ok({
          version: nextVersion,
          key,
          createdAt,
        });
      }

      // Another writer got there first with different data, retry
    }

    return err(
      createContentError(
        "BUCKET_ERROR",
        `Failed to store content after ${maxRetries} attempts due to concurrent writes`,
      ),
    );
  }

  /**
   * Retrieve a specific version of content.
   */
  async getContent(
    guildId: string,
    pageId: string,
    version: number,
  ): Promise<Result<GetContentResult, ContentStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!pageId || pageId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "pageId cannot be empty"));
    }
    if (!Number.isInteger(version) || version < 1) {
      return err(createContentError("INVALID_KEY", "version must be a positive integer"));
    }

    const key = this.buildContentPath(guildId, pageId, version);
    const getResult = await this.client.getValidated(key, StoredContentSchema);

    if (!getResult.ok) {
      return err(wrapR2Error(getResult.error));
    }

    if (getResult.value === null) {
      return err(
        createContentError(
          "VERSION_NOT_FOUND",
          `Content version ${version} not found for page ${pageId} in guild ${guildId}`,
        ),
      );
    }

    const stored = getResult.value.value;

    return ok({
      content: stored.content,
      metadata: stored.metadata,
    });
  }

  /**
   * Retrieve the current (latest) version of content.
   */
  async getCurrentContent(
    guildId: string,
    pageId: string,
  ): Promise<Result<GetContentResult, ContentStorageError>> {
    const versionResult = await this.getCurrentVersionNumber(guildId, pageId);
    if (!versionResult.ok) {
      return versionResult;
    }

    if (versionResult.value === 0) {
      return err(
        createContentError(
          "CONTENT_NOT_FOUND",
          `No content found for page ${pageId} in guild ${guildId}`,
        ),
      );
    }

    return this.getContent(guildId, pageId, versionResult.value);
  }

  /**
   * List all versions of content for a page.
   */
  async listVersions(
    guildId: string,
    pageId: string,
  ): Promise<Result<ContentVersionInfo[], ContentStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!pageId || pageId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "pageId cannot be empty"));
    }

    const prefix = this.buildContentPrefix(guildId, pageId);
    const listResult = await this.client.listAll(prefix);

    if (!listResult.ok) {
      return err(wrapR2Error(listResult.error));
    }

    const versions: ContentVersionInfo[] = [];
    for (const obj of listResult.value) {
      const version = this.extractVersion(obj.key);
      if (version !== null) {
        versions.push({
          version,
          createdAt: obj.uploaded,
          size: obj.size,
          etag: obj.etag,
        });
      }
    }

    // Sort by version number (ascending)
    versions.sort((a, b) => a.version - b.version);

    return ok(versions);
  }

  /**
   * List all pages for a guild.
   */
  async listPages(guildId: string): Promise<Result<PageInfo[], ContentStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "guildId cannot be empty"));
    }

    const prefix = this.buildPagesPrefix(guildId);
    const listResult = await this.client.listAll(prefix);

    if (!listResult.ok) {
      return err(wrapR2Error(listResult.error));
    }

    // Group by page ID and find the max version for each
    const pageMap = new Map<string, { maxVersion: number; updatedAt: Date }>();

    for (const obj of listResult.value) {
      const pageId = this.extractPageId(obj.key);
      const version = this.extractVersion(obj.key);

      if (pageId !== null && version !== null) {
        const existing = pageMap.get(pageId);
        if (!existing || version > existing.maxVersion) {
          pageMap.set(pageId, { maxVersion: version, updatedAt: obj.uploaded });
        }
      }
    }

    const pages: PageInfo[] = Array.from(pageMap.entries()).map(([pageId, info]) => ({
      pageId,
      currentVersion: info.maxVersion,
      updatedAt: info.updatedAt,
    }));

    // Sort by page ID
    pages.sort((a, b) => a.pageId.localeCompare(b.pageId));

    return ok(pages);
  }

  /**
   * Check if content exists for a page.
   */
  async exists(
    guildId: string,
    pageId: string,
  ): Promise<Result<boolean, ContentStorageError>> {
    const versionResult = await this.getCurrentVersionNumber(guildId, pageId);
    if (!versionResult.ok) {
      return versionResult;
    }
    return ok(versionResult.value > 0);
  }

  /**
   * Check if a specific version exists.
   */
  async versionExists(
    guildId: string,
    pageId: string,
    version: number,
  ): Promise<Result<boolean, ContentStorageError>> {
    const key = this.buildContentPath(guildId, pageId, version);
    const existsResult = await this.client.exists(key);

    if (!existsResult.ok) {
      return err(wrapR2Error(existsResult.error));
    }

    return ok(existsResult.value);
  }

  /**
   * Delete a specific version of content.
   */
  async deleteVersion(
    guildId: string,
    pageId: string,
    version: number,
  ): Promise<Result<void, ContentStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!pageId || pageId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "pageId cannot be empty"));
    }
    if (!Number.isInteger(version) || version < 1) {
      return err(createContentError("INVALID_KEY", "version must be a positive integer"));
    }

    const key = this.buildContentPath(guildId, pageId, version);
    const deleteResult = await this.client.delete(key);

    if (!deleteResult.ok) {
      return err(wrapR2Error(deleteResult.error));
    }

    return ok(undefined);
  }

  /**
   * Delete all versions of content for a page.
   */
  async deleteAllVersions(
    guildId: string,
    pageId: string,
  ): Promise<Result<number, ContentStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!pageId || pageId.trim().length === 0) {
      return err(createContentError("INVALID_KEY", "pageId cannot be empty"));
    }

    const prefix = this.buildContentPrefix(guildId, pageId);
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
 * Create a Content Storage Service instance.
 */
export function createContentStorageService(
  client: R2Client,
  config?: ContentStorageConfig,
): ContentStorageService {
  return new ContentStorageService(client, config);
}
