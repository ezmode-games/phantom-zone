# Phantom Zone Orchestration Plan

Autonomous execution plan for completing 47 open issues using agents, plugins, and skills.

## Execution Strategy

```
Phase 0: Foundation (blocking)
    ↓
Phase 1: Core Runtime + Storage (parallel)
    ↓
Phase 2: Form Designer + Block Editor Core (parallel)
    ↓
Phase 3: Advanced Features (parallel)
    ↓
Phase 4: App Routes + Polish (parallel)
```

---

## PR Workflow (Per Issue)

Every issue follows this workflow. **Dependent issues cannot start until blocking PRs are merged.**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CREATE BRANCH                                                │
│    git checkout -b pz-[NUMBER]-[slug]                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. IMPLEMENT                                                    │
│    Agent: frontend/backend subagent                            │
│    - Read issue requirements                                    │
│    - Implement feature                                          │
│    - Write tests                                                │
│    - Run local checks: pnpm test && pnpm lint && pnpm typecheck│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CREATE PR                                                    │
│    gh pr create --title "PZ-[NUMBER]: [Title]" --body "..."    │
│    Link to issue: "Closes #[NUMBER]"                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. REVIEW GATE (blocking)                                       │
│                                                                 │
│    Run ALL review agents in parallel:                          │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ • pr-review-toolkit:code-reviewer                       │ │
│    │ • pr-review-toolkit:silent-failure-hunter               │ │
│    │ • pr-review-toolkit:type-design-analyzer                │ │
│    │ • pr-review-toolkit:pr-test-analyzer                    │ │
│    │ • feature-dev:code-reviewer                             │ │
│    └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│    Collect all findings into PR comments                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. ADDRESS REVIEW COMMENTS                                      │
│                                                                 │
│    WHILE (unresolved comments exist):                          │
│      - Read comment                                             │
│      - Implement fix                                            │
│      - Push commit                                              │
│      - Reply to comment with resolution                        │
│      - Re-run relevant reviewer if needed                      │
│                                                                 │
│    Exit when: All comments resolved OR marked as won't-fix     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. MERGE                                                        │
│    gh pr merge --squash --delete-branch                        │
│    git checkout main && git pull                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. UNBLOCK DEPENDENTS                                           │
│    Dependent issues can now start their PR workflow            │
└─────────────────────────────────────────────────────────────────┘
```

### Review Agent Dispatch

```
Use the Task tool to launch these agents in parallel for PR #[PR_NUMBER]:

Task 1: pr-review-toolkit:code-reviewer
  "Review PR #[PR_NUMBER] for code quality, bugs, and project conventions"

Task 2: pr-review-toolkit:silent-failure-hunter
  "Review PR #[PR_NUMBER] for silent failures and error handling issues"

Task 3: pr-review-toolkit:type-design-analyzer
  "Analyze new types in PR #[PR_NUMBER] for encapsulation and invariants"

Task 4: pr-review-toolkit:pr-test-analyzer
  "Review test coverage in PR #[PR_NUMBER] for gaps and edge cases"

Task 5: feature-dev:code-reviewer
  "Review PR #[PR_NUMBER] for logic errors and security vulnerabilities"
```

### Blocking Rules

| Scenario | Action |
|----------|--------|
| Review finds critical issue | Fix before merge, re-review |
| Review finds minor issue | Fix or document as tech debt |
| Tests fail | Fix before merge |
| Dependent issue waiting | Cannot start until this PR merged |
| Parallel issue (no dependency) | Can proceed independently |

---

## Phase 0: Foundation

**Goal:** Establish package structure and shared infrastructure.

**Agent:** `Plan` → `general-purpose`

### Tasks

1. **Create monorepo structure**
   ```
   packages/
     codegen/    # Zod-to-form code generator (existing)
     core/       # Runtime, validation, layout
     ui/         # React components, designer
     edit/       # Block editor
     storage/    # R2/Cloudflare services
   apps/
     dashboard/  # Admin UI routes
   ```

2. **Setup shared tooling**
   - pnpm workspaces (pnpm-workspace.yaml)
   - Shared tsconfig (tsconfig.base.json)
   - Shared biome config
   - Package interdependencies

**Completion Criteria:** `pnpm install && pnpm build` succeeds across all packages.

---

## Phase 1: Core Runtime + Storage

Two parallel tracks that have no dependencies on each other.

### Track 1A: Core Runtime (packages/core)

**Agent:** `frontend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #26 | PZ-001: Base Input Registry | None |
| #27 | PZ-001b: Validation Rule Registry | #26 |
| #29 | PZ-004: Validation Error Display | #26 |
| #68 | PZ-003: Form Layout Engine | #26 |
| #69 | PZ-005: Form State Persistence | #26 |
| #30 | PZ-007: Form Submission Handler | #26, #27 |
| #70 | PZ-006: Accessibility Compliance | #26, #29 |

