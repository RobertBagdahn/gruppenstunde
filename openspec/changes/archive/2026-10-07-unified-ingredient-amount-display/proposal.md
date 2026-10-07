## Why

Dieselbe Zutatenmenge wird an mehreren Stellen mit eigener Logik formatiert. Der Essensplan kennt vorgewogene Portionen wie „EL 15 g" nicht und zeigt so Zeilen wie „× 0,5 Gramm (15g)", obwohl 0,5 eine Portionsanzahl ist. Die Rezeptseite zeigt denselben Wert korrekt. Außerdem lässt sich im Plan nach dem Hinzufügen weder Einheit noch Portion ändern, und es gibt keine Notiz pro Zutat. Peters Feedback: Beim Hinzufügen einer Einzelzutat zu einer Tageszeit soll man wie in den Rezepten die Einheit wählen und Notizen ergänzen können.

## What Changes

- Ein gemeinsamer Formatter für Zutatenmengen ersetzt `formatItemPortion` (Tabellenansicht), die Inline-Funktion `formatPortion` in `MealSlot.tsx` und die Inline-Anzeige im `RefMealEditorPage`. Er baut auf der Rezeptlogik in `lib/ingredientAmount.ts` auf (Portionsanzahl vs. direkte Metrikmenge).
- Plan-Zeilen mit Einzelzutat zeigen Menge plus Einheit-/Portions-Auswahl statt „× Menge Einheit". Der Wechsel rechnet die Menge so um, dass die Grammmenge gleich bleibt (Kalorien und Kosten ändern sich nicht).
- `PATCH /{meal_plan_id}/meal-items/{item_id}/` akzeptiert zusätzlich `portion_id` und `measuring_unit_id` (mit serverseitiger Umrechnung) und `note`.
- Neues Feld `MealItem.note` (Freitext, optional) mit Migration. Pydantic- und Zod-Schema bleiben synchron. Die Notiz erscheint in der Plan-Zeile, im Hinzufügen-Dialog und im PDF-Export.
- Der Hinzufügen-Dialog für Einzelzutaten im Plan bekommt ein Notiz-Feld.
- Die Referenz-Mahlzeit-Anzeige nutzt den gemeinsamen Formatter. Ein Einheiten-Editor dort ist nicht Teil dieser Änderung.

## Capabilities

### New Capabilities
- `meal-item-unit-edit`: Einheit/Portion einer Einzelzutat im Essensplan ändern, mit Umrechnung bei gleicher Grammmenge.
- `meal-item-note`: Notiz pro Einzelzutat im Essensplan (Eingabe, Anzeige, PDF).

### Modified Capabilities
- `quantity-display-formatting`: Ein gemeinsamer Formatter gilt für alle Anzeigeorte; Portionsanzahl wird nie mit der Messeinheit der Portion beschriftet.
- `meal-item-factor-edit`: Einzelzutaten zeigen Menge mit wählbarer Einheit statt eines nicht editierbaren „× Menge Einheit".

## Impact

- Backend: `backend/planner/models/meal_plan.py` (`MealItem.note`, Migration), `backend/planner/schemas/meal_plan.py` (`MealItemUpdateIn`, `MealItemOut`, Add-Schema), `backend/planner/api/meal_plan.py` (Update-Endpoint, Umrechnung), PDF-Export in `backend/planner`.
- Frontend (`frontend-food`): `schemas/mealPlan.ts`, `api/mealPlans.ts` (`useUpdateMealItem`), `utils/formatItemDisplay.ts`, `lib/ingredientAmount.ts`, `pages/planning/MealSlot.tsx`, `pages/planning/TableView.tsx`, `pages/planning/QuantityInput.tsx`, `pages/planning/RefMealEditorPage.tsx`, `MealOmnibarDialog`, `IngredientQuantityDialog`.
- Daten: nur ein neues optionales Feld, keine Datenmigration der Mengen. Für Prod gilt der gesammelte Rollout-Plan (erst Dry-Run).
- Tests: Backend-API und Umrechnung, Zod-Vertrag, Komponententests der Zeilen.
