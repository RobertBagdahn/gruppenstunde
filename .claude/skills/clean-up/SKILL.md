---
name: clean-up
description: Audit the Inspi monorepo (or a given subpath) for schema mismatches (Pydantic↔Zod), bugs, dead code, refactoring opportunities, TODOs, missing implementations, missing unit/integration tests, wrong or illogical business logic, spec mismatches, missing error handling, risks, bad practices, and inconsistent layout components. Produces a prioritized Markdown report and offers safe auto-fixes. Use whenever the user wants a code audit, health check, "clean up the repo", "find bugs/dead code/TODOs", "check schema sync", "find missing tests", "find wrong business logic", "find layout inconsistencies", or wants to review whether recent OpenSpec specs match the implementation.
license: MIT
metadata:
  author: inspi
  version: "1.0"
---

# Skill: Clean-Up

A systematic, repo-wide quality audit for **Inspi** (Django Ninja backend + `frontend/` + `frontend-food/`, OpenSpec-driven). It finds problems across many dimensions, writes a **prioritized Markdown report**, and offers to **auto-fix only the safe categories** after asking.

**Read `AGENTS.md`, `backend/AGENTS.md`, and `frontend/AGENTS.md` first** so findings respect project conventions (uv runner, hybrid package structure, content/supply architecture, German umlauts, no food code in `frontend/`, schema-sync principle).

---

## Scope (argument-driven)

The argument after the invocation sets the scope:

- **(no argument)** → audit the whole repo (`backend/`, `frontend/`, `frontend-food/`, `openspec/`).
- **a path** (e.g. `backend/recipe`, `frontend-food/src/pages/planning`) → audit only that subtree.
- **a keyword** → audit only that dimension across the default scope:
  - `schema` / `sync` → only the Pydantic↔Zod schema-sync check
  - `dead` / `deadcode` → only dead/unused code
  - `todo` → only TODO/FIXME/HACK markers
  - `specs` → only the last-10-specs review + summary
  - `layout` / `ui` → only layout/UI consistency
  - `tests` → only the missing unit/integration test analysis
  - `logic` → only the wrong/illogical business-logic analysis
  - `bugs`, `risk`, `errors` → only that category

State the resolved scope back to the user before starting.

---

## Finding categories

Every finding is tagged with a **Severity** and a **Category**.

| Severity | Meaning |
|----------|---------|
| 🔴 Critical | Breaks runtime, data loss, security/DSGVO violation, or production-down risk |
| 🟠 High | Real bug, schema mismatch users will hit, missing implementation behind a shipped UI |
| 🟡 Medium | Refactoring need, missing error handling, spec drift, bad practice with real impact |
| 🟢 Low | TODO, cosmetic inconsistency, minor cleanup |

| Category | What it covers |
|----------|----------------|
| `schema-mismatch` | Pydantic (backend) vs Zod (`frontend` + `frontend-food`) field/type/optionality drift |
| `bug` | Logic errors, wrong conditions, off-by-one, unhandled None, wrong status codes |
| `dead-code` | Unused functions, components, imports, exports, vars; unreachable code; orphaned files |
| `refactor` | Duplication, overly long functions, copy-paste, missing abstraction |
| `todo` | `TODO`, `FIXME`, `HACK`, `XXX`, `@deprecated`, commented-out code blocks |
| `missing-impl` | Stubs, `NotImplementedError`, `pass`-only bodies, `throw new Error("not implemented")`, UI wired to non-existent endpoints |
| `spec-mismatch` | OpenSpec spec/change requirements not (fully) reflected in code |
| `missing-error` | No try/except, swallowed errors, missing user-facing German error messages, no toast/error state, unvalidated input |
| `risk` | Security, DSGVO (raw IPs, PII), N+1 queries, unbounded queries, missing pagination, race conditions, secrets in code |
| `bad-practice` | `any` in TS, missing type hints, `print`/`console.log`, magic numbers, non-English code, `ae/oe/ue/ss` instead of umlauts |
| `layout-inconsistency` | UI components/pages that deviate from shared layout conventions (see Layout section) |
| `missing-tests` | Important untested code: business-critical functions, management commands, API endpoints, calculation logic without unit tests |
| `missing-integration-tests` | Missing API/integration tests: endpoints, auth/permission flows, cross-app flows (e.g. meal-plan → shopping-list), seed commands |
| `wrong-logic` | Incorrect or illogical business logic: wrong formulas, inverted conditions, unit/quantity/portion miscalculations, rules that contradict the spec or common sense |

