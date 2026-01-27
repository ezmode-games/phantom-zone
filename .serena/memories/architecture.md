# Codebase Architecture

## Package Dependencies

```
@phantom-zone/codegen (CLI + API for code generation)
    └── Uses Zod 4 for schema introspection

@phantom-zone/core (runtime components)
    └── Peer deps: React, Zod 4
    ├── registry/     - Input and validation rule registries
    ├── layout/       - Form layout engine (conditional visibility)
    ├── validation/   - Error display and messages
    ├── accessibility/ - WCAG compliance (focus, keyboard, contrast, aria)
    ├── persistence/  - Form state persistence
    ├── hooks/        - Form submission handler
    └── composer/     - Rule composition engine

@phantom-zone/ui (form designer components)
    └── Depends on: @phantom-zone/core
    └── Uses: dnd-kit for drag-and-drop

@phantom-zone/edit (block editor)
    └── Block document model and registry

@phantom-zone/storage (Cloudflare services)
    └── R2 storage client
    └── Schema, response, content, asset services
```

## Key Modules

### packages/codegen
- `cli.ts` - Command line interface
- `introspection/` - Analyzes Zod schemas (types, checks, unwrapping)
- `mapping/` - Maps Zod types to UI components
- `codegen/` - Generates React form code
  - `templates/` - Code templates for form wrapper and fields

### packages/core
- `registry/inputs.ts` - Input component registry
- `registry/rules.ts` - Validation rule registry
- `layout/engine.ts` - Computes form layout with conditional visibility
- `validation/errors.ts` - Validation error utilities
- `accessibility/` - Focus management, keyboard nav, contrast checks
- `persistence/storage.ts` - Form draft persistence
- `hooks/useFormSubmit.ts` - Form submission hook

### packages/ui
- Form designer canvas
- Input & rule palettes
- Field property editor
- Conditional logic builder
- Schema export/import
- Live preview

### packages/edit
- Block document model
- Block registry system
- Block selection & focus
- Drag and drop
- Undo/redo history
- Block types: typography, layout, media, form

## Design Patterns

1. **Registry Pattern:** Input and validation rule registries allow extensibility
2. **Visitor/Introspection:** Schema introspection walks Zod schema tree
3. **Engine Pattern:** Layout engine computes derived state from config + values
4. **Composition:** Rule composer combines validation rules

## Testing Strategy

- Unit tests alongside source: `test/` mirrors `src/`
- Test runner: Vitest
- Lock file prevents parallel test execution (shared resources)
