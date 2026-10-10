## Context

Heute bedeutet `MealItem.quantity` je nach Feldkombination etwas anderes:

```
MealItem (ingredient)                         Problem
├─ portion + measuring_unit = Gramm      →   Anzahl, aber UI liest „Gramm“  ← Screenshot
├─ measuring_unit = Gramm / ml           →   Gramm / ml
├─ measuring_unit = EL (ohne Portion)    →   Portionssuche über Maßeinheit (Altlast)
└─ Standardmaß                           →   sofort in Gramm umgerechnet, Absicht verloren
```

Ursache des Screenshots: `planner/api/meal_plan.py` (~Z. 1176) setzt beim Hinzufügen `measuring_unit_id = chosen_portion.measuring_unit_id`. `MealSlot.tsx` beschriftet dann mit `measuring_unit_name`, und `isPortionUnit` kennt „Gramm“ nicht. Das Backend rechnet richtig (`_resolve_ingredient_weight_g`: Portion zuerst).

`RecipeItem` ist schon sauberer aufgebaut: Portion × Anzahl, die Zutat ist über die Portion verankert, Gramm über die „g“-Basisportion. Es fehlen nur die Standardmaße.

Zielbild:

```
gespeichert:   Anzahl × Einheit   (Absicht: „2 Stück“, „1 EL“, „80 g“)
                      │
                      ▼  eine Funktion (Backend)
berechnet:     quantity_g          → kcal, Kosten, Einkauf, Anzeige
                      │
angezeigt:     Startansicht = gespeicherte Einheit, Gramm immer sichtbar
               frei umschaltbar (nur Ansicht), Eingabe in jeder Einheit
```

## Goals / Non-Goals

**Goals:**
- Eindeutige Mengenbedeutung mit genau einer Einheitenart pro Eintrag.
- Standardmaße speichern.
- Gramm immer sichtbar; Ansicht an jedem Mengenort frei umschaltbar; Eingabe in jeder Einheit.
- Ein Formatierer im Frontend, eine Gramm-Berechnung im Backend.
- Buffet-Rollen in Stück/EL; Einkaufsliste in natürlichen Einheiten.

**Non-Goals:**
- Kein Umbau auf „nur Gramm speichern“. Bewusst verworfen: Korrekturen an Portionsgewichten müssen weiter automatisch in alle Pläne und Rezepte wirken, die Absicht („2 Zwiebeln“) bleibt erhalten, und der Umbau wäre zu groß (~90 Stellen in `planner`, ~95 Dateien in `recipe`, ~50 Specs).
- Keine Nutzer- oder Planeinstellung.
- Packungsberechnung und REWE-Export bleiben unverändert.

## Decisions

### 1. Einheitenart explizit, Maßeinheit nur für g/ml
`MealItem`: neues Feld `standard_measure_key` (`CharField(max_length=10, blank=True, default="")`). Einheitenart:
- `portion` ⇔ `portion` gesetzt, `standard_measure_key = ""`, `measuring_unit = NULL`
- `standard` ⇔ `standard_measure_key` gesetzt, `portion = NULL`, `measuring_unit = NULL`
- `grams`/`milliliters` ⇔ beide leer, `measuring_unit` ∈ {Gramm, Milliliter}

Ein CheckConstraint auf Feld-Ebene stellt „höchstens eins von portion/standard_measure_key/measuring_unit“ sicher. Dass `measuring_unit` nur g/ml sein darf, prüft die Validierung im Service.
`RecipeItem`: neues Feld `standard_measure_key`. Ein Standardmaß verwendet die „g“-Basisportion als Zutatenanker. Constraint: `standard_measure_key` nur zusammen mit der Basisportion (Service-Validierung, weil der Rank der Basisportion nicht im Constraint prüfbar ist).
*Verworfen:* eigenes Feld `unit_kind`. Es wäre redundant zu den FKs.

### 2. Eine Gramm-Berechnung
`supply/services/quantity_units.py`:
- `resolve_grams(ingredient, kind, quantity, portion, standard_key) -> GramResult(grams, is_approx, missing)` als einzige Logik.
- `_resolve_ingredient_weight_g` (planner) und `RecipeItemOut.resolve_weight_g` (recipe) delegieren dorthin.
- Standardmaß-Gramm aus `list_standard_measures` extrahiert (`standard_measure_grams(ingredient, key)`).
- `unit_options(ingredient)` und Batch-Endpunkt `GET /api/ingredients/unit-options/?ids=`.
- `format_amount(...)` für das PDF.

