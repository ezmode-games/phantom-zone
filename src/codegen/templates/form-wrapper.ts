import type { FieldDescriptor, FormDescriptor } from "../../introspection";
import type { ComponentConfig, ComponentType } from "../../mapping";
import { generateFieldJSX } from "./field-components";

export interface FormTemplateInput {
  form: FormDescriptor;
  fieldConfigs: Map<string, ComponentConfig>;
  uiImportPath: string;
}

/**
 * Generates the complete form component file content.
 */
export function generateFormFile(input: FormTemplateInput): string {
  const { form, fieldConfigs, uiImportPath } = input;

  const imports = generateImports(form, fieldConfigs, uiImportPath);
  const typeName = inferTypeName(form.schemaExportName);
  const propsInterface = generatePropsInterface(form.name, typeName);
  const defaultValues = generateDefaultValues(form.fields, fieldConfigs);
  const fieldJSX = generateAllFieldsJSX(form.fields, fieldConfigs);

  return `'use client';

${imports}

${propsInterface}

export function ${form.name}({ defaultValues: initialValues, onSubmit }: ${form.name}Props) {
  const form = useForm({
    defaultValues: initialValues ?? {
${defaultValues}
    },
    validators: {
      onSubmit: ${form.schemaExportName},
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
${fieldJSX}

      <button type="submit">Submit</button>
    </form>
  );
}
`;
}

function generateImports(
  form: FormDescriptor,
  fieldConfigs: Map<string, ComponentConfig>,
  uiImportPath: string,
): string {
  const lines: string[] = [];

  // TanStack Form import
  lines.push("import { useForm } from '@tanstack/react-form';");

  // UI component imports
  const usedComponents = getUsedComponents(fieldConfigs);
  const uiImports = buildUIImports(usedComponents);
  lines.push(`import {\n${uiImports}\n} from '${uiImportPath}';`);

  // Schema import
  const typeName = inferTypeName(form.schemaExportName);
  lines.push(
    `import { ${form.schemaExportName}, type ${typeName} } from '${form.schemaImportPath}';`,
  );

  return lines.join("\n");
}

function getUsedComponents(
  fieldConfigs: Map<string, ComponentConfig>,
): Set<ComponentType> {
  const components = new Set<ComponentType>();

  for (const config of fieldConfigs.values()) {
    components.add(config.component);
  }

  return components;
}

function buildUIImports(usedComponents: Set<ComponentType>): string {
  const imports: string[] = [];

  // Always include Field wrapper
  imports.push("  Field,");

  // Add used components
  for (const component of usedComponents) {
    imports.push(`  ${component},`);
  }

  // Include Label if RadioGroup is used
  if (usedComponents.has("RadioGroup")) {
    imports.push("  Label,");
  }

  // Sort all imports alphabetically for consistent output
  return imports.sort().join("\n");
}

/**
 * Infers TypeScript type name from schema export name.
 * userSchema -> User
 * profileSchema -> Profile
 */
function inferTypeName(schemaExportName: string): string {
  // Remove 'Schema' or 'schema' suffix
  const stripped = schemaExportName.replace(/Schema$/i, "");

  // If nothing remains after stripping, fall back to a safe default
  if (stripped.trim().length === 0) {
    return "Schema";
  }

  // Capitalize first letter of the remaining base
  return stripped.replace(/^./, (s) => s.toUpperCase());
}

function generatePropsInterface(formName: string, typeName: string): string {
  return `interface ${formName}Props {
  defaultValues?: Partial<${typeName}>;
  onSubmit: (data: ${typeName}) => void | Promise<void>;
}`;
}

function generateDefaultValues(
  fields: FieldDescriptor[],
  fieldConfigs: Map<string, ComponentConfig>,
): string {
  const lines: string[] = [];

  for (const field of fields) {
    const defaultValue = getDefaultValueForField(field, fieldConfigs);
    lines.push(`      ${field.name}: ${defaultValue},`);
  }

  return lines.join("\n");
}

function getDefaultValueForField(
  field: FieldDescriptor,
  fieldConfigs: Map<string, ComponentConfig>,
): string {
  const config = fieldConfigs.get(field.name);

  switch (field.type) {
    case "string":
      return '""';
    case "number": {
      // Use min from slider/input props if available
      const min = config?.componentProps.min;
      return typeof min === "number" ? String(min) : "0";
    }
    case "boolean":
      return "false";
    case "date":
      return "undefined";
    case "enum": {
      // Use first enum value
      if (field.metadata.kind === "enum" && field.metadata.values.length > 0) {
        return JSON.stringify(field.metadata.values[0]);
      }
      return '""';
    }
    default:
      return "undefined";
  }
}

function generateAllFieldsJSX(
  fields: FieldDescriptor[],
  fieldConfigs: Map<string, ComponentConfig>,
): string {
  const fieldJSXs: string[] = [];

  for (const field of fields) {
    const config = fieldConfigs.get(field.name);
    if (config) {
      const jsx = generateFieldJSX(field, config);
      // Indent each line by 6 spaces for proper form structure
      const indented = jsx
        .split("\n")
        .map((line) => `      ${line}`)
        .join("\n");
      fieldJSXs.push(indented);
    }
  }

  return fieldJSXs.join("\n\n");
}

export { inferTypeName };
