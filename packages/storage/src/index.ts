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

// Schema Storage Service (PZ-301)
export {
  SchemaStorageService,
  createSchemaStorageService,
  defaultSchemaSerializer,
  type SchemaSerializer,
  type SchemaStorageError,
  type SchemaStorageErrorCode,
  type PutSchemaResult,
  type GetSchemaResult,
} from "./schema-storage";

// Content Storage Service (PZ-302)
export {
  ContentStorageService,
  createContentStorageService,
  type ContentStorageError,
  type ContentStorageErrorCode,
  type PutContentResult,
  type GetContentResult,
  type PutContentInput,
  type PageInfo,
} from "./content-storage";

// Response Storage Service (PZ-303)
export {
  ResponseStorageService,
  createResponseStorageService,
  type CreateResponseInput,
  type UpdateStatusInput,
} from "./response-storage";

// Asset Storage Service (PZ-304)
export {
  AssetStorageService,
  createAssetStorageService,
  type AssetStorageError,
  type AssetStorageErrorCode,
  type UploadAssetResult,
  type UploadAssetInput,
  type ListAssetsOptions,
  type ListAssetsResult,
} from "./asset-storage";

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
  // Schema Storage Types (PZ-301)
  SchemaMetadata,
  StoredSchema,
  VersionInfo,
  SchemaStorageConfig,
  // Content Storage Types (PZ-302)
  ContentMetadata,
  StoredContent,
  ContentVersionInfo,
  ContentStorageConfig,
  // Response Storage Types (PZ-303)
  FormResponse,
  ResponseStatus,
  ResponseListOptions,
  ResponseListResult,
  ResponseStorageConfig,
  // Asset Storage Types (PZ-304)
  AssetType,
  AssetMetadata,
  StoredAssetInfo,
  AssetStorageConfig,
} from "./types";

// Type utilities and schemas
export {
  ok,
  err,
  createError,
  DEFAULT_RETRY_CONFIG,
  StorageMetadataSchema,
  // Schema Storage Schemas
  VersionInfoSchema,
  SchemaMetadataSchema,
  StoredSchemaSchema,
  // Content Storage Schemas
  ContentVersionInfoSchema,
  ContentMetadataSchema,
  StoredContentSchema,
  // Response Storage Schemas
  ResponseStatusSchema,
  FormResponseSchema,
  // Asset Storage Schemas
  AssetTypeSchema,
  AssetMetadataSchema,
  StoredAssetInfoSchema,
} from "./types";
