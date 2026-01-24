import { z } from "zod";

/**
 * Layout Types for Form Layout Engine (PZ-003)
 *
 * Defines the structure for form layouts including:
 * - Single and two column layouts
 * - Field groups with headers
 * - Conditional field visibility
 * - Field ordering from metadata
 */

// ============================================================================
// Layout Type Definitions
// ============================================================================

/**
 * Supported layout types for form rendering.
 */
export const LayoutTypeSchema = z.enum(["single-column", "two-column"]);
export type LayoutType = z.infer<typeof LayoutTypeSchema>;

/**
 * Field width in a two-column layout.
 * - "full": Spans both columns
 * - "half": Spans one column (for short fields)
 */
export const FieldWidthSchema = z.enum(["full", "half"]);
export type FieldWidth = z.infer<typeof FieldWidthSchema>;

// ============================================================================
// Conditional Visibility
// ============================================================================

/**
 * Comparison operators for conditional visibility.
 */
export const ComparisonOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "greaterThan",
  "lessThan",
  "greaterThanOrEquals",
  "lessThanOrEquals",
  "isEmpty",
  "isNotEmpty",
  "matches", // regex match
]);
export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;

/**
 * A single visibility condition that compares a field's value.
 */
export const VisibilityConditionSchema = z.object({
  /** The field ID to check */
  fieldId: z.string().min(1),

  /** The comparison operator */
  operator: ComparisonOperatorSchema,

  /**
   * The value to compare against.
   * Not required for isEmpty/isNotEmpty operators.
   */
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});
export type VisibilityCondition = z.infer<typeof VisibilityConditionSchema>;

/**
 * Logical operator for combining multiple conditions.
 */
export const LogicalOperatorSchema = z.enum(["and", "or"]);
export type LogicalOperator = z.infer<typeof LogicalOperatorSchema>;

/**
 * A group of conditions combined with a logical operator.
 * Supports nested condition groups for complex logic.
 */
export const ConditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z.object({
    /** How to combine the conditions */
    operator: LogicalOperatorSchema,

    /** The conditions to evaluate */
    conditions: z.array(
      z.union([VisibilityConditionSchema, ConditionGroupSchema])
    ),
  })
);

export interface ConditionGroup {
  operator: LogicalOperator;
  conditions: Array<VisibilityCondition | ConditionGroup>;
}

/**
 * Visibility rules for a field.
 * Can be a single condition or a group of conditions.
 */
export const VisibilityRulesSchema = z.union([
  VisibilityConditionSchema,
  ConditionGroupSchema,
]);
export type VisibilityRules = z.infer<typeof VisibilityRulesSchema>;

// ============================================================================
// Field Layout Configuration
// ============================================================================

/**
 * Layout configuration for a single field.
 */
export const FieldLayoutSchema = z.object({
  /** The field ID this layout applies to */
  fieldId: z.string().min(1),

  /**
   * Field width in the layout.
   * Only applies in two-column layouts.
   * Defaults to "full" if not specified.
   */
  width: FieldWidthSchema.optional(),

  /**
   * Explicit ordering position.
   * Lower numbers appear first.
   * Fields without order are sorted alphabetically by fieldId after ordered fields.
   */
  order: z.number().int().nonnegative().optional(),

  /**
   * Conditional visibility rules.
   * If not specified, field is always visible.
   */
  visibleWhen: VisibilityRulesSchema.optional(),

  /**
   * CSS class names to apply to this field's container.
   */
  className: z.string().optional(),
});
export type FieldLayout = z.infer<typeof FieldLayoutSchema>;

// ============================================================================
// Field Groups
// ============================================================================

/**
 * A group of fields with an optional header.
 * Used to organize related fields together.
 */
export const FieldGroupSchema = z.object({
  /** Unique identifier for this group */
  id: z.string().min(1),

  /** Display header for the group (optional) */
  header: z.string().optional(),

  /** Description text shown below the header */
  description: z.string().optional(),

  /** Field IDs belonging to this group, in order */
  fieldIds: z.array(z.string().min(1)),

  /**
   * Whether the group is collapsible.
   * If true, users can expand/collapse the group.
   */
  collapsible: z.boolean().optional(),

  /**
   * Whether the group starts collapsed.
   * Only applies if collapsible is true.
   */
  defaultCollapsed: z.boolean().optional(),

  /**
   * Conditional visibility for the entire group.
   * If any field in the group is visible, the group is visible
   * unless this explicitly hides it.
   */
  visibleWhen: VisibilityRulesSchema.optional(),

  /**
   * CSS class names to apply to this group's container.
   */
  className: z.string().optional(),
});
export type FieldGroup = z.infer<typeof FieldGroupSchema>;

// ============================================================================
// Complete Form Layout
// ============================================================================

/**
 * Complete layout configuration for a form.
 */
export const FormLayoutSchema = z.object({
  /** Layout type (single-column or two-column) */
  type: LayoutTypeSchema.default("single-column"),

  /**
   * Layout configuration for individual fields.
   * Fields not listed here use default settings.
   */
  fields: z.array(FieldLayoutSchema).optional(),

  /**
   * Field groups for organizing fields with headers.
   * Fields can belong to at most one group.
   * Ungrouped fields appear after all groups.
   */
  groups: z.array(FieldGroupSchema).optional(),

  /**
   * Default field width for two-column layouts.
   * Individual field widths override this.
   */
  defaultFieldWidth: FieldWidthSchema.optional(),

  /**
   * Gap between fields (CSS gap value).
   * Defaults to theme spacing if not specified.
   */
  gap: z.string().optional(),

  /**
   * Gap between groups (CSS gap value).
   * Defaults to theme spacing if not specified.
   */
  groupGap: z.string().optional(),

  /**
   * CSS class names to apply to the form container.
   */
  className: z.string().optional(),
});
export type FormLayout = z.infer<typeof FormLayoutSchema>;

// ============================================================================
// Computed Layout Types (Runtime)
// ============================================================================

/**
 * A field with its computed layout properties.
 * This is the resolved layout ready for rendering.
 */
export interface ComputedFieldLayout {
  /** The field ID */
  fieldId: string;

  /** Resolved width */
  width: FieldWidth;

  /** Resolved order position */
  order: number;

  /** Whether the field is currently visible */
  visible: boolean;

  /** The group this field belongs to, if any */
  groupId: string | null;

  /** CSS class names */
  className: string | null;
}

/**
 * A group with its computed properties.
 */
export interface ComputedFieldGroup {
  /** Group ID */
  id: string;

  /** Display header */
  header: string | null;

  /** Description text */
  description: string | null;

  /** Whether the group is collapsible */
  collapsible: boolean;

  /** Whether the group starts collapsed */
  defaultCollapsed: boolean;

  /** Computed fields in this group, in order */
  fields: ComputedFieldLayout[];

  /** Whether the group is currently visible */
  visible: boolean;

  /** CSS class names */
  className: string | null;
}

/**
 * The complete computed layout ready for rendering.
 */
export interface ComputedFormLayout {
  /** Layout type */
  type: LayoutType;

  /** Groups with their fields, in order */
  groups: ComputedFieldGroup[];

  /** Ungrouped fields, in order */
  ungroupedFields: ComputedFieldLayout[];

  /** CSS gap value between fields */
  gap: string | null;

  /** CSS gap value between groups */
  groupGap: string | null;

  /** CSS class names for the form container */
  className: string | null;
}

/**
 * Form values type for condition evaluation.
 * Keys are field IDs, values are the current field values.
 */
export type FormValues = Record<string, unknown>;
