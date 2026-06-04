# Tasks

## 1. Backend: Modell & Migration

- [x] 1.1 `MealTypeChoices.DRINKS = "drinks"` (`_("Getränke")`) in `planner/models/meal_plan.py` ergänzen
- [x] 1.2 `MEAL_TYPE_DAY_FACTORS["drinks"] = 0.0`, `DEFAULT_MEAL_TYPES += DRINKS`, `MEAL_TYPE_DEFAULT_TIMES["drinks"]` und `default_day_part_factors()` um `drinks` ergänzen
- [x] 1.3 Feld `external_cost_per_person` (`FloatField`, null, blank) am `Meal`-Modell hinzufügen
- [x] 1.4 `uv run python manage.py makemigrations planner` (eine Schema-Migration, keine Daten-Migration)
- [x] 1.5 `uv run python manage.py migrate` und Reversibilität prüfen

## 2. Backend: Schemas & Resolver

- [x] 2.1 `MealOut.external_cost_per_person` in `planner/schemas/meal_plan.py` ausgeben
- [x] 2.2 `resolve_total_cost_eur`: bei `is_external` → `external_cost_per_person × effektive_portionen` (sonst 0.0)
- [x] 2.3 `resolve_total_energy_kj`: bei `is_external` ohne manuellen Wert → automatisch `NORM_PERSON_DAILY_KCAL × day_part_factor` (in kJ); manueller Wert überschreibt
- [x] 2.4 `MealUpdateIn.external_cost_per_person` ergänzen + Update-Handling in `planner/api/meal_plan.py`
- [x] 2.5 Nutrition-Summary (Service/Resolver) so anpassen, dass `drinks`-Meals bei der Energie-Aggregation ausgeschlossen werden; Kosten/Einkauf unverändert

## 3. Backend: Neue Endpoints

- [x] 3.1 `POST /api/meal-plans/{plan_id}/meals/{meal_id}/scale-to-target`: alle Items × `target/current`, Faktor auf 1 NK gerundet, atomar; Fehlerfälle (current=0, synced, external)
- [x] 3.2 `POST /api/meal-plans/{plan_id}/meal-items/{item_id}/copy` mit `{ target_meal_id }` (default eigene Mahlzeit); kopiert recipe/ingredient/quantity/unit/factor/display_name; synced-Ziel abgelehnt
- [x] 3.3 Pydantic-Input/Output-Schemas für beide Endpoints

## 4. Backend: Seeds & Tests

- [ ] 4.1 `core/management/commands/seed_all.py` (planner-Section) + `planner/tests/__init__.py` Factories um Getränke-Demo ergänzen
- [ ] 4.2 Tests: Drinks aus Kcal-Bilanz ausgeschlossen, aber in Kosten/Einkauf enthalten
- [ ] 4.3 Tests: External cost (Festpreis × Portionen) und automatische Kcal-Deckung (mit/ohne manuellen Wert)
- [ ] 4.4 Tests: scale-to-target (proportional, Rundung, Fehlerfälle) und copy (Duplikat, in anderes Meal, synced-Ablehnung)

## 5. Frontend: Schemas & API-Hooks (frontend-food)

- [ ] 5.1 `src/schemas/mealPlan.ts`: `drinks` in `MEAL_TYPE_LABELS`/`MEAL_TYPE_ICONS`/`MEAL_TYPE_COLORS`
- [ ] 5.2 `external_cost_per_person` in `MealSchema` und `MealUpdateIn`-Zod ergänzen; Zod-Inputs für Scale/Copy
- [ ] 5.3 `src/api/mealPlans.ts`: Hooks `useScaleMealToTarget` und `useCopyMealItem` (mit Query-Invalidierung)

## 6. Frontend: Refactor MealEventDetailPage

- [ ] 6.1 `DayPlanView` nach `src/pages/planning/DayPlanView.tsx` extrahieren (Verhalten 1:1)
- [ ] 6.2 `MealSlot` nach `src/pages/planning/MealSlot.tsx` extrahieren
- [ ] 6.3 Gemeinsamen `FactorInput` extrahieren (Duplikat aus Page + TableView entfernen)
- [ ] 6.4 `MealEventDetailPage.tsx` auf neue Imports umstellen, Tagesplan manuell gegentesten

## 7. Frontend: Gemeinsames MealActionsMenu

- [ ] 7.1 `src/components/planning/MealActionsMenu.tsx` (shadcn `DropdownMenu`) mit Aktionen: Portionen, Extern, Auf Soll skalieren, Soll ändern, Notiz, RefMeal verknüpfen/entkoppeln, Items kopieren, Mahlzeit löschen
- [ ] 7.2 Inline-Eingaben/Popover für Portionen (`override_portions`), Soll (`day_part_factor`), Notiz (`note`), Extern (`is_external` + `external_cost_per_person` + optional `external_energy_kcal`)
- [ ] 7.3 Menü in `MealSlot` (Tagesplan) einhängen, altes Settings-Panel/Icon-Leiste ersetzen
- [ ] 7.4 Menü in `TableView`-Zelle einhängen (Parität herstellen)

## 8. Frontend: Getränke & Kopier-Dialog

- [ ] 8.1 `drinks` in `mealTypes` (DayPlanView) und `MEAL_TYPE_ORDER` (TableView) aufnehmen
- [ ] 8.2 Tages-Kcal-Summen (`dayActualKcal`/`dayTargetKcal`) und Tabellen-Tagessummen: `drinks` aus Kcal ausschließen; Kosten unverändert
- [ ] 8.3 Getränke-Slot: kein Soll/Ist-%, eigene Kcal/Kosten informativ anzeigen
- [ ] 8.4 `src/pages/planning/CopyMealItemDialog.tsx`: Ziel-Mahlzeit wählen (gruppiert nach Tag+Typ, synced/reference ausgeschlossen)

## 9. Abschluss

- [ ] 9.1 Pydantic ↔ Zod Synchronität prüfen (Felder, Typen)
- [ ] 9.2 Mobile (320px) und Desktop in Tagesplan und Tabelle testen
- [ ] 9.3 Keine `console.log`/`print` im Production-Code; `uv run` für alle Python-Befehle
- [ ] 9.4 `openspec validate meal-plan-drinks-and-actions` erneut prüfen
