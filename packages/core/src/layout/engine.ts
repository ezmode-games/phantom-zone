import type {
  ComputedFieldGroup,
  ComputedFieldLayout,
  ComputedFormLayout,
  ConditionGroup,
  FieldGroup,
  FieldLayout,
  FieldWidth,
  FormLayout,
  FormValues,
  VisibilityCondition,
  VisibilityRules,
} from "./types";

/**
 * Form Layout Engine (PZ-003)
 *
 * Computes the resolved layout for a form based on:
 * - Layout configuration (single/two column, groups, etc.)
 * - Current form values (for conditional visibility)
 * - Field metadata
 */

// ============================================================================
// Condition Evaluation
// ============================================================================

/**
 * Type guard to check if a rule is a ConditionGroup (has operator and conditions).
 */
function isConditionGroup(
  rule: VisibilityRules
): rule is ConditionGroup {
  return "operator" in rule && "conditions" in rule;
}

/**
 * Evaluates a single visibility condition against form values.
 *
 * @param condition - The condition to evaluate
 * @param values - Current form values
 * @returns Whether the condition is satisfied
 */
export function evaluateCondition(
  condition: VisibilityCondition,
  values: FormValues
): boolean {
  const fieldValue = values[condition.fieldId];
  const compareValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return fieldValue === compareValue;

    case "notEquals":
      return fieldValue !== compareValue;

    case "contains":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        return fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(compareValue);
      }
      return false;

    case "notContains":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        return !fieldValue.includes(compareValue);
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(compareValue);
      }
      return true;

    case "greaterThan":
      if (typeof fieldValue === "number" && typeof compareValue === "number") {
        return fieldValue > compareValue;
      }
      return false;

    case "lessThan":
      if (typeof fieldValue === "number" && typeof compareValue === "number") {
        return fieldValue < compareValue;
      }
      return false;

    case "greaterThanOrEquals":
      if (typeof fieldValue === "number" && typeof compareValue === "number") {
        return fieldValue >= compareValue;
      }
      return false;

    case "lessThanOrEquals":
      if (typeof fieldValue === "number" && typeof compareValue === "number") {
        return fieldValue <= compareValue;
      }
      return false;

    case "isEmpty":
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "isNotEmpty":
      return !(
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "matches":
      if (typeof fieldValue === "string" && typeof compareValue === "string") {
        try {
          const regex = new RegExp(compareValue);
          return regex.test(fieldValue);
        } catch {
          // Invalid regex, return false
          return false;
        }
      }
      return false;

    default: {
      // Exhaustive check
      const _exhaustive: never = condition.operator;
      return false;
    }
  }
}

/**
 * Evaluates visibility rules (single condition or group) against form values.
 *
 * @param rules - The visibility rules to evaluate
 * @param values - Current form values
 * @returns Whether the field should be visible
 */
export function evaluateVisibilityRules(
  rules: VisibilityRules,
  values: FormValues
): boolean {
  if (isConditionGroup(rules)) {
    return evaluateConditionGroup(rules, values);
  }
  return evaluateCondition(rules, values);
}

/**
 * Evaluates a condition group with logical operators.
 *
 * @param group - The condition group to evaluate
 * @param values - Current form values
 * @returns Whether the group's conditions are satisfied
 */
function evaluateConditionGroup(
  group: ConditionGroup,
  values: FormValues
): boolean {
  const results = group.conditions.map((condition) => {
    if (isConditionGroup(condition)) {
      return evaluateConditionGroup(condition, values);
    }
    return evaluateCondition(condition, values);
  });

  if (group.operator === "and") {
    return results.every(Boolean);
  }
  // operator === "or"
  return results.some(Boolean);
}

// ============================================================================
// Layout Computation
// ============================================================================

/**
 * Options for computing the layout.
 */
export interface ComputeLayoutOptions {
  /** The layout configuration */
  layout: FormLayout;

  /** All field IDs in the form */
  fieldIds: string[];

  /** Current form values for conditional visibility */
  values: FormValues;
}

/**
 * Computes the resolved layout for a form.
 *
 * @param options - The computation options
 * @returns The computed layout ready for rendering
 */
