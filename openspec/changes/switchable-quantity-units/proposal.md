## Why

Peter will Brötchen, Belag und Aufstriche nicht in Gramm planen, sondern in Stück bzw. Portionen und in Küchenmaßen wie EL, TL oder Prise. Heute ist die Bedeutung einer Menge nicht eindeutig. Beim Hinzufügen mit Portion setzt `planner/api/meal_plan.py` zusätzlich `measuring_unit` auf die Maßeinheit der Portion („Gramm“). Jede Seite formatiert selbst, und der MealSlot zeigt deshalb „× 0,5 Gramm (15g)“ statt „0,5 Portion (15 g)“. Standardmaße werden beim Auswählen sofort in Gramm umgerechnet und verlieren ihre Bezeichnung. Buffet und Einkaufsliste denken nur in Gramm.

Grundsatz: **Gespeichert wird, was der Nutzer meint (Anzahl × Einheit). Gramm werden immer eindeutig daraus berechnet und überall angezeigt.** So wirken korrigierte Portionsgewichte automatisch in allen Plänen und Rezepten, und „2 Zwiebeln“ bleiben 2 Zwiebeln.

## What Changes

- **Eindeutiges Mengenmodell** für Zutaten-Einträge (`MealItem`, `RecipeItem`): Menge = Anzahl × Einheit, mit genau einer Einheitenart: Gramm, Milliliter, Portion der Zutat oder Standardmaß (EL, TL, Tasse, Prise, Msp). **BREAKING**: Bei `MealItem` ist `measuring_unit` nur noch für Gramm/Milliliter erlaubt. Einträge mit Portion oder Standardmaß haben keine Maßeinheit mehr, sodass kein „Gramm“ mehr an einer Portionsanzahl hängt.
- **Standardmaße werden gespeichert** (`standard_measure_key`) statt sofort in Gramm umgerechnet. Das Gewicht kommt aus der Zutatendichte.
- **Eine Gramm-Berechnung** im Backend für alle Einheitenarten. Die API liefert zu jedem Eintrag `quantity_g`, `unit_kind`, `unit_label`.
- **Startansicht = gespeicherte Einheit**, für alle Nutzer gleich. Beim Hinzufügen gilt: Standardportion der Zutat mit Gewicht, sonst Gramm.
- **Gramm immer sichtbar**: „1,5 Stück (90 g)“, „2 EL (≈ 30 g)“, „80 g“. Bei der Eingabe steht daneben eine Live-Vorschau „= 120 g“.
- **Dynamische Ansicht**: An jedem Mengenort gibt es einen Umschalter mit allen Portionen der Zutat, allen Standardmaßen und Gramm, dazu einen Seitenmodus „Alles in Gramm“ (`?units=grams`). In Lesedarstellungen ändert Umschalten nur die Ansicht. In bearbeitbaren Essensplan-Einträgen speichert ein Einheitenwechsel ohne neue Menge sofort mit konstantem Gewicht („55 g“ → „0,55 Stück (55 g)“), mit „Rückgängig“.
- **Eingabe in jeder Einheit**: Wer eine Menge in einer Einheit eingibt, speichert genau diese Einheit mit dieser Anzahl.
- **Überall gleich**: Mahlzeit-Karte, Buffet-Rollenliste, Tabellen- und Tagesansicht, Referenz-Mahlzeit, Buffet- und Frühstücks-Wizard (Item- **und** Rollenmenge, z. B. „Brot: 2 Stück/Person“), Rezept-Editor, Einkaufsliste („24 Stück (1,4 kg)“) und PDF-Export. Die verstreuten Formatierer werden durch einen gemeinsamen ersetzt.
- Buffet-Rollenmengen und die Einkaufsliste rechnen intern weiter in Gramm, weil dort verschiedene Zutaten zusammenkommen.

## Capabilities

