# Task Completion Checklist

When completing a task in phantom-zone, follow this checklist:

## Before Committing

1. **Run full validation:**
   ```bash
   pnpm install && pnpm build && ./scripts/test-with-lock.sh && pnpm lint && pnpm typecheck
   ```

2. **Check for unused code:**
   - No unused imports, variables, or parameters (Biome enforces this)
   - Remove commented-out code

3. **Verify exports:**
   - New public APIs exported from package's `src/index.ts`
   - Types exported with `export type` syntax

4. **Write tests:**
   - Unit tests for new functionality
   - Aim for >80% coverage of new code
   - Test edge cases and error conditions

## Git Hooks (Automatic)

**Pre-commit (parallel):**
- Biome lint check on staged files
- TypeScript type check

**Pre-push:**
- Full flightcheck (lint + typecheck + all tests)

## PR Workflow

1. Create feature branch: `pz-[NUMBER]-[slug]`
2. Implement with tests
3. Create PR with "Closes #[NUMBER]" in body
4. Run review agents (code-reviewer, silent-failure-hunter, type-design-analyzer, pr-test-analyzer)
5. Address review comments
6. Merge with squash

## After Merging

```bash
git checkout main && git pull
```

## What NOT to Do

- Don't skip git hooks (`--no-verify`)
- Don't commit with failing tests
- Don't merge PRs with unresolved review comments
- Don't force push to main
