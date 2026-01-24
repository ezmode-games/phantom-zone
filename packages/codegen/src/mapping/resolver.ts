import type { FieldDescriptor } from "../introspection";
import { defaultMappingRules } from "./default-map";
import type { ComponentConfig, MappingRule } from "./types";

/**
 * Resolves a FieldDescriptor to a ComponentConfig using mapping rules.
 * Iterates rules in order and returns the first match.
 *
 * @throws Error if no rule matches the field
 */
export function resolveField(
  field: FieldDescriptor,
  rules: MappingRule[] = defaultMappingRules,
): ComponentConfig {
  const matchedRule = rules.find((rule) => rule.match(field));

  if (!matchedRule) {
    throw new Error(
      `No mapping rule matched field "${field.name}" of type "${field.type}"`,
    );
  }

  return {
    component: matchedRule.component,
    componentProps: matchedRule.getProps(field),
    fieldProps: {
      label: field.label,
      description: field.description,
      required: !field.isOptional,
    },
  };
}
