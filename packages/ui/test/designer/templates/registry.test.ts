/**
 * Template Registry Tests (PZ-106)
 *
 * Tests for the template registry and storage.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  createInMemoryStorage,
  createTemplateRegistry,
  createInMemoryRegistry,
  builtInTemplates,
  getDefaultRegistry,
  resetDefaultRegistry,
} from "../../../src/designer/templates";
import type { FormTemplate, TemplateStorage } from "../../../src/designer/templates";

describe("createInMemoryStorage", () => {
  let storage: TemplateStorage;

  beforeEach(() => {
    storage = createInMemoryStorage();
  });

  it("initially returns empty array", async () => {
    const templates = await storage.getAll();
    expect(templates).toEqual([]);
  });

  it("can save and retrieve a template", async () => {
    const template: FormTemplate = {
      metadata: {
        id: "test-1",
        name: "Test Template",
        description: "A test template",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test Form",
      fields: [],
    };

    await storage.save(template);
    const templates = await storage.getAll();

    expect(templates).toHaveLength(1);
    expect(templates[0]).toEqual(template);
  });

  it("can save multiple templates", async () => {
    const template1: FormTemplate = {
      metadata: {
        id: "test-1",
        name: "Template 1",
        description: "First template",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Form 1",
      fields: [],
    };

    const template2: FormTemplate = {
      metadata: {
        id: "test-2",
        name: "Template 2",
        description: "Second template",
        category: "guild",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Form 2",
      fields: [],
    };

    await storage.save(template1);
    await storage.save(template2);

    const templates = await storage.getAll();
    expect(templates).toHaveLength(2);
  });

  it("can update an existing template", async () => {
    const template: FormTemplate = {
      metadata: {
        id: "test-1",
        name: "Original Name",
        description: "Original description",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Original Form",
      fields: [],
    };

    await storage.save(template);

    const updated: FormTemplate = {
      ...template,
      metadata: {
        ...template.metadata,
        name: "Updated Name",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
      title: "Updated Form",
    };

    await storage.save(updated);

    const templates = await storage.getAll();
    expect(templates).toHaveLength(1);
    expect(templates[0]!.metadata.name).toBe("Updated Name");
    expect(templates[0]!.title).toBe("Updated Form");
  });

  it("can delete a template", async () => {
    const template: FormTemplate = {
      metadata: {
        id: "test-1",
        name: "Test Template",
        description: "A test template",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Test Form",
      fields: [],
    };

    await storage.save(template);
    const deleted = await storage.delete("test-1");

    expect(deleted).toBe(true);

    const templates = await storage.getAll();
    expect(templates).toHaveLength(0);
  });

  it("returns false when deleting non-existent template", async () => {
    const deleted = await storage.delete("non-existent");
    expect(deleted).toBe(false);
  });

  it("can clear all templates", async () => {
    const template1: FormTemplate = {
      metadata: {
        id: "test-1",
        name: "Template 1",
        description: "First template",
        category: "custom",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Form 1",
      fields: [],
    };

    const template2: FormTemplate = {
      metadata: {
        id: "test-2",
        name: "Template 2",
        description: "Second template",
        category: "guild",
        icon: "file",
        isBuiltIn: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      title: "Form 2",
      fields: [],
    };

    await storage.save(template1);
    await storage.save(template2);
    await storage.clear();

    const templates = await storage.getAll();
    expect(templates).toHaveLength(0);
  });
});

describe("createTemplateRegistry", () => {
  let storage: TemplateStorage;

  beforeEach(() => {
    storage = createInMemoryStorage();
  });

  describe("getBuiltIn", () => {
    it("returns all built-in templates", () => {
      const registry = createTemplateRegistry(storage);
      const templates = registry.getBuiltIn();

      expect(templates).toHaveLength(builtInTemplates.length);
      expect(templates).toEqual(builtInTemplates);
    });

    it("returns a copy, not the original array", () => {
      const registry = createTemplateRegistry(storage);
      const templates1 = registry.getBuiltIn();
      const templates2 = registry.getBuiltIn();

      expect(templates1).not.toBe(templates2);
      expect(templates1).toEqual(templates2);
    });
  });

  describe("getCustom", () => {
    it("initially returns empty array", async () => {
      const registry = createTemplateRegistry(storage);
      const templates = await registry.getCustom();

      expect(templates).toEqual([]);
    });

    it("returns saved custom templates", async () => {
      const registry = createTemplateRegistry(storage);

      await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: "My Form",
        fields: [],
      });

      const templates = await registry.getCustom();
      expect(templates).toHaveLength(1);
      expect(templates[0]!.metadata.name).toBe("My Template");
    });
  });

  describe("getAll", () => {
    it("returns built-in templates when no custom exist", async () => {
      const registry = createTemplateRegistry(storage);
      const templates = await registry.getAll();

      expect(templates).toHaveLength(builtInTemplates.length);
    });

    it("returns both built-in and custom templates", async () => {
      const registry = createTemplateRegistry(storage);

      await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: "My Form",
        fields: [],
      });

      const templates = await registry.getAll();
      expect(templates).toHaveLength(builtInTemplates.length + 1);
    });
  });

  describe("get", () => {
    it("returns built-in template by id", async () => {
      const registry = createTemplateRegistry(storage);
      const template = await registry.get("general-application");

      expect(template).toBeDefined();
      expect(template?.metadata.id).toBe("general-application");
    });

    it("returns custom template by id", async () => {
      const registry = createTemplateRegistry(storage);

      const saved = await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: "My Form",
        fields: [],
      });

      const template = await registry.get(saved.metadata.id);

      expect(template).toBeDefined();
      expect(template?.metadata.id).toBe(saved.metadata.id);
    });

    it("returns undefined for unknown id", async () => {
      const registry = createTemplateRegistry(storage);
      const template = await registry.get("unknown-id");

      expect(template).toBeUndefined();
    });

    it("prefers built-in over custom with same id (edge case)", async () => {
      const registry = createTemplateRegistry(storage);
      const template = await registry.get("general-application");

      expect(template?.metadata.isBuiltIn).toBe(true);
    });
  });

  describe("getByCategory", () => {
    it("returns templates filtered by category", async () => {
      const registry = createTemplateRegistry(storage);

      const guildTemplates = await registry.getByCategory("guild");
      expect(guildTemplates.every((t) => t.metadata.category === "guild")).toBe(true);

      const recruitmentTemplates = await registry.getByCategory("recruitment");
      expect(recruitmentTemplates.every((t) => t.metadata.category === "recruitment")).toBe(true);
    });

    it("includes custom templates in category filter", async () => {
      const registry = createTemplateRegistry(storage);

      await registry.saveCustom({
        metadata: {
          name: "Custom Guild Template",
          description: "A custom guild template",
          category: "guild",
          icon: "file",
        },
        title: "Custom Guild Form",
        fields: [],
      });

      const guildTemplates = await registry.getByCategory("guild");
      expect(guildTemplates.some((t) => t.metadata.name === "Custom Guild Template")).toBe(true);
    });

    it("returns empty array for category with no templates", async () => {
      const registry = createTemplateRegistry(storage);
      const templates = await registry.getByCategory("custom");

      expect(templates).toHaveLength(0);
    });
  });

  describe("saveCustom", () => {
    it("generates id for new template", async () => {
      const registry = createTemplateRegistry(storage);

      const saved = await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: "My Form",
        fields: [],
      });

      expect(saved.metadata.id).toBeTruthy();
      expect(typeof saved.metadata.id).toBe("string");
    });

    it("sets isBuiltIn to false", async () => {
      const registry = createTemplateRegistry(storage);

      const saved = await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: "My Form",
        fields: [],
      });

      expect(saved.metadata.isBuiltIn).toBe(false);
    });

    it("sets createdAt and updatedAt timestamps", async () => {
      const registry = createTemplateRegistry(storage);

      const before = new Date().toISOString();

      const saved = await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: "My Form",
        fields: [],
      });

      const after = new Date().toISOString();

      expect(saved.metadata.createdAt).toBeTruthy();
      expect(saved.metadata.updatedAt).toBeTruthy();
      expect(saved.metadata.createdAt >= before).toBe(true);
      expect(saved.metadata.createdAt <= after).toBe(true);
    });

    it("preserves template fields", async () => {
      const registry = createTemplateRegistry(storage);

      const saved = await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: "My Form",
        fields: [
          { inputType: "text", label: "Name", required: true },
          { inputType: "textarea", label: "Bio", required: false },
        ],
      });

      expect(saved.fields).toHaveLength(2);
      expect(saved.fields[0]!.label).toBe("Name");
      expect(saved.fields[1]!.label).toBe("Bio");
    });
  });

  describe("deleteCustom", () => {
    it("deletes custom template", async () => {
      const registry = createTemplateRegistry(storage);

      const saved = await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: "My Form",
        fields: [],
      });

      const deleted = await registry.deleteCustom(saved.metadata.id);
      expect(deleted).toBe(true);

      const template = await registry.get(saved.metadata.id);
      expect(template).toBeUndefined();
    });

    it("cannot delete built-in template", async () => {
      const registry = createTemplateRegistry(storage);

      const deleted = await registry.deleteCustom("general-application");
      expect(deleted).toBe(false);

      const template = await registry.get("general-application");
      expect(template).toBeDefined();
    });

    it("returns false for non-existent template", async () => {
      const registry = createTemplateRegistry(storage);

      const deleted = await registry.deleteCustom("non-existent");
      expect(deleted).toBe(false);
    });
  });
});

describe("createInMemoryRegistry", () => {
  it("creates a registry with in-memory storage", async () => {
    const registry = createInMemoryRegistry();

    // Should have built-in templates
    expect(registry.getBuiltIn()).toHaveLength(builtInTemplates.length);

    // Should be able to save and retrieve custom templates
    const saved = await registry.saveCustom({
      metadata: {
        name: "Test",
        description: "Test",
        category: "custom",
        icon: "file",
      },
      title: "Test",
      fields: [],
    });

    const custom = await registry.getCustom();
    expect(custom).toHaveLength(1);
    expect(custom[0]!.metadata.id).toBe(saved.metadata.id);
  });
});

describe("getDefaultRegistry", () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  it("returns a registry instance", () => {
    const registry = getDefaultRegistry();

    expect(registry).toBeDefined();
    expect(typeof registry.getBuiltIn).toBe("function");
    expect(typeof registry.getCustom).toBe("function");
  });

  it("returns the same instance on multiple calls", () => {
    const registry1 = getDefaultRegistry();
    const registry2 = getDefaultRegistry();

    expect(registry1).toBe(registry2);
  });

  it("resetDefaultRegistry creates new instance", () => {
    const registry1 = getDefaultRegistry();
    resetDefaultRegistry();
    const registry2 = getDefaultRegistry();

    expect(registry1).not.toBe(registry2);
  });
});
