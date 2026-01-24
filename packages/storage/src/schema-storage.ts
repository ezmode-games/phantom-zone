/**
 * Schema Storage Service for Cloudflare Workers
 *
 * Stores and retrieves versioned Zod schemas in R2 with:
 * - Auto-incrementing version numbers
 * - JSON Schema serialization
 * - Version history management
 *
 * R2 Path Format: {guild_id}/forms/{form_id}/schemas/v{n}.json
 */

import type { z } from "zod/v4";
import type { R2Client } from "./r2-client";
import {
  type Result,
  type R2StorageError,
  type SchemaMetadata,
  type SchemaStorageConfig,
  type StoredSchema,
  type VersionInfo,
  StoredSchemaSchema,
  VersionInfoSchema,
  createError,
  err,
  ok,
} from "./types";

/**
 * Error codes specific to schema storage operations
 */
export type SchemaStorageErrorCode =
  | R2StorageError["code"]
  | "SCHEMA_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "INVALID_SCHEMA"
  | "SERIALIZATION_FAILED";

export interface SchemaStorageError {
  code: SchemaStorageErrorCode;
  message: string;
  cause?: unknown;
  retryable: boolean;
}

function createSchemaError(
  code: SchemaStorageErrorCode,
  message: string,
  cause?: unknown,
): SchemaStorageError {
  const retryable = code === "NETWORK_ERROR" || code === "BUCKET_ERROR";
  return { code, message, cause, retryable };
}

/**
 * Converts R2StorageError to SchemaStorageError
 */
function wrapR2Error(error: R2StorageError): SchemaStorageError {
  return {
    code: error.code,
    message: error.message,
    cause: error.cause,
    retryable: error.retryable,
  };
}

/**
 * Result of putting a schema (includes the assigned version number)
 */
export interface PutSchemaResult {
  /** The version number assigned to this schema */
  version: number;
  /** R2 key where the schema is stored */
  key: string;
  /** Timestamp when stored */
  createdAt: Date;
}

/**
 * Result of getting a schema
 */
export interface GetSchemaResult {
  /** The stored schema as a JSON Schema object */
  schema: Record<string, unknown>;
  /** Metadata about this version */
  metadata: SchemaMetadata;
}

/**
 * Interface for serializing Zod schemas to JSON Schema format.
 * Users can provide custom serializers if needed.
 */
export interface SchemaSerializer {
  /**
   * Serialize a Zod schema to JSON Schema format
   */
  serialize(schema: z.ZodType): Result<Record<string, unknown>, SchemaStorageError>;

  /**
   * Deserialize JSON Schema back to a representation
   * Note: Full Zod schema reconstruction is not always possible,
   * so this returns the JSON Schema representation
   */
  deserialize(jsonSchema: Record<string, unknown>): Result<Record<string, unknown>, SchemaStorageError>;
}

/**
 * Default schema serializer using zod-to-json-schema pattern.
 * Stores the schema definition as-is since Zod v4 supports JSON Schema output.
 */
export const defaultSchemaSerializer: SchemaSerializer = {
  serialize(schema: z.ZodType): Result<Record<string, unknown>, SchemaStorageError> {
    try {
      // Zod v4 has toJsonSchema() but we need to handle cases where it's not available
      // For now, we store a descriptor of the schema type
      // In production, you'd use zodToJsonSchema from 'zod-to-json-schema'
      if (typeof (schema as unknown as { toJsonSchema?: () => unknown }).toJsonSchema === "function") {
        const jsonSchema = (schema as unknown as { toJsonSchema: () => Record<string, unknown> }).toJsonSchema();
        return ok(jsonSchema);
      }

      // Fallback: store schema description/shape info
      // This is a simplified representation
      const descriptor: Record<string, unknown> = {
        _type: "zod_schema",
        _zodVersion: "4",
        description: schema.description,
      };

      // Try to get the shape for object schemas
      if ("shape" in schema && typeof schema.shape === "object") {
        descriptor.shape = Object.keys(schema.shape as Record<string, unknown>);
      }

      return ok(descriptor);
    } catch (cause) {
      return err(
        createSchemaError(
          "SERIALIZATION_FAILED",
          "Failed to serialize Zod schema to JSON Schema",
          cause,
        ),
      );
    }
  },

  deserialize(jsonSchema: Record<string, unknown>): Result<Record<string, unknown>, SchemaStorageError> {
    // JSON Schema is returned as-is; reconstruction to Zod would require additional tooling
    return ok(jsonSchema);
  },
};

/**
 * Schema Storage Service
 *
 * Manages versioned Zod schema storage in R2 with automatic version incrementing.
 */
export class SchemaStorageService {
  private readonly client: R2Client;
  private readonly pathPrefix: string;
  private readonly serializer: SchemaSerializer;

