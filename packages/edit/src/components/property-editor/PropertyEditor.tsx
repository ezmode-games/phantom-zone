/**
 * PropertyEditor Component
 *
 * Panel to edit selected block's props with form fields generated from Zod schema.
 * Implements PZ-208: Block Property Editor
 */

import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  $selectedBlock,
  $blockDefinition,
  $fieldMeta,
  $showPropertyEditor,
  $canMoveUp,
  $canMoveDown,
  $validationErrors,
  setErrors,
  clearErrors,
  markTouched,
} from "./state";
import { validateProps } from "./schema-parser";
import { FormField } from "./FormField";
import { ActionButtons } from "./ActionButtons";
import type { FieldError, FieldMeta, PropertyEditorProps } from "./types";

/**
 * Debounce helper
 */
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

/**
 * PropertyEditor component
 */
export function PropertyEditor({
  className = "",
  onPropsChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  showActions = true,
  liveUpdate = true,
  debounceDelay = 150,
}: PropertyEditorProps): ReactElement | null {
  const selectedBlock = useStore($selectedBlock);
  const blockDefinition = useStore($blockDefinition);
  const fieldMeta = useStore($fieldMeta);
  const showPropertyEditor = useStore($showPropertyEditor);
  const canMoveUp = useStore($canMoveUp);
  const canMoveDown = useStore($canMoveDown);
  const validationErrors = useStore($validationErrors);

  // Local state for form values (allows editing before commit)
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [initialized, setInitialized] = useState(false);

  // Sync local values with selected block props
  useEffect(() => {
    if (selectedBlock) {
      // Cast to Record<string, unknown> since BlockProps extends an interface
      setLocalValues(selectedBlock.props as Record<string, unknown>);
      setInitialized(true);
      clearErrors();
    } else {
      setLocalValues({});
      setInitialized(false);
      clearErrors();
    }
  }, [selectedBlock?.id]);

  // Debounced prop update
  const debouncedPropsChange = useDebounce(
    useCallback(
      (blockId: string, props: Record<string, unknown>) => {
        onPropsChange?.(blockId, props);
      },
      [onPropsChange]
    ),
    debounceDelay
  );

  // Handle field value change
  const handleFieldChange = useCallback(
    (fieldKey: string, value: unknown) => {
      if (!selectedBlock || !blockDefinition) return;

      const newValues = {
        ...localValues,
        [fieldKey]: value,
      };
      setLocalValues(newValues);
      markTouched();

      // Validate on change
      const validation = validateProps(blockDefinition.propsSchema, newValues);
      if (!validation.valid) {
        setErrors(validation.errors);
      } else {
        clearErrors();
      }

      // Live update if enabled and valid
      if (liveUpdate && validation.valid) {
        debouncedPropsChange(selectedBlock.id, newValues);
      }
    },
    [selectedBlock, blockDefinition, localValues, liveUpdate, debouncedPropsChange]
  );

  // Don't render if no block selected
  if (!showPropertyEditor || !selectedBlock || !blockDefinition) {
    return null;
  }

  return (
    <aside
      className={`pz-property-editor ${className}`}
      role="complementary"
      aria-label="Block properties"
    >
      <div className="pz-property-editor__header">
        <span
          className="pz-property-editor__icon"
          data-icon={blockDefinition.icon}
          aria-hidden="true"
        />
        <h2 className="pz-property-editor__title">{blockDefinition.name}</h2>
      </div>

      {blockDefinition.description && (
        <p className="pz-property-editor__description">{blockDefinition.description}</p>
      )}

      <form
        className="pz-property-editor__form"
        onSubmit={(e) => e.preventDefault()}
        noValidate
      >
        <div className="pz-property-editor__fields">
          {fieldMeta.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={localValues[field.key]}
              onChange={(value) => handleFieldChange(field.key, value)}
              errors={validationErrors}
              disabled={false}
            />
          ))}
        </div>

        {fieldMeta.length === 0 && (
          <div className="pz-property-editor__empty">
            This block has no editable properties.
          </div>
        )}
      </form>

      {showActions && (
        <ActionButtons
          blockId={selectedBlock.id}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          disabled={false}
        />
      )}
    </aside>
  );
}
