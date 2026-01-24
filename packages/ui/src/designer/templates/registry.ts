/**
 * Template Registry (PZ-106)
 *
 * Manages built-in and custom templates.
 */

import { generateUUIDv7 } from "../types";
import { builtInTemplates, getBuiltInTemplate } from "./builtin";
import type {
  FormTemplate,
  TemplateCategory,
  TemplateMetadata,
  TemplateRegistry,
  TemplateStorage,
} from "./types";

// -----------------------------------------------------------------------------
// In-Memory Storage (Default)
// -----------------------------------------------------------------------------

/**
 * Creates an in-memory template storage.
 * Useful for testing or when persistence isn't needed.
 */
export function createInMemoryStorage(): TemplateStorage {
  const templates = new Map<string, FormTemplate>();

  return {
    async getAll(): Promise<FormTemplate[]> {
      return Array.from(templates.values());
    },

    async save(template: FormTemplate): Promise<void> {
      templates.set(template.metadata.id, template);
    },

    async delete(templateId: string): Promise<boolean> {
      return templates.delete(templateId);
    },

    async clear(): Promise<void> {
      templates.clear();
    },
  };
}

// -----------------------------------------------------------------------------
// LocalStorage Storage
// -----------------------------------------------------------------------------

const STORAGE_KEY = "phantom-zone-custom-templates";

/**
 * Creates a localStorage-based template storage.
 * Templates persist across browser sessions.
 */
export function createLocalStorage(): TemplateStorage {
  function readFromStorage(): Map<string, FormTemplate> {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return new Map();
      }
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return new Map();
      }
      const parsed = JSON.parse(data) as FormTemplate[];
      return new Map(parsed.map((t) => [t.metadata.id, t]));
    } catch {
      return new Map();
    }
  }

  function writeToStorage(templates: Map<string, FormTemplate>): void {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }
      const data = Array.from(templates.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Silently fail if storage is full or unavailable
    }
  }

  return {
    async getAll(): Promise<FormTemplate[]> {
      return Array.from(readFromStorage().values());
    },

    async save(template: FormTemplate): Promise<void> {
      const templates = readFromStorage();
      templates.set(template.metadata.id, template);
      writeToStorage(templates);
    },

    async delete(templateId: string): Promise<boolean> {
      const templates = readFromStorage();
      const deleted = templates.delete(templateId);
      if (deleted) {
        writeToStorage(templates);
      }
      return deleted;
    },

    async clear(): Promise<void> {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
  };
}

// -----------------------------------------------------------------------------
// Template Registry
// -----------------------------------------------------------------------------

/**
 * Creates a template registry with the specified storage backend.
 */
export function createTemplateRegistry(storage: TemplateStorage): TemplateRegistry {
  return {
    getBuiltIn(): FormTemplate[] {
      return [...builtInTemplates];
    },

    async getCustom(): Promise<FormTemplate[]> {
      return storage.getAll();
    },

    async getAll(): Promise<FormTemplate[]> {
      const custom = await storage.getAll();
      return [...builtInTemplates, ...custom];
    },

    async get(templateId: string): Promise<FormTemplate | undefined> {
      // Check built-in first
      const builtIn = getBuiltInTemplate(templateId);
      if (builtIn) {
        return builtIn;
      }

      // Check custom templates
      const customTemplates = await storage.getAll();
      return customTemplates.find((t) => t.metadata.id === templateId);
    },

    async getByCategory(category: TemplateCategory): Promise<FormTemplate[]> {
      const all = await this.getAll();
      return all.filter((t) => t.metadata.category === category);
    },

    async saveCustom(
      template: Omit<FormTemplate, "metadata"> & {
        metadata: Omit<TemplateMetadata, "id" | "createdAt" | "updatedAt" | "isBuiltIn">;
      }
    ): Promise<FormTemplate> {
      const now = new Date().toISOString();
      const fullTemplate: FormTemplate = {
        ...template,
        metadata: {
          ...template.metadata,
          id: generateUUIDv7(),
          isBuiltIn: false,
          createdAt: now,
          updatedAt: now,
        },
      };

      await storage.save(fullTemplate);
      return fullTemplate;
    },

    async deleteCustom(templateId: string): Promise<boolean> {
      // Cannot delete built-in templates
      const builtIn = getBuiltInTemplate(templateId);
      if (builtIn) {
        return false;
      }

      return storage.delete(templateId);
    },
  };
}

/**
 * Creates a template registry with in-memory storage.
 */
export function createInMemoryRegistry(): TemplateRegistry {
  return createTemplateRegistry(createInMemoryStorage());
}

/**
 * Creates a template registry with localStorage.
 */
export function createLocalStorageRegistry(): TemplateRegistry {
  return createTemplateRegistry(createLocalStorage());
}

// -----------------------------------------------------------------------------
// Default Registry
// -----------------------------------------------------------------------------

let defaultRegistry: TemplateRegistry | null = null;

/**
 * Gets the default template registry (localStorage-backed).
 * Creates it on first access.
 */
export function getDefaultRegistry(): TemplateRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createLocalStorageRegistry();
  }
  return defaultRegistry;
}

/**
 * Resets the default registry.
 * Primarily useful for testing.
 */
export function resetDefaultRegistry(): void {
  defaultRegistry = null;
}