### New Capabilities
- `quantity-units`: Mengenmodell (Anzahl × Einheit), Gramm-Berechnung, Einheitenoptionen, Startansicht, Gramm immer sichtbar, dynamische Ansicht und Eingabe in jeder Einheit, gemeinsamer Formatierer.

### Modified Capabilities
- `standard-measure-catalog`: Standardmaße werden als Einheit gespeichert statt sofort in Gramm umgerechnet.
- `quantity-display-formatting`: Aus „Gramm zuerst, Portion sekundär“ wird „Einheit zuerst, Gramm in Klammern“, mit dynamischer Umschaltung.
- `portion-picker`: Der Picker wird zum Einheiten-Umschalter an allen Mengenorten. Ein Standardmaß bleibt als Einheit erhalten.
- `buffet-builder`: Rollen- und Item-Mengen sind in jeder Einheit eingebbar. Gespeicherte Buffet-Einträge behalten ihre Einheit.
- `ref-meal-editor`: Mengen mit Einheit, ohne Rundung, Einheit wird beim Synchronisieren übernommen.
- `shopping-list-piece-equivalents`: Der feste Stück-Hinweis wird durch Startansicht und dynamische Ansicht ersetzt.

## Impact

- **Backend**
  - `planner`: `MealItem.standard_measure_key`, CheckConstraint „genau eine Einheitenart“, Create/Update/RefMeal/Wizard-Schemas, `meal_item_helpers._resolve_ingredient_weight_g`, `buffet_service`, `shopping_service`-Anbindung, `pdf_export`. Die Hinzufügen-Logik setzt bei Portion keine `measuring_unit` mehr.
  - `recipe`: `RecipeItem.standard_measure_key` (Anker ist die „g“-Basisportion der Zutat), Gewichtsauflösung in `RecipeItemOut.resolve_weight_g`, Schemas.
  - `supply`: `services/quantity_units.py` (Optionen, Gramm-Berechnung, Formatierung), Standardmaß-Umrechnung aus `list_standard_measures` extrahiert, Batch-Endpunkt für Einheitenoptionen.
- **Schemas (Pydantic ↔ Zod)**: `MealItemOut/CreateIn/UpdateIn`, `RefMealItemIn/Out`, `WizardItemsIn`, `BuffetSaveIn`/`BuffetResultOut`, `RecipeItemIn/Out`, Plan-Einkaufsliste, `ShoppingListItemOut`, neues `UnitOptionOut` ↔ `frontend-food/src/schemas/mealPlan.ts`, `recipe.ts`, `shoppingList.ts`, Buffet-Schemas, neues `quantityUnits.ts`.
- **Migrationen**: additiv `planner.MealItem.standard_measure_key`, `recipe.RecipeItem.standard_measure_key`. Datenmigration `MealItem`: `measuring_unit` bei Einträgen mit Portion leeren; Einträge mit anderer Maßeinheit als g/ml auf Standardmaß bzw. passende Portion abbilden, nicht abbildbare melden (Dry-Run). `Meal.buffet_role_amounts` bleibt in Gramm/ml.
- **Food-Frontend**: `pages/planning/MealSlot.tsx`, `QuantityInput.tsx`, `TableView.tsx`, `DayPlanView.tsx`, `RefMealEditorPage.tsx`, `components/planning/MealOmnibarDialog.tsx`, `components/buffet/BuffetBuilder.tsx`, `pages/planning/breakfast/*`, `components/recipe/PortionPicker.tsx`, `InlineIngredientEditor.tsx`, `IngredientQuantityDialog.tsx`, `components/shopping/ShoppingListItemRow.tsx`, Plan-Einkaufsansicht, `pages/ingredients/IngredientDetailPage.tsx`, `lib/ingredientAmount.ts`, `utils/formatItemDisplay.ts`, `lib/portionQuantityHint.ts`.
- **Nicht betroffen**: Haupt-Frontend (`frontend/`), Packungsberechnung, REWE-Export.