### 3. API liefert Anzeige-Bausteine
`MealItemOut`/`RecipeItemOut`: `quantity`, `unit_kind`, `unit_label`, `portion_id`, `standard_measure_key`, `quantity_g`, `is_weight_approx`, `has_missing_weight`. `measuring_unit_name` wird für Zutaten-Einträge entfernt. Für die Anzeige reicht das; den vollen Optionskatalog lädt der Umschalter beim Öffnen (gebündelt pro Seite über `useUnitOptions(ids)`).

### 4. Einheit wechseln
`PATCH /api/meal-plans/{plan_id}/meal-items/{item_id}/` verwendet die bestehenden flachen Felder `{ quantity, portion_id?, measuring_unit_id?, standard_measure_key? }`. Die Anzahl berechnet das Frontend mengenerhaltend im Eingabemodus; das Backend speichert, was kommt, und validiert die Kombination. Wenn nur `quantity` gesendet wird, bleibt die Einheit unverändert.

### 5. Frontend-Bausteine
- `lib/quantityUnits.ts`: `toCount(grams, option)`, `toGrams(count, option)`, `formatAmount({ count, option, grams, isApprox, missing })`. Gramm sind nie optional.
- `components/quantity/QuantityUnitLabel.tsx` (Ansicht + Umschalter), `QuantityUnitInput.tsx` (Eingabe + Umschalter + Live-Vorschau „= … g“) und `UnitPicker.tsx` (kompakter Einheitenkatalog). Der Rezept-Editor übernimmt dieselben Optionen und Umrechnungsregeln in Phase 2.
- `useUnitViewMode()` für `?units=grams`; Zeilenwahl als lokaler State.
- Fixture-Satz `backend/supply/tests/fixtures/quantity_format_cases.json`, im Backend und im Frontend getestet.

### 6. Buffet
- `Meal.buffet_role_amounts[role] = { amount_g, unit }`, wobei `unit` die Anzeige-Einheit der Rolle ist (`grams`, `milliliters`, `{portion_name}`, `{standard_measure_key}`). Die Berechnung bleibt in Gramm/ml.
- Rollen-Eingabe „n × Einheit“: pro Item `grams_i = n × share_i × weight_i(unit)`. Daraus werden Rollen-Gramm und Shares nach Gramm neu berechnet, sodass „2 Stück“ beim Wiederherstellen wieder „2 Stück“ ergibt.
- Gespeicherte MealItems behalten ihre Item-Einheit (`selections[].portion_id | standard_measure_key`).
- Preview liefert `role_unit_options`.

### 7. Einkaufslisten
- Plan-Ansicht: `piece_equivalent` entfällt, dafür kommen `start_unit` (gemeinsame Quell-Einheit → Standardportion → g/ml) und `ingredient_id`.
- Kollaborative Liste: Speicherung bleibt `quantity_g`; neu sind `start_unit` im Out-Schema und Mengen-Eingabe in jeder Einheit (Frontend rechnet in Gramm).

### 8. Startauswahl beim Hinzufügen
Omnibar und Rezept-Editor: Standardportion (niedrigster Rank, vertrauenswürdiges Gewicht, nicht „g“) × 1, sonst 100 g. Das ist bestehende Logik aus `smart-ingredient-default`, die die Omnibar jetzt ebenfalls nutzt; bisher nahm sie `portions[0]`.

## Betroffene Dateien

**Backend**
- `backend/planner/models/meal_plan.py` (+ Migration), `backend/planner/schemas/meal_plan.py`, `backend/planner/api/meal_plan.py` (Hinzufügen setzt keine `measuring_unit` bei Portion; `_require_defined_unit` entfällt), `backend/planner/api/ref_meal.py`, `backend/planner/api/buffet.py`
- `backend/planner/services/meal_item_helpers.py`, `buffet_service.py`, `pdf_export.py`, `quantity_plausibility.py`, `cooking_schedule_service.py`
- `backend/recipe/models/items.py` (+ Migration), `backend/recipe/schemas/items.py`, Recipe-Item-API
- `backend/supply/services/quantity_units.py` (neu), `backend/supply/api/ingredients.py`, `backend/supply/services/shopping_service.py`
- `backend/shopping/schemas.py`, `backend/shopping/api.py`

