## Context

Der Essensplan (`planner` App + `frontend-food/`) bietet zwei Ansichten auf dieselben Mahlzeiten: den **Tagesplan** (`DayPlanView` / `MealSlot` in `MealEventDetailPage.tsx`) und die **Tabelle/Übersicht** (`TableView.tsx`). Beide iterieren über dieselben `Meal`-Objekte und denselben Satz `meal_type`-Werte, haben aber unterschiedliche Funktionsumfänge entwickelt:

- Tagesplan: Mahlzeit-Settings-Panel (`day_part_factor`, `is_external`, `external_energy_kcal`), RefMeal-Link/Unlink, Rezept-Inline-Suche.
- Tabelle: Notiz-Inline-Editor, Portionen-Anzeige.

Das Datenmodell kennt aktuell `breakfast/lunch/dinner/snack/dessert` (`MealTypeChoices`). Externe Mahlzeiten setzen `total_cost_eur` hart auf `0.0` und nutzen ein manuelles `external_energy_kj`-Feld.

`MealEventDetailPage.tsx` ist mit 1574 Zeilen die zentrale, schwer wartbare Datei. Es existiert ein paralleler, rein visueller Change `food-frontend-facelift` (Tokens/Farben/Cards) — keine funktionale Kollision, berührt `TableView` nur optisch.

## Goals / Non-Goals

**Goals:**
- Getränke als planbarer, eigener Mahlzeit-Typ, kalorisch aus der Tagesbilanz ausgenommen.
- Strukturelle Funktions-Parität zwischen Tagesplan und Tabelle über eine gemeinsame `MealActionsMenu`-Komponente.
- Saubere Restaurant-Kalkulation: Festpreis/Person + automatische Kcal-Deckung.
- Mahlzeit auf Soll skalieren (proportional, gerundet).
- Meal-Items duplizieren/kopieren.
- `MealEventDetailPage.tsx` in wartbare Teilkomponenten aufteilen.

**Non-Goals:**
- Keine Daten-Migration, die bestehenden Plänen Getränke-Slots hinzufügt.
- Kein neues Getränke-Mengen-Modell (Liter/Person/Tag) — Getränke nutzen das bestehende `MealItem`-Modell.
- Keine Skalierung auf Tages-/Plan-Ebene (nur einzelne Mahlzeit).
- Keine visuellen Token-Änderungen (Sache des `food-frontend-facelift`).
- Kein Drag&Drop zum Verschieben (nur Kopieren).

## Decisions

### 1. Getränke als eigener `meal_type` statt Item-Kategorie oder neues Modell
`MealTypeChoices.DRINKS = "drinks"` mit `MEAL_TYPE_DAY_FACTORS["drinks"] = 0.0`. Aufgenommen in `DEFAULT_MEAL_TYPES`, damit neue Tage automatisch einen Getränke-Slot erhalten, und in `MEAL_TYPE_DEFAULT_TIMES`.

- **Warum**: Maximale Wiederverwendung — beide Views iterieren bereits über `meal_type`-Maps. Mit Ergänzung von `drinks` in `MEAL_TYPE_LABELS/ICONS/COLORS` (Zod) und in den `mealTypes`/`MEAL_TYPE_ORDER`-Arrays erscheint der Slot in beiden Ansichten mit allen Funktionen.
- **Alternativen**: (a) `is_drink`-Flag auf `MealItem` → erfordert separate UI-Bereiche pro Mahlzeit, höhere Komplexität. (b) Eigenständiges Getränke-Modell → größter Aufwand, kein klarer Mehrwert.

### 2. Getränke-Kalorien aus der Kcal-Tagesbilanz ausschließen — Frontend + Backend
- **Frontend** (`DayPlanView`): `dayActualKcal`/`dayTargetKcal` filtern `m.meal_type !== 'drinks'`. Der Getränke-Slot zeigt kein Soll/Ist-% (da `day_part_factor = 0`), aber eigene Kcal/Kosten informativ.
- **Backend**: Nutrition-Summary (`resolve`/Service) schließt `drinks`-Meals bei der Energie-Aggregation aus. **Kosten** (`resolve_total_cost_eur`, `MealPlanCostSummary`) und **Einkaufsliste** behandeln `drinks` unverändert wie normale Mahlzeiten.
- **Warum**: Getränke-Kalorien sind „on top" und sollen die Deckungsanzeige nicht verfälschen, müssen aber bezahlt und eingekauft werden.
- **Trade-off**: Energie- und Kosten-Aggregation behandeln denselben `meal_type` unterschiedlich — wird durch klar benannte Helper/Filter dokumentiert.

### 3. Gemeinsames `MealActionsMenu` als Single Source of Truth
Neue Komponente `src/components/planning/MealActionsMenu.tsx` (shadcn/ui `DropdownMenu`), die ein `meal` plus Callbacks erhält und in `MealSlot` (Tagesplan) **und** `TableView`-Zelle identisch eingehängt wird. Enthält: Portionen ändern (`override_portions`), Extern essen (`is_external` + Felder), Auf Soll skalieren, Soll ändern (`day_part_factor`), Notiz (`note`), RefMeal verknüpfen/entkoppeln, Items kopieren, Mahlzeit löschen.

- **Warum**: Parität wird strukturell garantiert statt durch doppelte Pflege.
- **Alternative**: Settings-Panels in beiden Views duplizieren → erneute Drift vorprogrammiert.
- Untermenüs/Eingaben (Portionen, Soll%, Notiz, Extern-Felder) als kleine Inline-Dialoge/Popover innerhalb des Menüs.

