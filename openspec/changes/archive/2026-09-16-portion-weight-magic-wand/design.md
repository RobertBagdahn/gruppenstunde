## Context

`Portion.weight_g` is currently nullable because piece-like names intentionally avoid a fabricated `1 g` fallback. The model, create/update APIs, AI apply path and historical data therefore permit active portions that cannot participate reliably in recipe, price, nutrition or shopping calculations. The Food frontend exposes this state as “Kein Gewicht” and currently only warns for missing package weights.

The change spans the `supply` model/API/services, recipe validation and the Food ingredient detail page. It must preserve the existing named-portion model: `Stück` remains a portion name and no dedicated `Stück` measuring unit is introduced.

## Goals / Non-Goals

**Goals:**

- Enforce a positive weight for every active non-deleted portion, including manually created, AI-applied and imported portions.
- Provide an auditable repair path for existing missing weights, with deterministic repair where safe and AI/manual review otherwise.
- Add exactly one dedicated portions magic-wand action in the “Portionen” section.
- Generate a fresh AI suggestion on every wand invocation and show all changes in a confirmation dialog before mutation.
- Keep weighted portions unchanged; replace only selected unweighted portions and optionally add selected new typical portions.
- Keep backend Pydantic and Food Zod schemas synchronized.
- Apply selected replacements atomically: delete the old unweighted rows and create complete weighted rows in one transaction.

**Non-Goals:**

- No new `Stück` measuring-unit type.
- No automatic replacement of already weighted portions.
- No reuse of a previous wand response or silent background mutation.
- No generic `1 g` fallback when the AI cannot determine a meaningful value.
- No redesign of package purchasing semantics.

## Decisions

### Enforce the invariant at the service and API boundary

`weight_g > 0` is validated centrally before saving active portions. Model save behavior may continue to calculate safe metric/canonical weights, but an active portion that resolves to `None` or a non-positive value is rejected by the domain service and API. The same validation is used by manual creation, update, AI apply and import paths. Database-level enforcement is evaluated after existing data is repaired because a PostgreSQL check constraint cannot express the “system row versus active row” distinction without careful migration handling.

### Preserve the existing named-piece model

The system keeps `Portion.name` as the user-facing unit for `Stück`, `Scheibe`, `Zehe` and size variants. `weight_g` is the physical calculation basis. A missing piece weight is therefore a validation/review problem, not a reason to introduce a new measuring-unit architecture.

### Use a two-phase magic-wand workflow

The frontend calls a preview endpoint and opens a dialog. The backend gathers the complete ingredient context and requests a new AI response on every call. The preview contains:

- existing weighted portions, read-only and excluded from replacement;
- existing unweighted portions, selected for replacement by default;
- new AI-proposed typical portions, unselected by default;
- a positive editable weight for every proposal;
- an explicit error/manual-input state when AI returns no usable weight.

The apply request sends the selected existing portion IDs and complete replacement/new definitions. The backend revalidates permissions, names, weights and current database state inside one transaction, soft-deletes selected unweighted portions, then creates the replacements. It rejects a stale request if a selected source became weighted or changed since preview.

### Resolve the unselected-unweighted conflict explicitly

Because active unweighted portions are forbidden, unchecking an automatic replacement cannot leave the source row active. The dialog presents the user with a required choice: enter a positive manual weight for that existing portion, or select deletion without replacement. The apply button remains disabled while any selected operation would otherwise leave an unweighted active portion.

### Keep AI context broad but response structured

The AI input includes ingredient name/description, aliases, current portions, packages, nutrition, retail/category and physical properties, plus recipe usages where available. The response is parsed through a dedicated Pydantic schema containing source IDs, operation type, name, quantity, measuring-unit name, rank, proposed weight, confidence and an explanation. AI output never writes directly to the database.

### API contract

- `POST /api/ingredients/{slug}/portions/magic-wand/preview/` creates a fresh preview. Authenticated users with portion edit permission receive existing rows and proposed operations.
- `POST /api/ingredients/{slug}/portions/magic-wand/apply/` applies a confirmed preview atomically. The request includes selected replacements, selected new portions, manual weights and a preview token/version. The response returns the active portions and operation summary.
- Existing create/update and `ai-apply` endpoints reject active portions without positive resolved weight and retain their current permission behavior.

### Repair existing data before tightening production behavior

The repair command scans active portions with missing/non-positive weight, calculates safe values when the measuring unit and semantics are unambiguous, and creates review findings for piece-like or otherwise ambiguous rows. AI/manual repair uses the same confirmation/apply service. Recipe references are preserved; rows cannot be silently overwritten when a referenced portion’s physical weight would change.

### Frontend placement

`IngredientDetailPage` renders one `Wand2`/magic-wand action in the “Portionen” header next to “Portion hinzufügen”. There are no per-row wand buttons. A dedicated dialog component owns preview selection, manual weight validation, loading/error/empty states and confirmation. TanStack Query invalidates the ingredient and portion queries after apply.

## Risks / Trade-offs

- [Existing production data contains many unweighted rows] → Run an auditable repair scan first; block only new writes until reviewed rows are resolved, and provide per-row repair findings.
- [AI suggests implausible or duplicate portions] → Require positive numeric validation, case-insensitive duplicate checks, preview selection, confidence display and final server-side validation.
- [User confirms a stale preview] → Include a preview version/context hash and revalidate source rows and names in the transaction; return a conflict without partial mutation.
- [Deleting an unweighted portion can remove a useful recipe reference] → Soft-delete only, preserve RecipeItem references, and require explicit deletion choice when no replacement is selected.
- [A broad recipe-usage context increases AI payload size] → Bound and summarize recipe usages while retaining enough context to identify typical units; record the AI interaction for auditability.
- [Nullable database field remains for historical and migration safety] → Enforce the active-row invariant in all write services and add a follow-up database check only after the repair gate succeeds.

## Migration Plan

1. Add schemas, preview/apply service, validation tests and frontend contract tests without changing existing rows.
2. Run the repair scan and classify all active unweighted portions into deterministic repairs, AI/manual review, or explicit deletion candidates.
3. Apply deterministic repairs and review remaining findings through the existing authenticated repair tooling.
4. Deploy write-path validation and the portions magic-wand UI.
5. Run cross-consumer tests for recipe, nutrition, price, planner and shopping calculations.
6. If the repaired dataset is clean, add a database constraint or equivalent integrity check in a follow-up migration.
7. Rollback keeps repaired weights and soft-deleted rows; disable the wand UI and endpoints if necessary, but do not re-enable unvalidated active writes.

## Open Questions

- Recipe usage context is currently bounded to the 50 most recently updated recipe items; a later data-volume review may change this to a usage-ranked sample.

## Release Decision

The final database check constraint is deferred to a follow-up migration after the production repair gate. The current implementation enforces the invariant in all covered write services and APIs, while the nullable column remains necessary for historical rows awaiting repair and for the existing audit workflow.

The repair command was executed in dry-run mode against the current dataset with a limit of 50. It found 50 candidates, including referenced piece-like portions. No automatic apply was performed because those rows require per-ingredient review or confirmed AI proposals. The release gate therefore remains data-review dependent.
