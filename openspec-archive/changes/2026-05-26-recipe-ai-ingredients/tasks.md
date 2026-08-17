## 1. Backend: Schema erweitern

- [x] 1.1 `AiRefurbishOut` in `backend/content/schemas/ai.py` um `suggested_ingredients: list[AiIngredientSuggestionOut] = []` erweitern

## 2. Backend: Refurbish-Endpoint erweitern

- [x] 2.1 In `backend/content/api/ai.py` → `ai_refurbish()`: Nach `service.refurbish()` bei `content_type=="recipe"` die Funktionen `suggest_recipe_supplies(title=result.title, description=result.description)` + `match_ingredients_to_database()` aufrufen
- [x] 2.2 Ergebnis in `result.suggested_ingredients` packen. Bei Exception: leeres Array, kein Fehler nach außen

## 3. Frontend: Zod Schema erweitern

- [x] 3.1 `AiRefurbishSchema` in `frontend/src/schemas/content.ts` um `suggested_ingredients` Array erweitern (mit `name`, `quantity`, `unit`, `ingredient_id`, `ingredient_slug`, `matched_name` — alle optional außer `name`)

## 4. Frontend: Zutaten-Sektion im Wizard Schritt 2

- [x] 4.1 State für `ingredients` in `CreateRecipePage.tsx` anlegen (initialisiert aus `refurbish.suggested_ingredients`)
- [x] 4.2 Bearbeitbare Zutaten-Liste als neue Sektion in Schritt 2 rendern: Zeile pro Zutat mit Menge (Input), Einheit (Input/Select), Name, Entfernen-Button
- [x] 4.3 "Zutat hinzufügen" Button mit bestehendem `IngredientAutocomplete` integrieren

## 5. Frontend: Zutaten beim Speichern als RecipeItems anlegen

- [x] 5.1 Nach erfolgreicher Rezept-Erstellung: Für jede Zutat mit `ingredient_id != null` einen `RecipeItem`-Create-Call ausführen (existierende API nutzen)
