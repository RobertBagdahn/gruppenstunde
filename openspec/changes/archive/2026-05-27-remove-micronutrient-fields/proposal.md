## Why

Das Cockpit zeigt pro Tag ~20 Mikronährstoff-Punkte (Eisen, Calcium, Vitamin A/B1/B2/B6/B12/D/E/K, Folat, etc.), die auf einem Pfadfinder-Lager fast nie erfüllt werden. Das erzeugt "Alarm-Müdigkeit" — die wichtigen Signale (Energie, Makros, Zucker, Preis) gehen im Rot-Rauschen unter. Die granularen Mikronährstoff-Felder werden entfernt, nur Vitamin C bleibt als praxisrelevanter Mikronährstoff.

## What Changes

- **BREAKING**: Entfernung von 23 Mikronährstoff-Feldern aus `Ingredient` Model (alle Vitamine außer C, alle Mineralstoffe)
- **BREAKING**: Entfernung von 5 cached Mikronährstoff-Feldern aus `Recipe` Model (alle außer `cached_vitamin_c_mg`)
- **BREAKING**: Entfernung der entsprechenden Felder aus DGE-Referenz-Model (`supply/models/reference.py`)
- Anpassung aller Pydantic-Schemas (Ingredient, Recipe, Nutrition, Reference)
- Anpassung aller Zod-Schemas (recipe.ts, normPerson.ts)
- Reduktion `MICRONUTRIENT_FIELDS` / `CACHED_MICRONUTRIENT_FIELDS` auf nur `["vitamin_c_mg"]`
- Anpassung `NutrientParameterChoices` in `supply/choices.py`
- Frontend MicronutrientSection zeigt nur noch Vitamin C
- AI-Service Prompt-Anpassung (keine Mikronährstoffe mehr abfragen außer C)
- Django-Migration: `RemoveField` ×28

## Capabilities

### New Capabilities

_(keine — reiner Cleanup)_

### Modified Capabilities

- `extended-nutrition-rules`: Mikronährstoff-Tracking auf nur Vitamin C reduziert
- `recipe`: Cached nutrition fields reduziert
- `ingredient-database`: Mikronährstoff-Felder entfernt

## Impact

**Backend Apps**: `supply`, `recipe`
**Pydantic Schemas**: `supply/schemas/ingredients.py`, `supply/schemas/reference.py`, `recipe/schemas/recipes.py`, `recipe/schemas/nutrition.py`
**Zod Schemas**: `frontend-food/src/schemas/recipe.ts`, `frontend/src/schemas/recipe.ts`, `frontend-food/src/schemas/normPerson.ts`, `frontend/src/schemas/normPerson.ts`
**Services**: `recipe/services/recipe_checks.py`, `recipe/services/cockpit_service.py`, `recipe/api/nutrition.py`
**Frontend Pages**: `RecipeDetailPage.tsx` (MicronutrientSection)
**AI**: `supply/services/ingredient_ai_service.py`
**Migration**: 1 neue Migration mit ~28 RemoveField-Operationen
**Daten**: Bestehende Mikronährstoff-Werte in DB gehen verloren (akzeptiert)
