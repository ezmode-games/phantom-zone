/**
 * Form Layout Engine (PZ-003)
 *
 * Provides layout computation for forms including:
 * - Single and two column layouts
 * - Field groups with headers
 * - Conditional field visibility
 * - Field ordering from metadata
 */

// Types
export type {
  LayoutType,
  FieldWidth,
  ComparisonOperator,
  VisibilityCondition,
  LogicalOperator,
  ConditionGroup,
  VisibilityRules,
  FieldLayout,
  FieldGroup,
  FormLayout,
  ComputedFieldLayout,
  ComputedFieldGroup,
  ComputedFormLayout,
  FormValues,
} from "./types";

// Schemas
export {
  LayoutTypeSchema,
  FieldWidthSchema,
  ComparisonOperatorSchema,
  VisibilityConditionSchema,
  LogicalOperatorSchema,
  ConditionGroupSchema,
  VisibilityRulesSchema,
  FieldLayoutSchema,
  FieldGroupSchema,
  FormLayoutSchema,
} from "./types";

// Engine functions
export {
  computeLayout,
  evaluateCondition,
  evaluateVisibilityRules,
  createDefaultLayout,
  createTwoColumnLayout,
  createFieldGroup,
  mergeLayouts,
  getVisibleFieldIds,
  isFieldVisible,
} from "./engine";

export type { ComputeLayoutOptions } from "./engine";
