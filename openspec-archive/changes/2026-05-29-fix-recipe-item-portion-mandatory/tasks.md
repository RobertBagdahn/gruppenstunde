## 1. Backend: Portion Model anpassen

- [x] 1.1 `Portion.measuring_unit`: `null=False`, `blank=False`, `on_delete=PROTECT` setzen
- [x] 1.2 `Portion.weight_g`: `MinValueValidator(0.01)` hinzufügen, `null=False` sicherstellen
- [x] 1.3 `Portion.name`: `default="g"` setzen
- [x] 1.4 Signal `pre_save` auf Portion: `weight_g` automatisch berechnen (g: qty×unit.qty, ml: qty×unit.qty×density, sonst: unverändert)
- [x] 1.5 Migration: Bestehende Portions mit `measuring_unit=NULL` auf passende Unit setzen (schätzen aus Kontext/name)

## 2. Backend: Basis-Portionen erstellen

- [x] 2.1 Datenmigration: Für jede Ingredient ohne `is_default=True` Portion eine Basis-Portion anlegen (name="g", quantity=1, weight_g=1 für solids; name="ml", quantity=1, weight_g=density für liquids)
- [x] 2.2 Signal/Hook: Bei Ingredient-Erstellung automatisch Basis-Portion anlegen

## 3. Backend: RecipeItem Model anpassen

- [x] 3.1 Datenmigration: Alle RecipeItems mit `portion_id=NULL` auf Basis-Portion des `ingredient` mappen (quantity bleibt = Gramm-Wert)
- [x] 3.2 RecipeItems ohne `portion_id` UND ohne `ingredient_id` löschen
- [x] 3.3 `RecipeItem.portion`: `null=False`, `blank=False`, `on_delete=PROTECT`
- [x] 3.4 `RecipeItem.ingredient` Feld entfernen
- [x] 3.5 `RecipeItem.measuring_unit` Feld entfernen
- [x] 3.6 CheckConstraint `quantity > 0` hinzufügen
- [x] 3.7 Migration generieren und testen

## 4. Backend: Schemas & API anpassen

- [x] 4.1 `RecipeItemOut`: `ingredient_id`, `measuring_unit_id`, `measuring_unit_name` über `portion` auflösen (statt eigener Felder)
- [x] 4.2 `RecipeItemCreateIn`: `ingredient_id` und `measuring_unit_id` entfernen, `portion_id` Pflicht (nicht optional)
- [x] 4.3 `RecipeItemUpdateIn`: `ingredient_id` und `measuring_unit_id` entfernen
- [x] 4.4 API-Endpunkte `create`/`update` anpassen (kein `ingredient_id` mehr)
- [x] 4.5 `resolve_ingredient_portions` über `portion.ingredient` auflösen

## 5. Backend: AI Service anpassen

- [x] 5.1 AI Estimate: Rückgabe-Quantity umrechnen auf aktuelle Portion (`estimated_grams / portion.weight_g`)
- [x] 5.2 AI Ingredient Suggest: Sicherstellen dass immer `portion_id` zurückgegeben wird

## 6. Frontend: Zod Schemas anpassen

- [x] 6.1 `RecipeItemSchema`: `ingredient_id` und `measuring_unit_id` entfernen, `portion_id` required
- [x] 6.2 API-Hooks anpassen (create/update Payloads)

## 7. Frontend: Inline Editor anpassen

- [x] 7.1 `handleAddIngredient`: Basis-Portion des Ingredients verwenden, `portion_id` setzen
- [x] 7.2 `handleSave`: Immer `portion_id` mitsenden
- [x] 7.3 Beim Laden: Wenn Item `portion_id` hat, quantity direkt anzeigen (ist bereits Multiplikator)
- [x] 7.4 AI Estimate Apply: Quantity direkt übernehmen (Backend rechnet bereits um)

## 8. Frontend: View-Logik vereinfachen

- [x] 8.1 `IngredientList.tsx`: `weightG = quantity × portion.weight_g` (kein Fallback mehr nötig)
- [x] 8.2 Portion-ID Fallback-Logik entfernen (ist immer gesetzt)
