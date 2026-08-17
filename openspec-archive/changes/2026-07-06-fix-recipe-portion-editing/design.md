## Context

**Current State:**
The `Portion` model (`backend/supply/models/ingredient.py`) supports two kinds of portions:
1. **Direct unit portions**: `quantity=1` of a base `measuring_unit` (e.g. "Gramm" with `weight_g=1`, or "Stück")
2. **Composite portions**: `quantity=N` of a base `measuring_unit`, representing a real-world serving/packaging unit (e.g. "1 Portion Nudeln" = `quantity=125` × "Gramm" = `weight_g=125`)

`InlineIngredientEditor.normalizeItems()` always uses the base (rank=1) portion for editing and labels the input field with `basePortion.measuring_unit_name` — the *underlying* unit, not the portion's own name. For composite portions this is wrong: the number shown is a **multiplier of the composite portion** (e.g. `2.24` × "1 Portion Nudeln" = 280g), but the label says "Gramm", implying the number itself is grams.

**Confirmed via live data (recipe #434, "Klassische Nudeln mit Tomatensoße"):**
```
Portion: "1 Portion Nudeln"  measuring_unit=Gramm  quantity=125  weight_g=125
RecipeItem.quantity (corrupted) = 125  →  weight_g = 125 × 125 = 15625g
```
This is consistent with a user seeing "Gramm" as the label, entering "500" believing it meant 500g for 4 servings, and the app storing `500 / 4 = 125` as the per-serving multiplier of the 125g portion — 62.5× too much pasta.

**Constraints:**
- Backend already stores quantities correctly as *multiplier of the assigned portion* — this is a stable, correct data model. The bug is purely in how the frontend labels/interprets that multiplier for editing.
- No backend schema or API changes are required for the core fix.
- Existing internal `PortionScaler` + `rescaleForNewPortions()` + `toBasePerServing()` scaling logic inside `InlineIngredientEditor` is already correct and must not be broken by this fix.

**Additional confirmed location (found during deeper review):** the portion `<select>` dropdown's `<option>` labels (`InlineIngredientEditor.tsx` render section) use `p.measuring_unit_name || p.name`, which — like `normalizeItems()` — always prefers the underlying measuring unit name. For the Nudeln ingredient this means the dropdown would show **two indistinguishable "Gramm" options** (the 125g composite portion and the plain 1g portion), making it impossible for users to pick the correct one intentionally. This must be fixed using the same composite-vs-direct rule as `normalizeItems()`, and the local `EditableItem.ingredient_portions` type/mapping needs the portion's `quantity` field added (it is already present in the API response via `PortionSchema`, just dropped when building the local per-item portions list).

**Stakeholders:**
- Users editing recipes (must be able to trust the unit shown matches the number)
- Content-quality reviewers (need visibility into ingredients with placeholder/likely-wrong portion weights)

## Goals / Non-Goals

**Goals:**
- Ensure the quantity input in `InlineIngredientEditor` always shows a unit label consistent with the displayed number
- Add a lightweight signal for portions with suspicious placeholder `weight_g` values
- Repair already-corrupted recipe data discovered during this investigation (recipe #434)
- Add regression tests reproducing the exact bug data shape to prevent recurrence

**Non-Goals:**
- Changing the backend quantity storage model (multiplier-of-assigned-portion stays as-is)
- Building a full ingredient master-data audit/cleanup tool (only a display-level warning is in scope)
- Fixing the portion-count reactivity concern from the earlier draft of this proposal — verified as already working correctly, no changes needed there
- Auto-detecting and mass-repairing all potentially corrupted recipes (documented as a recommended follow-up, not part of this change)

## Decisions

### Decision 1: Label the quantity input using the portion's own name when it's a composite unit
**Choice:** In `normalizeItems()`, compute the display label as:
```
basePortion.quantity !== 1 ? basePortion.name : basePortion.measuring_unit_name
```

**Rationale:**
- A composite portion's `name` (e.g. "1 Portion Nudeln") already communicates the real-world meaning of "1 unit" — showing it directly removes ambiguity
- A direct unit portion (`quantity === 1`) has no meaningful distinction between its own name and the underlying measuring unit — using `measuring_unit_name` here keeps existing correct behavior (e.g. plain "Gramm", "Stück")

**Alternatives Considered:**
- Always show computed real grams instead of the portion multiplier: rejected — changes the underlying editing model (multiplier-of-portion) which works correctly elsewhere (portion switch, exchange groups) and would require broader rework
- Show both label and computed grams side-by-side (e.g. "2.24 Portion Nudeln (280g)"): good enhancement, worth considering as a follow-up but not required to fix the core bug; noted as an open question below

### Decision 1b: Apply the same labeling rule to the portion `<option>` dropdown
**Choice:** The `<option>` labels in the portion-switch dropdown (and the local `EditableItem.ingredient_portions` type) must use the same `quantity !== 1 ? name : measuring_unit_name` rule as the main quantity label, and must carry the portion's `quantity` field (already available from the API, currently dropped in the local mapping).

**Rationale:**
- Without this, users cannot distinguish composite portions (e.g. "1 Portion Nudeln") from the plain gram portion in the dropdown — both would render as "Gramm"
- This is the same root cause as the main quantity label bug, just in a second location; fixing both together avoids leaving a related bug unaddressed

**Alternatives Considered:**
- Leave dropdown options as-is, fix only the main label: rejected — would leave a confusing, easily reproducible variant of the same bug (users unable to tell portions apart when switching units)

### Decision 2: Keep the multiplier-based editing model; fix only the label
**Choice:** The number in the input field continues to represent "how many of the base portion", exactly as today. Only the **displayed label** changes.

**Rationale:**
- Minimizes risk — `handlePortionChange`, `handleEditPortionsChange`, and `handleSave` all already operate correctly on this multiplier model; changing the underlying representation would require re-verifying all of them
- The bug is a presentation bug (wrong label), not a math bug — the fix should be scoped accordingly

**Alternatives Considered:**
- Refactor editor to always work in grams internally: larger, riskier change; not justified since the actual defect is narrower

### Decision 3: Add a lightweight heuristic warning for placeholder portion weights
**Choice:** Flag portions where `weight_g == 1.0` but the portion `name` suggests a larger real-world unit (heuristic: name not in a small-unit allowlist like "Prise", "Messerspitze", "Gramm", "g").

**Rationale:**
- `weight_g == 1.0` for something like "große Dose" (large can) is almost certainly an unset/placeholder value (Portion.save() computes weight_g from quantity × measuring_unit.quantity; a "Gramm"-based composite with quantity=1 defaulting to 1g is a strong smell for "nobody entered the real weight")
- A simple heuristic in the frontend is sufficient to catch obviously-wrong cases without needing a backend audit system

**Alternatives Considered:**
- Backend-side validation preventing portions with weight_g=1.0 and non-gram names from being saved: more invasive, would need product/content-team sign-off on master data rules; out of scope for this bug-fix change

### Decision 4: Repair recipe #434 data directly, document as a one-off correction
**Choice:** Directly correct the six corrupted `RecipeItem.quantity` values on recipe #434 to match the plausible pre-corruption amounts, recompute via `target_weight_g / portion.weight_g`.

**Rationale:**
- This is the exact recipe used to diagnose the bug; leaving it corrupted in the shared/dev database would be confusing for future testing
- A broader recipe audit is a separate, larger effort (needs criteria for "this looks corrupted" across the whole dataset) — tracked as a recommended follow-up, not blocking this fix

**Alternatives Considered:**
- Leave data as-is, fix code only: rejected — the corrupted test recipe would keep causing confusion in QA/demos
- Build a full audit+repair script now: valuable, but expands scope significantly; recommended as a separate follow-up change

## Risks / Trade-offs

**Risk 1: Heuristic for "suspicious placeholder weight" may have false positives/negatives**
- Impact: Some legitimately-small portions could be flagged; some genuinely bad data might not be caught
- Mitigation: Keep it a soft, dismissible UI hint (not a hard block); iterate on the allowlist based on real usage feedback

**Risk 2: Other recipes may have the same corruption pattern (quantity ≈ portion.weight_g) already in the database**
- Impact: Users could still see and be confused by other already-corrupted recipes
- Mitigation: Document a recommended follow-up audit query (`RecipeItem.quantity` close to `portion.weight_g` where `portion.weight_g != 1`) rather than silently ignoring it; out of scope for this change but flagged

**Risk 3: Label change could confuse users accustomed to seeing "Gramm" even when it was wrong**
- Impact: Minor — users adapt quickly once the label reflects a portion name they already recognize from the recipe (e.g. "Portion Nudeln")
- Mitigation: Consider the follow-up enhancement of showing computed grams alongside the label for extra clarity

**Risk 4: Manual DB repair for recipe #434 bypassed the normal save path**
- Impact: Any signal-based cache invalidation (nutrition, price) tied to `RecipeItem.save()`/signals might not have been triggered by the raw `update_fields=['quantity']` save
- Mitigation: **Verified resolved** — `RecipeItem.save(update_fields=['quantity'])` does trigger the recompute signal; recipe #434's `cached_at` timestamp updated immediately after the manual fix and `cached_price_total` (0.40€) now matches the repaired quantities. No further action needed.

## Migration Plan

**Phase 1: Verify & Test**
- Add regression tests reproducing the exact recipe #434 data shape (composite portion mislabeling)
- Add tests for direct-unit and piece-based portions to confirm no regression

**Phase 2: Fix Frontend Label Logic**
- Update `normalizeItems()` label derivation logic in `InlineIngredientEditor.tsx`
- Update `handlePortionChange()` if needed to keep label logic consistent when switching portions
- Add placeholder-weight heuristic warning

**Phase 3: Data Verification**
- ✅ Verified: recipe #434's cached nutrition/price fields already reflect the repaired quantities (signal fired automatically on save)
- Document the recommended audit query for other potentially-corrupted recipes as a follow-up

**Phase 4: Rollout**
- Frontend-only change, low risk — deploy directly, no backend coordination needed
- Monitor for user confusion/support questions post-release (should decrease, not increase)

**Rollback Strategy:**
- Revert the label-derivation change in `normalizeItems()` (isolated, single-function change)
- No data migration to roll back (recipe #434 repair is a one-time correction, not a reversible migration)

## Open Questions

1. **Should the editor show both label AND computed grams** (e.g. "2.24 Portion Nudeln (≈280g)")? Would add clarity but wasn't required to fix the core bug — worth a follow-up UX discussion.
2. **Should we build the recommended audit script now or as a separate change?** Given it touches production data broadly, likely warrants its own proposal with review.
3. **Should placeholder-weight portions be blocked from being assigned to new recipe items**, or just flagged as a warning? Current design only flags; blocking would need content-team input.
