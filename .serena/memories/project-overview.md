# Phantom Zone - Project Overview

## Purpose
Phantom Zone is a form builder platform that generates type-safe React form components from Zod schemas. It includes:
- Code generation from Zod to React forms
- Visual form designer
- Block editor for content
- Storage services for schemas and responses

## Tech Stack
- **Language:** TypeScript (strict mode, ES2022 target)
- **Runtime:** Node.js, Cloudflare Workers (for storage)
- **Package Manager:** pnpm (workspaces)
- **Build:** tsup
- **Testing:** Vitest
- **Linting/Formatting:** Biome
- **Form State:** TanStack Form
- **Validation:** Zod 4
- **UI Components:** React 18/19, Rafters/shadcn, dnd-kit for drag-and-drop
- **Git Hooks:** Lefthook

## Package Structure

```
packages/
  codegen/    # Zod-to-form code generator (CLI + programmatic API)
  core/       # Form runtime: inputs, validation, layout, accessibility
  ui/         # React components for form designer
  edit/       # Block editor
  storage/    # R2/Cloudflare storage services

apps/
  dashboard/  # Admin UI routes
```

## Key Features
- Introspects Zod schemas to understand field types and validation
- Maps Zod types to appropriate UI components
- Generates complete React form components with TanStack Form
- Input and validation rule registries for extensibility
- Conditional field visibility based on form values
- Form layout engine (single/two column, groups)
- Accessibility compliance (WCAG)

## Repository
- GitHub: https://github.com/ezmode-games/phantom-zone
- License: MIT
