/**
 * Response Storage Service for Cloudflare Workers
 *
 * Provides typed operations for storing and retrieving form responses:
 * - Store response with schema version reference
 * - Get response by ID
 * - List responses with pagination
 * - Filter by status
 * - Update response status (pending/accepted/rejected)
 *
 * R2 Key Structure: {guild_id}/forms/{form_id}/responses/{response_id}.json
 */

import type { R2Client } from "./r2-client";
import {
  type FormResponse,
  FormResponseSchema,
  type R2StorageError,
  type ResponseListOptions,
  type ResponseListResult,
  type ResponseStatus,
  type ResponseStorageConfig,
  type Result,
  createError,
  err,
  ok,
} from "./types";

/**
 * Input for creating a new response
 */
export interface CreateResponseInput {
  /** Unique response ID */
  id: string;
  /** The form this response belongs to */
  formId: string;
  /** The guild this response belongs to */
  guildId: string;
  /** Schema version the response was created against */
  schemaVersion: number;
  /** The response data */
  data: Record<string, unknown>;
  /** Optional submitter identifier */
  submitterId?: string;
}

/**
 * Input for updating response status
 */
export interface UpdateStatusInput {
  /** The guild ID */
  guildId: string;
  /** The form ID */
  formId: string;
  /** The response ID */
  responseId: string;
  /** New status */
  status: ResponseStatus;
  /** Optional reviewer identifier */
  reviewerId?: string;
  /** Optional review notes */
  reviewNotes?: string;
}

/**
 * Response Storage Service
 *
 * Wraps R2Client to provide typed operations for form responses.
 */
export class ResponseStorageService {
  private readonly client: R2Client;
  private readonly pathPrefix: string;

  constructor(client: R2Client, config?: ResponseStorageConfig) {
    this.client = client;
    this.pathPrefix = config?.pathPrefix ?? "";
  }

  /**
   * Build the R2 key for a response.
   *
   * Key structure: {prefix}{guild_id}/forms/{form_id}/responses/{response_id}.json
   */
  private buildKey(guildId: string, formId: string, responseId: string): string {
    const base = `${guildId}/forms/${formId}/responses/${responseId}.json`;
    return this.pathPrefix ? `${this.pathPrefix}/${base}` : base;
  }

  /**
   * Build the prefix for listing responses.
   */
  private buildListPrefix(guildId: string, formId: string): string {
    const base = `${guildId}/forms/${formId}/responses/`;
    return this.pathPrefix ? `${this.pathPrefix}/${base}` : base;
  }

  /**
   * Store a new response.
   *
   * @param input - The response creation input
   */
  async create(input: CreateResponseInput): Promise<Result<FormResponse>> {
    // Validate required fields
    if (!input.id || input.id.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Response ID is required"));
    }
    if (!input.formId || input.formId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Form ID is required"));
    }
    if (!input.guildId || input.guildId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Guild ID is required"));
    }
    if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1) {
      return err(createError("VALIDATION_ERROR", "Schema version must be a positive integer"));
    }

    const key = this.buildKey(input.guildId, input.formId, input.id);
    const now = new Date();

    const response: FormResponse = {
      id: input.id,
      formId: input.formId,
      guildId: input.guildId,
      schemaVersion: input.schemaVersion,
      data: input.data,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      submitterId: input.submitterId,
    };

    // Validate the response object
    const validation = FormResponseSchema.safeParse(response);
    if (!validation.success) {
      return err(
        createError("VALIDATION_ERROR", "Invalid response data", validation.error),
      );
    }

    // Store with status in custom metadata for filtering
    const putResult = await this.client.put(key, response, {
      metadata: {
        contentType: "application/json",
        customMetadata: {
          status: response.status,
          formId: response.formId,
          guildId: response.guildId,
          schemaVersion: String(response.schemaVersion),
        },
      },
    });

    if (!putResult.ok) {
      return putResult;
    }

