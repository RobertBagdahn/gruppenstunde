## Context

Ingredient prices are stored directly as nullable `Ingredient.price_per_kg`. Existing AI and data-quality flows can estimate missing values, but the runtime treats `NULL` and `0` inconsistently and has no durable proposal/approval history. Recipe caches sum known prices without an explicit coverage state.

## Goals / Non-Goals

**Goals:**

- Generate structured AI price proposals for missing or zero prices.
- Require user confirmation before changing the global ingredient price.
- Preserve proposal history and provenance.
- Make `NULL` and zero consistently mean missing.
- Expose price coverage in recipe and meal-plan cost responses.

**Non-Goals:**

- Do not overwrite positive prices automatically.
- Do not create product-level supermarket price histories in this change.
- Do not estimate prices for materials.

## Decisions

### Proposal model and provenance

Add an `IngredientPriceProposal` model containing ingredient, proposed EUR/kg, confidence, rationale/source, status (`pending`, `accepted`, `rejected`), requester/reviewer and timestamps. Add lightweight provenance fields to Ingredient or derive active provenance from the accepted proposal history.

### Approval endpoints

- `POST /api/ingredients/{slug}/price-proposals/` creates an AI proposal for one ingredient.
- `GET /api/ingredients/{slug}/price-proposals/` lists proposals for authorized users.
- `POST /api/ingredients/{slug}/price-proposals/{proposal_id}/accept/` applies a proposal globally.
- `POST .../reject/` records a rejection.
- A staff batch endpoint may process missing prices in bounded chunks, but each proposal remains independently reviewable.

### No automatic overwrite

The accept service locks the Ingredient, verifies the proposal is still pending and changes `price_per_kg` only on explicit confirmation. Positive existing prices cause a conflict unless the user explicitly chooses replacement.

### Unified missing-price semantics

Centralize `is_missing_price()` and use it in price service, cache calculation, data-quality queries, shopping, planner and frontend coverage. `None` and `0` are missing; positive values are priced.

### Coverage model

Recipe and meal-plan cost responses expose total ingredient count, priced count, missing count and coverage. The frontend shows a partial-price warning while still rendering the known subtotal.

## Risks / Trade-offs

- [AI prices can be inaccurate] -> Require confirmation and display rationale/confidence.
- [Many missing prices can cause AI cost spikes] -> Use bounded batches, rate limits and idempotent pending proposals.
- [Accepted price changes invalidate caches] -> Use existing signals plus explicit recipe/meal-plan invalidation.
- [Existing zero prices may mean free items] -> Treat zero as missing under the agreed food-domain semantics and expose the migration impact.

## Migration Plan

1. Add proposal/provenance migration and centralized missing-price helper.
2. Backfill no prices as missing without changing positive values.
3. Add proposal/approval API and Food UI.
4. Update recipe/planner/shopping coverage responses and tests.
5. Rollback by disabling proposal creation; accepted price values remain valid manual data.
