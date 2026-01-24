import { describe, expect, it, beforeEach } from "vitest";
import { R2Client } from "../src/r2-client";
import {
  AssetStorageService,
  createAssetStorageService,
  type UploadAssetInput,
} from "../src/asset-storage";
import { createMockBucket } from "./test-utils";

describe("AssetStorageService", () => {
  let client: R2Client;
  let service: AssetStorageService;

  beforeEach(() => {
    const { bucket } = createMockBucket();
    client = new R2Client(bucket);
    service = new AssetStorageService(client);
  });

  describe("createAssetStorageService", () => {
    it("creates an AssetStorageService instance", () => {
      const { bucket } = createMockBucket();
      const client = new R2Client(bucket);
      const service = createAssetStorageService(client);
      expect(service).toBeInstanceOf(AssetStorageService);
    });

    it("accepts configuration with path prefix", () => {
      const { bucket } = createMockBucket();
      const client = new R2Client(bucket);
      const service = createAssetStorageService(client, {
        pathPrefix: "test-prefix",
        maxFileSizeBytes: 10 * 1024 * 1024,
      });
      expect(service).toBeInstanceOf(AssetStorageService);
    });
  });

  describe("upload", () => {
    const createTestInput = (
      overrides?: Partial<UploadAssetInput>,
    ): UploadAssetInput => ({
      guildId: "guild-001",
      assetId: "asset-001",
      data: new TextEncoder().encode("test content"),
      contentType: "image/png",
      assetType: "image",
      ...overrides,
    });

    it("uploads an image asset", async () => {
      const input = createTestInput();
      const result = await service.upload(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.assetId).toBe("asset-001");
        expect(result.value.assetType).toBe("image");
        expect(result.value.contentType).toBe("image/png");
        expect(result.value.uploadedAt).toBeInstanceOf(Date);
      }
    });

    it("stores optional metadata", async () => {
      const input = createTestInput({
        filename: "photo.png",
        uploaderId: "user-123",
      });

      const uploadResult = await service.upload(input);
      expect(uploadResult.ok).toBe(true);

      const infoResult = await service.getInfo("guild-001", "image", "asset-001");
      expect(infoResult.ok).toBe(true);
      if (infoResult.ok && infoResult.value) {
        expect(infoResult.value.filename).toBe("photo.png");
        expect(infoResult.value.uploaderId).toBe("user-123");
      }
    });

    it("validates content type for image", async () => {
      const input = createTestInput({
        contentType: "application/pdf",
        assetType: "image",
      });

      const result = await service.upload(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_FILE_TYPE");
      }
    });

    it("allows any content type for 'other' asset type", async () => {
      const input = createTestInput({
        contentType: "application/octet-stream",
        assetType: "other",
      });

      const result = await service.upload(input);
      expect(result.ok).toBe(true);
    });

    it("rejects empty guild ID", async () => {
      const input = createTestInput({ guildId: "" });
      const result = await service.upload(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_KEY");
      }
    });

    it("rejects empty asset ID", async () => {
      const input = createTestInput({ assetId: "" });
      const result = await service.upload(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_KEY");
      }
    });

    it("rejects files exceeding max size", async () => {
      const { bucket } = createMockBucket();
      const client = new R2Client(bucket);
      const service = new AssetStorageService(client, {
        maxFileSizeBytes: 10, // Very small limit
      });

      const input: UploadAssetInput = {
        guildId: "guild-001",
        assetId: "asset-001",
        data: new TextEncoder().encode("this content is too large"),
        contentType: "image/png",
        assetType: "image",
      };

      const result = await service.upload(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FILE_TOO_LARGE");
      }
    });

    it("supports document asset type", async () => {
      const input = createTestInput({
        assetId: "doc-001",
        contentType: "application/pdf",
        assetType: "document",
      });

      const result = await service.upload(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.assetType).toBe("document");
      }
    });

    it("supports video asset type", async () => {
      const input = createTestInput({
        assetId: "vid-001",
        contentType: "video/mp4",
        assetType: "video",
      });

      const result = await service.upload(input);
      expect(result.ok).toBe(true);
    });

    it("supports audio asset type", async () => {
      const input = createTestInput({
        assetId: "aud-001",
        contentType: "audio/mpeg",
        assetType: "audio",
      });

      const result = await service.upload(input);
      expect(result.ok).toBe(true);
    });
  });

  describe("get", () => {
    beforeEach(async () => {
      await service.upload({
        guildId: "guild-001",
        assetId: "asset-001",
        data: new TextEncoder().encode("test content"),
        contentType: "image/png",
        assetType: "image",
        filename: "test.png",
      });
    });

    it("retrieves asset stream and info", async () => {
      const result = await service.get("guild-001", "image", "asset-001");

      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.info.assetId).toBe("asset-001");
        expect(result.value.info.assetType).toBe("image");
        expect(result.value.stream).toBeInstanceOf(ReadableStream);
      }
    });

    it("returns null for non-existent asset", async () => {
      const result = await service.get("guild-001", "image", "non-existent");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe("getInfo", () => {
    beforeEach(async () => {
      await service.upload({
        guildId: "guild-001",
        assetId: "asset-001",
        data: new TextEncoder().encode("test content"),
        contentType: "image/png",
        assetType: "image",
        filename: "test.png",
      });
    });

    it("retrieves asset metadata", async () => {
      const result = await service.getInfo("guild-001", "image", "asset-001");

      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.assetId).toBe("asset-001");
        expect(result.value.contentType).toBe("image/png");
        expect(result.value.filename).toBe("test.png");
        expect(result.value.size).toBeGreaterThan(0);
      }
    });

    it("returns null for non-existent asset", async () => {
      const result = await service.getInfo("guild-001", "image", "non-existent");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      await service.upload({
        guildId: "guild-001",
        assetId: "asset-001",
        data: new TextEncoder().encode("test content"),
        contentType: "image/png",
        assetType: "image",
      });
    });

    it("deletes an existing asset", async () => {
      const deleteResult = await service.delete("guild-001", "image", "asset-001");
      expect(deleteResult.ok).toBe(true);

      const existsResult = await service.exists("guild-001", "image", "asset-001");
      expect(existsResult.ok && existsResult.value).toBe(false);
    });

    it("succeeds for non-existent asset", async () => {
      const result = await service.delete("guild-001", "image", "non-existent");
      expect(result.ok).toBe(true);
    });
  });

  describe("exists", () => {
    beforeEach(async () => {
      await service.upload({
        guildId: "guild-001",
        assetId: "asset-001",
        data: new TextEncoder().encode("test content"),
        contentType: "image/png",
        assetType: "image",
      });
    });

    it("returns true for existing asset", async () => {
      const result = await service.exists("guild-001", "image", "asset-001");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it("returns false for non-existent asset", async () => {
      const result = await service.exists("guild-001", "image", "non-existent");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      // Upload assets of different types
      await service.upload({
        guildId: "guild-001",
        assetId: "img-001",
        data: new TextEncoder().encode("image 1"),
        contentType: "image/png",
        assetType: "image",
      });
      await service.upload({
        guildId: "guild-001",
        assetId: "img-002",
        data: new TextEncoder().encode("image 2"),
        contentType: "image/jpeg",
        assetType: "image",
      });
      await service.upload({
        guildId: "guild-001",
        assetId: "doc-001",
        data: new TextEncoder().encode("document"),
        contentType: "application/pdf",
        assetType: "document",
      });
    });

    it("lists all assets for a guild", async () => {
      const result = await service.list("guild-001");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.assets).toHaveLength(3);
      }
    });

    it("filters by asset type", async () => {
      const result = await service.list("guild-001", { assetType: "image" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.assets).toHaveLength(2);
        expect(result.value.assets.every((a) => a.assetType === "image")).toBe(true);
      }
    });

    it("respects limit", async () => {
      const result = await service.list("guild-001", { limit: 2 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.assets).toHaveLength(2);
        expect(result.value.hasMore).toBe(true);
      }
    });

    it("returns empty array for guild with no assets", async () => {
      const result = await service.list("empty-guild");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.assets).toHaveLength(0);
        expect(result.value.hasMore).toBe(false);
      }
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await service.upload({
        guildId: "guild-001",
        assetId: "img-001",
        data: new TextEncoder().encode("image 1"),
        contentType: "image/png",
        assetType: "image",
      });
      await service.upload({
        guildId: "guild-001",
        assetId: "img-002",
        data: new TextEncoder().encode("image 2"),
        contentType: "image/jpeg",
        assetType: "image",
      });
      await service.upload({
        guildId: "guild-001",
        assetId: "doc-001",
        data: new TextEncoder().encode("document"),
        contentType: "application/pdf",
        assetType: "document",
      });
    });

    it("counts all assets", async () => {
      const result = await service.count("guild-001");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(3);
      }
    });

    it("counts assets by type", async () => {
      const imageCount = await service.count("guild-001", "image");
      const docCount = await service.count("guild-001", "document");

      expect(imageCount.ok && imageCount.value).toBe(2);
      expect(docCount.ok && docCount.value).toBe(1);
    });

    it("returns 0 for guild with no assets", async () => {
      const result = await service.count("empty-guild");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });
  });

  describe("deleteAll", () => {
    beforeEach(async () => {
      await service.upload({
        guildId: "guild-001",
        assetId: "img-001",
        data: new TextEncoder().encode("image 1"),
        contentType: "image/png",
        assetType: "image",
      });
      await service.upload({
        guildId: "guild-001",
        assetId: "img-002",
        data: new TextEncoder().encode("image 2"),
        contentType: "image/jpeg",
        assetType: "image",
      });
      await service.upload({
        guildId: "guild-001",
        assetId: "doc-001",
        data: new TextEncoder().encode("document"),
        contentType: "application/pdf",
        assetType: "document",
      });
    });

    it("deletes all assets and returns count", async () => {
      const result = await service.deleteAll("guild-001");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(3);
      }

      const countResult = await service.count("guild-001");
      expect(countResult.ok && countResult.value).toBe(0);
    });

    it("deletes assets by type", async () => {
      const result = await service.deleteAll("guild-001", "image");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(2);
      }

      // Documents should still exist
      const docCount = await service.count("guild-001", "document");
      expect(docCount.ok && docCount.value).toBe(1);
    });

    it("returns 0 for guild with no assets", async () => {
      const result = await service.deleteAll("empty-guild");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(0);
      }
    });
  });

  describe("path prefix", () => {
    it("prepends prefix to all keys", async () => {
      const { bucket } = createMockBucket();
      const client = new R2Client(bucket);
      const service = new AssetStorageService(client, { pathPrefix: "prod" });

      await service.upload({
        guildId: "guild-001",
        assetId: "asset-001",
        data: new TextEncoder().encode("content"),
        contentType: "image/png",
        assetType: "image",
      });

      const listResult = await client.listAll("prod/");
      expect(listResult.ok).toBe(true);
      if (listResult.ok) {
        expect(listResult.value.length).toBe(1);
        expect(listResult.value[0].key).toContain("prod/");
      }
    });
  });
});
