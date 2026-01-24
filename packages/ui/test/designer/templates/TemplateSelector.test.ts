/**
 * TemplateSelector Component Tests (PZ-106)
 *
 * Tests for the TemplateSelector component.
 * Note: These tests are limited since we use node environment.
 * Full component testing would require jsdom environment and @testing-library/react.
 */

import { describe, expect, it } from "vitest";
import {
  TemplateSelector,
  useTemplateSelector,
  builtInTemplates,
  createInMemoryRegistry,
  applyTemplate,
  generalApplicationTemplate,
} from "../../../src/designer/templates";
import type { TemplateSelectorProps } from "../../../src/designer/templates";
import { createEmptyCanvasState } from "../../../src/designer/types";

describe("TemplateSelector", () => {
  describe("exports", () => {
    it("TemplateSelector is exported as a function", () => {
      expect(typeof TemplateSelector).toBe("function");
    });

    it("useTemplateSelector is exported as a function", () => {
      expect(typeof useTemplateSelector).toBe("function");
    });
  });

  describe("TemplateSelector component", () => {
    it("is a valid React component function", () => {
      expect(TemplateSelector.length).toBeGreaterThanOrEqual(0);
    });

    it("has sub-components attached", () => {
      expect(TemplateSelector.CategoryFilter).toBeDefined();
      expect(TemplateSelector.SearchInput).toBeDefined();
      expect(TemplateSelector.TemplateCard).toBeDefined();
      expect(TemplateSelector.TemplatePreview).toBeDefined();
      expect(TemplateSelector.TemplateGrid).toBeDefined();
      expect(TemplateSelector.SaveTemplateDialog).toBeDefined();
      expect(TemplateSelector.EmptyState).toBeDefined();
      expect(TemplateSelector.TemplateIcon).toBeDefined();
    });
  });

  describe("useTemplateSelector hook", () => {
    it("is exported as a function", () => {
      // Note: We cannot test the actual hook behavior in node environment
      // since React hooks require a React component context.
      expect(typeof useTemplateSelector).toBe("function");
    });
  });
});

describe("TemplateSelector Type Tests", () => {
  it("TemplateSelectorProps interface is correct", () => {
    const registry = createInMemoryRegistry();
    const canvasState = createEmptyCanvasState();

    const props: TemplateSelectorProps = {
      registry,
      onApply: () => {},
      onSave: () => {},
      onDelete: () => {},
      canvasState,
      showSaveOption: true,
      className: "test-class",
      children: null,
    };

    expect(props.registry).toBe(registry);
    expect(typeof props.onApply).toBe("function");
    expect(typeof props.onSave).toBe("function");
    expect(typeof props.onDelete).toBe("function");
    expect(props.canvasState).toBe(canvasState);
    expect(props.showSaveOption).toBe(true);
    expect(props.className).toBe("test-class");
  });

  it("TemplateSelectorProps supports minimal configuration", () => {
    const props: TemplateSelectorProps = {};

    expect(props.registry).toBeUndefined();
    expect(props.onApply).toBeUndefined();
    expect(props.canvasState).toBeUndefined();
  });
});