---

## Workflow

Execute in phases. Use **parallel subagents per area** to keep it fast on this large repo. Track progress with TodoWrite.

### Phase 0 — Setup

1. Resolve scope (see above) and announce it.
2. Read the three `AGENTS.md` files for conventions.
3. Pick the report path: `clean-up-report.md` at repo root (or `clean-up-report-<scope>.md` for a scoped run).

### Phase 1 — Tooling pass (fast, deterministic)

Run the available tooling and collect raw signals. Use `uv run` for all Python. Don't fail the whole audit if one tool errors — note it and continue.

```bash
# Backend (run from backend/)
make lint            # ruff
make typecheck       # mypy
make test-fast       # fast tests only

# Frontend
make frontend-lint
make frontend-typecheck

# Food frontend (no dedicated make target → use the script)
cd frontend-food && npm run lint && npx tsc --noEmit

# OpenSpec structural validation
openspec validate --all 2>/dev/null || openspec list
```

Also grep for cheap high-signal markers across the scope (use the Grep tool, not shell grep):
- `TODO|FIXME|HACK|XXX` → `todo`
- `NotImplementedError|not implemented|@deprecated` → `missing-impl`
- `: any|as any` in `*.ts,*.tsx` → `bad-practice`
- `console\.log|print\(` → `bad-practice`
- `\b(ae|oe|ue|ss)\b` in German UI strings → `bad-practice` (review carefully, many are false positives)
- `except:\s*$|except Exception:\s*pass|catch\s*\(.*\)\s*\{\s*\}` → `missing-error`

### Phase 2 — Semantic analysis (parallel subagents)

Spawn one `general` (or `explore`) subagent **per area** in the same turn. Each returns a list of findings in the exact JSON-ish format below. Areas (skip any outside scope):

- `backend` — split further per app if large (`recipe`, `event`, `content`, `supply`, `planner`, `profiles`, etc.)
- `frontend`
- `frontend-food`
- `schema-sync` (dedicated, see Phase 3)
- `specs` (dedicated, see Phase 4)
- `layout` (dedicated, see Phase 5)
- `tests` + `business-logic` (dedicated, see Phase 6)

Give each subagent this brief:
> Audit `<area>` of the Inspi repo for: bugs, dead code, refactoring, missing implementation, missing error handling, risks, and bad practices. Respect conventions in `<area>`'s AGENTS.md (uv runner, hybrid packages, German umlauts, no food code in frontend/). For each finding return: severity, category, `file:line`, a one-line description, and a suggested fix. Do NOT modify any files. Be precise — prefer fewer, real findings over noise.

### Phase 3 — Schema-sync (field-by-field)

This is a **core project principle**, so do it carefully.

