/**
 * Template Selector Component (PZ-106)
 *
 * UI for browsing and selecting form templates.
 * Features:
 * - "Start from template" option in form designer
 * - Template preview before selection
 * - Editable after selection (loads into canvas state)
 * - Custom template management (save/delete)
 */

import {
  type ReactNode,
  useState,
  useCallback,
  useMemo,
  useEffect,
  createContext,
  useContext,
} from "react";
import type { CanvasState } from "../types";
import { applyTemplate, canvasStateToTemplate } from "./apply";
import { builtInTemplates } from "./builtin";
import { getDefaultRegistry, createInMemoryRegistry } from "./registry";
import type {
  FormTemplate,
  TemplateCategory,
  TemplateRegistry,
  TemplateSelectEvent,
  TemplateSaveEvent,
  TemplateDeleteEvent,
  TemplateApplyResult,
} from "./types";

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface TemplateSelectorContextValue {
  /** All available templates (built-in + custom) */
  templates: FormTemplate[];
  /** Currently selected template for preview */
  previewTemplate: FormTemplate | null;
  /** Whether templates are loading */
  isLoading: boolean;
  /** Current filter category */
  filterCategory: TemplateCategory | "all";
  /** Search query */
  searchQuery: string;
  /** Filtered templates based on category and search */
  filteredTemplates: FormTemplate[];
  /** Set the preview template */
  setPreviewTemplate: (template: FormTemplate | null) => void;
  /** Set the filter category */
  setFilterCategory: (category: TemplateCategory | "all") => void;
  /** Set the search query */
  setSearchQuery: (query: string) => void;
  /** Apply a template */
  applyTemplate: (template: FormTemplate) => TemplateApplyResult;
  /** Save current form as custom template */
  saveAsTemplate: (
    canvasState: CanvasState,
    metadata: { name: string; description: string; category: TemplateCategory; icon: string }
  ) => Promise<FormTemplate>;
  /** Delete a custom template */
  deleteTemplate: (templateId: string) => Promise<boolean>;
  /** Refresh templates from registry */
  refresh: () => Promise<void>;
}

const TemplateSelectorContext = createContext<TemplateSelectorContextValue | null>(null);

/**
 * Hook to access the TemplateSelector context.
 * Must be used within a TemplateSelector component.
 */
export function useTemplateSelector(): TemplateSelectorContextValue {
  const context = useContext(TemplateSelectorContext);
  if (!context) {
    throw new Error("useTemplateSelector must be used within a TemplateSelector component");
  }
  return context;
}

// -----------------------------------------------------------------------------
// Icon Components
// -----------------------------------------------------------------------------

function TemplateIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="32" height="32" rx="2" />
      <line x1="16" y1="16" x2="32" y2="16" />
      <line x1="16" y1="24" x2="28" y2="24" />
      <line x1="16" y1="32" x2="24" y2="32" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4" />
      <line x1="10" y1="10" x2="14" y2="14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polyline points="2,8 6,12 14,4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M2 4h12" />
      <path d="M5 4V2h6v2" />
      <path d="M3 4v10a1 1 0 001 1h8a1 1 0 001-1V4" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------

interface CategoryFilterProps {
  value: TemplateCategory | "all";
  onChange: (category: TemplateCategory | "all") => void;
}