export function computeLayout(options: ComputeLayoutOptions): ComputedFormLayout {
  const { layout, fieldIds, values } = options;

  // Build a map of field layouts for quick lookup
  const fieldLayoutMap = new Map<string, FieldLayout>();
  for (const fieldLayout of layout.fields ?? []) {
    fieldLayoutMap.set(fieldLayout.fieldId, fieldLayout);
  }

  // Build a map of field -> group membership
  const fieldToGroupMap = new Map<string, string>();
  for (const group of layout.groups ?? []) {
    for (const fieldId of group.fieldIds) {
      fieldToGroupMap.set(fieldId, group.id);
    }
  }

  // Compute layout for each field
  const computedFields = new Map<string, ComputedFieldLayout>();
  let orderCounter = 0;

  for (const fieldId of fieldIds) {
    const fieldLayout = fieldLayoutMap.get(fieldId);
    const groupId = fieldToGroupMap.get(fieldId) ?? null;

    // Determine visibility
    let visible = true;
    if (fieldLayout?.visibleWhen) {
      visible = evaluateVisibilityRules(fieldLayout.visibleWhen, values);
    }

    // Determine width
    let width: FieldWidth = layout.defaultFieldWidth ?? "full";
    if (fieldLayout?.width) {
      width = fieldLayout.width;
    }

    // Determine order
    const order = fieldLayout?.order ?? Number.MAX_SAFE_INTEGER;

    computedFields.set(fieldId, {
      fieldId,
      width,
      order: order === Number.MAX_SAFE_INTEGER ? orderCounter++ + 10000 : order,
      visible,
      groupId,
      className: fieldLayout?.className ?? null,
    });
  }

  // Compute groups
  const computedGroups: ComputedFieldGroup[] = [];

  for (const group of layout.groups ?? []) {
    // Check group visibility
    let groupVisible = true;
    if (group.visibleWhen) {
      groupVisible = evaluateVisibilityRules(group.visibleWhen, values);
    }

    // Get fields in this group
    const groupFields: ComputedFieldLayout[] = [];
    for (const fieldId of group.fieldIds) {
      const computed = computedFields.get(fieldId);
      if (computed) {
        groupFields.push(computed);
      }
    }

    // Sort fields by order within the group
    sortFieldsByOrder(groupFields);

    // Group is visible if it has visible fields (unless explicitly hidden)
    const hasVisibleFields = groupFields.some((f) => f.visible);
    const isVisible = groupVisible && hasVisibleFields;

    computedGroups.push({
      id: group.id,
      header: group.header ?? null,
      description: group.description ?? null,
      collapsible: group.collapsible ?? false,
      defaultCollapsed: group.defaultCollapsed ?? false,
      fields: groupFields,
      visible: isVisible,
      className: group.className ?? null,
    });
  }

  // Get ungrouped fields
  const groupedFieldIds = new Set<string>();
  for (const group of layout.groups ?? []) {
    for (const fieldId of group.fieldIds) {
      groupedFieldIds.add(fieldId);
    }
  }

  const ungroupedFields: ComputedFieldLayout[] = [];
  for (const fieldId of fieldIds) {
    if (!groupedFieldIds.has(fieldId)) {
      const computed = computedFields.get(fieldId);
      if (computed) {
        ungroupedFields.push(computed);
      }
    }
  }

  // Sort ungrouped fields by order
  sortFieldsByOrder(ungroupedFields);

  return {
    type: layout.type ?? "single-column",
    groups: computedGroups,
    ungroupedFields,
    gap: layout.gap ?? null,
    groupGap: layout.groupGap ?? null,
    className: layout.className ?? null,
  };
}

/**
 * Sorts fields by their order property in place.
 * Fields with the same order maintain their relative position.
 */
