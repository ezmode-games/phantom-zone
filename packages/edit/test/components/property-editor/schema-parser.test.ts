/**
 * Schema Parser Tests
 *
 * Tests for Zod schema to form field metadata conversion.
 * Implements PZ-208: Block Property Editor
 */

import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import {
  parseSchema,
  validateProps,
  keyToLabel,
} from "../../../src/components/property-editor/schema-parser";

describe("Schema Parser (PZ-208)", () => {
  describe("keyToLabel", () => {
    it("converts camelCase to Title Case", () => {
      expect(keyToLabel("firstName")).toBe("First Name");
      expect(keyToLabel("showLineNumbers")).toBe("Show Line Numbers");
      expect(keyToLabel("isActive")).toBe("Is Active");
    });

    it("handles single word", () => {
      expect(keyToLabel("name")).toBe("Name");
      expect(keyToLabel("content")).toBe("Content");
    });

    it("handles already capitalized first letter", () => {
      expect(keyToLabel("Name")).toBe("Name");
    });
  });

  describe("parseSchema", () => {
    it("parses simple string field", () => {
      const schema = z.object({
        content: z.string(),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0]).toMatchObject({
        key: "content",
        label: "Content",
        type: "text",
        required: true,
        optional: false,
      });
    });

    it("parses optional string field", () => {
      const schema = z.object({
        title: z.string().optional(),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "title",
        type: "text",
        required: false,
        optional: true,
      });
    });

    it("parses number field", () => {
      const schema = z.object({
        count: z.number(),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "count",
        type: "number",
        required: true,
      });
    });

    it("parses number field with min/max", () => {
      const schema = z.object({
        level: z.number().min(1).max(6),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "level",
        type: "number",
        min: 1,
        max: 6,
      });
    });

    it("parses boolean field", () => {
      const schema = z.object({
        showLineNumbers: z.boolean(),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "showLineNumbers",
        label: "Show Line Numbers",
        type: "boolean",
      });
    });

    it("parses enum field", () => {
      const schema = z.object({
        align: z.enum(["left", "center", "right"]),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "align",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ],
      });
    });

    it("parses union of literals as select", () => {
      const schema = z.object({
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "level",
        type: "select",
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
        ],
      });
    });

    it("parses array field", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "items",
        type: "array",
      });
      expect(result.fields[0]?.itemSchema).toMatchObject({
        type: "text",
      });
    });

    it("parses nested object field", () => {
      const schema = z.object({
        settings: z.object({
          enabled: z.boolean(),
          value: z.number(),
        }),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "settings",
        type: "object",
      });
      expect(result.fields[0]?.nested).toHaveLength(2);
      expect(result.fields[0]?.nested?.[0]).toMatchObject({
        key: "enabled",
        type: "boolean",
      });
    });

    it("filters out base block props", () => {
      const schema = z.object({
        content: z.string(),
        className: z.string().optional(),
        style: z.record(z.string(), z.unknown()).optional(),
        dataAttributes: z.record(z.string(), z.string()).optional(),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0]?.key).toBe("content");
    });

    it("parses field with default value", () => {
      const schema = z.object({
        count: z.number().default(10),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields[0]).toMatchObject({
        key: "count",
        type: "number",
        defaultValue: 10,
      });
    });

    it("parses complex block schema (heading)", () => {
      const schema = z.object({
        level: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
        ]),
        content: z.string(),
        align: z.enum(["left", "center", "right"]).optional(),
        className: z.string().optional(),
      });

      const result = parseSchema(schema);

      expect(result.success).toBe(true);
      expect(result.fields).toHaveLength(3); // level, content, align (className filtered)
      expect(result.fields.find((f) => f.key === "level")).toMatchObject({
        type: "select",
      });
      expect(result.fields.find((f) => f.key === "content")).toMatchObject({
        type: "text",
        required: true,
      });
      expect(result.fields.find((f) => f.key === "align")).toMatchObject({
        type: "select",
        optional: true,
      });
    });

    it("returns error for non-object schema", () => {
      const schema = z.string();

      const result = parseSchema(schema);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Schema must be a ZodObject");
    });
  });

  describe("validateProps", () => {
    it("validates correct props", () => {
      const schema = z.object({
        content: z.string(),
        level: z.number().min(1).max(6),
      });

      const result = validateProps(schema, {
        content: "Hello",
        level: 2,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns errors for invalid props", () => {
      const schema = z.object({
        content: z.string(),
        level: z.number().min(1).max(6),
      });

      const result = validateProps(schema, {
        content: 123, // Should be string
        level: 10, // Should be max 6
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns error path for nested fields", () => {
      const schema = z.object({
        settings: z.object({
          enabled: z.boolean(),
        }),
      });

      const result = validateProps(schema, {
        settings: {
          enabled: "not a boolean",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("settings"))).toBe(true);
    });

    it("validates missing required field", () => {
      const schema = z.object({
        content: z.string(),
      });

      const result = validateProps(schema, {});

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "content")).toBe(true);
    });

    it("allows missing optional field", () => {
      const schema = z.object({
        content: z.string(),
        title: z.string().optional(),
      });

      const result = validateProps(schema, {
        content: "Hello",
      });

      expect(result.valid).toBe(true);
    });
  });
});
