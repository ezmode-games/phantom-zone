import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod/v4";
import { R2Client, createR2Client } from "../src/r2-client";
import type { R2StorageError } from "../src/types";

// Mock R2 types for testing
interface MockR2Object {
  key: string;
  etag: string;
  size: number;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

interface MockR2ObjectBody extends MockR2Object {
  body: ReadableStream<Uint8Array>;
  text: () => Promise<string>;
  json: <T>() => Promise<T>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

function createMockObject(
  key: string,
  value: unknown,
  options?: {
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
  },
): MockR2ObjectBody {
  const text = JSON.stringify(value);
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  return {
    key,
    etag: `"${Math.random().toString(36).slice(2)}"`,
    size: data.length,
    uploaded: new Date(),
    httpMetadata: options?.httpMetadata,
    customMetadata: options?.customMetadata,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    }),
    text: async () => text,
    json: async <T>() => JSON.parse(text) as T,
    arrayBuffer: async () => data.buffer,
  };
}

function createMockBucket() {
  const storage = new Map<string, MockR2ObjectBody>();

  const bucket: R2Bucket = {
    put: vi.fn(async (key: string, value: unknown, options?: R2PutOptions) => {
      const text =
        typeof value === "string"
          ? value
          : value instanceof ArrayBuffer
            ? new TextDecoder().decode(value)
            : value instanceof Uint8Array
              ? new TextDecoder().decode(value)
              : String(value);

      const obj = createMockObject(key, JSON.parse(text), {
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata,
      });
      storage.set(key, obj);
      return {
        key: obj.key,
        etag: obj.etag,
        uploaded: obj.uploaded,
      } as R2Object;
    }),

    get: vi.fn(async (key: string, _options?: R2GetOptions) => {
      const obj = storage.get(key);
      return obj ?? null;
    }),

    head: vi.fn(async (key: string) => {
      const obj = storage.get(key);
      if (!obj) return null;
      return {
        key: obj.key,
        etag: obj.etag,
        size: obj.size,
        uploaded: obj.uploaded,
        httpMetadata: obj.httpMetadata,
        customMetadata: obj.customMetadata,
      } as R2Object;
    }),

    delete: vi.fn(async (keys: string | string[]) => {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      for (const key of keyArray) {
        storage.delete(key);
      }
    }),

    list: vi.fn(async (options?: R2ListOptions) => {
      const prefix = options?.prefix ?? "";
      const limit = options?.limit ?? 1000;
      const cursor = options?.cursor;

      const allKeys = Array.from(storage.keys())
        .filter((k) => k.startsWith(prefix))
        .sort();

      let startIndex = 0;
      if (cursor) {
        startIndex = allKeys.indexOf(cursor) + 1;
      }

      const keys = allKeys.slice(startIndex, startIndex + limit);
      const truncated = startIndex + limit < allKeys.length;

      const objects = keys.map((key) => {
        const obj = storage.get(key)!;
        return {
          key: obj.key,
          etag: obj.etag,
          size: obj.size,
          uploaded: obj.uploaded,
          httpMetadata: obj.httpMetadata,
          customMetadata: obj.customMetadata,
        };
      });

      return {
        objects,
        truncated,
        cursor: truncated ? keys[keys.length - 1] : undefined,
        delimitedPrefixes: [],
      } as R2Objects;
    }),

    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
  };

  return { bucket, storage };
}