function sortFieldsByOrder(fields: ComputedFieldLayout[]): void {
  fields.sort((a, b) => a.order - b.order);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a default layout configuration for a set of fields.
 * All fields are rendered in a single column with default settings.
 *
 * @param fieldIds - The field IDs to include
 * @returns A default FormLayout
 */
export function createDefaultLayout(fieldIds: string[]): FormLayout {
  return {
    type: "single-column",
    fields: fieldIds.map((fieldId, index) => ({
      fieldId,
      order: index,
      width: "full" as const,
    })),
  };
}

/**
 * Creates a two-column layout with specified short fields.
 *
 * @param fieldIds - All field IDs
 * @param shortFieldIds - Field IDs that should be half-width
 * @returns A two-column FormLayout
 */
export function createTwoColumnLayout(
  fieldIds: string[],
  shortFieldIds: string[]
): FormLayout {
  const shortFieldSet = new Set(shortFieldIds);

  return {
    type: "two-column",
    fields: fieldIds.map((fieldId, index) => ({
      fieldId,
      order: index,
      width: shortFieldSet.has(fieldId) ? ("half" as const) : ("full" as const),
    })),
  };
}

/**
 * Creates a field group configuration.
 *
 * @param id - Group ID
 * @param fieldIds - Field IDs in the group
 * @param options - Optional group settings
 * @returns A FieldGroup configuration
 */
export function createFieldGroup(
  id: string,
  fieldIds: string[],
  options?: Partial<Omit<FieldGroup, "id" | "fieldIds">>
): FieldGroup {
  return {
    id,
    fieldIds,
    ...options,
  };
}

/**
 * Merges layout configurations, with later configs taking precedence.
 *
 * @param layouts - Layout configurations to merge
 * @returns The merged layout
 */
export function mergeLayouts(...layouts: Partial<FormLayout>[]): FormLayout {
  const result: FormLayout = {
    type: "single-column",
  };

  for (const layout of layouts) {
    if (layout.type !== undefined) {
      result.type = layout.type;
    }
    if (layout.defaultFieldWidth !== undefined) {
      result.defaultFieldWidth = layout.defaultFieldWidth;
    }
    if (layout.gap !== undefined) {
      result.gap = layout.gap;
    }
    if (layout.groupGap !== undefined) {
      result.groupGap = layout.groupGap;
    }
    if (layout.className !== undefined) {
      result.className = layout.className;
    }
    if (layout.fields !== undefined) {
      result.fields = mergeFieldLayouts(result.fields ?? [], layout.fields);
    }
    if (layout.groups !== undefined) {
      result.groups = mergeFieldGroups(result.groups ?? [], layout.groups);
    }
  }

  return result;
}

/**
 * Merges field layout arrays, with later entries overriding earlier ones.
 */
function mergeFieldLayouts(
  base: FieldLayout[],
  overrides: FieldLayout[]
): FieldLayout[] {
  const map = new Map<string, FieldLayout>();

  for (const field of base) {
    map.set(field.fieldId, field);
  }
  for (const field of overrides) {
    const existing = map.get(field.fieldId);
    if (existing) {
      map.set(field.fieldId, { ...existing, ...field });
    } else {
      map.set(field.fieldId, field);
    }
  }

  return Array.from(map.values());
}

/**
 * Merges field group arrays, with later entries overriding earlier ones.
 */
function mergeFieldGroups(
  base: FieldGroup[],
  overrides: FieldGroup[]
): FieldGroup[] {
  const map = new Map<string, FieldGroup>();

  for (const group of base) {
    map.set(group.id, group);
  }
  for (const group of overrides) {
    const existing = map.get(group.id);
    if (existing) {
      map.set(group.id, { ...existing, ...group });
    } else {
      map.set(group.id, group);
    }
  }

  return Array.from(map.values());
}

/**
 * Gets all visible field IDs from a computed layout.
 *
 * @param layout - The computed layout
 * @returns Array of visible field IDs in order
 */
export function getVisibleFieldIds(layout: ComputedFormLayout): string[] {
  const result: string[] = [];

  // Add fields from visible groups
  for (const group of layout.groups) {
    if (group.visible) {
      for (const field of group.fields) {
        if (field.visible) {
          result.push(field.fieldId);
        }
      }
    }
  }

  // Add visible ungrouped fields
  for (const field of layout.ungroupedFields) {
    if (field.visible) {
      result.push(field.fieldId);
    }
  }

  return result;
}

/**
 * Checks if a specific field is visible in the computed layout.
 *
 * @param layout - The computed layout
 * @param fieldId - The field ID to check
 * @returns Whether the field is visible
 */
export function isFieldVisible(
  layout: ComputedFormLayout,
  fieldId: string
): boolean {
  // Check groups
  for (const group of layout.groups) {
    for (const field of group.fields) {
      if (field.fieldId === fieldId) {
        return group.visible && field.visible;
      }
    }
  }

  // Check ungrouped fields
  for (const field of layout.ungroupedFields) {
    if (field.fieldId === fieldId) {
      return field.visible;
    }
  }

  return false;
}
