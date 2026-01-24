import { describe, expect, it } from "vitest";

describe("@phantom-zone/core", () => {
  it("should export module", async () => {
    const module = await import("../src/index");
    expect(module).toBeDefined();
  });

  it("exports VERSION", async () => {
    const { VERSION } = await import("../src/index");
    expect(VERSION).toBe("0.0.1");
  });

  describe("Registry Exports", () => {
    it("exports registry factory functions", async () => {
      const module = await import("../src/index");
      expect(module.createInputRegistry).toBeDefined();
      expect(module.createDefaultInputRegistry).toBeDefined();
      expect(module.getInputRegistry).toBeDefined();
      expect(module.resetGlobalRegistry).toBeDefined();
    });

    it("exports all default input definitions", async () => {
      const module = await import("../src/index");
      expect(module.textInputDefinition).toBeDefined();
      expect(module.textAreaDefinition).toBeDefined();
      expect(module.numberInputDefinition).toBeDefined();
      expect(module.checkboxDefinition).toBeDefined();
      expect(module.selectDefinition).toBeDefined();
      expect(module.multiSelectDefinition).toBeDefined();
      expect(module.datePickerDefinition).toBeDefined();
      expect(module.fileUploadDefinition).toBeDefined();
      expect(module.defaultInputDefinitions).toHaveLength(8);
    });
  });

  describe("Type Exports", () => {
    it("exports core types (compile-time check)", async () => {
      // These are type-only exports, so we just verify the module loads
      // Type checking is done by TypeScript compiler
      const module = await import("../src/index");
      expect(module).toBeDefined();
    });
  });
});
