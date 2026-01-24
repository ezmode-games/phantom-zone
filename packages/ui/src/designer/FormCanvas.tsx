import {
  type ReactNode,
  useReducer,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  canvasReducer,
  createEmptyCanvasState,
  createField,
  type CanvasAction,
  type CanvasField,
  type CanvasState,
} from "./types";
import type { InputTypeId } from "@phantom-zone/core";

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface FormCanvasContextValue {
  state: CanvasState;
  dispatch: (action: CanvasAction) => void;
  addField: (inputType: InputTypeId, label: string, index?: number) => void;
  removeField: (fieldId: string) => void;
  updateField: (fieldId: string, updates: Partial<Omit<CanvasField, "id">>) => void;
  selectField: (fieldId: string | null) => void;
  togglePreview: () => void;
}

const FormCanvasContext = createContext<FormCanvasContextValue | null>(null);

/**
 * Hook to access the FormCanvas context.
 * Must be used within a FormCanvas component.
 */
export function useFormCanvas(): FormCanvasContextValue {
  const context = useContext(FormCanvasContext);
  if (!context) {
    throw new Error("useFormCanvas must be used within a FormCanvas component");
  }
  return context;
}

// -----------------------------------------------------------------------------
// Sortable Field Item
// -----------------------------------------------------------------------------

interface SortableFieldItemProps {
  field: CanvasField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  renderField?: (field: CanvasField, isPreview: boolean) => ReactNode;
  isPreview: boolean;
}