**Execution Order:**
```
#26 (Base Input Registry)
    ↓
#27, #29, #68, #69 (parallel)
    ↓
#30 (Form Submission Handler)
    ↓
#70 (Accessibility Audit)
```

**Agent Prompt Template:**
```
Use the frontend subagent to implement [ISSUE_TITLE].

Context: packages/core in phantom-zone monorepo
Issue: #[NUMBER] - [TITLE]
Requirements: [PASTE FROM ISSUE]

Constraints:
- TypeScript strict mode
- Zod 4 for validation schemas
- Export from packages/core/src/index.ts
- Unit tests with Vitest
- No external runtime dependencies

Success criteria: Tests pass, exports available, integrates with existing introspection/mapping/codegen
```

### Track 1B: Storage Services (packages/storage)

**Agent:** `backend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #31 | PZ-300: R2 Storage Client | None |
| #32 | PZ-301: Schema Storage Service | #31 |
| #33 | PZ-303: Response Storage Service | #31 |
| #57 | PZ-302: Content Storage Service | #31 |
| #61 | PZ-304: Asset Storage Service | #31 |

**Execution Order:**
```
#31 (R2 Storage Client)
    ↓
#32, #33, #57, #61 (parallel - all depend only on #31)
```

**Agent Prompt Template:**
```
Use the backend subagent to implement [ISSUE_TITLE].

Context: packages/storage in phantom-zone monorepo
Issue: #[NUMBER] - [TITLE]
Requirements: [PASTE FROM ISSUE]

Constraints:
- Cloudflare Workers compatible
- R2 for object storage
- Zod schemas for all data types
- Return typed Results, not exceptions
- Unit tests with Vitest + MSW for R2 mocking

Success criteria: Tests pass, typed client exported
```

---

## Phase 2: Designer + Block Editor Core

### Track 2A: Form Designer (packages/ui)

**Agent:** `frontend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #34 | PZ-100: Form Designer Canvas | Phase 1A |
| #35 | PZ-101: Input & Rule Palette | #34 |
| #36 | PZ-102: Field Property Editor | #34 |
| #37 | PZ-102b: Rule Composition Engine | #35, #36 |
| #71 | PZ-103: Conditional Logic Builder | #36 |
| #72 | PZ-104: Form Settings Panel | #34 |
| #73 | PZ-105: Schema Export/Import | #34 |
| #38 | PZ-106: Form Templates | #34 |
| #39 | PZ-107: Live Preview | #34, Phase 1A |

**Execution Order:**
```
#34 (Canvas)
    ↓
#35, #36, #72, #73, #38 (parallel)
    ↓
#37, #71 (parallel - need #35/#36)
    ↓
#39 (Live Preview - needs canvas + core runtime)
```

### Track 2B: Block Editor Core (packages/edit)

**Agent:** `frontend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #41 | PZ-200: Block Document Model | None |
| #42 | PZ-201: Block Registry System | #41 |
| #43 | PZ-207: Block Selection & Focus | #41 |
| #44 | PZ-209: Drag and Drop | #41, #43 |
| #45 | PZ-210: Undo/Redo History | #41 |
| #50 | PZ-206: Block Sidebar | #42 |
| #51 | PZ-208: Block Property Editor | #42, #43 |

**Execution Order:**
```
#41 (Document Model)
    ↓
#42, #43, #45 (parallel)
    ↓
#44, #50, #51 (parallel)
```

---

## Phase 3: Advanced Features

### Track 3A: Block Types (packages/edit)

**Agent:** `frontend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #46 | PZ-202: Typography Blocks | Phase 2B |
| #47 | PZ-203: Layout Blocks | Phase 2B |
| #48 | PZ-204: Media Blocks | Phase 2B |
| #49 | PZ-205: Form Blocks | Phase 2B + Phase 1A |

**Execution:** All parallel after Phase 2B complete.

### Track 3B: Editor Features (packages/edit)

