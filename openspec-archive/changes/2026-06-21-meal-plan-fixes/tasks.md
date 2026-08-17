## 1. Backend — effective_portions Fundament

- [x] 1.1 `Meal.effective_portions`-Property in `planner/models/meal_plan.py` ergänzen (`override_portions or norm_portions or 1`)
- [x] 1.2 `MealItemOut.resolve_energy_kcal` und `resolve_cost_eur` (`schemas/meal_plan.py`) auf `effective_portions` umstellen
- [x] 1.3 `MealOut.resolve_total_energy_kcal` auf `effective_portions` umstellen; external-Branch = `external_energy_kcal × effective_portions`, Fallback = `2335 × day_part_factor × effective_portions`
- [x] 1.4 `MealOut.resolve_total_cost_eur` auf `effective_portions` umstellen (Konsistenz mit external-Cost-Branch)

## 2. Backend — Aggregations-Endpunkte

- [x] 2.1 `scale_meal_to_target` (`api/meal_plan.py`): current_kcal gegen `effective_portions` messen, konsistent mit total_energy_kcal
- [x] 2.2 `nutrition_summary` auf Per-Meal-Aggregation umbauen (je Mahlzeit mit effective_portions, dann Pro-Person-Werte summieren)
- [x] 2.3 `cost_summary` cost_per_person je Mahlzeit (`total/effective_portions`) summieren statt global `/norm_portions`

## 3. Backend — Zeit-Bearbeitung

- [x] 3.1 `MealUpdateIn` (`schemas/meal_plan.py`) um `start_datetime`/`end_datetime` (optional) erweitern
- [x] 3.2 `update_meal` (`api/meal_plan.py`): Zeitfelder durchreichen, `end_datetime > start_datetime` erzwingen (HttpError 400 sonst)

## 4. Backend — DGE-Rule & Tests

- [x] 4.1 `seed_rules.py` energy_kcal-Rule (scope day + meal_event) um 2335 zentrieren, tip_text aktualisieren
- [x] 4.2 Test: scale-to-target mit override_portions liefert ≈100% (nicht 200%)
- [x] 4.3 Test: external total_energy_kcal = external_energy_kcal × effective_portions (bestehenden Test 500→5000 anpassen)
- [x] 4.4 Test: update_meal Zeit-Validierung (end <= start → 400; gültige Zeit speichert)
- [x] 4.5 Test: nutrition_summary + cost_summary mit gemischten override_portions (Per-Meal-Aggregation)

## 5. Frontend — Schema & Helper

- [x] 5.1 `MealUpdateInSchema` (`schemas/mealPlan.ts`) um `start_datetime`/`end_datetime` ergänzen
- [x] 5.2 `formatMealTime(datetime)`-Helper mit `timeZone: 'Europe/Berlin'` in `mealPlan.ts`; `formatTime` in TableView ersetzen
- [x] 5.3 `effectivePortions(meal)`-Helper in `mealPlan.ts`
- [x] 5.4 `getDayCoverage`/`getCoverageBadge` um Überdeckungs-Zustand (>100% → "Überplant", Warnfarbe) erweitern

## 6. Frontend — Berechnungen auf effective_portions

- [x] 6.1 `MealSlot.tsx`: alle `/normPortions` (148, 151, 326, 329) auf `effectivePortions(meal)` umstellen
- [x] 6.2 `TableView.tsx`: Item-kcal/cost (404, 405) auf `effectivePortions(meal)`; Tagesbilanz Pro-Person je Meal summieren
- [x] 6.3 `DayPlanView.tsx`: Tages-Pro-Person-Summen (112, 114) je Meal mit effectivePortions

## 7. Frontend — Zeit-Anzeige & -Editor

- [x] 7.1 `MealSlot.tsx`: Zeit-Zeile (formatMealTime) unter dem Namen, vor den Stats; nur wenn start_datetime vorhanden
- [x] 7.2 `MealActionsMenu.tsx`: Menüpunkt "Zeit bearbeiten…" + Editor (zwei time-Inputs, end>start, Überlappungs-Warnung, ISO mit bestehendem Datum bauen)
- [x] 7.3 `MealEventDetailPage.tsx` + Prop-Ketten (DayPlanView/MealSlot/TableView): `handleUpdateMeal` um Zeitfelder erweitern

## 8. Frontend — UI-Konsistenz

- [x] 8.1 `MealSlot.tsx`: "Soll X%" (neutral) und "Ist X% erfüllt" (gefärbt, coverage.percent) trennen; `actualDailyPercent` entfernen
- [x] 8.2 `MealEventDetailPage.tsx`: `handleAddMealType` nutzt `plan.meal_default_times` (Fallback hardcoded)
- [x] 8.3 `MealEventDetailPage.tsx`: Reserve-Header-Label präzisieren ("Einkauf +X% Reserve")
- [x] 8.4 `MealEventDetailPage.tsx`: Tab-State-Guard (useEffect) — wenn aktiver Tab nicht mehr verfügbar (z.B. allergens ohne Tags) → 'plan'
- [x] 8.5 `NutritionView.tsx`: toten `avgCoverage`/`selectedCoverage` `?? 1`-Fallback aufräumen

## 9. Verifikation

- [x] 9.1 Backend-Tests grün: `uv run pytest planner/tests/ -x`
- [x] 9.2 Frontend Build/Typecheck grün; manuell Mobile (320px) + Desktop prüfen
- [x] 9.3 Pydantic- und Zod-Schemas synchron (MealUpdateIn)
