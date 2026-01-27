# Suggested Commands

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Watch mode development
pnpm dev

# Type checking
pnpm typecheck
```

## Testing

```bash
# Run all tests (uses lock to prevent parallel execution)
./scripts/test-with-lock.sh

# Run unit tests only
pnpm test:unit

# Run all tests including integration
pnpm test:all

# Run tests for specific package
pnpm --filter @phantom-zone/core test
```

## Linting & Formatting

```bash
# Check for lint errors
pnpm lint

# Fix lint errors and format
pnpm lint:fix

# Format only
pnpm format
```

## Pre-commit Checks

```bash
# Quick preflight (lint + typecheck + unit tests)
pnpm preflight

# Full flightcheck (lint + typecheck + all tests)
pnpm flightcheck
```

## Git Workflow

```bash
# Create feature branch
git checkout -b pz-[NUMBER]-[slug]

# Before committing, run local checks
./scripts/test-with-lock.sh && pnpm lint && pnpm typecheck

# Create PR
gh pr create --title "PZ-[NUMBER]: [Title]" --body "Closes #[NUMBER]"

# Merge PR
gh pr merge --squash --delete-branch
```

## Utility Commands

```bash
# List files
ls -la

# Find files
find . -name "*.ts" -not -path "./node_modules/*"

# Search in files
grep -r "pattern" --include="*.ts"

# Git operations
git status
git diff
git log --oneline -20
```

## Releases

```bash
# Create changeset
pnpm changeset

# Version packages
pnpm version

# Build and publish
pnpm release
```
