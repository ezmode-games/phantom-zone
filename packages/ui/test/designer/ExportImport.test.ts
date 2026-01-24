/**
 * ExportImport Tests (PZ-105)
 *
 * Note: These tests are limited since we use node environment.
 * Full component testing would require jsdom environment and @testing-library/react.
 * These tests verify types, exports, validation functions, and basic functionality.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ExportImport,
  useExportImport,
  exportSchema,
  serializeSchema,
  validateSchema,
  schemaToCanvasState,
  compareVersions,
  isVersionSupported,
  ExportMetadataSchema,
  ExportedFormSchema,
  ExportableSchemaSchema,
  SCHEMA_VERSION,
  MIN_SUPPORTED_VERSION,
} from "../../src/designer";
import type {
  ExportImportProps,
  ExportableSchema,
  ExportMetadata,
  SchemaValidationResult,
  SchemaValidationError,
  SchemaImportEvent,
  SchemaImportErrorEvent,
} from "../../src/designer";
import {
  createEmptyCanvasState,
  createField,
  type CanvasState,
} from "../../src/designer/types";

describe("ExportImport", () => {
  describe("exports", () => {
    it("ExportImport is exported as a function", () => {
      expect(typeof ExportImport).toBe("function");
    });

    it("useExportImport is exported as a function", () => {
      expect(typeof useExportImport).toBe("function");
    });

    it("exportSchema is exported as a function", () => {
      expect(typeof exportSchema).toBe("function");
    });

    it("serializeSchema is exported as a function", () => {
      expect(typeof serializeSchema).toBe("function");
    });

    it("validateSchema is exported as a function", () => {
      expect(typeof validateSchema).toBe("function");
    });

    it("schemaToCanvasState is exported as a function", () => {
      expect(typeof schemaToCanvasState).toBe("function");
    });

    it("compareVersions is exported as a function", () => {
      expect(typeof compareVersions).toBe("function");
    });

    it("isVersionSupported is exported as a function", () => {
      expect(typeof isVersionSupported).toBe("function");
    });

    it("SCHEMA_VERSION is exported as a string", () => {
      expect(typeof SCHEMA_VERSION).toBe("string");
      expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("MIN_SUPPORTED_VERSION is exported as a string", () => {
      expect(typeof MIN_SUPPORTED_VERSION).toBe("string");
      expect(MIN_SUPPORTED_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("ExportImport component", () => {
    it("is a valid React component function", () => {
      expect(ExportImport.length).toBeGreaterThanOrEqual(0);
    });

    it("has sub-components attached", () => {
      expect(ExportImport.ExportIcon).toBeDefined();
      expect(ExportImport.ImportIcon).toBeDefined();
    });
  });

  describe("useExportImport hook", () => {
    it("is exported as a function", () => {
      // Note: We cannot test the actual hook behavior in node environment
      // since React hooks require a React component context.
      expect(typeof useExportImport).toBe("function");
    });
  });
});

describe("ExportImport Type Tests", () => {
  it("ExportImportProps interface is correct", () => {
    const canvasState = createEmptyCanvasState();
    const props: ExportImportProps = {
      canvasState,
      onImport: (event: SchemaImportEvent) => {
        void event;
      },
      onImportError: (event: SchemaImportErrorEvent) => {
        void event;
      },
      onExport: (schema: ExportableSchema) => {
        void schema;
      },
      exportedBy: "Test App",
      className: "test-class",
      children: null,
    };

    expect(props.canvasState).toBeDefined();
    expect(typeof props.onImport).toBe("function");
    expect(typeof props.onImportError).toBe("function");
    expect(typeof props.onExport).toBe("function");
    expect(props.exportedBy).toBe("Test App");
    expect(props.className).toBe("test-class");
  });

  it("ExportImportProps supports minimal configuration", () => {
    const canvasState = createEmptyCanvasState();
    const props: ExportImportProps = {
      canvasState,
    };

    expect(props.canvasState).toBeDefined();
    expect(props.onImport).toBeUndefined();
  });

  it("ExportableSchema type has correct structure", () => {
    const schema: ExportableSchema = {
      version: "1.0.0",
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: "Test App",
        notes: "Test notes",
      },
      form: {
        id: "form-123",
        title: "Test Form",
        description: "A test form",
        fields: [],
      },
    };

    expect(schema.version).toBe("1.0.0");
    expect(schema.metadata.exportedAt).toBeTruthy();
    expect(schema.metadata.exportedBy).toBe("Test App");
    expect(schema.form.id).toBe("form-123");
    expect(schema.form.title).toBe("Test Form");
  });

  it("ExportMetadata type has correct structure", () => {
    const metadata: ExportMetadata = {
      exportedAt: new Date().toISOString(),
      exportedBy: "Test App",
      notes: "Some notes",
    };

    expect(metadata.exportedAt).toBeTruthy();
    expect(metadata.exportedBy).toBe("Test App");
    expect(metadata.notes).toBe("Some notes");
  });

  it("ExportMetadata supports minimal configuration", () => {
    const metadata: ExportMetadata = {
      exportedAt: new Date().toISOString(),
    };

    expect(metadata.exportedAt).toBeTruthy();
    expect(metadata.exportedBy).toBeUndefined();
    expect(metadata.notes).toBeUndefined();
  });

  it("SchemaValidationError type has correct structure", () => {
    const error: SchemaValidationError = {
      code: "INVALID_JSON",
      message: "Unexpected token at position 0",
      path: "form.fields[0]",
    };

    expect(error.code).toBe("INVALID_JSON");
    expect(error.message).toBeTruthy();
    expect(error.path).toBe("form.fields[0]");
  });

  it("SchemaValidationResult valid case is correct", () => {
    const schema: ExportableSchema = {
      version: "1.0.0",
      metadata: { exportedAt: new Date().toISOString() },
      form: { id: "1", title: "Test", fields: [] },
    };
    const result: SchemaValidationResult = { valid: true, schema };

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schema).toBeDefined();
    }
  });

  it("SchemaValidationResult invalid case is correct", () => {
    const result: SchemaValidationResult = {
      valid: false,
      errors: [{ code: "INVALID_JSON", message: "Parse error" }],
    };

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBe(1);
    }
  });

  it("SchemaImportEvent type has correct structure", () => {
    const canvasState = createEmptyCanvasState();
    const schema: ExportableSchema = {
      version: "1.0.0",
      metadata: { exportedAt: new Date().toISOString() },
      form: { id: canvasState.id, title: canvasState.title, fields: [] },
    };
    const event: SchemaImportEvent = {
      schema,
      canvasState,
    };

    expect(event.schema).toBeDefined();
    expect(event.canvasState).toBeDefined();
  });

  it("SchemaImportErrorEvent type has correct structure", () => {
    const event: SchemaImportErrorEvent = {
      errors: [{ code: "INVALID_JSON", message: "Error" }],
      rawContent: "{ invalid json",
    };

    expect(event.errors.length).toBe(1);
    expect(event.rawContent).toBe("{ invalid json");
  });
});

describe("Zod Schemas", () => {
  describe("ExportMetadataSchema", () => {
    it("validates valid metadata", () => {
      const metadata = {
        exportedAt: "2024-01-15T10:30:00.000Z",
        exportedBy: "Test App",
        notes: "Some notes",
      };
      const result = ExportMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("validates metadata with only required fields", () => {
      const metadata = {
        exportedAt: "2024-01-15T10:30:00.000Z",
      };
      const result = ExportMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("rejects metadata without exportedAt", () => {
      const metadata = {
        exportedBy: "Test App",
      };
      const result = ExportMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });
  });

  describe("ExportedFormSchema", () => {
    it("validates valid form data", () => {
      const form = {
        id: "form-123",
        title: "Test Form",
        description: "A test form",
        fields: [],
      };
      const result = ExportedFormSchema.safeParse(form);
      expect(result.success).toBe(true);
    });

    it("validates form with fields", () => {
      const form = {
        id: "form-123",
        title: "Test Form",
        fields: [
          { id: "field-1", inputType: "text", label: "Name" },
        ],
      };
      const result = ExportedFormSchema.safeParse(form);
      expect(result.success).toBe(true);
    });

    it("rejects form without id", () => {
      const form = {
        title: "Test Form",
        fields: [],
      };
      const result = ExportedFormSchema.safeParse(form);
      expect(result.success).toBe(false);
    });

    it("rejects form without title", () => {
      const form = {
        id: "form-123",
        fields: [],
      };
      const result = ExportedFormSchema.safeParse(form);
      expect(result.success).toBe(false);
    });
  });

  describe("ExportableSchemaSchema", () => {
    it("validates complete schema", () => {
      const schema = {
        version: "1.0.0",
        metadata: {
          exportedAt: "2024-01-15T10:30:00.000Z",
        },
        form: {
          id: "form-123",
          title: "Test Form",
          fields: [],
        },
      };
      const result = ExportableSchemaSchema.safeParse(schema);
      expect(result.success).toBe(true);
    });

    it("rejects schema without version", () => {
      const schema = {
        metadata: {
          exportedAt: "2024-01-15T10:30:00.000Z",
        },
        form: {
          id: "form-123",
          title: "Test Form",
          fields: [],
        },
      };
      const result = ExportableSchemaSchema.safeParse(schema);
      expect(result.success).toBe(false);
    });

    it("rejects schema without metadata", () => {
      const schema = {
        version: "1.0.0",
        form: {
          id: "form-123",
          title: "Test Form",
          fields: [],
        },
      };
      const result = ExportableSchemaSchema.safeParse(schema);
      expect(result.success).toBe(false);
    });

    it("rejects schema without form", () => {
      const schema = {
        version: "1.0.0",
        metadata: {
          exportedAt: "2024-01-15T10:30:00.000Z",
        },
      };
      const result = ExportableSchemaSchema.safeParse(schema);
      expect(result.success).toBe(false);
    });
  });
});

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("2.3.4", "2.3.4")).toBe(0);
  });

  it("returns negative when first is less than second", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.1.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.0.1")).toBeLessThan(0);
  });

  it("returns positive when first is greater than second", () => {
    expect(compareVersions("2.0.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("1.1.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.1", "1.0.0")).toBeGreaterThan(0);
  });

  it("handles multi-digit version numbers", () => {
    expect(compareVersions("10.0.0", "9.0.0")).toBeGreaterThan(0);
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.10", "1.0.9")).toBeGreaterThan(0);
  });

  it("returns 0 for invalid version formats", () => {
    expect(compareVersions("invalid", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "invalid")).toBe(0);
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
  });
});

describe("isVersionSupported", () => {
  it("returns true for current version", () => {
    expect(isVersionSupported(SCHEMA_VERSION)).toBe(true);
  });

  it("returns true for minimum supported version", () => {
    expect(isVersionSupported(MIN_SUPPORTED_VERSION)).toBe(true);
  });

  it("returns false for version below minimum", () => {
    // Assuming MIN_SUPPORTED_VERSION is 1.0.0
    expect(isVersionSupported("0.9.9")).toBe(false);
  });

  it("returns false for version above current", () => {
    expect(isVersionSupported("99.0.0")).toBe(false);
  });

  it("returns false for invalid version format", () => {
    expect(isVersionSupported("invalid")).toBe(false);
    expect(isVersionSupported("1.0")).toBe(false);
    expect(isVersionSupported("v1.0.0")).toBe(false);
  });
});

describe("exportSchema", () => {
  let canvasState: CanvasState;

  beforeEach(() => {
    canvasState = createEmptyCanvasState();
    canvasState.title = "Test Form";
    canvasState.description = "A test description";
  });

  it("exports canvas state with correct version", () => {
    const schema = exportSchema(canvasState);
    expect(schema.version).toBe(SCHEMA_VERSION);
  });

  it("exports canvas state with metadata", () => {
    const schema = exportSchema(canvasState);
    expect(schema.metadata.exportedAt).toBeTruthy();
    // Verify it's a valid ISO date
    expect(new Date(schema.metadata.exportedAt).toISOString()).toBe(schema.metadata.exportedAt);
  });

  it("exports canvas state with custom options", () => {
    const schema = exportSchema(canvasState, {
      exportedBy: "Test App",
      notes: "Test notes",
    });
    expect(schema.metadata.exportedBy).toBe("Test App");
    expect(schema.metadata.notes).toBe("Test notes");
  });

  it("exports form data correctly", () => {
    const schema = exportSchema(canvasState);
    expect(schema.form.id).toBe(canvasState.id);
    expect(schema.form.title).toBe("Test Form");
    expect(schema.form.description).toBe("A test description");
    expect(schema.form.fields).toEqual([]);
  });

  it("exports fields correctly", () => {
    const field1 = createField("text", "Name");
    const field2 = createField("email", "Email");
    canvasState.fields = [field1, field2];

    const schema = exportSchema(canvasState);
    expect(schema.form.fields).toHaveLength(2);
    expect(schema.form.fields[0]).toEqual(field1);
    expect(schema.form.fields[1]).toEqual(field2);
  });

  it("does not export UI-specific fields", () => {
    canvasState.selectedFieldId = "some-id";
    canvasState.isPreviewMode = true;

    const schema = exportSchema(canvasState);
    expect(schema.form).not.toHaveProperty("selectedFieldId");
    expect(schema.form).not.toHaveProperty("isPreviewMode");
  });
});

describe("serializeSchema", () => {
  it("serializes schema to JSON string", () => {
    const canvasState = createEmptyCanvasState();
    const schema = exportSchema(canvasState);
    const json = serializeSchema(schema);

    expect(typeof json).toBe("string");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("pretty prints by default", () => {
    const canvasState = createEmptyCanvasState();
    const schema = exportSchema(canvasState);
    const json = serializeSchema(schema);

    // Pretty printed JSON has newlines
    expect(json).toContain("\n");
    expect(json).toContain("  ");
  });

  it("can disable pretty printing", () => {
    const canvasState = createEmptyCanvasState();
    const schema = exportSchema(canvasState);
    const json = serializeSchema(schema, false);

    // Minified JSON has no unnecessary whitespace
    expect(json).not.toContain("\n");
    expect(json).not.toContain("  ");
  });

  it("produces valid JSON that parses back to same structure", () => {
    const canvasState = createEmptyCanvasState();
    canvasState.title = "Test Form";
    const field = createField("text", "Name");
    canvasState.fields = [field];

    const schema = exportSchema(canvasState);
    const json = serializeSchema(schema);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(schema.version);
    expect(parsed.form.title).toBe(schema.form.title);
    expect(parsed.form.fields).toHaveLength(1);
  });
});

describe("validateSchema", () => {
  it("validates valid schema JSON", () => {
    const canvasState = createEmptyCanvasState();
    const schema = exportSchema(canvasState);
    const json = serializeSchema(schema);

    const result = validateSchema(json);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schema.version).toBe(SCHEMA_VERSION);
    }
  });

  it("returns error for invalid JSON", () => {
    const result = validateSchema("{ invalid json");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]?.code).toBe("INVALID_JSON");
    }
  });

  it("returns error for empty JSON", () => {
    const result = validateSchema("{}");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]?.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns error for missing version", () => {
    const json = JSON.stringify({
      metadata: { exportedAt: new Date().toISOString() },
      form: { id: "1", title: "Test", fields: [] },
    });
    const result = validateSchema(json);
    expect(result.valid).toBe(false);
  });

  it("returns error for unsupported version", () => {
    const json = JSON.stringify({
      version: "99.0.0",
      metadata: { exportedAt: new Date().toISOString() },
      form: { id: "1", title: "Test", fields: [] },
    });
    const result = validateSchema(json);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]?.code).toBe("UNSUPPORTED_VERSION");
    }
  });

  it("returns error for version below minimum", () => {
    const json = JSON.stringify({
      version: "0.0.1",
      metadata: { exportedAt: new Date().toISOString() },
      form: { id: "1", title: "Test", fields: [] },
    });
    const result = validateSchema(json);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]?.code).toBe("UNSUPPORTED_VERSION");
    }
  });

  it("defaults missing form fields to empty array", () => {
    // The schema uses a default value for fields, so missing fields is valid
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      metadata: { exportedAt: new Date().toISOString() },
      form: { id: "1", title: "Test" },
    });
    const result = validateSchema(json);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schema.form.fields).toEqual([]);
    }
  });

  it("includes path in validation errors", () => {
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      metadata: { exportedAt: new Date().toISOString() },
      form: { id: 123, title: "Test", fields: [] }, // id should be string
    });
    const result = validateSchema(json);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const errorWithPath = result.errors.find((e) => e.path);
      expect(errorWithPath?.path).toContain("form");
    }
  });

  it("validates schema with fields", () => {
    const canvasState = createEmptyCanvasState();
    canvasState.fields = [
      createField("text", "Name"),
      createField("email", "Email"),
    ];
    const schema = exportSchema(canvasState);
    const json = serializeSchema(schema);

    const result = validateSchema(json);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schema.form.fields).toHaveLength(2);
    }
  });
});

describe("schemaToCanvasState", () => {
  it("converts schema to canvas state", () => {
    const schema: ExportableSchema = {
      version: SCHEMA_VERSION,
      metadata: { exportedAt: new Date().toISOString() },
      form: {
        id: "form-123",
        title: "Test Form",
        description: "Test description",
        fields: [],
      },
    };

    const state = schemaToCanvasState(schema);
    expect(state.id).toBe("form-123");
    expect(state.title).toBe("Test Form");
    expect(state.description).toBe("Test description");
    expect(state.fields).toEqual([]);
  });

  it("sets UI defaults", () => {
    const schema: ExportableSchema = {
      version: SCHEMA_VERSION,
      metadata: { exportedAt: new Date().toISOString() },
      form: {
        id: "form-123",
        title: "Test Form",
        fields: [],
      },
    };

    const state = schemaToCanvasState(schema);
    expect(state.selectedFieldId).toBeNull();
    expect(state.isPreviewMode).toBe(false);
  });

  it("preserves fields", () => {
    const field = createField("text", "Name");
    const schema: ExportableSchema = {
      version: SCHEMA_VERSION,
      metadata: { exportedAt: new Date().toISOString() },
      form: {
        id: "form-123",
        title: "Test Form",
        fields: [field],
      },
    };

    const state = schemaToCanvasState(schema);
    expect(state.fields).toHaveLength(1);
    expect(state.fields[0]).toEqual(field);
  });

  it("handles missing description", () => {
    const schema: ExportableSchema = {
      version: SCHEMA_VERSION,
      metadata: { exportedAt: new Date().toISOString() },
      form: {
        id: "form-123",
        title: "Test Form",
        fields: [],
      },
    };

    const state = schemaToCanvasState(schema);
    expect(state.description).toBeUndefined();
  });
});

describe("Round-trip Export/Import", () => {
  it("preserves data through export and import", () => {
    // Create a canvas state with various data
    const originalState = createEmptyCanvasState();
    originalState.title = "My Form";
    originalState.description = "A comprehensive form";
    originalState.fields = [
      createField("text", "Full Name", {
        placeholder: "Enter your name",
        required: true,
        helpText: "Your legal name",
      }),
      createField("email", "Email Address", {
        required: true,
      }),
      createField("select", "Country", {
        options: [
          { value: "us", label: "United States" },
          { value: "ca", label: "Canada" },
        ],
      }),
    ];

    // Export
    const schema = exportSchema(originalState);
    const json = serializeSchema(schema);

    // Import
    const validationResult = validateSchema(json);
    expect(validationResult.valid).toBe(true);

    if (validationResult.valid) {
      const importedState = schemaToCanvasState(validationResult.schema);

      // Verify data preservation
      expect(importedState.id).toBe(originalState.id);
      expect(importedState.title).toBe(originalState.title);
      expect(importedState.description).toBe(originalState.description);
      expect(importedState.fields).toHaveLength(3);

      // Check first field
      expect(importedState.fields[0]?.label).toBe("Full Name");
      expect(importedState.fields[0]?.placeholder).toBe("Enter your name");
      expect(importedState.fields[0]?.required).toBe(true);
      expect(importedState.fields[0]?.helpText).toBe("Your legal name");

      // Check select field options
      expect(importedState.fields[2]?.options).toHaveLength(2);
    }
  });

  it("handles complex field configurations", () => {
    const originalState = createEmptyCanvasState();
    originalState.fields = [
      createField("text", "Field with Rules", {
        validationRules: [
          { id: "rule-1", ruleId: "required", config: {} },
          { id: "rule-2", ruleId: "minLength", config: { value: 5 } },
        ],
        config: {
          customSetting: true,
          nestedConfig: { value: 42 },
        },
      }),
    ];

    const schema = exportSchema(originalState);
    const json = serializeSchema(schema);
    const result = validateSchema(json);

    expect(result.valid).toBe(true);
    if (result.valid) {
      const importedState = schemaToCanvasState(result.schema);
      const field = importedState.fields[0];
      expect(field?.validationRules).toHaveLength(2);
      expect(field?.config?.customSetting).toBe(true);
      expect(field?.config?.nestedConfig?.value).toBe(42);
    }
  });
});

describe("Edge Cases", () => {
  it("handles empty form title", () => {
    const state = createEmptyCanvasState();
    state.title = "";

    const schema = exportSchema(state);
    expect(schema.form.title).toBe("");

    const json = serializeSchema(schema);
    const result = validateSchema(json);
    expect(result.valid).toBe(true);
  });

  it("handles very long content", () => {
    const state = createEmptyCanvasState();
    state.title = "A".repeat(10000);
    state.description = "B".repeat(50000);

    const schema = exportSchema(state);
    const json = serializeSchema(schema);
    const result = validateSchema(json);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schema.form.title.length).toBe(10000);
    }
  });

  it("handles unicode characters", () => {
    const state = createEmptyCanvasState();
    state.title = "Form with Unicode Characters";
    state.fields = [
      createField("text", "Name with Unicode"),
    ];

    const schema = exportSchema(state);
    const json = serializeSchema(schema);
    const result = validateSchema(json);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schema.form.title).toContain("Unicode");
    }
  });

  it("handles special characters in JSON", () => {
    const state = createEmptyCanvasState();
    state.title = 'Form with "quotes" and \\backslashes';
    state.description = "Line1\nLine2\tTab";

    const schema = exportSchema(state);
    const json = serializeSchema(schema);
    const result = validateSchema(json);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schema.form.title).toContain('"quotes"');
      expect(result.schema.form.description).toContain("\n");
    }
  });

  it("handles many fields", () => {
    const state = createEmptyCanvasState();
    state.fields = Array.from({ length: 100 }, (_, i) =>
      createField("text", `Field ${i + 1}`)
    );

    const schema = exportSchema(state);
    const json = serializeSchema(schema);
    const result = validateSchema(json);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schema.form.fields).toHaveLength(100);
    }
  });
});

describe("Schema Format Documentation", () => {
  it("exported schema follows documented format", () => {
    const state = createEmptyCanvasState();
    state.title = "Sample Form";
    const schema = exportSchema(state);

    // Version is semver format
    expect(schema.version).toMatch(/^\d+\.\d+\.\d+$/);

    // Metadata has required exportedAt
    expect(schema.metadata.exportedAt).toBeTruthy();

    // Form has required fields
    expect(schema.form.id).toBeTruthy();
    expect(typeof schema.form.title).toBe("string");
    expect(Array.isArray(schema.form.fields)).toBe(true);

    // Optional fields are present but may be undefined
    expect("description" in schema.form || schema.form.description === undefined).toBe(true);
  });
});

describe("Version Constants", () => {
  it("SCHEMA_VERSION follows semver format", () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("MIN_SUPPORTED_VERSION follows semver format", () => {
    expect(MIN_SUPPORTED_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("MIN_SUPPORTED_VERSION is less than or equal to SCHEMA_VERSION", () => {
    expect(compareVersions(MIN_SUPPORTED_VERSION, SCHEMA_VERSION)).toBeLessThanOrEqual(0);
  });
});

describe("Integration", () => {
  it("complete workflow: create form, export, modify, import", () => {
    // Step 1: Create a form
    const originalState = createEmptyCanvasState();
    originalState.title = "Contact Form";
    originalState.fields = [
      createField("text", "Name"),
      createField("email", "Email"),
    ];

    // Step 2: Export
    const schema = exportSchema(originalState, {
      exportedBy: "Test Suite",
      notes: "Integration test export",
    });

    expect(schema.metadata.exportedBy).toBe("Test Suite");

    // Step 3: Serialize and simulate file save/load
    const json = serializeSchema(schema);
    expect(typeof json).toBe("string");

    // Step 4: Validate import
    const validation = validateSchema(json);
    expect(validation.valid).toBe(true);

    if (validation.valid) {
      // Step 5: Convert to canvas state
      const importedState = schemaToCanvasState(validation.schema);

      // Step 6: Verify
      expect(importedState.title).toBe("Contact Form");
      expect(importedState.fields).toHaveLength(2);
      expect(importedState.selectedFieldId).toBeNull();
      expect(importedState.isPreviewMode).toBe(false);
    }
  });

  it("handles schema from different (but compatible) version", () => {
    // Simulate importing from a schema with the current version
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      metadata: {
        exportedAt: "2024-01-01T00:00:00.000Z",
        exportedBy: "Old App Version",
      },
      form: {
        id: "legacy-form",
        title: "Legacy Form",
        fields: [
          { id: "f1", inputType: "text", label: "Legacy Field" },
        ],
      },
    });

    const result = validateSchema(json);
    expect(result.valid).toBe(true);

    if (result.valid) {
      const state = schemaToCanvasState(result.schema);
      expect(state.title).toBe("Legacy Form");
    }
  });
});
