#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { generate } from "./codegen/generator";

const program = new Command();

program
  .name("phantom-zone")
  .description("Generate React forms from Zod schemas")
  .version("0.0.1");

program
  .command("generate <schema-path>")
  .description("Generate a form component from a Zod schema")
  .option("-o, --output <path>", "Output file path")
  .option("-n, --name <name>", "Form component name")
  .option("-s, --schema <name>", "Exported schema name", "schema")
  .option("--ui <path>", "UI import path", "@rafters/ui")
  .action(async (schemaPath: string, options: GenerateCommandOptions) => {
    try {
      await runGenerate(schemaPath, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

program.parse();

interface GenerateCommandOptions {
  output?: string;
  name?: string;
  schema: string;
  ui: string;
}

async function runGenerate(
  schemaPath: string,
  options: GenerateCommandOptions,
): Promise<void> {
  // Resolve schema path
  const absoluteSchemaPath = path.resolve(schemaPath);

  // Check if file exists
  if (!fs.existsSync(absoluteSchemaPath)) {
    throw new Error(`Schema file not found: ${absoluteSchemaPath}`);
  }

  // Dynamically import the schema file
  const schemaUrl = pathToFileURL(absoluteSchemaPath).href;
  const schemaModule = await import(schemaUrl);

  // Get the schema export
  const schemaExportName = options.schema;
  const schema = schemaModule[schemaExportName] ?? schemaModule.default;

  if (!schema) {
    throw new Error(
      `Schema "${schemaExportName}" not exported from ${schemaPath}`,
    );
  }

  // Validate it's a Zod schema
  if (!schema._zod) {
    throw new Error(
      `Export "${schemaExportName}" is not a Zod schema. Ensure you are using zod >= 4.0.0`,
    );
  }

  // Determine output path
  const outputPath = options.output ?? deriveOutputPath(schemaPath);
  const absoluteOutputPath = path.resolve(outputPath);

  // Determine form name
  const formName = options.name ?? deriveFormName(schemaExportName);

  // Calculate relative import path from output to schema
  const schemaImportPath = calculateImportPath(
    absoluteOutputPath,
    absoluteSchemaPath,
  );

  // Generate the form
  const result = generate({
    schema,
    formName,
    schemaImportPath,
    schemaExportName,
    uiImportPath: options.ui,
  });

  // Write output file
  const outputDir = path.dirname(absoluteOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(absoluteOutputPath, result.code, "utf-8");

  // Print success message
  console.log(`✓ Generated ${absoluteOutputPath}`);
  console.log(`  ${result.fields.length} fields: ${result.fields.join(", ")}`);

  // Print warnings if any
  if (result.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of result.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
  }
}

/**
 * Derives output path from schema path.
 * ./user-schema.ts -> ./user-form.tsx
 */
function deriveOutputPath(schemaPath: string): string {
  const dir = path.dirname(schemaPath);
  const base = path.basename(schemaPath, path.extname(schemaPath));

  // Replace -schema or Schema suffix with -form
  const formBase = base.replace(/-schema$/i, "").replace(/schema$/i, "");

  const finalBase = formBase || base;
  return path.join(dir, `${finalBase}-form.tsx`);
}

/**
 * Derives form name from schema export name.
 * userSchema -> UserForm
 */
function deriveFormName(schemaExportName: string): string {
  const base = schemaExportName
    .replace(/Schema$/i, "")
    .replace(/^./, (s) => s.toUpperCase());

  const finalBase = base || "Generated";
  return `${finalBase}Form`;
}

/**
 * Calculates relative import path from output file to schema file.
 */
function calculateImportPath(outputPath: string, schemaPath: string): string {
  const outputDir = path.dirname(outputPath);
  let relativePath = path.relative(outputDir, schemaPath);

  // Remove .ts/.tsx extension
  relativePath = relativePath.replace(/\.(ts|tsx)$/, "");

  // Ensure it starts with ./
  if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}
