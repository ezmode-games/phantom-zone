import { vi } from "vitest";

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

export function createMockObject(
  key: string,
  value: unknown,
  options?: {
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
  },
): MockR2ObjectBody {
  const text = typeof value === "string" ? value : JSON.stringify(value);
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

export function createMockBucket() {
  const storage = new Map<string, MockR2ObjectBody>();

  const bucket: R2Bucket = {
    put: vi.fn(async (key: string, value: unknown, options?: R2PutOptions) => {
      let text: string;
      let size: number;

      if (typeof value === "string") {
        text = value;
        size = new TextEncoder().encode(text).length;
      } else if (value instanceof ArrayBuffer) {
        text = new TextDecoder().decode(value);
        size = value.byteLength;
      } else if (value instanceof Uint8Array) {
        text = new TextDecoder().decode(value);
        size = value.length;
      } else {
        text = String(value);
        size = new TextEncoder().encode(text).length;
      }

      // Try to parse as JSON for regular objects, otherwise store raw
      let storedValue: unknown;
      try {
        storedValue = JSON.parse(text);
      } catch {
        storedValue = text;
      }

      const obj = createMockObject(key, storedValue, {
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata,
      });
      // Override size for accurate tracking
      obj.size = size;
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
