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

// Placeholder types - to be implemented in Phase 1
export interface R2StorageClient {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

// Placeholder - to be implemented in PZ-300
export function createR2Client(_bucket: R2Bucket): R2StorageClient {
  throw new Error("Not implemented - see PZ-300");
}
