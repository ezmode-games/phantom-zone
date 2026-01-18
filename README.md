# phantom-zone

Generate type-safe React form components from Zod schemas. Built for [TanStack Form](https://tanstack.com/form) and [Rafters](https://rafters.dev)/[shadcn/ui](https://ui.shadcn.com) components.

## Quick Start

```bash
pnpx phantom-zone@latest generate ./src/schemas/user.ts -s userSchema
```

This reads your Zod schema and generates a complete React form component with:

- Full TypeScript types inferred from your schema
- TanStack Form for state management and validation
- Appropriate UI components for each field type
- Client-side validation using your Zod schema

## Requirements

- **Zod 4** - Schema definitions (`zod@^4.0.0`)
- **TanStack Form** - Form state management
- **Rafters/shadcn** - UI components copied to your project (typically at `@/components/ui`)

## Usage

```bash
pnpx phantom-zone@latest generate <schema-path> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | Derived from schema path |
| `-n, --name <name>` | Form component name | Derived from schema name |
| `-s, --schema <name>` | Exported schema name | `schema` |
| `--ui <path>` | UI components import path | `@/components/ui` |

### Examples

```bash
# Basic - generates user-form.tsx next to schema
pnpx phantom-zone@latest generate ./src/schemas/user-schema.ts -s userSchema

# Custom output path and component name
pnpx phantom-zone@latest generate ./src/schemas/user.ts \
  -o ./src/components/forms/profile-form.tsx \
  -n ProfileForm \
  -s userProfileSchema

# Custom UI import path
pnpx phantom-zone@latest generate ./src/schemas/user.ts \
  -s userSchema \
  --ui @/ui
```

## Supported Types

| Zod Type | Component | Notes |
|----------|-----------|-------|
| `z.string()` | Input | `type="text"` |
| `z.string().email()` | Input | `type="email"` |
| `z.string().url()` | Input | `type="url"` |
| `z.string().max(n)` | Textarea | When `n > 100` |
| `z.number()` | Input | `type="number"` |
| `z.number().min(a).max(b)` | Slider | When range `b - a <= 100` |
| `z.boolean()` | Checkbox | |
| `z.enum([...])` | RadioGroup | When `<= 4` options |
| `z.enum([...])` | Select | When `> 4` options |
| `z.date()` | DatePicker | |
| `z.optional(...)` | Any | Marks field as not required |

## Example

**Input schema:**

```typescript
// user-schema.ts
import { z } from "zod/v4";

export const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional(),
  role: z.enum(["admin", "user", "guest"]),
  newsletter: z.boolean(),
});

export type User = z.infer<typeof userSchema>;
```

**Generated form:**

```tsx
'use client';

import { useForm } from '@tanstack/react-form';
import { Checkbox, Field, Input, Label, RadioGroup } from '@/components/ui';
import { userSchema, type User } from './user-schema';

interface UserFormProps {
  defaultValues?: Partial<User>;
  onSubmit: (data: User) => void | Promise<void>;
}

export function UserForm({ defaultValues: initialValues, onSubmit }: UserFormProps) {
  const form = useForm({
    defaultValues: initialValues ?? {
      name: "",
      email: "",
      age: 0,
      role: "admin",
      newsletter: false,
    },
    validators: {
      onSubmit: userSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      {/* Generated fields... */}
    </form>
  );
}
```

## Programmatic API

```typescript
import { generate } from "phantom-zone";
import { userSchema } from "./schema";

const result = generate({
  schema: userSchema,
  formName: "UserForm",
  schemaImportPath: "./schema",
  schemaExportName: "userSchema",
  uiImportPath: "@/components/ui",
});

console.log(result.code);     // Generated TSX
console.log(result.fields);   // ["name", "email", "age", ...]
console.log(result.warnings); // Any issues encountered
```

## Documentation

Full documentation at [ezmode.games/oss/phantom-zone](https://ezmode.games/oss/phantom-zone)

## License

MIT
