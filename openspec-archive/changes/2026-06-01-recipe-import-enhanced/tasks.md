## 1. Backend: Gemini Structured Output erweitern

- [x] 1.1 `GeminiRecipeExtraction` Pydantic-Schema um Meta-Felder erweitern: `summary`, `recipe_type`, `difficulty`, `execution_time`, `preparation_time`, `costs_rating`, `scout_level_ids`, `tag_ids`
- [x] 1.2 `GeminiIngredientMatch` um `estimated_portion_weight_g: float` erweitern
- [x] 1.3 Gemini-Prompt in `_call_gemini_for_matching()` erweitern: Meta-Felder anfordern, Choice-Werte auflisten, ScoutLevels + Tags aus DB laden und als JSON mitgeben

## 2. Backend: Portion-Auflösung in _build_recipe_items()

- [x] 2.1 `RecipeItemDraftResult` um `portion_id: int` erweitern
- [x] 2.2 In `_build_recipe_items()`: Portion-Lookup per `(ingredient_id, measuring_unit_id)` — bei Treffer `portion_id` verwenden
- [x] 2.3 Bei fehlendem Match: neue Portion erstellen mit `weight_g` aus `estimated_portion_weight_g`
- [x] 2.4 Fallback für `measuring_unit_id=None`: Default-Portion des Ingredients verwenden (erste vorhandene)

## 3. Backend: Response-Schema und Draft erweitern

- [x] 3.1 `UrlImportResult` / `RecipeDraftSchema` (Pydantic) um Meta-Felder erweitern (summary, recipe_type, difficulty, execution_time, preparation_time, costs_rating, scout_level_ids, tag_ids)
- [x] 3.2 `RecipeItemDraftResult` Serialisierung: `portion_id` im API-Response mitgeben
- [x] 3.3 JSON-LD `prepTime`/`cookTime` parsen und in Choice-Buckets mappen (Vorrang vor Gemini)

## 4. Frontend: Zod-Schemas aktualisieren

- [x] 4.1 `RecipeImportUrlResponseSchema` um Meta-Felder erweitern (summary, recipe_type, difficulty, execution_time, preparation_time, costs_rating, scout_level_ids, tag_ids)
- [x] 4.2 `RecipeItemDraftSchema` um `portion_id` erweitern

## 5. Frontend: CreateRecipePage — Save-Logik fixen

- [x] 5.1 Import-onSuccess: Meta-Felder in Formular-State übernehmen (summary, recipe_type, difficulty, times, costs, scout_levels, tags)
- [x] 5.2 Save-Logik (Zeile 247): `portion_id` statt `ingredient_id` an `POST /recipe-items/` senden

## 6. Frontend: Vorschau verbessern

- [x] 6.1 Zutatenliste in Vorschau: lesbares Format "{quantity} {measuring_unit_name} {ingredient_name}" anzeigen
- [x] 6.2 Neue Zutaten mit "Neu"-Badge markieren (basierend auf `is_new_ingredient` Flag)

## 7. Validierung

- [x] 7.1 Backend: Ungültige Choice-Werte aus Gemini-Output abfangen (Fallback auf Defaults)
- [ ] 7.2 Manuell testen: Chefkoch-URL importieren → alle Felder vorausgefüllt → Speichern → Zutaten vorhanden