function SortableFieldItem({
  field,
  isSelected,
  onSelect,
  onDelete,
  renderField,
  isPreview,
}: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, disabled: isPreview });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = useCallback(() => {
    if (!isPreview) {
      onSelect();
    }
  }, [isPreview, onSelect]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!isPreview) {
          onSelect();
        }
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (!isPreview && isSelected) {
          event.preventDefault();
          onDelete();
        }
      }
    },
    [isPreview, isSelected, onSelect, onDelete]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`canvas-field-${field.id}`}
      data-selected={isSelected}
      data-dragging={isDragging}
      role="listitem"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-selected={isSelected}
      aria-label={`Field: ${field.label}`}
    >
      <div data-testid="field-container">
        {/* Drag Handle */}
        {!isPreview && (
          <button
            type="button"
            data-testid={`drag-handle-${field.id}`}
            aria-label={`Drag to reorder ${field.label}`}
            {...attributes}
            {...listeners}
          >
            <DragHandleIcon />
          </button>
        )}

        {/* Field Content */}
        <div data-testid="field-content">
          {renderField ? (
            renderField(field, isPreview)
          ) : (
            <DefaultFieldRenderer field={field} isPreview={isPreview} />
          )}
        </div>

        {/* Delete Button */}
        {!isPreview && (
          <button
            type="button"
            data-testid={`delete-field-${field.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={`Delete ${field.label}`}
          >
            <DeleteIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Default Field Renderer
// -----------------------------------------------------------------------------

interface DefaultFieldRendererProps {
  field: CanvasField;
  isPreview: boolean;
}

function DefaultFieldRenderer({ field, isPreview }: DefaultFieldRendererProps) {
  return (
    <div data-testid="default-field-renderer">
      <label data-testid="field-label">
        {field.label}
        {field.required && <span aria-hidden="true"> *</span>}
      </label>
      {field.helpText && (
        <p data-testid="field-help-text">{field.helpText}</p>
      )}
      {isPreview && (
        <div data-testid="field-preview-input">
          <input
            type="text"
            placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
            disabled={!isPreview}
            aria-label={field.label}
          />
        </div>
      )}
      {!isPreview && (
        <p data-testid="field-type-badge">
          {field.inputType}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Empty State
// -----------------------------------------------------------------------------

interface EmptyStateProps {
  onAddField?: () => void;
}

function EmptyState({ onAddField }: EmptyStateProps) {
  return (
    <div
      data-testid="canvas-empty-state"
      role="status"
      aria-label="Empty form canvas"
    >
      <div data-testid="empty-state-icon">
        <FormIcon />
      </div>
      <h3 data-testid="empty-state-title">
        No fields yet
      </h3>
      <p data-testid="empty-state-description">
        Add your first question to start building your form
      </p>
      {onAddField && (
        <button
          type="button"
          onClick={onAddField}
          data-testid="add-first-field-button"
          aria-label="Add your first question"
        >
          <PlusIcon />
          Add your first question
        </button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Preview Toggle
// -----------------------------------------------------------------------------

interface PreviewToggleProps {
  isPreview: boolean;
  onToggle: () => void;
}

function PreviewToggle({ isPreview, onToggle }: PreviewToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="preview-toggle"
      aria-pressed={isPreview}
      aria-label={isPreview ? "Exit preview mode" : "Enter preview mode"}
    >
      {isPreview ? <EditIcon /> : <EyeIcon />}
      {isPreview ? "Edit" : "Preview"}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Icons (Simple SVG placeholders)
// -----------------------------------------------------------------------------

function DragHandleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="3" r="1.5" />
      <circle cx="11" cy="3" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="13" r="1.5" />
      <circle cx="11" cy="13" r="1.5" />
    </svg>
  );
}

function DeleteIcon() {
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
      <path d="M2 4h12M5.5 4V2.5h5V4M6 7v5M10 7v5M3.5 4l1 10h7l1-10" />
    </svg>
  );
}

function PlusIcon() {
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
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

function FormIcon() {
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
      <rect x="6" y="6" width="36" height="36" rx="4" />
      <path d="M12 16h24M12 24h18M12 32h12" />
    </svg>
  );
}

function EyeIcon() {
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
      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EditIcon() {
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
      <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// FormCanvas Component
// -----------------------------------------------------------------------------

export interface FormCanvasProps {
  /** Initial canvas state */
  initialState?: CanvasState;
  /** Callback when state changes */
  onChange?: (state: CanvasState) => void;
  /** Custom field renderer */
  renderField?: (field: CanvasField, isPreview: boolean) => ReactNode;
  /** Callback when add field button is clicked in empty state */
  onAddFieldClick?: () => void;
  /** Children to render (e.g., toolbar) */
  children?: ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * FormCanvas is the main drag-drop canvas for building forms visually.
 * It manages the form field state and provides reordering, selection,
 * and preview capabilities.
 */
export function FormCanvas({
  initialState,
  onChange,
  renderField,
  onAddFieldClick,
  children,
  className,
}: FormCanvasProps) {
  const [state, dispatch] = useReducer(
    canvasReducer,
    initialState ?? createEmptyCanvasState()
  );

  // Notify parent of state changes
  const wrappedDispatch = useCallback(
    (action: CanvasAction) => {
      dispatch(action);
      // Note: This calls onChange synchronously, but the state update is async
      // In a real app, you might want to use useEffect to sync state
    },
    []
  );

  // Helper functions
  const addField = useCallback(
    (inputType: InputTypeId, label: string, index?: number) => {
      const field = createField(inputType, label);
      wrappedDispatch({ type: "ADD_FIELD", field, index });
      onChange?.({
        ...state,
        fields: [...state.fields.slice(0, index ?? state.fields.length), field, ...state.fields.slice(index ?? state.fields.length)],
        selectedFieldId: field.id,
      });
    },
    [wrappedDispatch, onChange, state]
  );

  const removeField = useCallback(
    (fieldId: string) => {
      wrappedDispatch({ type: "REMOVE_FIELD", fieldId });
      const newFields = state.fields.filter((f) => f.id !== fieldId);
      const wasSelected = state.selectedFieldId === fieldId;
      onChange?.({
        ...state,
        fields: newFields,
        selectedFieldId: wasSelected ? null : state.selectedFieldId,
      });
    },
    [wrappedDispatch, onChange, state]
  );

  const updateField = useCallback(
    (fieldId: string, updates: Partial<Omit<CanvasField, "id">>) => {
      wrappedDispatch({ type: "UPDATE_FIELD", fieldId, updates });
      const newFields = state.fields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      );
      onChange?.({
        ...state,
        fields: newFields,
      });
    },
    [wrappedDispatch, onChange, state]
  );

  const selectField = useCallback(
    (fieldId: string | null) => {
      wrappedDispatch({ type: "SELECT_FIELD", fieldId });
      onChange?.({
        ...state,
        selectedFieldId: fieldId,
      });
    },
    [wrappedDispatch, onChange, state]
  );

  const togglePreview = useCallback(() => {
    wrappedDispatch({ type: "TOGGLE_PREVIEW" });
    onChange?.({
      ...state,
      isPreviewMode: !state.isPreviewMode,
      selectedFieldId: state.isPreviewMode ? state.selectedFieldId : null,
    });
  }, [wrappedDispatch, onChange, state]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = state.fields.findIndex((f) => f.id === active.id);
        const newIndex = state.fields.findIndex((f) => f.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          wrappedDispatch({
            type: "REORDER_FIELDS",
            fromIndex: oldIndex,
            toIndex: newIndex,
          });

          const newFields = [...state.fields];
          const [removed] = newFields.splice(oldIndex, 1);
          if (removed) {
            newFields.splice(newIndex, 0, removed);
          }
          onChange?.({
            ...state,
            fields: newFields,
          });
        }
      }
    },
    [state, wrappedDispatch, onChange]
  );

  // Field IDs for sortable context
  const fieldIds = useMemo(
    () => state.fields.map((f) => f.id),
    [state.fields]
  );

  // Context value
  const contextValue = useMemo<FormCanvasContextValue>(
    () => ({
      state,
      dispatch: wrappedDispatch,
      addField,
      removeField,
      updateField,
      selectField,
      togglePreview,
    }),
    [state, wrappedDispatch, addField, removeField, updateField, selectField, togglePreview]
  );

  const isEmpty = state.fields.length === 0;

  return (
    <FormCanvasContext.Provider value={contextValue}>
      <div
        data-testid="form-canvas"
        data-preview={state.isPreviewMode}
        className={className}
        role="region"
        aria-label="Form designer canvas"
      >
        {/* Toolbar area for children */}
        {children && (
          <div data-testid="canvas-toolbar">
            {children}
          </div>
        )}

        {/* Preview Toggle */}
        <div data-testid="canvas-header">
          <PreviewToggle
            isPreview={state.isPreviewMode}
            onToggle={togglePreview}
          />
        </div>

        {/* Canvas Content */}
        <div data-testid="canvas-content">
          {isEmpty ? (
            <EmptyState onAddField={onAddFieldClick} />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fieldIds}
                strategy={verticalListSortingStrategy}
              >
                <div
                  role="list"
                  aria-label="Form fields"
                  data-testid="field-list"
                >
                  {state.fields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      isSelected={state.selectedFieldId === field.id}
                      onSelect={() => selectField(field.id)}
                      onDelete={() => removeField(field.id)}
                      renderField={renderField}
                      isPreview={state.isPreviewMode}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </FormCanvasContext.Provider>
  );
}

// Export sub-components for flexibility
FormCanvas.EmptyState = EmptyState;
FormCanvas.PreviewToggle = PreviewToggle;
FormCanvas.DragHandleIcon = DragHandleIcon;
FormCanvas.DeleteIcon = DeleteIcon;