**Agent:** `frontend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #52 | PZ-211: Clipboard Operations | Phase 2B |
| #53 | PZ-212: MDX Serialization | Phase 2B |
| #54 | PZ-213: Auto-Save & Versioning | Phase 2B + #31 |
| #55 | PZ-214: Multi-Page Management | Phase 2B |
| #56 | PZ-215: Slash Commands | Phase 2B |
| #60 | PZ-218: Preview Modes | Phase 2B |

**Execution:** All parallel after Phase 2B complete.

### Track 3C: Form Designer Advanced (packages/ui)

**Agent:** `frontend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #40 | PZ-108: Schema Versioning UI | Phase 2A |
| #74 | PZ-109: Response Compatibility Check | #40 |
| #75 | PZ-110: Form Designer Undo/Redo | Phase 2A |

**Execution Order:**
```
#40, #75 (parallel)
    ↓
#74
```

---

## Phase 4: App Routes + Polish

### Track 4A: Dashboard Routes (apps/dashboard)

**Agent:** `frontend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #62 | PZ-400: Application Form Route | Phase 1A + 1B |
| #63 | PZ-401: Form Designer Dashboard | Phase 2A + 1B |
| #64 | PZ-402: Content Editor Dashboard | Phase 2B + 1B |
| #65 | PZ-403: Response Viewer | #33 |

**Execution:** All parallel after their dependencies.

### Track 4B: Polish (packages/edit)

**Agent:** `frontend` subagent

| Issue | Title | Dependencies |
|-------|-------|--------------|
| #76 | PZ-219: Collaborative Editing Indicators | Phase 3B |
| #77 | PZ-220: Mobile Editor | Phase 2B |

**Execution:** Parallel, run last.

---

## Agent Dispatch Protocol

### Issue Lifecycle (Full Workflow)

```bash
# 1. Check dependencies are merged
gh pr list --state merged --search "PZ-[DEP_NUMBER]"

# 2. Create feature branch
git checkout main && git pull
git checkout -b pz-[NUMBER]-[slug]

# 3. Read issue
gh issue view [NUMBER]

# 4. Dispatch implementation agent
```

**Implementation Prompt:**
```
Use the [frontend|backend] subagent to implement #[NUMBER] [TITLE].

Context: [PACKAGE_PATH] in phantom-zone monorepo
Branch: pz-[NUMBER]-[slug]

Requirements:
[PASTE FROM gh issue view OUTPUT]

Dependencies already merged:
- #[DEP1] [TITLE1]
- #[DEP2] [TITLE2]

Instructions:
- Read existing code in the package first
- Follow established patterns from merged dependencies
- Write comprehensive tests (aim for >80% coverage of new code)
- Update package exports in index.ts
- Run full check before committing:
  pnpm install && pnpm build && pnpm test && pnpm lint && pnpm typecheck

Deliverable:
- All code committed to branch
- Ready for PR creation
```

```bash
# 5. Create PR
gh pr create --title "PZ-[NUMBER]: [Title]" --body "$(cat <<'EOF'
## Summary
[1-3 bullet points of what was implemented]

## Changes
- [File/module changes]

## Test Plan
- [ ] Unit tests added
- [ ] Integration tests added (if applicable)
- [ ] Manual testing steps

Closes #[NUMBER]

Generated with Claude Code
EOF
)"

# 6. Run review agents (parallel)
```

**Review Dispatch (run all in parallel):**
```
Launch these review agents in parallel for the PR:

Task: pr-review-toolkit:code-reviewer
  "Review the current PR for adherence to project guidelines and best practices.
   Focus on the diff from: gh pr diff [PR_NUMBER]"

Task: pr-review-toolkit:silent-failure-hunter
  "Examine error handling in the current PR. Check for silent failures,
   swallowed exceptions, and inappropriate fallbacks."

Task: pr-review-toolkit:type-design-analyzer
  "Analyze any new TypeScript types/interfaces added in this PR.
   Rate encapsulation, invariant expression, and enforcement."

Task: pr-review-toolkit:pr-test-analyzer
  "Review test coverage for the PR. Identify critical gaps and missing edge cases."
```

```bash
# 7. Collect review findings
gh pr view [PR_NUMBER] --comments

# 8. Address each comment
```

**Comment Resolution Prompt:**
```
Address review comments on PR #[PR_NUMBER].

Comments to resolve:
[PASTE COMMENTS]

For each comment:
1. If valid: implement fix, push commit, reply with "Fixed in [SHA]"
2. If clarification needed: reply with question
3. If disagree: reply with reasoning, mark as "won't fix" if appropriate