1. Enumerate backend Pydantic schemas (look in each app's `schemas.py` / `schemas/` package; remember the hybrid package structure re-exports via `__init__.py`).
2. For each entity, find the corresponding Zod schema in `frontend/` and/or `frontend-food/` (food-related schemas live only in `frontend-food/`).
3. Compare **field by field**: presence, type, optionality/nullability, enum values, nested shapes.
4. Report every divergence as `schema-mismatch` with both sides: `backend: RecipeSchema.portion: float (required)` vs `frontend-food: recipeSchema.portion: z.number().optional()`.

If an entity exists on only one side, that's a `schema-mismatch` (High) unless intentionally backend-only.

### Phase 4 — Specs review + summary (last 10 specs)

1. List specs/changes by recency:
   ```bash
   ls -td openspec/changes/*/ 2>/dev/null | head -10
   # plus most recently modified specs:
   ls -td openspec/specs/*/ | head -10
   ```
   Prefer **active changes** in `openspec/changes/` (current work); fall back to most-recently-modified entries under `openspec/specs/`. Take the 10 most recent overall.
2. For each of the 10:
   - **Summarize the spec** in 2-3 sentences: what capability/requirement it defines.
   - **Check the implementation**: does the code reflect the spec's requirements/scenarios? Spot-check the key requirements, not every line.
   - Record an **implementation status**: `Done` / `Partial` / `Missing` / `Drifted`.
   - Emit `spec-mismatch` findings for any gap, with the specific unmet requirement.
3. Produce a **Spec Summary table** (see Report template) — this is required even when there are no mismatches.

### Phase 5 — Layout / UI consistency

Both frontends share conventions. Compare pages/components against them and flag deviations.

Shared building blocks to check against:
- `frontend/src/components/Layout.tsx` and `frontend-food/src/components/layout/FoodLayout.tsx` — every page should render inside its layout.
- `ListPageHero`, `ToolLandingPage`, `ListPageSearchBar` (shared) — list/landing pages should reuse these rather than re-implementing heros/search bars.
- Filter sidebars (`*FilterSidebar.tsx`) — consistent placement/props.

Heuristics for `layout-inconsistency`:
- A page that builds its own header/hero/container instead of the shared component.
- Divergent spacing/padding/max-width wrappers for the same page type (e.g. one list page uses `max-w-7xl px-4`, another `container mx-auto p-6`).
- Inconsistent card/section primitives (raw `<div className="border rounded">` vs the shared shadcn `Card`).
- Pages not wrapped in the app `Layout`/`FoodLayout`.
- Mixing semantic-color tokens vs hardcoded hex/`bg-gray-*` where a design-system token exists.
- Mobile-first violations (fixed pixel widths, no responsive breakpoints) — the platform is primarily used on phones (320px min).

For each, report the deviating file and the shared component/pattern it should use.

### Phase 6 — Test coverage & business-logic correctness

This phase is about *what the tooling can't tell you*: whether the right things are tested and whether the logic is actually correct.

**6a — Missing tests (`missing-tests`, `missing-integration-tests`)**

Map source modules to their tests and flag important gaps. Don't chase 100% coverage — focus on code where a bug would hurt users or data.

1. Inventory tests: `backend/<app>/tests/`, `frontend/src/**/*.test.ts(x)`, `frontend-food/src/**/*.test.ts(x)`.
2. Identify **business-critical, untested** code and rank by impact:
   - Calculation/algorithm code (portion scaling, quantity/unit conversion, cost/nutrition aggregation, shopping-list generation, mengenberechnung).
   - Django management commands (`seed_*`, `add_users`, `import-inspi`, `generate-embeddings`).
   - API endpoints with non-trivial logic, permission checks, or side effects.
   - Anything recently changed by the last-10 specs (cross-reference Phase 4).
3. Distinguish:
   - `missing-tests` → no unit test for a critical function/branch.
   - `missing-integration-tests` → no test exercising the endpoint/flow end-to-end (request → DB → response), auth/permission flows, or cross-app flows (e.g. meal-plan → cooking-schedule → shopping-list).
4. For each gap, name the **specific function/endpoint/flow** and the **risk if it breaks** (so the user can prioritize), plus a one-line test suggestion. Optionally run `make test-cov` to back claims with coverage numbers, but reason about importance, not just raw %.

**6b — Wrong / illogical business logic (`wrong-logic`)**

This needs real reasoning, not pattern matching. Spawn a focused subagent for the calculation-heavy areas (recipe scaling, meal-plan portions, shopping-list quantities, unit conversion, cost/nutrition, breakfast calculator) with this brief:
> Read the calculation/business-logic code in `<area>` and judge whether it is *correct and sensible*, not just whether it runs. Look for: inverted conditions, wrong operators, unit mismatches (g vs kg, piece vs weight), rounding applied at the wrong step, division-by-zero / empty-collection cases, factors applied twice or not at all, off-by-one in portions/days, defaults that produce nonsensical results, and logic that contradicts the relevant OpenSpec spec. For each issue give `file:line`, what the code currently does, why it's wrong, and the correct behavior.

Cross-check suspected `wrong-logic` against the spec text (Phase 4) — if the spec disagrees with the code, decide whether it's a `wrong-logic` bug or a `spec-mismatch` and tag accordingly. When a `wrong-logic` finding has no test, also emit the matching `missing-tests` finding so the fix can be locked in.

### Phase 7 — Report

Write the report to the chosen path using the **exact template below**. Then print a short console summary: counts per severity and per category, plus the top 5 Critical/High items.

### Phase 8 — Offer fixes

After presenting the report, **ask before fixing** (like the deploy skill: ask before each action). Only auto-fix **safe categories**:

**Safe to auto-fix (offer in a batch, then apply after confirmation):**
- Unused imports / unused local variables (verify they're truly unused first)
- `console.log` / stray `print()` removal
- `ae/oe/ue/ss` → real umlauts in UI strings (confirm each — risk of false positives in code identifiers)
- Dead code with zero references (verify with a repo-wide search before deleting)
- `ruff --fix` / `npm run lint -- --fix` auto-fixable lints
- Formatting (`make format`)

**Never auto-fix (report only, require explicit per-item go-ahead):**
- `schema-mismatch` (touches both backend and frontend contracts)
- `bug`, `missing-impl`, `missing-error`, `risk`, `spec-mismatch`, `wrong-logic`
- `missing-tests` / `missing-integration-tests` — offer to *write* the tests, but only after the user picks which gaps to cover (writing tests is opt-in, not a silent auto-fix)
- Anything that changes behavior, API shape, DB models, or migrations

For safe fixes: present the list, ask "Diese sicheren Fixes anwenden?", apply on confirmation, then re-run the relevant linter/typecheck to confirm nothing broke. After applying, remind the user about the quality checklist (`make check`) and that Pydantic/Zod must stay in sync.

For test gaps: when the user asks to fill them, write tests next to the existing test suite (`backend/<app>/tests/`, `*.test.tsx`), follow the existing test style, and run them with `uv run` (backend) or `npm test` (frontend) to confirm they pass — a `wrong-logic` fix should land together with a test that would have caught it.

---

## Report template

ALWAYS use this exact structure:

```markdown
# Clean-Up Report — <scope> — <date>

## Zusammenfassung
- Geprüfter Scope: <scope>
- Findings gesamt: <n>  (🔴 <n> · 🟠 <n> · 🟡 <n> · 🟢 <n>)
- Tooling-Status: ruff <ok/fail>, mypy <ok/fail>, frontend tsc <ok/fail>, food tsc <ok/fail>, tests <ok/fail>

## Top-Prioritäten
1. 🔴 [category] <one-liner> — `file:line`
2. ...

## Findings nach Kategorie

### schema-mismatch
| Sev | Backend | Frontend | Problem | Fix |
|-----|---------|----------|---------|-----|
| 🟠 | RecipeSchema.portion: float (req) | frontend-food recipeSchema.portion: optional | Optionalität weicht ab | Zod auf required setzen |

### bug
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🔴 | `backend/recipe/api.py:142` | ... | ... |

### dead-code
| Sev | Ort | Problem | Fix |

### refactor
| Sev | Ort | Problem | Fix |

### todo
| Sev | Ort | Marker | Notiz |

### missing-impl
| Sev | Ort | Problem | Fix |

### missing-error
| Sev | Ort | Problem | Fix |

### risk
| Sev | Ort | Problem | Fix |

### bad-practice
| Sev | Ort | Problem | Fix |

### layout-inconsistency
| Sev | Ort | Abweichung | Soll-Komponente/Pattern |

### wrong-logic
| Sev | Ort | Ist-Verhalten | Warum falsch | Soll-Verhalten |

### missing-tests
| Sev | Ort (Funktion) | Risiko bei Fehler | Test-Vorschlag |

### missing-integration-tests
| Sev | Endpoint / Flow | Risiko bei Fehler | Test-Vorschlag |

## OpenSpec — letzte 10 Specs

| Spec / Change | Zusammenfassung | Implementierungs-Status | Lücken |
|---------------|-----------------|-------------------------|--------|
| recipe-folders | Definiert Ordner-Gruppierung für Rezepte ... | Done | – |
| meal-plan-drinks | ... | Partial | Endpoint X fehlt |

## Sichere Auto-Fixes (Vorschlag)
- [ ] Ungenutzte Imports in <files>
- [ ] console.log entfernen in <files>
- [ ] Umlaut-Korrekturen in <files>

## Manuelle Fixes (nur mit Freigabe)
- 🔴/🟠 Liste ...
```

---

## Guardrails

- **Never auto-fix** anything outside the safe-categories list. Behavior/contract/DB changes need explicit per-item confirmation.
- **Always run Python via `uv run`** (never global python / micromamba).
- **Respect the food/main split**: do not suggest adding food code to `frontend/` or moving food UI out of `frontend-food/`.
- **Use real German umlauts** (ä ö ü Ä Ö Ü ß) in the report and any UI fixes.
- **Verify before deleting**: a "dead code" finding must be backed by a repo-wide reference search before you propose removal.
- **Prefer few real findings over noise** — every finding needs a `file:line` and a concrete fix.
- If a tooling command fails, note it in the report's Tooling-Status and continue; don't abort the whole audit.
- The Spec Summary table is **always** produced when specs are in scope, even with zero mismatches.