    return ok(response);
  }

  /**
   * Get a response by ID.
   *
   * @param guildId - The guild ID
   * @param formId - The form ID
   * @param responseId - The response ID
   */
  async get(
    guildId: string,
    formId: string,
    responseId: string,
  ): Promise<Result<FormResponse | null>> {
    // Validate required parameters
    if (!guildId || guildId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Guild ID is required"));
    }
    if (!formId || formId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Form ID is required"));
    }
    if (!responseId || responseId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Response ID is required"));
    }

    const key = this.buildKey(guildId, formId, responseId);

    const result = await this.client.getValidated(key, FormResponseSchema);
    if (!result.ok) {
      return result;
    }

    if (result.value === null) {
      return ok(null);
    }

    return ok(result.value.value);
  }

  /**
   * List responses for a form with pagination and optional status filter.
   *
   * Note: R2 doesn't support efficient filtering by custom metadata during list operations.
   * For production systems with many responses, consider using a separate index in D1.
   *
   * Uses key-based pagination with startAfter for consistent cursor behavior.
   *
   * @param guildId - The guild ID
   * @param formId - The form ID
   * @param options - List options including pagination and filters
   */
  async list(
    guildId: string,
    formId: string,
    options?: ResponseListOptions,
  ): Promise<Result<ResponseListResult>> {
    // Validate required parameters
    if (!guildId || guildId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Guild ID is required"));
    }
    if (!formId || formId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Form ID is required"));
    }

    const prefix = this.buildListPrefix(guildId, formId);
    const limit = options?.limit ?? 50;

    // List objects from R2 using startAfter for key-based pagination
    const listResult = await this.client.list({
      prefix,
      startAfter: options?.cursor,
      // Request more than needed if filtering, to account for filtered items
      limit: options?.status ? limit * 3 : limit + 1,
    });

    if (!listResult.ok) {
      return listResult;
    }

    // Fetch and filter responses
    const items: FormResponse[] = [];
    let hasMore = false;
    let nextCursor: string | undefined;
    let lastProcessedKey: string | undefined;

    for (const obj of listResult.value.objects) {
      lastProcessedKey = obj.key;

      // If filtering by status, check metadata first
      if (options?.status) {
        const metadata = obj.customMetadata;
        if (metadata?.status !== options.status) {
          continue;
        }
      }

      // We have enough items - use the current key as cursor for next page
      if (items.length >= limit) {
        hasMore = true;
        // Use the last successfully added item's key as cursor
        const lastItem = items[items.length - 1];
        nextCursor = lastItem
          ? this.buildKey(guildId, formId, lastItem.id)
          : lastProcessedKey;
        break;
      }

      // Fetch the full response
      const getResult = await this.client.getValidated(obj.key, FormResponseSchema);
      if (getResult.ok && getResult.value !== null) {
        // Double-check status filter (in case metadata was stale)
        if (!options?.status || getResult.value.value.status === options.status) {
          items.push(getResult.value.value);
        }
      }
    }

    // If we got a truncated result and haven't filled items yet, there might be more
    if (!hasMore && listResult.value.truncated && lastProcessedKey) {
      hasMore = true;
      nextCursor = lastProcessedKey;
    }

    return ok({
      items,
      cursor: nextCursor,
      hasMore,
    });
  }

  /**
   * Update the status of a response.
   *
   * @param input - The status update input
   */
  async updateStatus(input: UpdateStatusInput): Promise<Result<FormResponse>> {
    // Get the existing response
    const getResult = await this.get(input.guildId, input.formId, input.responseId);
    if (!getResult.ok) {
      return getResult;
    }

    if (getResult.value === null) {
      return err(
        createError(
          "NOT_FOUND",
          `Response not found: ${input.guildId}/${input.formId}/${input.responseId}`,
        ),
      );
    }

    const existingResponse = getResult.value;

    // Create updated response
    const updatedResponse: FormResponse = {
      ...existingResponse,
      status: input.status,
      updatedAt: new Date(),
      reviewerId: input.reviewerId ?? existingResponse.reviewerId,
      reviewNotes: input.reviewNotes ?? existingResponse.reviewNotes,
    };

    // Validate the updated response
    const validation = FormResponseSchema.safeParse(updatedResponse);
    if (!validation.success) {
      return err(
        createError("VALIDATION_ERROR", "Invalid response data", validation.error),
      );
    }

    // Store with updated metadata
    const key = this.buildKey(input.guildId, input.formId, input.responseId);
    const putResult = await this.client.put(key, updatedResponse, {
      metadata: {
        contentType: "application/json",
        customMetadata: {
          status: updatedResponse.status,
          formId: updatedResponse.formId,
          guildId: updatedResponse.guildId,
          schemaVersion: String(updatedResponse.schemaVersion),
        },
      },
    });

    if (!putResult.ok) {
      return putResult;
    }

    return ok(updatedResponse);
  }

  /**
   * Delete a response.
   *
   * @param guildId - The guild ID
   * @param formId - The form ID
   * @param responseId - The response ID
   */
  async delete(
    guildId: string,
    formId: string,
    responseId: string,
  ): Promise<Result<void>> {
    // Validate required parameters
    if (!guildId || guildId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Guild ID is required"));
    }
    if (!formId || formId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Form ID is required"));
    }
    if (!responseId || responseId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Response ID is required"));
    }

    const key = this.buildKey(guildId, formId, responseId);
    return this.client.delete(key);
  }

  /**
   * Check if a response exists.
   *
   * @param guildId - The guild ID
   * @param formId - The form ID
   * @param responseId - The response ID
   */
  async exists(
    guildId: string,
    formId: string,
    responseId: string,
  ): Promise<Result<boolean>> {
    // Validate required parameters
    if (!guildId || guildId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Guild ID is required"));
    }
    if (!formId || formId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Form ID is required"));
    }
    if (!responseId || responseId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Response ID is required"));
    }

    const key = this.buildKey(guildId, formId, responseId);
    return this.client.exists(key);
  }

  /**
   * Count responses for a form with optional status filter.
   *
   * Note: This requires listing all objects and may be slow for large datasets.
   * For production, consider maintaining counts in D1.
   *
   * @param guildId - The guild ID
   * @param formId - The form ID
   * @param status - Optional status filter
   */
  async count(
    guildId: string,
    formId: string,
    status?: ResponseStatus,
  ): Promise<Result<number>> {
    // Validate required parameters
    if (!guildId || guildId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Guild ID is required"));
    }
    if (!formId || formId.trim() === "") {
      return err(createError("VALIDATION_ERROR", "Form ID is required"));
    }

    const prefix = this.buildListPrefix(guildId, formId);

    const listResult = await this.client.listAll(prefix);
    if (!listResult.ok) {
      return listResult;
    }

    if (!status) {
      return ok(listResult.value.length);
    }

    // Filter by status using metadata
    const filtered = listResult.value.filter(
      (obj) => obj.customMetadata?.status === status,
    );

    return ok(filtered.length);
  }
}

/**
 * Create a Response Storage Service.
 *
 * @param client - The R2 client to use for storage
 * @param config - Optional service configuration
 */
export function createResponseStorageService(
  client: R2Client,
  config?: ResponseStorageConfig,
): ResponseStorageService {
  return new ResponseStorageService(client, config);
}
