import type { FieldDescriptor } from "../introspection";
import type { MappingRule } from "./types";

/**
 * Default mapping rules applied in order.
 * First matching rule wins.
 */
export const defaultMappingRules: MappingRule[] = [
  // 1. Boolean -> Checkbox
  {
    name: "boolean-checkbox",
    match: (f) => f.type === "boolean",
    component: "Checkbox",
    getProps: () => ({}),
  },

  // 2. Enum (<=4 values) -> RadioGroup
  {
    name: "enum-radio-group",
    match: (f) =>
      f.type === "enum" &&
      f.metadata.kind === "enum" &&
      f.metadata.values.length <= 4,
    component: "RadioGroup",
    getProps: (f) => {
      if (f.metadata.kind === "enum") {
        return { options: f.metadata.values };
      }
      return {};
    },
  },

  // 3. Enum (>4 values) -> Select
  {
    name: "enum-select",
    match: (f) => f.type === "enum",
    component: "Select",
    getProps: (f) => {
      if (f.metadata.kind === "enum") {
        return { options: f.metadata.values };
      }
      return {};
    },
  },

  // 4. Date -> DatePicker
  {
    name: "date-picker",
    match: (f) => f.type === "date",
    component: "DatePicker",
    getProps: () => ({}),
  },

  // 5. Number (bounded range <=100) -> Slider
  {
    name: "number-slider",
    match: (f) => {
      if (f.type !== "number") return false;
      const { min, max } = f.constraints;
      if (min === undefined || max === undefined) return false;
      return max - min <= 100;
    },
    component: "Slider",
    getProps: (f) => ({
      min: f.constraints.min,
      max: f.constraints.max,
      step: f.constraints.step ?? 1,
    }),
  },

  // 6. Number -> Input[number]
  {
    name: "number-input",
    match: (f) => f.type === "number",
    component: "Input",
    getProps: (f) => ({
      type: "number",
      min: f.constraints.min,
      max: f.constraints.max,
      step: f.constraints.step,
    }),
  },

  // 7. String (email) -> Input[email]
  {
    name: "string-email",
    match: (f) => f.type === "string" && f.constraints.format === "email",
    component: "Input",
    getProps: () => ({ type: "email" }),
  },

  // 8. String (url) -> Input[url]
  {
    name: "string-url",
    match: (f) => f.type === "string" && f.constraints.format === "url",
    component: "Input",
    getProps: () => ({ type: "url" }),
  },

  // 9. String (long, maxLength > 100) -> Textarea
  {
    name: "string-textarea",
    match: (f) => {
      if (f.type !== "string") return false;
      const { maxLength } = f.constraints;
      return maxLength !== undefined && maxLength > 100;
    },
    component: "Textarea",
    getProps: (f) => ({ maxLength: f.constraints.maxLength }),
  },

  // 10. String (default) -> Input[text]
  {
    name: "string-default",
    match: (f) => f.type === "string",
    component: "Input",
    getProps: (f) => ({
      type: "text",
      minLength: f.constraints.minLength,
      maxLength: f.constraints.maxLength,
      pattern: f.constraints.pattern,
    }),
  },
];

/**
 * Finds the first matching rule for a field.
 * Returns undefined if no rule matches.
 */
export function findMatchingRule(
  field: FieldDescriptor,
  rules: MappingRule[] = defaultMappingRules,
): MappingRule | undefined {
  return rules.find((rule) => rule.match(field));
}
