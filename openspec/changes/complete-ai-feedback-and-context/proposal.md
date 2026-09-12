## Why

Der Feedback-Mechanismus (`AiInteraction.vote`, `AiVoteButtons`) existiert, aber viele AI-Services verwerfen den `interaction_id` aus `gemini_call()` und geben ihn nicht in ihren Response-Schemas zurück. Dadurch fehlt der Daumen-hoch/runter-Button bei den meistgenutzten Features (Meal-Plan-Generierung, Recipe-Wizard, Zutaten-Vorschläge, Step-AI). Gleichzeitig werden verfügbare Kontextdaten (Diät-Tags, Gruppengröße, Saison, Vorrat) nicht in die Prompts eingespeist — `ai_create_recipe` bekommt z. B. nur den Freitext.

## What Changes

- `ai_interaction_id` durch alle AI-Services und Response-Schemas reichen (Pydantic + Zod), wo aktuell verworfen wird.
- `AiVoteButtons` in allen AI-Oberflächen rendern (Meal-Plan-Wizard, Recipe-Wizard, Zutaten-Suggest, Ingredient-Create, Step-AI, Verbesserungen, Intelligent Suggestions).
- Zentralen Prompt-Kontext-Builder in `core/services/gemini.py` einführen: Diät-/Ernährungs-Tags, Gruppengröße/Portionen, Saison, Vorrat.
- Diesen Kontext in `recipe_ai_suggest_service.ai_create_recipe`, `ai_ingredients_service`, `meal_plan_ai_service`, `ai_supply_service` einspeisen.
- `ai-vote-coverage`-Spec korrigieren (Claims „already present" für ai-create/suggest-all sind faktisch falsch).

## Capabilities

### New Capabilities
- `ai-prompt-context`: Zentraler Kontext-Builder, der verfügbaren Nutzer-/Gruppen-/Saison-/Vorratskontext für AI-Prompts bereitstellt.

### Modified Capabilities
- `ai-vote-coverage`: `ai_interaction_id` für alle fehlenden Endpunkte (recipe-ai-create, recipe-ai-suggest-all/-ingredients, step-AI, meal-plan-suggest, intelligent suggestions, ingredient-ai-create).
- `ai-meal-plan-generation`: Vote-ID zurückgeben und Saison-Kontext in den Prompt aufnehmen.
- `recipe-ai-create-prompt`: Prompt um Kontext (Diät-Tags, Gruppengröße, Saison) anreichern.
- `ingredient-ai-suggest`: Vote-ID für ai-create zurückgeben und Kontext anreichern.
- `context-recipe-suggestions`: Vote-ID für Rerank/Intelligent-Suggestions zurückgeben.

## Impact

- Backend-Schemas: `recipe/schemas/recipes.py`, `recipe/schemas/items.py`, `planner/schemas/ai_generation.py`, `supply/schemas/ingredients.py`, `content/schemas/ai*.py`.
- Services: `recipe_ai_suggest_service.py`, `ai_ingredients_service.py`, `step_ai_service.py`, `suggestion_service.py`, `meal_plan_ai_service.py`, `intelligent_suggestions_service.py`, `ingredient_ai_suggest_service.py`, `ai_supply_service.py`.
- Frontend-Schemas: `frontend-food/src/schemas/mealPlan.ts`, `supply.ts`, `recipes.ts`; Komponenten für `AiVoteButtons`.
- Keine Migration nötig (keine Model-Änderung).
