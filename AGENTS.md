# AGENTS.md

## Vállalhatatlan project rules

### 1. Audit first, modify second
Before changing code:
- inspect the relevant files
- search for references/usages
- understand the existing architecture

Never guess when the repository can answer the question.

### 2. Strict scope
Do ONLY what the current task requests.

Do not:
- refactor unrelated code
- fix unrelated bugs
- add unrequested features
- change APIs, database, auth or dependencies
- rename/move files unnecessarily

If you discover an unrelated problem, report it but do not fix it.

### 3. Work in phases
If a task is divided into phases, implement ONLY the current phase.

When the requested acceptance criteria are met:
STOP.

Do not continue improving the implementation.

### 4. Preserve existing functionality
Vállalhatatlan is an existing application.

Prefer modifying existing components and patterns over creating parallel systems.

Do not remove functionality unless explicitly requested.

UI removal does NOT mean removing the underlying functionality.

### 5. Hálózat is core functionality
`/halozat` is a core part of the product.

Before modifying it, inspect its related:
- components
- map/location logic
- spot logic
- API routes
- Supabase queries
- bottom navigation

Do not break or remove the existing Hálózat bottom navigation unless explicitly requested.

### 6. Navigation
The old `components/Navigation.tsx` has been intentionally removed.

Do NOT recreate it.

Global navigation should be implemented through the current shared layout architecture.

Do not duplicate global navigation across individual pages.

### 7. Design
Vállalhatatlan has a deliberate underground / experimental / CRT / Y2K visual language.

Do not turn the UI into a generic SaaS dashboard.

Reuse existing fonts, components, styles and design patterns where possible.

Do not invent new visual systems unnecessarily.

### 8. Auth / backend
Do not modify authentication, Supabase, Stripe, API contracts or database schemas during frontend tasks unless explicitly requested.

Keep frontend presentation separate from underlying functionality.

### 9. Validation
After changes:
- inspect the diff
- check imports/types
- run available typecheck/build/lint

If a validation error is unrelated to the current change, report it and leave it alone.

### 10. Git safety
Never:
- reset/revert user changes
- delete uncommitted work
- create commits
- push to GitHub

unless explicitly requested.

## Golden rule

BE PRECISE, NOT CLEVER.

A small correct change is better than a large "improvement".

When uncertain:
AUDIT → ASK → MODIFY.