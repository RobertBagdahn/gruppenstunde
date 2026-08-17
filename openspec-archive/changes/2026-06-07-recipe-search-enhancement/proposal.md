## Why

Das Hinzufügen von Rezepten zu Mahlzeiten ist der häufigste Workflow im Food Frontend — und aktuell der schlechteste. Der kleine unscheinbare Sliders-Button wird übersehen, die Suche ignoriert den Rezepttyp "Nachtisch" komplett, es gibt kein Fallback wenn eine Kategorie leer ist, und die Suchergebnisse zeigen weder Preis, Verlässlichkeit (verified/community/draft) noch die harten Diät-Filter des Plans (vegan/vegetarisch). Das Ranking funktioniert zwar nach Nutzungshäufigkeit, aber bei Gleichstand fehlt ein Zweitkriterium. Die Inline-Schnellsuche im MealSlot leidet unter den gleichen Defiziten.

## What Changes

- `dessert` (Nachtisch) in die `MEAL_TYPE_TO_RECIPE_TYPES`-Map aufnehmen (nur im Backend)
- Mehrstufiger Fallback: Keine Treffer in kategoriespezifischer Suche → automatisch auf alle recipe_types erweitern, mit `fallback_applied: true` im Response
- Rezept-Ampel: `recipe_badge` ("verified"|"community"|"draft") in allen Search-/Suggestion-/Popular-Responses
- Preis pro Portion: `price_per_serving` im Backend berechnet, in jeder Ergebniszeile angezeigt
- Ranking: `ORDER BY usage_count DESC, cached_price_total ASC NULLS LAST`
- Harter Diät-Filter: nutritional_tag_ids des Plans als AND-Match, im Dialog über Checkbox abwählbar. Alte `exclude_nutritional_tag_ids`-Logik entfällt.
- Prominenter CTA-Button "Rezept wählen" im leeren MealSlot
- Empty State als Klickfläche + "Rezept vorschlagen" (PreviewDialog, Zufall aus Top-20)
- Kategorie-Pills (horizontal scrollable) statt Select-Dropdown
- Suchergebnisse als Cards mit Ampel, Preis, Usage Count, Diät-Badges
- "Kürzlich verwendet"-Section (plan-übergreifend, letzte 5 distinct Rezepte)
- "Selbst erstellen"-Link im leeren Dialog
- Inline-Suche bekommt dieselben Felder (Ampel + Preis + Fallback)
- Eigene Drafts in Suche einschließen (`Q(status="approved") | Q(owner=user)`)

## Capabilities

### New Capabilities
<!-- No new standalone capabilities — all changes modify existing specs -->

### Modified Capabilities
- `meal-planner-recipe-search`: Neue Response-Felder (recipe_badge, price_per_serving, fallback_applied), Fallback-Logik, AND-Filter für Diät-Tags, dessert in Mapping, Sortierung erweitert, Kategorie-Pills, RecipeSearchCard, RecentlyUsedSection, Empty-State-Link
- `recipe-suggestions`: Response erweitert um recipe_badge, price_per_serving, recipe_type, fallback_applied; Fallback-Logik, AND-Filter, Random-Modus
- `meal-plan-frontend`: MealSlot-UI: CTA-Button, Empty-State-Klickfläche, "Rezept vorschlagen"-Button, verbesserte Inline-Suchergebnisse

## Impact

- **Backend**: `planner/api/meal_plan.py` — search, suggestions, popular, recently-used Endpoints; Pydantic-Schemas erweitern; `recipe/services/` — `resolve_recipe_badge()` extrahieren
- **Frontend-Food**: `MealSlot.tsx`, `RecipeSearchDialog.tsx`, `RecipePreviewDialog.tsx` umbauen; neue Komponenten `RecipeSearchCard.tsx`, `RecipeBadge.tsx`, `CategoryPills.tsx`, `RecentlyUsedSection.tsx`; Zod-Schemas erweitern; neue API-Hooks `useRecentlyUsedRecipes`, `useRandomRecipeSuggestion`; `MEAL_TYPE_TO_RECIPE_TYPES`-Konstante aus Frontend entfernen
- **Datenbank**: Keine Schema-Änderungen
- **Breaking**: Additive Änderungen an API-Responses — neue Felder, keine Entfernung