After all resolved, re-run any reviewer that found issues to verify fixes.
```

```bash
# 9. Merge when approved
gh pr merge [PR_NUMBER] --squash --delete-branch

# 10. Update local and unblock dependents
git checkout main && git pull

# 11. Issue auto-closes via "Closes #[NUMBER]" in PR body
```

### Parallel Execution Rules

**Can run in parallel:**
- Issues with no dependency relationship
- Review agents on same PR
- Implementation of independent branches

**Must run sequentially:**
- Issues where one depends on another (wait for PR merge)
- Fix commits after review comments
- Re-reviews after fixes

**Example: Phase 1A Execution**

```
┌──────────────────────────────────────────────────────────────────┐
│ #26 PZ-001: Base Input Registry                                  │
│ Branch: pz-26-base-input-registry                               │
│ [Implement] → [PR] → [Review] → [Fix] → [Merge]                 │
└──────────────────────────────────────────────────────────────────┘
                              ↓ (merged, unblocks)
    ┌─────────────────────────┼─────────────────────────┐
    ↓                         ↓                         ↓
┌────────────┐          ┌────────────┐          ┌────────────┐
│ #27        │          │ #29        │          │ #68        │
│ Validation │          │ Error      │          │ Layout     │
│ Rules      │          │ Display    │          │ Engine     │
│ (parallel) │          │ (parallel) │          │ (parallel) │
└────────────┘          └────────────┘          └────────────┘
    ↓ merge                 ↓ merge                 ↓ merge
    └─────────────────────────┼─────────────────────────┘
                              ↓ (all merged, unblocks)
┌──────────────────────────────────────────────────────────────────┐
│ #30 PZ-007: Form Submission Handler                              │
│ Requires: #26 merged, #27 merged                                │
└──────────────────────────────────────────────────────────────────┘
```

### Handling Blocked PRs

| Situation | Resolution |
|-----------|------------|
| Review requests changes | Implement fixes, push, re-request review |
| Merge conflict | Rebase on main, resolve conflicts, force push |
| Dependent PR not merged | Wait, work on independent issues |
| CI fails | Fix locally, push fix commit |
| Reviewer unavailable | Use another review agent, document in PR |

---

## Skill Usage

| Skill | When to Use |
|-------|-------------|
| `/commit` | After implementing fixes for review comments |
| `pr-review-toolkit:review-pr` | Full PR review (alternative to parallel agents) |
| `feature-dev:feature-dev` | Complex features needing architecture guidance |
| `testing` subagent | After phase completion for coverage audit |

---

## Phase Checkpoints

After ALL PRs in a phase are merged:

```bash
# Verify clean state
git checkout main && git pull

# Full validation
pnpm install
pnpm build
pnpm test:all
pnpm lint
pnpm typecheck

# If any fail: create fix PR before next phase
```

---

## Progress Tracking

Maintain state in GitHub:

```bash
# View open issues by phase
gh issue list --label "phase-1" --state open

# View PRs awaiting review
gh pr list --state open

# View merged PRs (completed work)
gh pr list --state merged --limit 50
```

Add labels to issues for tracking:
- `phase-0`, `phase-1`, `phase-2`, `phase-3`, `phase-4`
- `blocked` (waiting on dependency)
- `in-progress` (has open PR)
- `needs-review` (PR ready for review)

---

## Estimated Timeline Per Issue

| Step | Typical Duration |
|------|------------------|
| Implementation | 1 agent session |
| PR Creation | Immediate |
| Review (5 agents parallel) | 1 agent session |
| Address Comments | 0-2 iterations |
| Merge | Immediate |
| **Total per issue** | **2-4 agent sessions** |

With parallelization:
- Phase 1: ~4 sequential steps (due to dependencies)
- Phase 2: ~4 sequential steps
- Phase 3: ~2 sequential steps
- Phase 4: ~2 sequential steps

---

## Execution Command

To begin autonomous execution:

```
Execute the orchestration plan in ORCHESTRATION.md.

1. Start with Phase 0 (monorepo setup)
2. For each subsequent phase:
   a. Identify issues that can start (dependencies merged)
   b. For each startable issue, run full PR workflow
   c. Run parallel tracks when no dependencies conflict
   d. Wait for blocking PRs to merge before starting dependents
3. After each phase, run checkpoint validation
4. Track progress via GitHub labels and PR status
5. Stop and report if:
   - Review finds critical unfixable issue
   - Checkpoint validation fails
   - Circular dependency detected
```