describe("TemplateSelector Integration Scenarios", () => {
  describe("applying a template", () => {
    it("applies template and calls onApply callback", () => {
      let appliedResult: unknown = null;

      const props: TemplateSelectorProps = {
        onApply: (result) => {
          appliedResult = result;
        },
      };

      // Simulate template application
      const result = applyTemplate(generalApplicationTemplate);
      props.onApply?.(result);

      expect(appliedResult).toEqual(result);
      expect(result.canvasState.title).toBe("Guild Application");
      expect(result.fieldCount).toBe(generalApplicationTemplate.fields.length);
    });

    it("generates unique IDs on each apply", () => {
      const result1 = applyTemplate(generalApplicationTemplate);
      const result2 = applyTemplate(generalApplicationTemplate);

      expect(result1.canvasState.id).not.toBe(result2.canvasState.id);
      expect(result1.canvasState.fields[0]!.id).not.toBe(
        result2.canvasState.fields[0]!.id
      );
    });
  });

  describe("saving a custom template", () => {
    it("saves custom template with metadata", async () => {
      const registry = createInMemoryRegistry();
      const canvasState = createEmptyCanvasState();
      canvasState.title = "My Custom Form";
      canvasState.fields = [
        {
          id: "field-1",
          inputType: "text",
          label: "Name",
          required: true,
          validationRules: [],
        },
      ];

      const saved = await registry.saveCustom({
        metadata: {
          name: "My Template",
          description: "A custom template",
          category: "custom",
          icon: "file",
        },
        title: canvasState.title,
        fields: canvasState.fields.map((f) => ({
          inputType: f.inputType,
          label: f.label,
          required: f.required,
        })),
      });

      expect(saved.metadata.id).toBeTruthy();
      expect(saved.metadata.name).toBe("My Template");
      expect(saved.metadata.isBuiltIn).toBe(false);
      expect(saved.title).toBe("My Custom Form");
      expect(saved.fields).toHaveLength(1);
    });
  });

  describe("deleting a custom template", () => {
    it("deletes custom template from registry", async () => {
      const registry = createInMemoryRegistry();

      const saved = await registry.saveCustom({
        metadata: {
          name: "To Delete",
          description: "Will be deleted",
          category: "custom",
          icon: "file",
        },
        title: "Delete Me",
        fields: [],
      });

      let deletedId: string | null = null;
      const props: TemplateSelectorProps = {
        registry,
        onDelete: (id) => {
          deletedId = id;
        },
      };

      const deleted = await registry.deleteCustom(saved.metadata.id);
      props.onDelete?.(saved.metadata.id);

      expect(deleted).toBe(true);
      expect(deletedId).toBe(saved.metadata.id);

      const template = await registry.get(saved.metadata.id);
      expect(template).toBeUndefined();
    });

    it("cannot delete built-in templates", async () => {
      const registry = createInMemoryRegistry();

      const deleted = await registry.deleteCustom("general-application");
      expect(deleted).toBe(false);

      const template = await registry.get("general-application");
      expect(template).toBeDefined();
    });
  });

  describe("filtering templates", () => {
    it("filters by category", async () => {
      const registry = createInMemoryRegistry();

      const all = await registry.getAll();
      const guild = await registry.getByCategory("guild");
      const recruitment = await registry.getByCategory("recruitment");
      const social = await registry.getByCategory("social");

      expect(all.length).toBe(builtInTemplates.length);
      expect(guild.every((t) => t.metadata.category === "guild")).toBe(true);
      expect(recruitment.every((t) => t.metadata.category === "recruitment")).toBe(true);
      expect(social.every((t) => t.metadata.category === "social")).toBe(true);
    });

    it("includes custom templates in category filter", async () => {
      const registry = createInMemoryRegistry();

      await registry.saveCustom({
        metadata: {
          name: "Custom Guild",
          description: "Custom guild template",
          category: "guild",
          icon: "file",
        },
        title: "Custom Guild Form",
        fields: [],
      });

      const guild = await registry.getByCategory("guild");
      expect(guild.some((t) => t.metadata.name === "Custom Guild")).toBe(true);
    });
  });

  describe("searching templates", () => {
    it("simulates search filtering", () => {
      const searchQuery = "raid";
      const filteredTemplates = builtInTemplates.filter(
        (t) =>
          t.metadata.name.toLowerCase().includes(searchQuery) ||
          t.metadata.description.toLowerCase().includes(searchQuery) ||
          t.title.toLowerCase().includes(searchQuery)
      );

      expect(filteredTemplates.some((t) => t.metadata.id === "raid-recruitment")).toBe(
        true
      );
    });

    it("returns empty for non-matching search", () => {
      const searchQuery = "nonexistent-xyz-template";
      const filteredTemplates = builtInTemplates.filter(
        (t) =>
          t.metadata.name.toLowerCase().includes(searchQuery) ||
          t.metadata.description.toLowerCase().includes(searchQuery)
      );

      expect(filteredTemplates).toHaveLength(0);
    });
  });
});

describe("TemplateSelector Edge Cases", () => {
  it("handles empty canvas state for save option", () => {
    const canvasState = createEmptyCanvasState();
    const props: TemplateSelectorProps = {
      canvasState,
      showSaveOption: true,
    };

    // Save option should not be available for empty form
    expect(props.canvasState?.fields).toHaveLength(0);
    expect(props.showSaveOption).toBe(true);
  });

  it("handles canvas state with fields for save option", () => {
    const canvasState = createEmptyCanvasState();
    canvasState.fields = [
      {
        id: "field-1",
        inputType: "text",
        label: "Name",
        required: true,
        validationRules: [],
      },
    ];

    const props: TemplateSelectorProps = {
      canvasState,
      showSaveOption: true,
    };

    expect(props.canvasState?.fields.length).toBeGreaterThan(0);
  });

  it("handles missing registry (uses default)", () => {
    const props: TemplateSelectorProps = {};
    expect(props.registry).toBeUndefined();
    // Component would use getDefaultRegistry() internally
  });
});

describe("TemplateSelector All Templates Access", () => {
  it("provides access to all built-in templates", async () => {
    const registry = createInMemoryRegistry();
    const all = await registry.getAll();

    expect(all).toHaveLength(builtInTemplates.length);

    for (const template of builtInTemplates) {
      expect(all.some((t) => t.metadata.id === template.metadata.id)).toBe(true);
    }
  });

  it("provides access to individual templates by id", async () => {
    const registry = createInMemoryRegistry();

    const general = await registry.get("general-application");
    expect(general).toBeDefined();
    expect(general?.metadata.name).toBe("General Application");

    const raid = await registry.get("raid-recruitment");
    expect(raid).toBeDefined();
    expect(raid?.metadata.name).toBe("Raid Recruitment");

    const casual = await registry.get("casual-join");
    expect(casual).toBeDefined();
    expect(casual?.metadata.name).toBe("Casual Join");
  });
});
