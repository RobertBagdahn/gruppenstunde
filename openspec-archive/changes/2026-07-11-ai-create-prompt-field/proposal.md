## Why

Der `POST /api/recipes/ai-create/` Endpoint erwartet `{ title, description }`, aber das Frontend sendet `{ prompt }`. Das führt zu einem 422-Fehler und blockiert den KI-gestützten Rezept-Wizard komplett. Zusätzlich ist die Frontend-Seite ohne Zod-Schema oder TanStack Query Hook — der Fehler blieb im Dev-Betrieb unentdeckt.

Gleichzeitig ist das UI-Konzept ein freier Prompt ("Beschreibe dein Rezept"), was besser zum Nutzerverhalten passt als separate Titel-/Beschreibungsfelder. Der Fix vereinheitlicht Input und UI-Konzept auf ein `prompt`-Feld durch den gesamten Stack.

## What Changes

- **BREAKING**: Backend `RecipeAiCreateIn` Schema: `title` + `description` → `prompt: str`
- **BREAKING**: Backend Service `ai_create_recipe()`: Signatur von `(title, description, user)` → `(prompt, user)`
- Gemini-Prompt im Backend: Statt konstruiertem `"Recherchiere '{title}'"` wird der User-Prompt direkt verwendet
- Frontend: Zod-Request-Schema `RecipeAiCreateInSchema` mit `prompt: z.string()` hinzufügen
- Frontend: TanStack Query Mutation Hook `useRecipeAiCreate()` erstellen
- Frontend `WizardStepMethod.tsx`: `fetch()` durch Typ-sicheren Hook ersetzen
- Neuer Test für den `/ai-create/` Endpoint

## Capabilities

### New Capabilities
- `recipe-ai-create-prompt`: Vereinheitlichtes `prompt`-Feld für KI-Rezepterstellung über den gesamten Stack (Backend Schema, API, Frontend Schema, Hook, UI)

### Modified Capabilities
- `recipe-ai-suggest`: Input-Format des `/ai-create/` Endpoints ändert sich von `{ title, description }` zu `{ prompt }`. Die zugehörigen Scenarios werden aktualisiert.

## Impact

- **Backend**: `recipe/schemas/recipes.py` (RecipeAiCreateIn), `recipe/api/recipes.py` (ai_create endpoint), `recipe/services/recipe_ai_suggest_service.py` (ai_create_recipe Signatur + Prompt-Bau)
- **Frontend**: `frontend-food/src/schemas/recipe.ts` (neues Zod-Schema), `frontend-food/src/api/recipes.ts` (neuer Hook), `frontend-food/src/components/recipe/WizardStepMethod.tsx` (fetch → Hook)
- **Tests**: `recipe/tests/` (neuer API-Test)
- **Specs**: `openspec/specs/recipe-ai-suggest/spec.md` (Input-Format aktualisieren)