describe("R2Client", () => {
  let bucket: R2Bucket;
  let storage: Map<string, MockR2ObjectBody>;
  let client: R2Client;

  beforeEach(() => {
    const mock = createMockBucket();
    bucket = mock.bucket;
    storage = mock.storage;
    client = new R2Client(bucket);
  });

  describe("createR2Client", () => {
    it("creates an R2Client instance", () => {
      const client = createR2Client(bucket);
      expect(client).toBeInstanceOf(R2Client);
    });

    it("accepts configuration options", () => {
      const client = createR2Client(bucket, {
        retry: { maxRetries: 5 },
        defaultMetadata: { contentType: "application/json" },
      });
      expect(client).toBeInstanceOf(R2Client);
    });
  });

  describe("put", () => {
    it("stores a value with JSON serialization", async () => {
      const result = await client.put("test-key", { foo: "bar" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.key).toBe("test-key");
        expect(result.value.etag).toBeDefined();
        expect(result.value.uploaded).toBeInstanceOf(Date);
      }
    });

    it("stores complex objects", async () => {
      const complexObj = {
        name: "Test",
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        date: "2024-01-01",
      };

      const putResult = await client.put("complex", complexObj);
      expect(putResult.ok).toBe(true);

      const getResult = await client.get<typeof complexObj>("complex");
      expect(getResult.ok).toBe(true);
      if (getResult.ok && getResult.value) {
        expect(getResult.value.value).toEqual(complexObj);
      }
    });

    it("stores metadata with the object", async () => {
      const result = await client.put("with-meta", { data: "value" }, {
        metadata: {
          contentType: "application/json",
          customMetadata: { version: "1.0" },
        },
      });

      expect(result.ok).toBe(true);
      expect(bucket.put).toHaveBeenCalledWith(
        "with-meta",
        expect.any(String),
        expect.objectContaining({
          httpMetadata: { contentType: "application/json" },
          customMetadata: { version: "1.0" },
        }),
      );
    });

    it("rejects empty keys", async () => {
      const result = await client.put("", { foo: "bar" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_KEY");
        expect(result.error.message).toContain("empty");
      }
    });

    it("rejects keys starting with forward slash", async () => {
      const result = await client.put("/invalid-key", { foo: "bar" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_KEY");
        expect(result.error.message).toContain("forward slash");
      }
    });

    it("rejects keys longer than 1024 characters", async () => {
      const longKey = "a".repeat(1025);
      const result = await client.put(longKey, { foo: "bar" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_KEY");
        expect(result.error.message).toContain("1024");
      }
    });

    it("returns SERIALIZATION_ERROR for circular references", async () => {
      const circular: Record<string, unknown> = { name: "test" };
      circular.self = circular; // Creates circular reference

      const result = await client.put("circular", circular);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SERIALIZATION_ERROR");
        expect(result.error.message).toContain("serialize");
        expect(result.error.retryable).toBe(false);
      }
    });

    it("returns SERIALIZATION_ERROR for BigInt values", async () => {
      const withBigInt = { value: BigInt(9007199254740991) };

      const result = await client.put("bigint", withBigInt);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SERIALIZATION_ERROR");
        expect(result.error.retryable).toBe(false);
      }
    });
  });

  describe("putRaw", () => {
    it("stores raw string data", async () => {
      const result = await client.putRaw("raw-string", '{"raw": "data"}');
      expect(result.ok).toBe(true);
    });

    it("stores ArrayBuffer data", async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode('{"buffer": "data"}');
      const result = await client.putRaw("raw-buffer", data.buffer);
      expect(result.ok).toBe(true);
    });

    it("stores Uint8Array data", async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode('{"uint8": "data"}');
      const result = await client.putRaw("raw-uint8", data);
      expect(result.ok).toBe(true);
    });
  });

  describe("get", () => {
    beforeEach(async () => {
      await client.put("existing", { value: "test" });
    });

    it("retrieves and parses stored JSON", async () => {
      const result = await client.get<{ value: string }>("existing");

      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.key).toBe("existing");
        expect(result.value.value).toEqual({ value: "test" });
        expect(result.value.etag).toBeDefined();
        expect(result.value.size).toBeGreaterThan(0);
        expect(result.value.uploaded).toBeInstanceOf(Date);
      }
    });

    it("returns null for non-existent keys", async () => {
      const result = await client.get("non-existent");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it("returns parse error for invalid JSON", async () => {
      // Directly manipulate storage to have invalid JSON
      const badObj = createMockObject("bad-json", {});
      badObj.text = async () => "not valid json {";
      storage.set("bad-json", badObj);

      const result = await client.get("bad-json");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("PARSE_ERROR");
      }
    });
  });

  describe("getValidated", () => {
    const TestSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    beforeEach(async () => {
      await client.put("valid", { name: "Test", age: 25 });
      await client.put("invalid", { name: "Test", age: "not a number" });
    });

    it("returns validated data when schema matches", async () => {
      const result = await client.getValidated("valid", TestSchema);

      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.value).toEqual({ name: "Test", age: 25 });
      }
    });

    it("returns validation error when schema does not match", async () => {
      const result = await client.getValidated("invalid", TestSchema);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("returns null for non-existent keys", async () => {
      const result = await client.getValidated("non-existent", TestSchema);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe("getStream", () => {
    beforeEach(async () => {
      await client.put("stream-test", { data: "stream content" });
    });

    it("returns a readable stream", async () => {
      const result = await client.getStream("stream-test");

      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.body).toBeInstanceOf(ReadableStream);
        expect(result.value.key).toBe("stream-test");
        expect(result.value.size).toBeGreaterThan(0);
      }
    });

    it("returns null for non-existent keys", async () => {
      const result = await client.getStream("non-existent");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe("head", () => {
    beforeEach(async () => {
      await client.put("head-test", { data: "value" }, {
        metadata: {
          contentType: "application/json",
          customMetadata: { version: "2.0" },
        },
      });
    });

    it("returns object metadata without body", async () => {
      const result = await client.head("head-test");

      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.key).toBe("head-test");
        expect(result.value.size).toBeGreaterThan(0);
        expect(result.value.etag).toBeDefined();
        // The mock stores metadata
        expect(result.value.httpMetadata?.contentType).toBe("application/json");
        expect(result.value.customMetadata?.version).toBe("2.0");
      }
    });

    it("returns null for non-existent keys", async () => {
      const result = await client.head("non-existent");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      await client.put("to-delete", { data: "will be deleted" });
    });

    it("deletes an existing object", async () => {
      const deleteResult = await client.delete("to-delete");
      expect(deleteResult.ok).toBe(true);

      const getResult = await client.get("to-delete");
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value).toBeNull();
      }
    });

    it("succeeds for non-existent keys", async () => {
      const result = await client.delete("non-existent");
      expect(result.ok).toBe(true);
    });
  });

  describe("deleteMany", () => {
    beforeEach(async () => {
      await client.put("batch-1", { id: 1 });
      await client.put("batch-2", { id: 2 });
      await client.put("batch-3", { id: 3 });
    });

    it("deletes multiple objects", async () => {
      const result = await client.deleteMany(["batch-1", "batch-2"]);
      expect(result.ok).toBe(true);

      const get1 = await client.get("batch-1");
      const get2 = await client.get("batch-2");
      const get3 = await client.get("batch-3");

      expect(get1.ok && get1.value).toBeNull();
      expect(get2.ok && get2.value).toBeNull();
      expect(get3.ok && get3.value?.value).toEqual({ id: 3 });
    });

    it("validates all keys before deleting", async () => {
      const result = await client.deleteMany(["batch-1", "", "batch-2"]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_KEY");
      }
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await client.put("users/1", { id: 1 });
      await client.put("users/2", { id: 2 });
      await client.put("users/3", { id: 3 });
      await client.put("posts/1", { id: 1 });
      await client.put("posts/2", { id: 2 });
    });

    it("lists all objects", async () => {
      const result = await client.list();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.objects).toHaveLength(5);
        expect(result.value.truncated).toBe(false);
      }
    });

    it("filters by prefix", async () => {
      const result = await client.list({ prefix: "users/" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.objects).toHaveLength(3);
        expect(result.value.objects.every((o) => o.key.startsWith("users/"))).toBe(true);
      }
    });

    it("respects limit", async () => {
      const result = await client.list({ limit: 2 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.objects).toHaveLength(2);
        expect(result.value.truncated).toBe(true);
        expect(result.value.cursor).toBeDefined();
      }
    });

    it("supports pagination with cursor", async () => {
      const firstPage = await client.list({ limit: 2 });
      expect(firstPage.ok).toBe(true);

      if (firstPage.ok && firstPage.value.cursor) {
        const secondPage = await client.list({
          limit: 2,
          cursor: firstPage.value.cursor,
        });

        expect(secondPage.ok).toBe(true);
        if (secondPage.ok) {
          expect(secondPage.value.objects).toHaveLength(2);
        }
      }
    });
  });

  describe("listAll", () => {
    beforeEach(async () => {
      for (let i = 0; i < 10; i++) {
        await client.put(`items/${i}`, { id: i });
      }
    });

    it("lists all objects with automatic pagination", async () => {
      const result = await client.listAll("items/");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(10);
        expect(result.value.every((o) => o.key.startsWith("items/"))).toBe(true);
      }
    });

    it("filters by prefix", async () => {
      await client.put("other/key", { data: "other" });

      const result = await client.listAll("items/");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.every((o) => o.key.startsWith("items/"))).toBe(true);
        expect(result.value).toHaveLength(10);
      }
    });

    it("handles empty results", async () => {
      const result = await client.listAll("nonexistent/");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe("exists", () => {
    beforeEach(async () => {
      await client.put("exists-test", { data: "value" });
    });

    it("returns true for existing keys", async () => {
      const result = await client.exists("exists-test");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it("returns false for non-existent keys", async () => {
      const result = await client.exists("non-existent");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe("retry logic", () => {
    it("retries on retryable errors", async () => {
      let attempts = 0;
      (bucket.put as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Network error");
        }
        return {
          key: "retry-test",
          etag: '"abc"',
          uploaded: new Date(),
        };
      });

      const clientWithRetry = new R2Client(bucket, {
        retry: { baseDelayMs: 1, maxDelayMs: 10 },
      });

      const result = await clientWithRetry.put("retry-test", { data: "value" });

      expect(result.ok).toBe(true);
      expect(attempts).toBe(3);
    });

    it("gives up after max retries", async () => {
      (bucket.put as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        throw new Error("Persistent error");
      });

      const clientWithRetry = new R2Client(bucket, {
        retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 },
      });

      const result = await clientWithRetry.put("retry-test", { data: "value" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("BUCKET_ERROR");
      }
    });
  });

  describe("default metadata", () => {
    it("applies default metadata to all puts", async () => {
      const clientWithDefaults = new R2Client(bucket, {
        defaultMetadata: {
          contentType: "application/json",
          cacheControl: "max-age=3600",
        },
      });

      await clientWithDefaults.put("default-meta", { data: "value" });

      expect(bucket.put).toHaveBeenCalledWith(
        "default-meta",
        expect.any(String),
        expect.objectContaining({
          httpMetadata: {
            contentType: "application/json",
            cacheControl: "max-age=3600",
          },
        }),
      );
    });

    it("allows overriding default metadata", async () => {
      const clientWithDefaults = new R2Client(bucket, {
        defaultMetadata: {
          contentType: "application/json",
        },
      });

      await clientWithDefaults.put("override-meta", { data: "value" }, {
        metadata: {
          contentType: "text/plain",
        },
      });

      expect(bucket.put).toHaveBeenCalledWith(
        "override-meta",
        expect.any(String),
        expect.objectContaining({
          httpMetadata: {
            contentType: "text/plain",
          },
        }),
      );
    });
  });
});

describe("Result type utilities", () => {
  it("ok creates success result", async () => {
    const { ok } = await import("../src/types");
    const result = ok("value");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("value");
    }
  });

  it("err creates error result", async () => {
    const { err, createError } = await import("../src/types");
    const error = createError("NOT_FOUND", "Object not found");
    const result = err(error);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe("Object not found");
    }
  });

  it("createError sets retryable flag correctly", async () => {
    const { createError } = await import("../src/types");

    const networkError = createError("NETWORK_ERROR", "Network failed");
    expect(networkError.retryable).toBe(true);

    const bucketError = createError("BUCKET_ERROR", "Bucket failed");
    expect(bucketError.retryable).toBe(true);

    const notFoundError = createError("NOT_FOUND", "Not found");
    expect(notFoundError.retryable).toBe(false);

    const validationError = createError("VALIDATION_ERROR", "Invalid");
    expect(validationError.retryable).toBe(false);
  });
});