### 4. Externe Mahlzeiten: Festpreis/Person + automatische Kcal-Deckung
Neues Feld `Meal.external_cost_per_person` (`FloatField`, null).
- `resolve_total_cost_eur`: bei `is_external` → `external_cost_per_person × effektive_portionen` (`override_portions ?? norm_portions`) statt hart `0.0`.
- `resolve_total_energy_kj`: bei `is_external` → wenn `external_energy_kj` gesetzt, diesen nutzen; sonst **automatisch** `NORM_PERSON_DAILY_KCAL × day_part_factor` (in kJ via `kcal_to_kj`) × Portionen-Bezug analog normaler Meals.
- **Warum**: „Restaurant — alle satt" = Soll automatisch erfüllt; Festpreis ermöglicht Budget-Kalkulation. Manuelle Überschreibung bleibt möglich.
- **API**: `MealUpdateIn.external_cost_per_person` ergänzen; `MealOut.external_cost_per_person` ausgeben.

### 5. „Auf Soll skalieren" als Backend-Endpoint
`POST /api/meal-plans/{plan_id}/meals/{meal_id}/scale-to-target`.
- Berechnet `target_kcal = NORM_PERSON_DAILY_KCAL × day_part_factor`, `current_kcal = total_energy_kj→kcal / portions`, `scale = target/current`. Setzt für jedes Item `factor = round(factor × scale, 1)`.
- **Warum Backend**: konsistente Rundung, eine atomare Transaktion statt N Frontend-Requests; Reaktion auf `is_synced`-Meals (skalieren verboten/no-op).
- **Edge-Cases**: `current_kcal == 0` → kein Skalieren (Toast). `is_external`/`is_synced` → 400/no-op.
- **Frontend**: Hook `useScaleMealToTarget`; Menüeintrag.

### 6. „Meal-Item kopieren" als Backend-Endpoint
`POST /api/meal-plans/{plan_id}/meal-items/{item_id}/copy` mit Body `{ target_meal_id }` (default = eigene Mahlzeit → Duplikat).
- Erzeugt neues `MealItem` mit denselben `recipe`/`ingredient`/`quantity`/`measuring_unit`/`factor`/`display_name`. Ziel darf nicht `is_synced` sein.
- **Warum Backend**: kapselt die Item-Feldlogik; vermeidet, dass das Frontend alle Felder kennen muss.
- **Frontend**: `CopyMealItemDialog` zur Ziel-Mahlzeit-Auswahl (Liste aus `plan.meals`, gruppiert nach Tag+Typ, RefMeals/synced ausgeschlossen); Hook `useCopyMealItem`.

### 7. Refactor von `MealEventDetailPage.tsx`
Extraktion nach `src/pages/planning/` bzw. `src/components/planning/`:
- `DayPlanView.tsx`, `MealSlot.tsx`, `MealActionsMenu.tsx`, `CopyMealItemDialog.tsx`, gemeinsamer `FactorInput` (heute doppelt in Page + TableView).
- **Warum**: 1574-Zeilen-Datei ist nicht erweiterbar; geteilte `FactorInput`/Menü reduzieren Duplikate.

## Risks / Trade-offs

- **Inkonsistente `drinks`-Behandlung (Energie vs. Kosten)** → Mitigation: zentrale, benannte Filter-Helper (`isDrinkMeal`, `excludeDrinksForEnergy`) und Backend-Doku am Resolver; Tests für beide Pfade.
- **Bestehende Pläne haben keine Getränke-Slots** (bewusst) → Mitigation: „Getränke hinzufügen"-Button bleibt verfügbar; in UI-Hilfetext erklärt.
- **Skalierungs-Rundung auf 1 NK trifft Soll nur ungefähr** (bewusst) → Mitigation: Ist-Wert nach Skalierung anzeigen, kein Versprechen exakter Deckung.
- **Refactor-Regressionsrisiko** (große Datei aufteilen) → Mitigation: Verhalten 1:1 beibehalten, schrittweise extrahieren, manuell Tagesplan/Tabelle gegentesten.
- **Schema-Drift Pydantic ↔ Zod** → Mitigation: Felder gemeinsam ergänzen, in Tasks als Checkliste.

## Migration Plan

1. Backend-Modell: `MealTypeChoices.DRINKS`, `DEFAULT_MEAL_TYPES`, `MEAL_TYPE_DEFAULT_TIMES`, `MEAL_TYPE_DAY_FACTORS`, Feld `external_cost_per_person`.
2. `uv run python manage.py makemigrations planner` → **eine** Schema-Migration (neues Feld; Choices-Erweiterung ist DB-neutral bei `CharField`). **Keine** Daten-Migration.
3. Pydantic-Schemas + API-Resolver + neue Endpoints.
4. Zod-Schemas + API-Hooks synchronisieren.
5. Frontend-Refactor + `MealActionsMenu` + Getränke-Maps + Dialoge.
6. Seed (`seed_all.py` planner-Section) + Factories um Getränke-Demo ergänzen.
7. Tests (API happy-path + Fehlerfälle, Resolver-Energie/Kosten, Scale/Copy).
- **Rollback**: Migration reversibel (Feld droppen). Frontend rein additiv; keine Breaking-Changes für bestehende Daten.

## Open Questions

- Keine offenen Entscheidungen — alle in der Exploration geklärt (Getränke-Slot automatisch, Kcal ausgenommen, Kosten/Einkauf drin, keine Migration, Skalierung auf 1 NK, Extern-Kcal = Soll automatisch, Festpreis pro Person, Kopieren beidseitig).