**Food-Frontend**
- `frontend-food/src/lib/quantityUnits.ts`, `schemas/quantityUnits.ts`, `components/quantity/*` (neu)
- `frontend-food/src/schemas/mealPlan.ts`, `recipe.ts`, `shoppingList.ts`, Buffet-Schemas
- `frontend-food/src/pages/planning/MealSlot.tsx`, `TableView.tsx`, `DayPlanView.tsx`, `RefMealEditorPage.tsx`, `QuantityInput.tsx` (entfällt), `components/planning/MealOmnibarDialog.tsx`
- `frontend-food/src/components/buffet/BuffetBuilder.tsx`, `pages/planning/breakfast/*`
- `frontend-food/src/components/recipe/PortionPicker.tsx`, `InlineIngredientEditor.tsx`, `IngredientQuantityDialog.tsx`, `RecipeIngredientsTable.tsx`, `components/supply/IngredientList.tsx`
- `frontend-food/src/components/shopping/ShoppingListItemRow.tsx`, Plan-Einkaufsansicht, `pages/ingredients/IngredientDetailPage.tsx`
- Entfernen: `MealSlot.formatPortion/isPortionUnit`, `utils/formatItemDisplay.formatItemPortion`, `lib/portionQuantityHint.formatGramsWithPortionHint`; `lib/ingredientAmount.ts` geht in `quantityUnits.ts` auf

## API-Änderungen

| Methode | Pfad | Änderung |
|---|---|---|
| POST | `/api/meal-plans/{plan_id}/meals/{meal_id}/items/`, `.../wizard-items/`, `/meals/wizard-items/bulk/` | `MealItemCreateIn.standard_measure_key`; `measuring_unit_id` nur g/ml |
| PATCH | `/api/meal-plans/{plan_id}/meal-items/{item_id}/` | flache Einheitenfelder `portion_id`, `measuring_unit_id`, `standard_measure_key` neben `quantity` |
| GET | Meal-/Plan-Endpunkte | `MealItemOut.unit_kind`, `unit_label`, `standard_measure_key`, `is_weight_approx`; `measuring_unit_name` entfällt für Zutaten |
| PUT | RefMeal-Update | `RefMealItemIn.portion_id`, `standard_measure_key` |
| GET | `/api/ingredients/unit-options/?ids=` | neu |
| POST | `/api/meal-plans/{plan_id}/meals/{meal_id}/buffet/` | `role_amounts[role] = {amount_g, unit}`, `selections[].portion_id / standard_measure_key`; Preview mit `role_unit_options` |
| GET/POST/PATCH | Rezept-Items | `standard_measure_key`, `unit_kind`, `unit_label`, `is_weight_approx` |
| GET | Plan-Einkaufsliste | `start_unit`, `ingredient_id`; `piece_equivalent` entfällt |
| GET/PATCH | Einkaufslisten-Eintrag | `start_unit` in Out |

## Migrationen

1. `planner.MealItem.standard_measure_key`, `recipe.RecipeItem.standard_measure_key` (additiv).
2. Datenmigration `MealItem` (Management Command, Dry-Run als Default, `--apply`):
   - Portion gesetzt → `measuring_unit = NULL`.
   - Ohne Portion, Maßeinheit g/ml → unverändert.
   - Ohne Portion, andere Maßeinheit: Bei EL/TL/Tasse/Prise/Msp → `standard_measure_key`. Sonst die Portion der Zutat mit dieser Maßeinheit. Sonst melden.
3. CheckConstraints erst nach leerem Bericht aktivieren.
4. `Meal.buffet_role_amounts`: Zahl → `{amount_g, unit: grams|milliliters}`.
5. Prod: Dry-Run-Bericht und ausdrückliches Okay vor `--apply`.

## Risks / Trade-offs

- [Altdaten mit exotischen Maßeinheiten] → Bericht im Dry-Run, manuelle Zuordnung.
- [Portion korrigiert → Grammmenge ändert sich] → gewollt, weil die Absicht „2 Stück“ zählt. Die Plausibilitätswarnungen fangen Ausreißer.
- [Kollision mit `unified-buffet-wizard` (19/20 Tasks)] → Buffet-Teil erst nach dessen Archivierung.
- [Viele Anzeigeorte] → ein Formatierer plus gemeinsame Fixtures; Phase 1 behebt den Screenshot unabhängig vom Rest.
- [Mobile 320 px] → kompakte Trigger, Zeilen dürfen umbrechen, Gramm bleibt sichtbar.

## Open Questions

Keine.
