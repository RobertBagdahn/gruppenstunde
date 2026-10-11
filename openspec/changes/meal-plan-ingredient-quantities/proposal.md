# Mengenübersicht und planweite Mengenanpassung im Essensplan

## Why

Peter (Feedback 2026-10-11): „Haben wir was drin, wo man nochmal genau die Mengen sieht für nen Wochenplan? Pro Rezept außer in der Einkaufsliste? Und dass man das dann da anpassen kann aufs gesamte gesehen.“ Anlass: Zwiebeln und Salat für Sandwiches waren für kleine Gruppen passend, hochgerechnet auf den Wochenplan aber viel zu viel.

Heute:

- Die Einkaufsliste zeigt nur die Summe je Zutat; die aufklappbaren Quellen zeigen Gramm je Rezept/Mahlzeit, sind aber nicht bearbeitbar.
- Der Zubereitungs-Zeitplan zeigt hochgerechnete Zutaten je Rezept, gegliedert nach Tag, nur lesend.
- Anpassen geht nur über den Faktor eines ganzen Rezepts (`MealItem.factor`).
- `MealItemOverride` (`quantity_override`, `excluded` je Rezept-Zutat und Mahlzeit-Eintrag) ist samt API und Berechnung in allen Ausgabewegen vorhanden, hat aber **keine UI**.
- Es gibt keinen Weg, eine Zutat **planweit** zu korrigieren (z. B. „Zwiebeln insgesamt nur 3 Stück“).

Rezeptmengen werden pro Person gespeichert und linear hochgerechnet. Für Zutaten wie Zwiebel, Salat oder Gewürze passt das bei großen Gruppen und vielen Mahlzeiten nicht. Die Korrektur soll pro Plan erfolgen, ohne das Rezept selbst zu ändern.

## What Changes

- Neue Ansicht **„Mengen“** im Essensplan (Reiter Einkauf, `?sub=quantities`): alle Zutaten des Plans mit Gesamtmenge (netto und mit Reserve). Jede Zutat lässt sich zu ihren Anteilen je Mahlzeit und Rezept aufklappen (Menge pro Person in Rezepteinheit, Personenzahl, Faktor, Gesamtmenge).
- **Einzelanpassung:** Eine Rezept-Zutat in einer Mahlzeit kann direkt in der Ansicht geändert, ausgeschlossen oder zurückgesetzt werden. Gespeichert wird als `MealItemOverride`. Direkte Zutaten-Einträge werden über die bestehende MealItem-Mengenbearbeitung angepasst.
- **Planweite Anpassung je Zutat:** Zielmenge gesamt (in Gramm oder einer Portion der Zutat, z. B. „3 Stück“) oder prozentuale Änderung. Das System verteilt die Änderung anteilig auf alle anpassbaren Rezeptanteile und schreibt `MealItemOverride`s. „Zurücksetzen“ entfernt die Mengen-Overrides dieser Zutat im Plan.
- Neue Endpunkte: `GET /api/meal-plans/{id}/ingredient-quantities/`, `POST /api/meal-plans/{id}/ingredient-quantities/{ingredient_id}/adjust/` sowie `PUT`/`DELETE /api/meal-plans/{id}/meal-items/{item_id}/overrides/{recipe_item_id}/` für eine einzelne Zeile.
- Zutaten im Zubereitungs-Zeitplan erhalten `is_overridden`; der MealSlot nutzt die vorhandene `overrides`-Liste des `MealItemOut` (Pydantic und Zod synchron).
- Die Mengenberechnung für Einkaufsliste und Mengenübersicht wird in einen gemeinsamen Sammler (`collect_ingredient_contributions` + `aggregate_contributions`) ausgelagert, damit beide dieselben Zahlen liefern.
- Angepasste Mengen werden in der Mengenübersicht, im MealSlot und im Zubereitungs-Zeitplan als „angepasst“ markiert.

## Capabilities

### New Capabilities
- `meal-plan-ingredient-quantities`: Mengenübersicht je Plan sowie Einzel- und planweite Mengenanpassung.

### Modified Capabilities
- keine fachliche Änderung an `meal-item-overrides`; der bestehende Ersetzen-Endpunkt bleibt. Der neue Endpunkt arbeitet zeilengenau (Upsert), ohne andere Overrides des Mahlzeit-Eintrags zu löschen.

## Impact

- **Backend (`planner`, `supply`):**
  - `supply/services/shopping_service.py`: Sammler der Einzelbeiträge (`collect_ingredient_contributions`) herauslösen; `generate_shopping_list` aggregiert darauf.
  - Neuer Service `planner/services/ingredient_quantities.py` (Übersicht und Verteilung).
  - `planner/api/meal_plan.py`: zwei neue Endpunkte.
  - `planner/services/cooking_schedule_service.py`: `is_overridden` je Zutat.
  - `planner/schemas/meal_plan.py`: `IngredientQuantityOut`, `IngredientQuantityLineOut`, `IngredientQuantityAdjustIn`, `IngredientQuantityAdjustOut`, `OverrideQuantitySnapshot`, `MealItemOverrideLineIn`; re-exportiert über `planner/schemas/__init__.py`.
- **Frontend-Food:**
  - `src/schemas/mealPlan.ts`: passende Zod-Schemas.
  - `src/api/mealPlans.ts`: `useIngredientQuantities`, `useAdjustIngredientQuantity`, `useSetMealItemOverride` mit Invalidierung von Plan, Einkaufsliste, Kosten, Nährwerten und Zeitplan.
  - Neue Komponente `src/pages/planning/IngredientQuantitiesView.tsx`; Einbindung in `MealEventDetailPage.tsx` (Shopping-Unterreiter „Mengen“).
  - Markierung „angepasst“ in `MealSlot.tsx` und `CookingScheduleTab.tsx`.
- **Migration:** `planner.0017_meal_item_override_precision` erhöht `MealItemOverride.quantity_override` auf vier Nachkommastellen (`max_digits=12`). Zwei Stellen sind für Stückmengen pro Person zu grob (0,01 Stück × 35 Personen).
- **Nicht im Umfang:** Rezept dauerhaft ändern, nicht-lineare Skalierungsregeln je Zutat, Rückfluss manueller Änderungen aus einer persistierten Einkaufsliste in den Plan.
