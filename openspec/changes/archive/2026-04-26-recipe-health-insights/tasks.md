# Implementation Tasks — recipe-health-insights

## 1. Backend — Positive Traits Service

- [x] 1.1 Modul `backend/recipe/services/health_traits_service.py` anlegen
- [x] 1.2 Konstanten für DGE-/EU-Claim-Thresholds (siehe design.md Decision 1)
- [x] 1.3 Funktion `compute_positive_traits(recipe) -> list[str]` implementieren
- [x] 1.4 Verwendet bestehende `cached_*_per_100g`-Felder (oder rechnet aus `cached_*` + `cached_weight_g` bei Bedarf um)
- [x] 1.5 Jede Trait-Prüfung als kleine Helper-Funktion (Testbarkeit)

## 2. Backend — Contribution Computation

- [x] 2.1 In bestehendem Nutrition-Breakdown-Service Funktion `compute_item_contributions(item, recipe_totals) -> list[ContributionOut]` ergänzen
- [x] 2.2 Für jeden der Parameter (`energy`, `protein`, `fat`, `sat_fat`, `carbs`, `sugar`, `salt`, `fiber`) absoluten Item-Wert bestimmen
- [x] 2.3 Prozent = `item_absolute / recipe_total * 100`, auf 1 Dezimalstelle gerundet, bei `recipe_total == 0` → 0
- [x] 2.4 Zurückgeben sortiert nach Parameter-Enum (stabiler Output für Tests)

## 3. Backend — Schemas

- [x] 3.1 Neues Schema `ContributionOut` in `backend/recipe/schemas/` (parameter, absolute, percent_of_recipe)
- [x] 3.2 `RecipeItemNutritionOut` um Feld `contributions: list[ContributionOut]` erweitern
- [x] 3.3 `RecipeNutritionBreakdownOut` um Feld `positive_traits: list[str]` erweitern
- [x] 3.4 `__init__.py`-Re-Exports aktualisieren

## 4. Backend — API-Integration

- [x] 4.1 Bestehenden Breakdown-Endpoint anpassen: `compute_positive_traits` aufrufen, Ergebnis in Response legen
- [x] 4.2 Beim Bauen der Item-Liste `compute_item_contributions` pro Item aufrufen
- [x] 4.3 Sicherstellen, dass kein zusätzlicher DB-Roundtrip entsteht (bereits geladene Relations nutzen)

## 5. Backend — Tests

- [x] 5.1 `test_health_traits_service.py`: Tests für jeden Trait mit Grenz-Werten (genau am Threshold, knapp drüber, knapp drunter)
- [x] 5.2 Test: Rezept mit allen 5 Thresholds erfüllt → alle Traits im Response
- [x] 5.3 Test: Leeres Rezept (keine Items) → leeres `positive_traits`
- [x] 5.4 `test_nutrition_contributions.py`: Summe der `percent_of_recipe` ≈ 100 pro Parameter
- [x] 5.5 Test: Rezept mit zuckerfreien Zutaten → alle Zucker-Contributions = 0
- [x] 5.6 Test: `absolute`-Werte konsistent mit bestehenden Item-Feldern
- [x] 5.7 `uv run pytest backend/recipe/tests/test_health_traits_service.py backend/recipe/tests/test_nutrition_contributions.py` grün

## 6. Frontend — Zod-Schemas

- [x] 6.1 `ContributionSchema` in `frontend/src/schemas/recipe.ts`
- [x] 6.2 `RecipeItemNutritionSchema` um `contributions` erweitern
- [x] 6.3 `RecipeNutritionBreakdownSchema` um `positive_traits` erweitern
- [x] 6.4 TypeScript-Types exportieren

## 7. Frontend — PositiveTraitsBadges Komponente

- [x] 7.1 `frontend/src/components/recipe/PositiveTraitsBadges.tsx` anlegen
- [x] 7.2 Props: `traits: string[]`
- [x] 7.3 Mapping von Trait-Key → { Icon, Label (deutsch) } als Konstante in Komponente
- [x] 7.4 Styling: Chip mit `bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-sm flex items-center gap-1.5`
- [x] 7.5 Render nichts wenn `traits.length === 0`
- [x] 7.6 Row-Container: `flex flex-wrap gap-2`

## 8. Frontend — NutritionContributionPanel Komponente

- [x] 8.1 `frontend/src/components/recipe/NutritionContributionPanel.tsx` anlegen
- [x] 8.2 Props: `parameter: string`, `items: RecipeItemNutrition[]`, `unit: string`
- [x] 8.3 Berechne lokal `contributors = items.map(i => ({ name, contribution })).filter(c => c.percent > 0).sort(desc).slice(0, 5)`
- [x] 8.4 State `showAll: boolean`, Toggle-Button „+N weitere anzeigen" bei mehr als 5
- [x] 8.5 Jede Zeile: `<div class="flex items-center gap-2"><span>{name}</span><div class="flex-1 h-2 bg-muted rounded"><div style="width: {percent}%" class="h-full bg-primary/60 rounded"/></div><span class="tabular-nums">{absolute} {unit} · {percent}%</span></div>`
- [x] 8.6 Leere-Liste-Zustand: „Keine Zutat trägt {parameter_label} bei."

## 9. Frontend — Integration in RecipeDetailPage

- [x] 9.1 `<PositiveTraitsBadges traits={breakdown.positive_traits} />` direkt unterhalb des Nutri-Score-Haupt-Blocks in der Gesundheits-Sektion
- [x] 9.2 Bestehenden Nutrition-Breakdown-Block mit Accordion-/Collapsible-Wrapper versehen, falls noch nicht vorhanden
- [x] 9.3 Pro Parameter-Block innerhalb des Breakdowns: `<NutritionContributionPanel parameter="..." items={breakdown.items} unit="g" />`
- [x] 9.4 Parameter-Labels (deutsch) als Konstante definieren, Wiederverwendung in Badges und Panel

## 10. Verifikation

- [x] 10.1 `pnpm tsc --noEmit` grün
- [x] 10.2 `pnpm lint` grün
- [x] 10.3 `uv run pytest backend/recipe` grün
- [ ] 10.4 Manueller Test: Rezept mit `cached_fiber_per_100g >= 6` zeigt `Ballaststoffreich`-Chip
- [ ] 10.5 Manueller Test: Rezept ohne Trait-Treffer zeigt keine Chip-Reihe
- [ ] 10.6 Manueller Test: Contribution-Panel zeigt realistische Top-5 + „weitere" Toggle
- [ ] 10.7 Payload-Check: Breakdown-Response bleibt < 50 KB bei 15 Items

## 11. OpenSpec Archive

- [ ] 11.1 `openspec validate recipe-health-insights --strict` erfolgreich
- [ ] 11.2 Via `openspec archive recipe-health-insights` archivieren
