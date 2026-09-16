## Context

Recipe items store a quantity multiplier and reference a `Portion`. The portion currently carries the technical `weight_g` used by nutrition, price, meal-plan and shopping calculations. Import and AI paths still resolve unknown piece-like names to `Gramm`, while `Portion.save()` can turn an unweighted piece into `1 g`.

The product decision is to keep piece semantics in named portions, not to introduce a new `MeasuringUnit` type. A named portion such as `kleines Brötchen` therefore remains the user-facing unit while its confirmed `weight_g` remains the calculation basis.

## Goals / Non-Goals

**Goals:**

- Centralize piece-like portion detection and weight resolution across imports, AI creation, editor flows and calculations.
- Represent missing, proposed and confirmed portion weights explicitly.
- Require confirmation for a new AI piece-weight proposal.
- Let users choose between an existing piece portion and a new AI-proposed size.
- Preserve referenced portion definitions and create new portions for materially different confirmed weights.
- Keep recipe display in named portions while using confirmed grams for calculations.

**Non-Goals:**

- Do not add `unit="stk"` or revive the removed `Stück` MeasuringUnit architecture.
- Do not redesign package purchasing semantics.
- Do not repair all historical corrupt records in this change; that is handled by `repair-food-portion-data`.

## Decisions

### Persist weight provenance on portions

Add explicit portion metadata for weight status/source, for example `unknown`, `ai_proposed`, `confirmed`, and `imported`. A confirmed timestamp and optional confidence value allow the UI and repair jobs to distinguish a physical value from an unreviewed estimate.

This is preferred over inferring status from `weight_g` because a numeric weight alone cannot show whether a user confirmed it. No new MeasuringUnit is needed.

### Centralize piece classification

Introduce one service that classifies a portion/import row as piece-like from normalized portion names, source text and known size descriptors. All import and AI paths call this service. Unknown units must produce a clarification state rather than silently resolving to Gramm.

### Separate proposal from confirmation

Import previews and AI estimate responses return a structured weight proposal. The recipe wizard and inline editor require an explicit confirmation when no matching confirmed portion exists. Confirmation creates or selects a portion through an authenticated endpoint and then persists the RecipeItem.

### Preserve referenced portions

If a confirmed choice differs from a referenced portion, create a new portion with a unique descriptive name. Existing `Portion.weight_g` values are not changed in place. The new portion becomes available for future recipes and may be selected for the current RecipeItem.

### Keep calculations on confirmed weight

Nutrition, price, meal-plan and shopping services use `weight_g` only when the portion is confirmed or otherwise explicitly trusted by existing curated data. Unconfirmed proposals cannot silently contribute a fabricated `1 g` value.

### API and schema contracts

- Extend recipe import and AI estimate response schemas with `weight_status`, `weight_source`, `weight_proposal_g` and confirmation metadata.
- Add an authenticated portion-confirmation endpoint under the ingredient/portion API, returning the selected or newly created `PortionOut`.
- Extend `PortionOut` and the Food Zod `PortionSchema` in sync.
- Keep existing RecipeItem endpoints compatible, but reject unsafe piece updates with a typed validation error.

## Risks / Trade-offs

- [Existing data has ambiguous names] -> Use conservative classification and require confirmation when no trusted matching portion exists.
- [A user can create many size-specific portions] -> Enforce case-insensitive names and show existing candidates before creation.
- [Some valid recipe portions have no physical weight] -> Preserve the portion as count-only, but expose missing-weight status and exclude it from gram-based calculations until confirmed.
- [Different consumers may still use local unit heuristics] -> Add cross-consumer tests and route all new logic through the central portion resolver.
- [Changing Portion fields requires migration] -> Add nullable/default-safe fields in a new migration and backfill only unambiguous status values.

## Migration Plan

1. Add nullable provenance/status fields without changing existing weights.
2. Deploy resolver and API contracts behind the existing recipe editor/import flows.
3. Backfill trusted curated portions as `confirmed` or `imported`; leave ambiguous piece-like rows unresolved.
4. Run the separate data-repair change for historical 1-g and unit-mismatch records.
5. Roll back application behavior by disabling new confirmation paths; keep additive metadata fields for forward-compatible auditability.
