## 1. Backend: Recipe `servings` → `portions`

- [x] 1.1 In `recipe/models/recipe.py`: Feld `servings` → `portions` umbenennen, verbose_name bleibt "Portionen"
- [x] 1.2 Django-Migration erstellen: `uv run python manage.py makemigrations recipe --name rename_servings_to_portions`
- [x] 1.3 In `recipe/schemas/`: Alle Pydantic-Schemas: `servings` → `portions`
- [x] 1.4 In `recipe/api/`: Alle API-Endpunkte die `servings` verwenden anpassen

## 2. Backend: MealPlan `norm_portions` → `portions`

- [x] 2.1 In `planner/models/meal_plan.py`: Feld `norm_portions` → `portions`, `override_portions` → `portions_override` auf Meal
- [x] 2.2 Django-Migration erstellen
- [x] 2.3 In `planner/schemas/`: Alle Pydantic-Schemas anpassen
- [x] 2.4 In `planner/api/`: Alle API-Endpunkte anpassen

## 3. Backend: Game `players` → `participants`, `play_area` → `location_type`

- [x] 3.1 In `game/models.py`: `min_players` → `min_participants`, `max_players` → `max_participants`, `play_area` → `location_type`
- [x] 3.2 Django-Migration erstellen
- [x] 3.3 In `game/schemas.py` und `game/api.py`: Schemas und Endpunkte anpassen

## 4. Backend: Ingredient `physical_viscosity` → `food_category`

- [x] 4.1 In `supply/models/ingredient.py`: Feld `physical_viscosity` → `food_category`, verbose_name "Lebensmittelkategorie"
- [x] 4.2 In `supply/choices.py`: `PhysicalViscosityChoices` → `FoodCategoryChoices` (gleiche Werte, gleiche Labels)
- [x] 4.3 Django-Migration erstellen
- [x] 4.4 In `supply/schemas/` und `supply/api/`: Schemas und Endpunkte anpassen

## 5. Backend: Shopping API `servings` → `portions`

- [x] 5.1 In `shopping/schemas.py` und `shopping/api.py`: `servings`-Parameter → `portions`

## 6. Frontend: Schemas und API-Hooks anpassen

- [x] 6.1 In `frontend/src/schemas/recipe.ts`: `servings` → `portions`
- [x] 6.2 In `frontend/src/schemas/game.ts`: `min_players`/`max_players` → `min_participants`/`max_participants`, `play_area` → `location_type`
- [x] 6.3 In `frontend/src/api/`: Alle Hooks und API-Calls anpassen
- [x] 6.4 In `frontend/src/pages/` und `frontend/src/components/`: Alle UI-Komponenten anpassen die renamed Felder referenzieren

## 7. Frontend-Food: Schemas und API-Hooks anpassen

- [x] 7.1 In `frontend-food/src/schemas/recipe.ts`: `servings` → `portions`
- [x] 7.2 In `frontend-food/src/schemas/mealPlan.ts`: `norm_portions` → `portions`, `override_portions` → `portions_override`
- [x] 7.3 In `frontend-food/src/schemas/supply.ts` (oder ingredient.ts): `physical_viscosity` → `food_category`
- [x] 7.4 In `frontend-food/src/api/` und `frontend-food/src/pages/`: Alle Referenzen anpassen

## 8. Migrationen und Tests

- [x] 8.1 Alle Migrationen ausführen: `uv run python manage.py migrate`
- [x] 8.2 Backend-Tests ausführen und fehlgeschlagene Asserts auf renamed Felder anpassen
- [x] 8.3 Frontend typecheck: `npm run typecheck` in `frontend/` und `frontend-food/`
- [x] 8.4 Frontend lint: `npm run lint` in `frontend/` und `frontend-food/`