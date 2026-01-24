/**
 * Property Editor State
 *
 * Nanostores atoms for property editor state management.
 * Implements PZ-208: Block Property Editor
 */

import { atom, computed, type ReadableAtom, type WritableAtom } from "nanostores";
import { $document, findBlockById } from "../../model/document";
import type { Block } from "../../model/types";
import { getComponentBlockRegistry } from "../../registry/blocks";
import type { BaseComponentBlockDefinition } from "../../registry/types";
import { $focus, $multiSelection, getNextBlockId, getPrevBlockId } from "../../selection/state";
import type { FieldError, FieldMeta, PropertyEditorState } from "./types";
import { parseSchema } from "./schema-parser";

/**
 * Property editor internal state
 */
export const $propertyEditorState: WritableAtom<PropertyEditorState> = atom<PropertyEditorState>({
  values: {},
  errors: [],
  touched: false,
  submitting: false,
});

/**
 * Computed: Currently selected block for editing
 * Uses the focused block if in single selection, otherwise null for multi-selection
 */
export const $selectedBlock: ReadableAtom<Block | null> = computed(
  [$document, $focus, $multiSelection],
  (doc, focus, selection) => {
    // Only show property editor for single selection
    if (selection.selectedIds.size !== 1) {
      return null;
    }

    // Get the single selected block
    const selectedId = [...selection.selectedIds][0];
    if (!selectedId) return null;

    return findBlockById(doc.blocks, selectedId);
  }
);

/**
 * Computed: Block definition for the selected block
 */
export const $blockDefinition: ReadableAtom<BaseComponentBlockDefinition | null> = computed(
  $selectedBlock,
  (block) => {
    if (!block) return null;
    const registry = getComponentBlockRegistry();
    return registry.get(block.type) ?? null;
  }
);

/**
 * Computed: Parsed field metadata from block's props schema
 */
export const $fieldMeta: ReadableAtom<FieldMeta[]> = computed(
  $blockDefinition,
  (definition) => {
    if (!definition?.propsSchema) return [];
    const result = parseSchema(definition.propsSchema);
    return result.success ? result.fields : [];
  }
);

/**
 * Computed: Whether property editor should be visible
 */
export const $showPropertyEditor: ReadableAtom<boolean> = computed(
  [$selectedBlock, $blockDefinition],
  (block, definition) => {
    return block !== null && definition !== null;
  }
);

/**
 * Computed: Whether the selected block can move up
 */
export const $canMoveUp: ReadableAtom<boolean> = computed(
  [$document, $selectedBlock],
  (doc, block) => {
    if (!block) return false;
    const prevId = getPrevBlockId(block.id);
    return prevId !== null;
  }
);

/**
 * Computed: Whether the selected block can move down
 */
export const $canMoveDown: ReadableAtom<boolean> = computed(
  [$document, $selectedBlock],
  (doc, block) => {
    if (!block) return false;
    const nextId = getNextBlockId(block.id);
    return nextId !== null;
  }
);

/**
 * Computed: Validation errors for current values
 */
export const $validationErrors: ReadableAtom<FieldError[]> = computed(
  $propertyEditorState,
  (state) => state.errors
);

/**
 * Computed: Whether the form has validation errors
 */
export const $hasErrors: ReadableAtom<boolean> = computed(
  $validationErrors,
  (errors) => errors.length > 0
);

/**
 * Get errors for a specific field path
 */
export function getFieldErrors(path: string): FieldError[] {
  const errors = $validationErrors.get();
  return errors.filter((error) => error.path === path || error.path.startsWith(`${path}.`));
}

/**
 * Check if a specific field has errors
 */
export function hasFieldError(path: string): boolean {
  return getFieldErrors(path).length > 0;
}

/**
 * Set validation errors
 */
export function setErrors(errors: FieldError[]): void {
  const current = $propertyEditorState.get();
  $propertyEditorState.set({
    ...current,
    errors,
  });
}

/**
 * Clear all validation errors
 */
export function clearErrors(): void {
  setErrors([]);
}

/**
 * Mark form as touched
 */
export function markTouched(): void {
  const current = $propertyEditorState.get();
  if (!current.touched) {
    $propertyEditorState.set({
      ...current,
      touched: true,
    });
  }
}

/**
 * Reset property editor state
 */
export function resetPropertyEditorState(): void {
  $propertyEditorState.set({
    values: {},
    errors: [],
    touched: false,
    submitting: false,
  });
}
