## 1. Daten-Migration

- [x] 1.1 RunPython-Migration: bestehende `once`-RecipeItems umrechnen (`quantity = quantity / recipe.servings`, mit Division-durch-0-Schutz)
- [x] 1.2 RemoveField-Migration: `RecipeItem.quantity_type` entfernen

## 2. Backend Model & Choices

- [x] 2.1 `MaterialQuantityType` aus `backend/supply/choices.py` entfernen
- [x] 2.2 `quantity_type` Feld aus `RecipeItem` Model entfernen (`backend/recipe/models/items.py`)

## 3. Backend Schemas & API

- [x] 3.1 `quantity_type` aus Pydantic-Schemas entfernen (`backend/recipe/schemas/items.py`)
- [x] 3.2 Alle API-Endpunkte prüfen die `quantity_type` lesen/schreiben und bereinigen

## 4. Backend Services & Commands

- [x] 4.1 `import_cooklang.py`: `quantity_type`-Zuweisungen entfernen
- [x] 4.2 `import_legacy_food.py`: `quantity_type`-Zuweisungen entfernen
- [x] 4.3 `shopping_service.py`: Prüfen ob quantity_type-Referenzen existieren und entfernen
- [x] 4.4 `recipe_checks.py`: Prüfen ob quantity_type-Referenzen existieren und entfernen

## 5. Frontend Schemas

- [x] 5.1 `quantity_type` aus `frontend-food/src/schemas/recipe.ts` entfernen
- [x] 5.2 `quantity_type` aus `frontend-food/src/schemas/supply.ts` entfernen
- [x] 5.3 `quantity_type` aus `frontend-food/src/schemas/content.ts` entfernen

## 6. Frontend Komponenten

- [x] 6.1 `CreateRecipePage.tsx`: `quantity_type: 'per_person'`-Zuweisung entfernen
- [x] 6.2 `RecipeDetailPage.tsx`: `quantity_type`-Referenzen entfernen
- [x] 6.3 `InlineIngredientEditor.tsx`: `quantity_per_person`-Referenzen prüfen und ggf. vereinfachen
- [x] 6.4 `frontend-food/src/api/recipes.ts`: `quantity_type`-Felder entfernen

## 7. Verifizierung

- [x] 7.1 `uv run python manage.py makemigrations --check` — keine ausstehenden Migrationen
- [x] 7.2 TypeScript-Build ohne Fehler (`npm run build` in frontend-food)
