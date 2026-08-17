## 1. Backend: AI-Mengenschätzung Endpoint

- [x] 1.1 Pydantic-Schema `EstimateQuantitiesOut` erstellen in `recipe/schemas/` (Response: Liste von `{item_id, ingredient_name, quantity_per_person, quantity_total, unit}`)
- [x] 1.2 Service-Methode `estimate_existing_quantities(recipe)` in `recipe/services/ai_ingredients_service.py` — Prompt baut auf existierenden RecipeItems auf, nutzt Gemini structured output
- [x] 1.3 API-Endpoint `POST /api/recipes/{id}/estimate-quantities/` in `recipe/api/` mit `can_edit`-Prüfung

## 2. Backend: Ingredient-Erstellung via API

- [x] 2.1 POST-Endpoint für Ingredient-Erstellung prüfen/erstellen (`POST /api/ingredients/` mit `status=draft`), sodass Frontend neue Zutaten direkt anlegen kann

## 3. Frontend: Edit-Mode Grundstruktur

- [x] 3.1 `isEditMode`-State und `InlineEditToolbar`-Komponente (Bearbeiten/Speichern/Abbrechen Buttons)
- [x] 3.2 `PortionEditor`-Komponente: editierbares Input-Feld für `servings` im Edit-Mode
- [x] 3.3 Mutation Hook für PATCH auf Recipe (`servings`-Update)

## 4. Frontend: Zutaten inline bearbeiten

- [x] 4.1 `IngredientEditRow`-Komponente: Menge (Number-Input), Einheit (Select), Notiz (Text), Löschen-Button
- [x] 4.2 `IngredientEditList`-Komponente: Lokaler State für alle Items, Dirty-Tracking
- [x] 4.3 Speichern-Logik: Parallele PATCHes für geänderte Items, DELETE für entfernte Items
- [x] 4.4 Zod-Schema `EstimateQuantitiesOut` synchron zum Backend

## 5. Frontend: Zutat hinzufügen

- [x] 5.1 `IngredientSearchAdd`-Komponente: Autocomplete mit `/suggest/?q=` Endpoint
- [x] 5.2 "Neu erstellen"-Option: POST neues Ingredient + POST neues RecipeItem
- [x] 5.3 Mutation Hooks für POST RecipeItem und POST Ingredient

## 6. Frontend: AI-Zauberstab

- [x] 6.1 Mutation Hook für `POST /api/recipes/{id}/estimate-quantities/`
- [x] 6.2 `AiEstimatePreview`-Dialog: Tabelle mit pro-Person und Total-Werten, Übernehmen/Verwerfen Buttons
- [x] 6.3 Zauberstab-Button in der Edit-Toolbar, Loading-State während AI-Call