function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const categories: Array<{ value: TemplateCategory | "all"; label: string }> = [
    { value: "all", label: "All Templates" },
    { value: "guild", label: "Guild" },
    { value: "recruitment", label: "Recruitment" },
    { value: "social", label: "Social" },
    { value: "custom", label: "My Templates" },
  ];

  return (
    <div data-testid="category-filter" role="group" aria-label="Filter by category">
      {categories.map((cat) => (
        <button
          key={cat.value}
          type="button"
          data-testid={`category-${cat.value}`}
          onClick={() => onChange(cat.value)}
          aria-pressed={value === cat.value}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (query: string) => void;
}

function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div data-testid="search-container">
      <SearchIcon />
      <input
        type="search"
        data-testid="template-search"
        placeholder="Search templates..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search templates"
      />
    </div>
  );
}

interface TemplateCardProps {
  template: FormTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onApply: () => void;
  onDelete?: () => void;
}

function TemplateCard({ template, isSelected, onSelect, onApply, onDelete }: TemplateCardProps) {
  return (
    <article
      data-testid={`template-card-${template.metadata.id}`}
      aria-selected={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="option"
    >
      <header data-testid="template-card-header">
        <h3 data-testid="template-name">{template.metadata.name}</h3>
        {template.metadata.isBuiltIn && (
          <span data-testid="builtin-badge" aria-label="Built-in template">
            Built-in
          </span>
        )}
      </header>
      <p data-testid="template-description">{template.metadata.description}</p>
      <footer data-testid="template-card-footer">
        <span data-testid="field-count">{template.fields.length} fields</span>
        <span data-testid="template-category">{template.metadata.category}</span>
      </footer>
      <div data-testid="template-actions">
        <button
          type="button"
          data-testid="apply-template-btn"
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          aria-label={`Use ${template.metadata.name} template`}
        >
          <CheckIcon />
          Use Template
        </button>
        {!template.metadata.isBuiltIn && onDelete && (
          <button
            type="button"
            data-testid="delete-template-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={`Delete ${template.metadata.name} template`}
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </article>
  );
}

interface TemplatePreviewProps {
  template: FormTemplate;
  onApply: () => void;
  onClose: () => void;
}

function TemplatePreview({ template, onApply, onClose }: TemplatePreviewProps) {
  return (
    <aside
      data-testid="template-preview"
      role="dialog"
      aria-label={`Preview of ${template.metadata.name}`}
    >
      <header data-testid="preview-header">
        <h2 data-testid="preview-title">{template.metadata.name}</h2>
        <button
          type="button"
          data-testid="close-preview-btn"
          onClick={onClose}
          aria-label="Close preview"
        >
          Close
        </button>
      </header>

      <div data-testid="preview-content">
        <p data-testid="preview-description">{template.metadata.description}</p>

        <section data-testid="preview-form" aria-label="Form preview">
          <h3 data-testid="preview-form-title">{template.title}</h3>
          {template.description && (
            <p data-testid="preview-form-description">{template.description}</p>
          )}

          <ul data-testid="preview-fields" aria-label="Form fields">
            {template.fields.map((field, index) => (
              <li key={index} data-testid={`preview-field-${index}`}>
                <span data-testid="field-label">
                  {field.label}
                  {field.required && <span aria-label="required"> *</span>}
                </span>
                <span data-testid="field-type">{field.inputType}</span>
                {field.helpText && (
                  <span data-testid="field-help">{field.helpText}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer data-testid="preview-footer">
        <button
          type="button"
          data-testid="apply-from-preview-btn"
          onClick={onApply}
        >
          Use This Template
        </button>
      </footer>
    </aside>
  );
}

interface EmptyStateProps {
  hasSearch: boolean;
  category: TemplateCategory | "all";
}

function EmptyState({ hasSearch, category }: EmptyStateProps) {
  const message = hasSearch
    ? "No templates match your search."
    : category === "custom"
    ? "You haven't saved any custom templates yet."
    : "No templates available in this category.";

  return (
    <div data-testid="empty-state" role="status">
      <TemplateIcon />
      <p>{message}</p>
      {category === "custom" && !hasSearch && (
        <p data-testid="empty-hint">
          Create a form and save it as a template to reuse later.
        </p>
      )}
    </div>
  );
}

interface TemplateGridProps {
  templates: FormTemplate[];
  previewTemplate: FormTemplate | null;
  onSelectPreview: (template: FormTemplate) => void;
  onApply: (template: FormTemplate) => void;
  onDelete: (templateId: string) => void;
  hasSearch: boolean;
  category: TemplateCategory | "all";
}

function TemplateGrid({
  templates,
  previewTemplate,
  onSelectPreview,
  onApply,
  onDelete,
  hasSearch,
  category,
}: TemplateGridProps) {
  if (templates.length === 0) {
    return <EmptyState hasSearch={hasSearch} category={category} />;
  }

  return (
    <div
      data-testid="template-grid"
      role="listbox"
      aria-label="Available templates"
    >
      {templates.map((template) => (
        <TemplateCard
          key={template.metadata.id}
          template={template}
          isSelected={previewTemplate?.metadata.id === template.metadata.id}
          onSelect={() => onSelectPreview(template)}
          onApply={() => onApply(template)}
          onDelete={
            template.metadata.isBuiltIn
              ? undefined
              : () => onDelete(template.metadata.id)
          }
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Save Template Dialog
// -----------------------------------------------------------------------------

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: {
    name: string;
    description: string;
    category: TemplateCategory;
    icon: string;
  }) => void;
}

function SaveTemplateDialog({ isOpen, onClose, onSave }: SaveTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("custom");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        icon: "file-plus",
      });

      // Reset form
      setName("");
      setDescription("");
      setCategory("custom");
      onClose();
    },
    [name, description, category, onSave, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      data-testid="save-template-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-dialog-title"
    >
      <form onSubmit={handleSubmit}>
        <h2 id="save-dialog-title" data-testid="save-dialog-title">
          Save as Template
        </h2>

        <div data-testid="save-form-fields">
          <label htmlFor="template-name">Template Name *</label>
          <input
            id="template-name"
            type="text"
            data-testid="template-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Custom Template"
            required
            aria-required="true"
          />

          <label htmlFor="template-description">Description</label>
          <textarea
            id="template-description"
            data-testid="template-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this template is for..."
            rows={3}
          />

          <label htmlFor="template-category">Category</label>
          <select
            id="template-category"
            data-testid="template-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
          >
            <option value="guild">Guild</option>
            <option value="recruitment">Recruitment</option>
            <option value="social">Social</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div data-testid="save-dialog-actions">
          <button
            type="button"
            data-testid="cancel-save-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="confirm-save-btn"
            disabled={!name.trim()}
          >
            Save Template
          </button>
        </div>
      </form>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export interface TemplateSelectorProps {
  /** Template registry to use (defaults to localStorage-backed registry) */
  registry?: TemplateRegistry;
  /** Callback when a template is applied */
  onApply?: (result: TemplateApplyResult) => void;
  /** Callback when a template is saved */
  onSave?: (template: FormTemplate) => void;
  /** Callback when a template is deleted */
  onDelete?: (templateId: string) => void;
  /** Current canvas state (for saving as template) */
  canvasState?: CanvasState;
  /** Whether to show the save as template option */
  showSaveOption?: boolean;
  /** Additional class name */
  className?: string;
  /** Children to render (e.g., custom header) */
  children?: ReactNode;
}

/**
 * TemplateSelector is a component for browsing and selecting form templates.
 *
 * Features:
 * - Browse built-in templates
 * - Filter by category
 * - Search templates
 * - Preview templates before applying
 * - Save custom templates
 * - Delete custom templates
 */
export function TemplateSelector({
  registry,
  onApply,
  onSave,
  onDelete,
  canvasState,
  showSaveOption = true,
  className,
  children,
}: TemplateSelectorProps) {
  // Use provided registry or default
  const templateRegistry = useMemo(
    () => registry ?? getDefaultRegistry(),
    [registry]
  );

  // State
  const [templates, setTemplates] = useState<FormTemplate[]>(builtInTemplates);
  const [isLoading, setIsLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Load templates on mount
  useEffect(() => {
    let mounted = true;

    async function loadTemplates() {
      setIsLoading(true);
      try {
        const all = await templateRegistry.getAll();
        if (mounted) {
          setTemplates(all);
        }
      } catch {
        // Fall back to built-in only
        if (mounted) {
          setTemplates(builtInTemplates);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      mounted = false;
    };
  }, [templateRegistry]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Filter by category
    if (filterCategory !== "all") {
      result = result.filter((t) => t.metadata.category === filterCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.metadata.name.toLowerCase().includes(query) ||
          t.metadata.description.toLowerCase().includes(query) ||
          t.title.toLowerCase().includes(query)
      );
    }

    return result;
  }, [templates, filterCategory, searchQuery]);

  // Apply a template
  const handleApplyTemplate = useCallback(
    (template: FormTemplate) => {
      const result = applyTemplate(template);
      onApply?.(result);
      return result;
    },
    [onApply]
  );

  // Save as template
  const handleSaveAsTemplate = useCallback(
    async (
      state: CanvasState,
      metadata: { name: string; description: string; category: TemplateCategory; icon: string }
    ) => {
      const templateData = canvasStateToTemplate(state, metadata);
      const saved = await templateRegistry.saveCustom(templateData);

      // Refresh templates
      const all = await templateRegistry.getAll();
      setTemplates(all);

      onSave?.(saved);
      return saved;
    },
    [templateRegistry, onSave]
  );

  // Delete template
  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      const deleted = await templateRegistry.deleteCustom(templateId);
      if (deleted) {
        // Refresh templates
        const all = await templateRegistry.getAll();
        setTemplates(all);

        // Clear preview if deleted template was being previewed
        if (previewTemplate?.metadata.id === templateId) {
          setPreviewTemplate(null);
        }

        onDelete?.(templateId);
      }
      return deleted;
    },
    [templateRegistry, previewTemplate, onDelete]
  );

  // Refresh templates
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await templateRegistry.getAll();
      setTemplates(all);
    } finally {
      setIsLoading(false);
    }
  }, [templateRegistry]);

  // Context value
  const contextValue = useMemo<TemplateSelectorContextValue>(
    () => ({
      templates,
      previewTemplate,
      isLoading,
      filterCategory,
      searchQuery,
      filteredTemplates,
      setPreviewTemplate,
      setFilterCategory,
      setSearchQuery,
      applyTemplate: handleApplyTemplate,
      saveAsTemplate: handleSaveAsTemplate,
      deleteTemplate: handleDeleteTemplate,
      refresh: handleRefresh,
    }),
    [
      templates,
      previewTemplate,
      isLoading,
      filterCategory,
      searchQuery,
      filteredTemplates,
      handleApplyTemplate,
      handleSaveAsTemplate,
      handleDeleteTemplate,
      handleRefresh,
    ]
  );

  return (
    <TemplateSelectorContext.Provider value={contextValue}>
      <section
        data-testid="template-selector"
        className={className}
        role="region"
        aria-label="Form templates"
      >
        {children && (
          <div data-testid="template-selector-header">{children}</div>
        )}

        <div data-testid="template-controls">
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
          <CategoryFilter value={filterCategory} onChange={setFilterCategory} />
          {showSaveOption && canvasState && canvasState.fields.length > 0 && (
            <button
              type="button"
              data-testid="save-as-template-btn"
              onClick={() => setShowSaveDialog(true)}
              aria-label="Save current form as template"
            >
              Save as Template
            </button>
          )}
        </div>

        {isLoading ? (
          <div data-testid="loading-indicator" role="status" aria-live="polite">
            Loading templates...
          </div>
        ) : (
          <div data-testid="template-content">
            <TemplateGrid
              templates={filteredTemplates}
              previewTemplate={previewTemplate}
              onSelectPreview={setPreviewTemplate}
              onApply={handleApplyTemplate}
              onDelete={handleDeleteTemplate}
              hasSearch={searchQuery.trim().length > 0}
              category={filterCategory}
            />

            {previewTemplate && (
              <TemplatePreview
                template={previewTemplate}
                onApply={() => handleApplyTemplate(previewTemplate)}
                onClose={() => setPreviewTemplate(null)}
              />
            )}
          </div>
        )}

        {canvasState && (
          <SaveTemplateDialog
            isOpen={showSaveDialog}
            onClose={() => setShowSaveDialog(false)}
            onSave={(metadata) => handleSaveAsTemplate(canvasState, metadata)}
          />
        )}
      </section>
    </TemplateSelectorContext.Provider>
  );
}

// Export sub-components for flexibility
TemplateSelector.CategoryFilter = CategoryFilter;
TemplateSelector.SearchInput = SearchInput;
TemplateSelector.TemplateCard = TemplateCard;
TemplateSelector.TemplatePreview = TemplatePreview;
TemplateSelector.TemplateGrid = TemplateGrid;
TemplateSelector.SaveTemplateDialog = SaveTemplateDialog;
TemplateSelector.EmptyState = EmptyState;
TemplateSelector.TemplateIcon = TemplateIcon;
