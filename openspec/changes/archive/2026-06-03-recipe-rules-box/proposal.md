## Why

Auf der Rezept-Detailseite werden Nährwert-Regeln (`Rule` mit `scope=recipe`) aktuell nur indirekt über die Top-5-Verbesserungsliste (`RecipeImprovements`) sichtbar — und dort ausschließlich die nicht erfüllten (gelb/rot) Regeln. Gruppenführer können nicht auf einen Blick sehen, **welche Regeln ein Rezept erfüllt und welche nicht**. Es fehlt eine transparente, vollständige Übersicht aller geltenden Regeln samt Pass/Fail-Status.

## What Changes

- Neue ausklappbare Box "Rezeptregeln" auf der Rezept-Detailseite (`frontend-food`), die **alle** aktiven `scope=recipe`-Regeln anzeigt — inklusive der erfüllten (grünen).
- Vorschau im eingeklappten Titel als **Zähler-Ampel** (z.B. `🟢 4 · 🟡 1 · 🔴 1`).
- Jede Regel zeigt Name, aktuellen Wert (pro Portion), Status-Ampel und den erfüllten/verfehlten Schwellenwert; bei gelb/rot zusätzlich den Tipp-Text.
- Neuer Backend-Service `evaluate_recipe_rules(recipe)`, der — anders als `match_recipe_hints()` — **auch grüne** Regeln zurückgibt, Werte pro Portion liefert und `nutri_class` als Buchstabe (A–E) abbildet.
- Neuer Endpunkt `GET /api/recipes/{recipe_id}/rules/` mit aggregierten Zählern (`green_count`, `yellow_count`, `red_count`).
- Neue Pydantic-Schemas (`RecipeRuleResult`, `RecipeRulesOut`) und synchrone Zod-Schemas + TanStack-Query-Hook (`useRecipeRules`).
- Wiederverwendung von `Rule.evaluate()` und dem Muster aus `match_recipe_hints()`. Der veraltete `improvement_ranking_service.py` (referenziert alte `RecipeHint`-Felder) wird **nicht** als Grundlage genutzt.

Keine Migration nötig (keine Model-Änderungen).

## Capabilities

### New Capabilities
- `recipe-rules-display`: Anzeige aller geltenden Nährwert-Regeln eines Rezepts mit Pass/Fail-Status auf der Detailseite, inklusive Backend-Auswertung (alle Regeln, pro Portion) und ausklappbarer UI-Box mit Zähler-Ampel-Vorschau.

### Modified Capabilities
<!-- Keine bestehenden Spec-Requirements ändern sich. -->

## Impact

- **Backend (`recipe` App)**:
  - `recipe/services/recipe_checks.py` — neuer Service `evaluate_recipe_rules(recipe)`.
  - `recipe/api/nutrition.py` — neuer Endpunkt `GET /{recipe_id}/rules/`.
  - `recipe/schemas/nutrition.py` (oder `rules.py`) — neue Pydantic-Schemas `RecipeRuleResult`, `RecipeRulesOut`.
  - Tests: `recipe/tests/test_recipe_rules.py` (Service + Endpunkt).
- **Frontend (`frontend-food`)**:
  - `src/schemas/recipe.ts` — neue Zod-Schemas (1:1 mit Pydantic).
  - `src/api/recipes.ts` — neuer Hook `useRecipeRules`.
  - `src/components/recipe/RecipeRulesBox.tsx` — neue ausklappbare Komponente (Muster von `AnalysisSection`).
  - `src/pages/recipes/RecipeDetailPage.tsx` — Einbindung der Box.
- **Keine** Dependency-Änderungen, **keine** DB-Migration.
- Strikte Trennung beachten: gesamte UI lebt in `frontend-food/`, nicht in `frontend/`.