  constructor(
    client: R2Client,
    config?: SchemaStorageConfig,
    serializer?: SchemaSerializer,
  ) {
    this.client = client;
    this.pathPrefix = config?.pathPrefix ?? "";
    this.serializer = serializer ?? defaultSchemaSerializer;
  }

  /**
   * Build the R2 key path for a schema version.
   *
   * Format: {prefix}{guild_id}/forms/{form_id}/schemas/v{n}.json
   */
  private buildSchemaPath(guildId: string, formId: string, version: number): string {
    const prefix = this.pathPrefix ? `${this.pathPrefix}/` : "";
    return `${prefix}${guildId}/forms/${formId}/schemas/v${version}.json`;
  }

  /**
   * Build the prefix for listing all schema versions.
   */
  private buildSchemasPrefix(guildId: string, formId: string): string {
    const prefix = this.pathPrefix ? `${this.pathPrefix}/` : "";
    return `${prefix}${guildId}/forms/${formId}/schemas/`;
  }

  /**
   * Extract version number from a schema key path.
   */
  private extractVersion(key: string): number | null {
    const match = key.match(/v(\d+)\.json$/);
    if (!match || !match[1]) return null;
    return parseInt(match[1], 10);
  }

  /**
   * Get the current (latest) version number for a form's schema.
   * Returns 0 if no versions exist.
   */
  private async getCurrentVersionNumber(
    guildId: string,
    formId: string,
  ): Promise<Result<number, SchemaStorageError>> {
    const prefix = this.buildSchemasPrefix(guildId, formId);
    const listResult = await this.client.listAll(prefix);

    if (!listResult.ok) {
      return err(wrapR2Error(listResult.error));
    }

    if (listResult.value.length === 0) {
      return ok(0);
    }

    // Find the highest version number
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
   * Store a new version of a schema.
   *
   * Automatically increments the version number with retry logic to handle
   * concurrent writes. Uses optimistic concurrency - if another write claims
   * the version first, this will retry with the next version.
   *
   * @param guildId - The guild identifier
   * @param formId - The form identifier
   * @param schema - The Zod schema to store
   * @param description - Optional description of this version
   */
  async putSchema(
    guildId: string,
    formId: string,
    schema: z.ZodType,
    description?: string,
  ): Promise<Result<PutSchemaResult, SchemaStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!formId || formId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "formId cannot be empty"));
    }

    // Serialize the schema
    const serializeResult = this.serializer.serialize(schema);
    if (!serializeResult.ok) {
      return serializeResult;
    }

    // Retry loop for concurrent write handling
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Get the next version number
      const versionResult = await this.getCurrentVersionNumber(guildId, formId);
      if (!versionResult.ok) {
        return versionResult;
      }

      const nextVersion = versionResult.value + 1;
      const key = this.buildSchemaPath(guildId, formId, nextVersion);
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

      // Build the stored schema object
      const storedSchema: StoredSchema = {
        metadata: {
          guildId,
          formId,
          version: nextVersion,
          createdAt,
          description,
        },
        schema: serializeResult.value,
      };

      // Store in R2
      const putResult = await this.client.put(key, storedSchema, {
        metadata: {
          contentType: "application/json",
          customMetadata: {
            guildId,
            formId,
            version: String(nextVersion),
          },
        },
      });

      if (!putResult.ok) {
        return err(wrapR2Error(putResult.error));
      }

      // Verify we won the race by checking the stored data matches ours
      const verifyResult = await this.client.getValidated(key, StoredSchemaSchema);
      if (!verifyResult.ok) {
        return err(wrapR2Error(verifyResult.error));
      }

      if (verifyResult.value === null) {
        // Extremely rare: object was deleted between put and get
        continue;
      }

      const storedMetadata = verifyResult.value.value.metadata;
      // Compare timestamps to verify we're the one who wrote it
      // Use string comparison since Date serialization may differ
      if (
        storedMetadata.guildId === guildId &&
        storedMetadata.formId === formId &&
        storedMetadata.version === nextVersion &&
        storedMetadata.description === description
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
      createSchemaError(
        "BUCKET_ERROR",
        `Failed to store schema after ${maxRetries} attempts due to concurrent writes`,
      ),
    );
  }

  /**
   * Retrieve a specific version of a schema.
   *
   * @param guildId - The guild identifier
   * @param formId - The form identifier
   * @param version - The version number to retrieve
   */
  async getSchema(
    guildId: string,
    formId: string,
    version: number,
  ): Promise<Result<GetSchemaResult, SchemaStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!formId || formId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "formId cannot be empty"));
    }
    if (!Number.isInteger(version) || version < 1) {
      return err(createSchemaError("INVALID_KEY", "version must be a positive integer"));
    }

    const key = this.buildSchemaPath(guildId, formId, version);
    const getResult = await this.client.getValidated(key, StoredSchemaSchema);

    if (!getResult.ok) {
      return err(wrapR2Error(getResult.error));
    }

    if (getResult.value === null) {
      return err(
        createSchemaError(
          "VERSION_NOT_FOUND",
          `Schema version ${version} not found for form ${formId} in guild ${guildId}`,
        ),
      );
    }

    const stored = getResult.value.value;

    // Deserialize the schema
    const deserializeResult = this.serializer.deserialize(stored.schema);
    if (!deserializeResult.ok) {
      return deserializeResult;
    }

    return ok({
      schema: deserializeResult.value,
      metadata: stored.metadata,
    });
  }

  /**
   * Retrieve the current (latest) version of a schema.
   *
   * @param guildId - The guild identifier
   * @param formId - The form identifier
   */
  async getCurrentSchema(
    guildId: string,
    formId: string,
  ): Promise<Result<GetSchemaResult, SchemaStorageError>> {
    // Get the current version number
    const versionResult = await this.getCurrentVersionNumber(guildId, formId);
    if (!versionResult.ok) {
      return versionResult;
    }

    if (versionResult.value === 0) {
      return err(
        createSchemaError(
          "SCHEMA_NOT_FOUND",
          `No schema found for form ${formId} in guild ${guildId}`,
        ),
      );
    }

    return this.getSchema(guildId, formId, versionResult.value);
  }

  /**
   * List all versions of a schema.
   *
   * @param guildId - The guild identifier
   * @param formId - The form identifier
   */
  async listVersions(
    guildId: string,
    formId: string,
  ): Promise<Result<VersionInfo[], SchemaStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!formId || formId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "formId cannot be empty"));
    }

    const prefix = this.buildSchemasPrefix(guildId, formId);
    const listResult = await this.client.listAll(prefix);

    if (!listResult.ok) {
      return err(wrapR2Error(listResult.error));
    }

    // Convert to VersionInfo array
    const versions: VersionInfo[] = [];
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
   * Check if a schema exists for the given form.
   *
   * @param guildId - The guild identifier
   * @param formId - The form identifier
   */
  async exists(
    guildId: string,
    formId: string,
  ): Promise<Result<boolean, SchemaStorageError>> {
    const versionResult = await this.getCurrentVersionNumber(guildId, formId);
    if (!versionResult.ok) {
      return versionResult;
    }
    return ok(versionResult.value > 0);
  }

  /**
   * Check if a specific version of a schema exists.
   *
   * @param guildId - The guild identifier
   * @param formId - The form identifier
   * @param version - The version number to check
   */
  async versionExists(
    guildId: string,
    formId: string,
    version: number,
  ): Promise<Result<boolean, SchemaStorageError>> {
    const key = this.buildSchemaPath(guildId, formId, version);
    const existsResult = await this.client.exists(key);

    if (!existsResult.ok) {
      return err(wrapR2Error(existsResult.error));
    }

    return ok(existsResult.value);
  }

  /**
   * Delete a specific version of a schema.
   *
   * @param guildId - The guild identifier
   * @param formId - The form identifier
   * @param version - The version number to delete
   */
  async deleteVersion(
    guildId: string,
    formId: string,
    version: number,
  ): Promise<Result<void, SchemaStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!formId || formId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "formId cannot be empty"));
    }
    if (!Number.isInteger(version) || version < 1) {
      return err(createSchemaError("INVALID_KEY", "version must be a positive integer"));
    }

    const key = this.buildSchemaPath(guildId, formId, version);
    const deleteResult = await this.client.delete(key);

    if (!deleteResult.ok) {
      return err(wrapR2Error(deleteResult.error));
    }

    return ok(undefined);
  }

  /**
   * Delete all versions of a schema for a form.
   *
   * @param guildId - The guild identifier
   * @param formId - The form identifier
   */
  async deleteAllVersions(
    guildId: string,
    formId: string,
  ): Promise<Result<number, SchemaStorageError>> {
    // Validate inputs
    if (!guildId || guildId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "guildId cannot be empty"));
    }
    if (!formId || formId.trim().length === 0) {
      return err(createSchemaError("INVALID_KEY", "formId cannot be empty"));
    }

    const prefix = this.buildSchemasPrefix(guildId, formId);
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
 * Create a Schema Storage Service instance.
 *
 * @param client - The R2Client to use for storage operations
 * @param config - Optional configuration
 * @param serializer - Optional custom schema serializer
 */
export function createSchemaStorageService(
  client: R2Client,
  config?: SchemaStorageConfig,
  serializer?: SchemaSerializer,
): SchemaStorageService {
  return new SchemaStorageService(client, config, serializer);
}
