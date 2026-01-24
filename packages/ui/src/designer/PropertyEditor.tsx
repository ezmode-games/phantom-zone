/**
 * Field Property Editor (PZ-102)
 *
 * A panel to configure selected field's properties and attached rules.
 * Features:
 * - Field props editing (label, help text, placeholder)
 * - Attached rules list with expand/collapse for config
 * - Click rule to configure (min/max values, etc.)
 * - Remove rule button
 * - Quick-add compatible rules dropdown
 * - Drag to reorder rules using @dnd-kit
 */

import {
  type ReactNode,
  useState,
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
import type {
  ValidationRuleId,
  ValidationRuleDefinition,
  InputTypeId,
} from "@phantom-zone/core";
import { getValidationRuleRegistry } from "@phantom-zone/core";

import type { CanvasField, AppliedValidationRule } from "./types";
import { generateUUIDv7 } from "./types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Field property values that can be edited.
 */
export interface FieldPropertyValues {
  label: string;
  helpText: string;
  placeholder: string;
  required: boolean;
}

/**
 * Event emitted when a field property changes.
 */
export interface FieldPropertyChangeEvent {
  fieldId: string;
  property: keyof FieldPropertyValues;
  value: string | boolean;
}

/**
 * Event emitted when a rule is added to a field.
 */
export interface RuleAddEvent {
  fieldId: string;
  ruleId: ValidationRuleId;
  config: Record<string, unknown>;
}

/**
 * Event emitted when a rule is removed from a field.
 */
export interface RuleRemoveEvent {
  fieldId: string;
  appliedRuleId: string;
}

/**
 * Event emitted when a rule's config changes.
 */
export interface RuleConfigChangeEvent {
  fieldId: string;
  appliedRuleId: string;
  config: Record<string, unknown>;
}

/**
 * Event emitted when rules are reordered.
 */
export interface RuleReorderEvent {
  fieldId: string;
  fromIndex: number;
  toIndex: number;
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

interface PropertyEditorContextValue {
  /** The field being edited */
  field: CanvasField | null;
  /** Currently expanded rule ID */
  expandedRuleId: string | null;
  /** Set the expanded rule */
  setExpandedRuleId: (ruleId: string | null) => void;
  /** Update a field property */
  onPropertyChange: (event: FieldPropertyChangeEvent) => void;
  /** Add a rule to the field */
  onRuleAdd: (event: RuleAddEvent) => void;
  /** Remove a rule from the field */
  onRuleRemove: (event: RuleRemoveEvent) => void;
  /** Update a rule's config */
  onRuleConfigChange: (event: RuleConfigChangeEvent) => void;
  /** Reorder rules */
  onRuleReorder: (event: RuleReorderEvent) => void;
  /** Get compatible rules for the current field */
  getCompatibleRules: () => ValidationRuleDefinition[];
  /** Check if a rule is already applied */
  isRuleApplied: (ruleId: ValidationRuleId) => boolean;
  /** Validation rule registry */
  ruleRegistry: ReturnType<typeof getValidationRuleRegistry>;
}

const PropertyEditorContext = createContext<PropertyEditorContextValue | null>(null);

/**
 * Hook to access the PropertyEditor context.
 * Must be used within a PropertyEditor component.
 */
export function usePropertyEditor(): PropertyEditorContextValue {
  const context = useContext(PropertyEditorContext);
  if (!context) {
    throw new Error("usePropertyEditor must be used within a PropertyEditor component");
  }
  return context;
}

// -----------------------------------------------------------------------------
// Sortable Rule Item
// -----------------------------------------------------------------------------

interface SortableRuleItemProps {
  appliedRule: AppliedValidationRule;
  ruleDefinition: ValidationRuleDefinition | undefined;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onConfigChange: (config: Record<string, unknown>) => void;
  renderRuleConfig?: (
    ruleId: ValidationRuleId,
    config: Record<string, unknown>,
    onChange: (config: Record<string, unknown>) => void
  ) => ReactNode;
}

function SortableRuleItem({
  appliedRule,
  ruleDefinition,
  isExpanded,
  onToggleExpand,
  onRemove,
  onConfigChange,
  renderRuleConfig,
}: SortableRuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: appliedRule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggleExpand();
      }
      if (event.key === "Delete") {
        event.preventDefault();
        onRemove();
      }
    },
    [onToggleExpand, onRemove]
  );

  const ruleName = ruleDefinition?.name ?? appliedRule.ruleId;
  const ruleIcon = ruleDefinition?.icon ?? "question";
  const ruleDescription = ruleDefinition?.description;
  const hasConfig = ruleDefinition?.defaultConfig && Object.keys(ruleDefinition.defaultConfig).length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`rule-item-${appliedRule.id}`}
      data-expanded={isExpanded}
      data-dragging={isDragging}
      role="listitem"
    >
      <div data-testid="rule-item-header">
        {/* Drag Handle */}
        <button
          type="button"
          data-testid={`rule-drag-handle-${appliedRule.id}`}
          aria-label={`Drag to reorder ${ruleName}`}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>

        {/* Rule Info */}
        <button
          type="button"
          data-testid={`rule-toggle-${appliedRule.id}`}
          onClick={onToggleExpand}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          aria-controls={`rule-config-${appliedRule.id}`}
        >
          <span data-testid="rule-icon" aria-hidden="true">
            {ruleIcon}
          </span>
          <span data-testid="rule-name">{ruleName}</span>
          {hasConfig && (
            <span data-testid="rule-chevron" aria-hidden="true">
              {isExpanded ? "v" : ">"}
            </span>
          )}
        </button>

        {/* Remove Button */}
        <button
          type="button"
          data-testid={`rule-remove-${appliedRule.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${ruleName} rule`}
        >
          <RemoveIcon />
        </button>
      </div>

      {/* Rule Config Panel */}
      {isExpanded && hasConfig && (
        <div
          id={`rule-config-${appliedRule.id}`}
          data-testid={`rule-config-${appliedRule.id}`}
          role="region"
          aria-label={`${ruleName} configuration`}
        >
          {ruleDescription && (
            <p data-testid="rule-description">{ruleDescription}</p>
          )}
          {renderRuleConfig ? (
            renderRuleConfig(
              appliedRule.ruleId as ValidationRuleId,
              appliedRule.config,
              onConfigChange
            )
          ) : (
            <DefaultRuleConfig
              ruleId={appliedRule.ruleId as ValidationRuleId}
              config={appliedRule.config}
              onChange={onConfigChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Default Rule Configuration Components
// -----------------------------------------------------------------------------

interface DefaultRuleConfigProps {
  ruleId: ValidationRuleId;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

function DefaultRuleConfig({ ruleId, config, onChange }: DefaultRuleConfigProps) {
  switch (ruleId) {
    case "minLength":
      return (
        <NumberConfigField
          label="Minimum Length"
          name="length"
          value={config.length as number | undefined}
          onChange={(value) => onChange({ ...config, length: value })}
          min={0}
        />
      );
    case "maxLength":
      return (
        <NumberConfigField
          label="Maximum Length"
          name="length"
          value={config.length as number | undefined}
          onChange={(value) => onChange({ ...config, length: value })}
          min={0}
        />
      );
    case "min":
      return (
        <NumberConfigField
          label="Minimum Value"
          name="value"
          value={config.value as number | undefined}
          onChange={(value) => onChange({ ...config, value })}
        />
      );
    case "max":
      return (
        <NumberConfigField
          label="Maximum Value"
          name="value"
          value={config.value as number | undefined}
          onChange={(value) => onChange({ ...config, value })}
        />
      );
    case "step":
      return (
        <NumberConfigField
          label="Step Value"
          name="step"
          value={config.step as number | undefined}
          onChange={(value) => onChange({ ...config, step: value })}
          min={0}
        />
      );
    case "minItems":
      return (
        <NumberConfigField
          label="Minimum Items"
          name="min"
          value={config.min as number | undefined}
          onChange={(value) => onChange({ ...config, min: value })}
          min={0}
        />
      );
    case "maxItems":
      return (
        <NumberConfigField
          label="Maximum Items"
          name="max"
          value={config.max as number | undefined}
          onChange={(value) => onChange({ ...config, max: value })}
          min={1}
        />
      );
    case "pattern":
      return (
        <div data-testid="pattern-config">
          <TextConfigField
            label="Pattern (RegExp)"
            name="pattern"
            value={config.pattern as string | undefined}
            onChange={(value) => onChange({ ...config, pattern: value })}
            placeholder="e.g., ^[A-Za-z]+$"
          />
          <TextConfigField
            label="Error Message"
            name="message"
            value={config.message as string | undefined}
            onChange={(value) => onChange({ ...config, message: value })}
            placeholder="Invalid format"
          />
        </div>
      );
    case "fileSize":
      return (
        <NumberConfigField
          label="Max Size (bytes)"
          name="maxBytes"
          value={config.maxBytes as number | undefined}
          onChange={(value) => onChange({ ...config, maxBytes: value })}
          min={0}
        />
      );
    case "fileType":
      return (
        <TextConfigField
          label="Allowed Types (comma-separated)"
          name="types"
          value={(config.types as string[] | undefined)?.join(", ")}
          onChange={(value) =>
            onChange({
              ...config,
              types: value.split(",").map((t) => t.trim()).filter(Boolean),
            })
          }
          placeholder="image/*, application/pdf"
        />
      );
    case "minDate":
      return (
        <DateConfigField
          label="Minimum Date"
          name="date"
          value={config.date as string | undefined}
          onChange={(value) => onChange({ ...config, date: value })}
        />
      );
    case "maxDate":
      return (
        <DateConfigField
          label="Maximum Date"
          name="date"
          value={config.date as string | undefined}
          onChange={(value) => onChange({ ...config, date: value })}
        />
      );
    default:
      // Rules without config (required, email, url, uuid, integer, positive, negative)
      return (
        <p data-testid="no-config-message">
          This rule has no configurable options.
        </p>
      );
  }
}

// -----------------------------------------------------------------------------
// Config Field Components
// -----------------------------------------------------------------------------

interface NumberConfigFieldProps {
  label: string;
  name: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

function NumberConfigField({
  label,
  name,
  value,
  onChange,
  min,
  max,
}: NumberConfigFieldProps) {
  const inputId = `config-${name}-${generateUUIDv7().slice(0, 8)}`;

  return (
    <div data-testid={`config-field-${name}`}>
      <label htmlFor={inputId} data-testid={`config-label-${name}`}>
        {label}
      </label>
      <input
        id={inputId}
        type="number"
        data-testid={`config-input-${name}`}
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        aria-label={label}
      />
    </div>
  );
}

interface TextConfigFieldProps {
  label: string;
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}

function TextConfigField({
  label,
  name,
  value,
  onChange,
  placeholder,
}: TextConfigFieldProps) {
  const inputId = `config-${name}-${generateUUIDv7().slice(0, 8)}`;

  return (
    <div data-testid={`config-field-${name}`}>
      <label htmlFor={inputId} data-testid={`config-label-${name}`}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        data-testid={`config-input-${name}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

interface DateConfigFieldProps {
  label: string;
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
}

function DateConfigField({
  label,
  name,
  value,
  onChange,
}: DateConfigFieldProps) {
  const inputId = `config-${name}-${generateUUIDv7().slice(0, 8)}`;

  return (
    <div data-testid={`config-field-${name}`}>
      <label htmlFor={inputId} data-testid={`config-label-${name}`}>
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        data-testid={`config-input-${name}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Field Properties Section
// -----------------------------------------------------------------------------

interface FieldPropertiesSectionProps {
  field: CanvasField;
  onPropertyChange: (event: FieldPropertyChangeEvent) => void;
}

function FieldPropertiesSection({
  field,
  onPropertyChange,
}: FieldPropertiesSectionProps) {
  const handleChange = useCallback(
    (property: keyof FieldPropertyValues, value: string | boolean) => {
      onPropertyChange({
        fieldId: field.id,
        property,
        value,
      });
    },
    [field.id, onPropertyChange]
  );

  return (
    <section
      data-testid="field-properties-section"
      role="region"
      aria-label="Field properties"
    >
      <h3 data-testid="section-title">Field Properties</h3>

      {/* Label */}
      <div data-testid="property-label">
        <label htmlFor={`prop-label-${field.id}`}>Label</label>
        <input
          id={`prop-label-${field.id}`}
          type="text"
          data-testid="property-input-label"
          value={field.label}
          onChange={(e) => handleChange("label", e.target.value)}
          aria-label="Field label"
        />
      </div>

      {/* Help Text */}
      <div data-testid="property-helpText">
        <label htmlFor={`prop-helpText-${field.id}`}>Help Text</label>
        <input
          id={`prop-helpText-${field.id}`}
          type="text"
          data-testid="property-input-helpText"
          value={field.helpText ?? ""}
          onChange={(e) => handleChange("helpText", e.target.value)}
          placeholder="Optional help text for users"
          aria-label="Help text"
        />
      </div>

      {/* Placeholder */}
      <div data-testid="property-placeholder">
        <label htmlFor={`prop-placeholder-${field.id}`}>Placeholder</label>
        <input
          id={`prop-placeholder-${field.id}`}
          type="text"
          data-testid="property-input-placeholder"
          value={field.placeholder ?? ""}
          onChange={(e) => handleChange("placeholder", e.target.value)}
          placeholder="Placeholder text"
          aria-label="Placeholder"
        />
      </div>

      {/* Required Checkbox */}
      <div data-testid="property-required">
        <label htmlFor={`prop-required-${field.id}`}>
          <input
            id={`prop-required-${field.id}`}
            type="checkbox"
            data-testid="property-input-required"
            checked={field.required}
            onChange={(e) => handleChange("required", e.target.checked)}
            aria-label="Required field"
          />
          Required
        </label>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Rules Section
// -----------------------------------------------------------------------------

interface RulesSectionProps {
  field: CanvasField;
  expandedRuleId: string | null;
  setExpandedRuleId: (ruleId: string | null) => void;
  onRuleRemove: (event: RuleRemoveEvent) => void;
  onRuleConfigChange: (event: RuleConfigChangeEvent) => void;
  onRuleReorder: (event: RuleReorderEvent) => void;
  onRuleAdd: (event: RuleAddEvent) => void;
  ruleRegistry: ReturnType<typeof getValidationRuleRegistry>;
  renderRuleConfig?: (
    ruleId: ValidationRuleId,
    config: Record<string, unknown>,
    onChange: (config: Record<string, unknown>) => void
  ) => ReactNode;
}

function RulesSection({
  field,
  expandedRuleId,
  setExpandedRuleId,
  onRuleRemove,
  onRuleConfigChange,
  onRuleReorder,
  onRuleAdd,
  ruleRegistry,
  renderRuleConfig,
}: RulesSectionProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  // Get compatible rules for quick-add
  const compatibleRules = useMemo(() => {
    return ruleRegistry.getCompatibleRules(field.inputType as InputTypeId);
  }, [ruleRegistry, field.inputType]);

  // Get rules that haven't been applied yet
  const availableRules = useMemo(() => {
    const appliedRuleIds = new Set(field.validationRules.map((r) => r.ruleId));
    return compatibleRules.filter((r) => !appliedRuleIds.has(r.id));
  }, [compatibleRules, field.validationRules]);

  // Rule IDs for sortable context
  const ruleIds = useMemo(
    () => field.validationRules.map((r) => r.id),
    [field.validationRules]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = field.validationRules.findIndex((r) => r.id === active.id);
        const newIndex = field.validationRules.findIndex((r) => r.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          onRuleReorder({
            fieldId: field.id,
            fromIndex: oldIndex,
            toIndex: newIndex,
          });
        }
      }
    },
    [field, onRuleReorder]
  );

  // Handle quick-add rule
  const handleAddRule = useCallback(
    (ruleDef: ValidationRuleDefinition) => {
      onRuleAdd({
        fieldId: field.id,
        ruleId: ruleDef.id,
        config: { ...ruleDef.defaultConfig },
      });
      setIsDropdownOpen(false);
    },
    [field.id, onRuleAdd]
  );

  return (
    <section
      data-testid="rules-section"
      role="region"
      aria-label="Validation rules"
    >
      <div data-testid="rules-header">
        <h3 data-testid="rules-title">Validation Rules</h3>

        {/* Quick-add dropdown */}
        <div data-testid="quick-add-container">
          <button
            type="button"
            data-testid="quick-add-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
            disabled={availableRules.length === 0}
            aria-label="Add validation rule"
          >
            <PlusIcon />
            Add Rule
          </button>

          {isDropdownOpen && availableRules.length > 0 && (
            <ul
              data-testid="quick-add-dropdown"
              role="listbox"
              aria-label="Available rules"
            >
              {availableRules.map((ruleDef) => (
                <li key={ruleDef.id} role="option">
                  <button
                    type="button"
                    data-testid={`add-rule-${ruleDef.id}`}
                    onClick={() => handleAddRule(ruleDef)}
                    aria-label={`Add ${ruleDef.name} rule`}
                  >
                    <span data-testid="rule-add-icon" aria-hidden="true">
                      {ruleDef.icon}
                    </span>
                    <span data-testid="rule-add-name">{ruleDef.name}</span>
                    {ruleDef.description && (
                      <span data-testid="rule-add-description">
                        {ruleDef.description}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Applied rules list */}
      {field.validationRules.length === 0 ? (
        <p data-testid="no-rules-message">
          No validation rules applied. Add rules to enforce input constraints.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={ruleIds}
            strategy={verticalListSortingStrategy}
          >
            <ul
              data-testid="rules-list"
              role="list"
              aria-label="Applied validation rules"
            >
              {field.validationRules.map((appliedRule) => (
                <SortableRuleItem
                  key={appliedRule.id}
                  appliedRule={appliedRule}
                  ruleDefinition={ruleRegistry.get(appliedRule.ruleId as ValidationRuleId)}
                  isExpanded={expandedRuleId === appliedRule.id}
                  onToggleExpand={() =>
                    setExpandedRuleId(
                      expandedRuleId === appliedRule.id ? null : appliedRule.id
                    )
                  }
                  onRemove={() =>
                    onRuleRemove({
                      fieldId: field.id,
                      appliedRuleId: appliedRule.id,
                    })
                  }
                  onConfigChange={(config) =>
                    onRuleConfigChange({
                      fieldId: field.id,
                      appliedRuleId: appliedRule.id,
                      config,
                    })
                  }
                  renderRuleConfig={renderRuleConfig}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Empty State
// -----------------------------------------------------------------------------

function EmptyState() {
  return (
    <div
      data-testid="property-editor-empty"
      role="status"
      aria-label="No field selected"
    >
      <div data-testid="empty-icon">
        <SettingsIcon />
      </div>
      <h3 data-testid="empty-title">No Field Selected</h3>
      <p data-testid="empty-description">
        Select a field on the canvas to edit its properties and validation rules.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Icons
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

function RemoveIcon() {
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
      <path d="M4 4l8 8M12 4l-8 8" />
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

function SettingsIcon() {
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
      <circle cx="24" cy="24" r="6" />
      <path d="M41 24c0-1.5-.5-3-1.5-4l2.5-4.5-3-3-4.5 2.5c-1-.5-2-1-3.5-1V8h-4v6c-1.5 0-2.5.5-3.5 1L19 12.5l-3 3 2.5 4.5c-1 1-1.5 2.5-1.5 4H11v4h6c0 1.5.5 3 1.5 4l-2.5 4.5 3 3 4.5-2.5c1 .5 2 1 3.5 1v6h4v-6c1.5 0 2.5-.5 3.5-1l4.5 2.5 3-3-2.5-4.5c1-1 1.5-2.5 1.5-4h6v-4h-6z" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// PropertyEditor Component
// -----------------------------------------------------------------------------

export interface PropertyEditorProps {
  /** The field to edit (null if no field selected) */
  field: CanvasField | null;
  /** Callback when a field property changes */
  onPropertyChange?: (event: FieldPropertyChangeEvent) => void;
  /** Callback when a rule is added */
  onRuleAdd?: (event: RuleAddEvent) => void;
  /** Callback when a rule is removed */
  onRuleRemove?: (event: RuleRemoveEvent) => void;
  /** Callback when a rule's config changes */
  onRuleConfigChange?: (event: RuleConfigChangeEvent) => void;
  /** Callback when rules are reordered */
  onRuleReorder?: (event: RuleReorderEvent) => void;
  /** Custom rule configuration renderer */
  renderRuleConfig?: (
    ruleId: ValidationRuleId,
    config: Record<string, unknown>,
    onChange: (config: Record<string, unknown>) => void
  ) => ReactNode;
  /** Additional class name */
  className?: string;
  /** Children to render (e.g., custom header) */
  children?: ReactNode;
}

/**
 * PropertyEditor is a panel for configuring a selected field's properties
 * and attached validation rules.
 *
 * Features:
 * - Edit field properties (label, help text, placeholder, required)
 * - View and manage attached validation rules
 * - Click to expand/configure rule settings
 * - Quick-add compatible rules via dropdown
 * - Drag to reorder rules
 */
export function PropertyEditor({
  field,
  onPropertyChange,
  onRuleAdd,
  onRuleRemove,
  onRuleConfigChange,
  onRuleReorder,
  renderRuleConfig,
  className,
  children,
}: PropertyEditorProps) {
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const ruleRegistry = useMemo(() => getValidationRuleRegistry(), []);

  // Handle property change
  const handlePropertyChange = useCallback(
    (event: FieldPropertyChangeEvent) => {
      onPropertyChange?.(event);
    },
    [onPropertyChange]
  );

  // Handle rule add
  const handleRuleAdd = useCallback(
    (event: RuleAddEvent) => {
      onRuleAdd?.(event);
    },
    [onRuleAdd]
  );

  // Handle rule remove
  const handleRuleRemove = useCallback(
    (event: RuleRemoveEvent) => {
      onRuleRemove?.(event);
      // Clear expanded state if the removed rule was expanded
      if (expandedRuleId === event.appliedRuleId) {
        setExpandedRuleId(null);
      }
    },
    [onRuleRemove, expandedRuleId]
  );

  // Handle rule config change
  const handleRuleConfigChange = useCallback(
    (event: RuleConfigChangeEvent) => {
      onRuleConfigChange?.(event);
    },
    [onRuleConfigChange]
  );

  // Handle rule reorder
  const handleRuleReorder = useCallback(
    (event: RuleReorderEvent) => {
      onRuleReorder?.(event);
    },
    [onRuleReorder]
  );

  // Get compatible rules for current field
  const getCompatibleRules = useCallback(() => {
    if (!field) return [];
    return ruleRegistry.getCompatibleRules(field.inputType as InputTypeId);
  }, [field, ruleRegistry]);

  // Check if a rule is already applied
  const isRuleApplied = useCallback(
    (ruleId: ValidationRuleId): boolean => {
      if (!field) return false;
      return field.validationRules.some((r) => r.ruleId === ruleId);
    },
    [field]
  );

  // Context value
  const contextValue = useMemo<PropertyEditorContextValue>(
    () => ({
      field,
      expandedRuleId,
      setExpandedRuleId,
      onPropertyChange: handlePropertyChange,
      onRuleAdd: handleRuleAdd,
      onRuleRemove: handleRuleRemove,
      onRuleConfigChange: handleRuleConfigChange,
      onRuleReorder: handleRuleReorder,
      getCompatibleRules,
      isRuleApplied,
      ruleRegistry,
    }),
    [
      field,
      expandedRuleId,
      handlePropertyChange,
      handleRuleAdd,
      handleRuleRemove,
      handleRuleConfigChange,
      handleRuleReorder,
      getCompatibleRules,
      isRuleApplied,
      ruleRegistry,
    ]
  );

  // Reset expanded state when field changes
  useMemo(() => {
    if (field?.id !== contextValue.field?.id) {
      setExpandedRuleId(null);
    }
  }, [field?.id, contextValue.field?.id]);

  return (
    <PropertyEditorContext.Provider value={contextValue}>
      <aside
        data-testid="property-editor"
        className={className}
        role="complementary"
        aria-label="Field property editor"
      >
        {children && (
          <div data-testid="property-editor-header">{children}</div>
        )}

        {!field ? (
          <EmptyState />
        ) : (
          <div data-testid="property-editor-content">
            {/* Field type indicator */}
            <div data-testid="field-type-indicator">
              <span data-testid="field-type-label">Field Type:</span>
              <span data-testid="field-type-value">{field.inputType}</span>
            </div>

            {/* Field Properties Section */}
            <FieldPropertiesSection
              field={field}
              onPropertyChange={handlePropertyChange}
            />

            {/* Validation Rules Section */}
            <RulesSection
              field={field}
              expandedRuleId={expandedRuleId}
              setExpandedRuleId={setExpandedRuleId}
              onRuleRemove={handleRuleRemove}
              onRuleConfigChange={handleRuleConfigChange}
              onRuleReorder={handleRuleReorder}
              onRuleAdd={handleRuleAdd}
              ruleRegistry={ruleRegistry}
              renderRuleConfig={renderRuleConfig}
            />
          </div>
        )}
      </aside>
    </PropertyEditorContext.Provider>
  );
}

// Export sub-components for flexibility
PropertyEditor.EmptyState = EmptyState;
PropertyEditor.FieldPropertiesSection = FieldPropertiesSection;
PropertyEditor.RulesSection = RulesSection;
PropertyEditor.DefaultRuleConfig = DefaultRuleConfig;
PropertyEditor.DragHandleIcon = DragHandleIcon;
PropertyEditor.RemoveIcon = RemoveIcon;
PropertyEditor.PlusIcon = PlusIcon;
PropertyEditor.SettingsIcon = SettingsIcon;
