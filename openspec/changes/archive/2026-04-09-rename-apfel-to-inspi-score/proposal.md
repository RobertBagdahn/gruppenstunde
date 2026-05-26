## Why

Das aktuelle Rezept-Bewertungssystem heißt "Apfel Score" und nutzt grüne Apfel-Emojis (🍏) zur Darstellung. Der Name und die Symbolik haben keinen Bezug zur Marke "Inspi". Durch Umbenennung zu "Inspi Score" und Verwendung des Inspi-Kopfes (favicon) als Bewertungssymbol wird das Scoring-System zur Marke konsistent und visuell einprägsamer.

## What Changes

- **BREAKING**: Rename "Apple Rating" / "Apfel Score" to "Inspi Score" in allen Backend-Services, Schemas und API-Endpunkten
- **BREAKING**: API-Endpunkt von `/{recipe_id}/apple-rating/` zu `/{recipe_id}/inspi-score/` ändern
- **BREAKING**: Pydantic-Schemas `AppleRatingOut` / `AppleRatingDimensionOut` zu `InspiScoreOut` / `InspiScoreDimensionOut` umbenennen
- **BREAKING**: Zod-Schemas `AppleRatingSchema` / `AppleRatingDimensionSchema` zu `InspiScoreSchema` / `InspiScoreDimensionSchema` umbenennen
- Frontend-Komponente `AppleRating.tsx` zu `InspiScore.tsx` umbenennen
- Apfel-Emoji (🍏) durch den Inspi-Kopf (favicon.png) als Bewertungssymbol ersetzen
- TanStack Query Hook `useAppleRating` zu `useInspiScore` umbenennen
- Backend-Service `apple_rating_service.py` zu `inspi_score_service.py` umbenennen
- Tests entsprechend anpassen

## Capabilities

### New Capabilities

_Keine neuen Capabilities — es handelt sich um ein Rebranding einer bestehenden Capability._

### Modified Capabilities

- `recipe-apple-rating`: Umbenennung zu "Inspi Score", neues visuelles Symbol (Inspi-Kopf statt Apfel-Emoji), geänderte API-Route und Schema-Namen

## Impact

- **Backend Django Apps**: `recipe` (Service, Schemas, API, Tests)
  - `recipe/services/apple_rating_service.py` → `inspi_score_service.py`
  - `recipe/schemas/nutrition.py` (Schema-Klassen umbenennen)
  - `recipe/api/nutrition.py` (Endpunkt-Route ändern)
  - `recipe/tests/test_apple_rating.py` → `test_inspi_score.py`
- **Frontend React**:
  - `components/recipe/AppleRating.tsx` → `InspiScore.tsx`
  - `schemas/recipe.ts` (Zod-Schemas umbenennen)
  - `api/recipes.ts` (Hook und Endpunkt-URL umbenennen)
  - `pages/recipes/RecipeDetailPage.tsx` (Import und Nutzung anpassen)
- **Pydantic-Schemas**: `AppleRatingOut`, `AppleRatingDimensionOut` → `InspiScoreOut`, `InspiScoreDimensionOut`
- **Zod-Schemas**: `AppleRatingSchema`, `AppleRatingDimensionSchema` → `InspiScoreSchema`, `InspiScoreDimensionSchema`
- **Keine Migrations nötig**: Keine Datenbank-Model-Änderungen, nur Service/API-Layer
- **OpenSpec**: Bestehende Spec `recipe-apple-rating` wird durch diese Change modifiziert
