# Code Style & Conventions

## TypeScript Configuration
- **Strict mode:** enabled
- **Target:** ES2022
- **Module:** ESNext with bundler resolution
- **No unchecked indexed access:** enabled
- **Verbatim module syntax:** enabled (use `import type` for types)
- **Isolated modules:** enabled

## Biome Rules (Enforced)
- `noUnusedImports`: error
- `noUnusedVariables`: error
- `noUnusedFunctionParameters`: error
- `noExplicitAny`: error (suppress with `biome-ignore` when necessary)
- `useConst`: error
- `useImportType`: error (use `import type` for type-only imports)
- `useExportType`: error (use `export type` for type-only exports)

## Formatting
- **Indent:** 2 spaces
- **Files:** include `src/**`, `test/**`, `*.ts`, `*.json`

## Naming Conventions
- **Files:** kebab-case (e.g., `rule-composer.ts`)
- **Types/Interfaces:** PascalCase (e.g., `ValidationRuleId`, `BaseInputProps`)
- **Functions:** camelCase (e.g., `evaluateCondition`, `computeLayout`)
- **Constants:** camelCase or SCREAMING_SNAKE_CASE for true constants

## Type Patterns
- Prefer explicit type annotations on exports
- Use union types for constrained strings (e.g., `type InputTypeId = "text" | "number" | ...`)
- Use generics for reusable components (e.g., `BaseInputProps<T>`)
- Use `Record<string, unknown>` for flexible config objects

## Documentation
- JSDoc comments for public exports
- Describe parameters and return values
- Include usage examples for complex APIs

## Testing Patterns
- Test files mirror source structure: `src/foo/bar.ts` → `test/foo/bar.test.ts`
- Use `describe` blocks to group related tests
- Descriptive test names: `it("returns true when values match")`
- Test edge cases and error conditions

## React Patterns (for UI packages)
- Functional components with hooks
- Props interfaces defined with explicit types
- Use `'use client'` directive for client-side components
- Accessibility props (aria-*) on interactive elements

## Error Handling
- Return typed Results rather than throwing exceptions (for storage services)
- Use exhaustive switch statements with `never` type check
- Handle regex compilation errors gracefully
