/**
 * Form Templates (PZ-106)
 *
 * Pre-built form templates for common guild needs.
 */

// Types
export type {
  TemplateCategory,
  TemplateMetadata,
  FormTemplate,
  TemplateField,
  TemplateSelectEvent,
  TemplateSaveEvent,
  TemplateDeleteEvent,
  TemplateApplyResult,
  TemplateStorage,
  TemplateRegistry,
} from "./types";

// Built-in templates
export {
  generalApplicationTemplate,
  raidRecruitmentTemplate,
  casualJoinTemplate,
  builtInTemplates,
  getBuiltInTemplate,
  getBuiltInTemplatesByCategory,
} from "./builtin";

// Registry
export {
  createInMemoryStorage,
  createLocalStorage,
  createTemplateRegistry,
  createInMemoryRegistry,
  createLocalStorageRegistry,
  getDefaultRegistry,
  resetDefaultRegistry,
} from "./registry";

// Apply functions
export {
  templateFieldToCanvasField,
  applyTemplate,
  canvasStateToTemplate,
  mergeTemplateIntoCanvas,
  validateTemplate,
} from "./apply";

// Component and hook
export { TemplateSelector, useTemplateSelector } from "./TemplateSelector";
export type { TemplateSelectorProps } from "./TemplateSelector";
