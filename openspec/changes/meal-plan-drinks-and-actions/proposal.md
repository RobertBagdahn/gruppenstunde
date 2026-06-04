## Why

Tagesplan (`DayPlanView`) und Tabelle/Übersicht (`TableView`) des Essensplans sind funktional auseinandergedriftet: Notiz-Bearbeitung gibt es nur in der Tabelle, RefMeal-Verknüpfung und Mahlzeit-Einstellungen nur im Tagesplan. Gleichzeitig fehlen praxisrelevante Funktionen für Lager: Getränke lassen sich nicht planen, externe Restaurant-Besuche nicht sauber kalkulieren (kein Festpreis), und es gibt keine Möglichkeit, Mahlzeit-Items zu kopieren oder eine Mahlzeit schnell auf das Soll zu skalieren.

## What Changes

- **Getränke als eigener Mahlzeit-Typ** (`drinks`): erscheint automatisch als Slot bei jedem neuen Tag (`day_part_factor = 0`). Getränke-Kalorien zählen **nicht** in die Kcal-Tagesbilanz; Kosten und Einkaufsliste laufen normal. Keine Daten-Migration für bestehende Pläne — nur über `DEFAULT_MEAL_TYPES` (neue Tage) und Seed-Daten.
- **Gemeinsames Mahlzeit-Aktionsmenü** (`MealActionsMenu`, Burger/Kebab `⋮`): eine wiederverwendbare Komponente, in Tagesplan **und** Tabelle identisch eingehängt, um Funktions-Parität strukturell zu garantieren. Enthält: Portionen ändern, Extern essen, Auf Soll skalieren, Soll ändern, Notiz, RefMeal verknüpfen/entkoppeln, Items kopieren, Mahlzeit löschen.
- **Externe Mahlzeiten erweitert**: Neues Feld `external_cost_per_person` am `Meal`-Modell → Gesamtkosten = Preis/Person × Portionen. Kcal werden bei extern automatisch auf das Soll gesetzt (`NORM_PERSON_DAILY_KCAL × day_part_factor`), optional manuell überschreibbar. Soll% und Notiz editierbar.
- **Auf Soll skalieren**: skaliert alle Items einer Mahlzeit proportional, bis Ist-Kcal = Soll-Kcal. Faktoren werden auf eine Nachkommastelle gerundet.
- **Meal-Item kopieren**: Item innerhalb derselben Mahlzeit duplizieren und in eine andere Mahlzeit kopieren (Ziel-Auswahl per Dialog).
- **Refactor (Pflicht)**: `MealEventDetailPage.tsx` (1574 Zeilen) wird aufgeteilt — `DayPlanView`, `MealSlot`, `MealActionsMenu` und Kopier-Dialog in eigene Dateien.

## Capabilities

### New Capabilities
- `meal-plan-drinks`: Getränke als eigener Mahlzeit-Typ mit Sonderbehandlung in der Kcal-Tagesbilanz (ausgeschlossen) und normaler Behandlung bei Kosten/Einkauf.
- `meal-actions-menu`: Gemeinsames Mahlzeit-Aktionsmenü, das in Tagesplan und Tabelle identisch eingehängt wird und Funktions-Parität sicherstellt (Portionen, Extern, Skalieren, Soll, Notiz, RefMeal, Kopieren, Löschen).
- `meal-external-cost`: Festpreis-Kalkulation pro Person und automatische Kcal-Deckung für externe Mahlzeiten.
- `meal-scale-to-target`: Proportionale Skalierung aller Items einer Mahlzeit auf das Kcal-Soll, gerundet auf eine Nachkommastelle.
- `meal-item-copy`: Kopieren/Duplizieren von Meal-Items innerhalb derselben oder in andere Mahlzeiten.

### Modified Capabilities
- `meal-plan`: `MealTypeChoices` erhält `drinks`; `DEFAULT_MEAL_TYPES` enthält `drinks`; `Meal` erhält `external_cost_per_person`; Kosten-/Energie-Auflösung berücksichtigt externe Festpreise und automatische Kcal-Deckung.

## Impact

- **Backend (`planner` App)**:
  - `planner/models/meal_plan.py`: `MealTypeChoices.DRINKS`, `MEAL_TYPE_DAY_FACTORS["drinks"]=0.0`, `DEFAULT_MEAL_TYPES += drinks`, `MEAL_TYPE_DEFAULT_TIMES["drinks"]`, neues Feld `external_cost_per_person`.
  - `planner/schemas/meal_plan.py` (Pydantic): `MealOut.external_cost_per_person`, angepasste `resolve_total_cost_eur` / `resolve_total_energy_kj`; `MealUpdateIn.external_cost_per_person`.
  - `planner/api/meal_plan.py`: Update-Handling für neues Feld; neue Endpoints `scale_meal_to_target` und `copy_meal_item`.
  - **Migration**: 1 Schema-Migration (neues Feld + erweiterte Choices). Keine Daten-Migration für Getränke-Slots.
  - `core/management/commands/seed_all.py` (planner-Section) + `planner/tests/__init__.py` Factories: Getränke-Demo-Daten.
- **Frontend (`frontend-food/`)**:
  - `src/schemas/mealPlan.ts` (Zod): `drinks` in `MEAL_TYPE_LABELS/ICONS/COLORS`; `external_cost_per_person` im `MealSchema`/`MealUpdateIn`; ggf. neue Zod-Schemas für Scale/Copy-Inputs.
  - `src/api/mealPlans.ts`: neue Hooks `useScaleMealToTarget`, `useCopyMealItem`.
  - `src/pages/planning/MealEventDetailPage.tsx`: Aufteilung in `DayPlanView`, `MealSlot`, `MealActionsMenu`, `CopyMealItemDialog`.
  - `src/pages/planning/TableView.tsx`: `MealActionsMenu` einhängen, `drinks` in `MEAL_TYPE_ORDER`, Getränke-Kcal aus Tages-Summen ausschließen.
- **Schemas**: Pydantic und Zod müssen 1:1 synchron bleiben.
- **Strikte Trennung**: ausschließlich `frontend-food/`, kein Code im Haupt-`frontend/`.
