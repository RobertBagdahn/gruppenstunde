## 1. Backend — Service umbenennen

- [x] 1.1 `backend/recipe/services/apple_rating_service.py` zu `inspi_score_service.py` umbenennen und alle internen Funktionsnamen anpassen (`calculate_apple_rating` → `calculate_inspi_score`, `_score_to_label` bleibt, Docstrings aktualisieren)
- [x] 1.2 Alle Referenzen auf den alten Service-Import in `backend/recipe/api/nutrition.py` aktualisieren

## 2. Backend — Pydantic Schemas umbenennen

- [x] 2.1 In `backend/recipe/schemas/nutrition.py`: `AppleRatingDimensionOut` → `InspiScoreDimensionOut` und `AppleRatingOut` → `InspiScoreOut` umbenennen

## 3. Backend — API-Endpunkt umbenennen

- [x] 3.1 In `backend/recipe/api/nutrition.py`: Route von `/{recipe_id}/apple-rating/` zu `/{recipe_id}/inspi-score/` ändern, Response-Schema auf `InspiScoreOut` aktualisieren, Funktionsname `get_apple_rating` → `get_inspi_score`

## 4. Backend — Tests anpassen

- [x] 4.1 `backend/recipe/tests/test_apple_rating.py` zu `test_inspi_score.py` umbenennen und Imports/Referenzen auf neuen Service-Namen aktualisieren
- [x] 4.2 Backend-Tests ausführen und sicherstellen, dass alle bestehen (`uv run python -m pytest backend/recipe/tests/test_inspi_score.py`)

## 5. Frontend — Zod Schemas umbenennen

- [x] 5.1 In `frontend/src/schemas/recipe.ts`: `AppleRatingDimensionSchema` → `InspiScoreDimensionSchema`, `AppleRatingDimension` → `InspiScoreDimension`, `AppleRatingSchema` → `InspiScoreSchema`, `AppleRating` → `InspiScore` umbenennen

## 6. Frontend — TanStack Query Hook umbenennen

- [x] 6.1 In `frontend/src/api/recipes.ts`: `useAppleRating` → `useInspiScore` umbenennen und Endpunkt-URL von `apple-rating` zu `inspi-score` ändern
- [x] 6.2 Cache-Invalidierung in Mutations (z.B. nach LLM-Vorschlägen) auf neuen Query-Key aktualisieren

## 7. Frontend — Komponente umbenennen und Icon ersetzen

- [x] 7.1 `frontend/src/components/recipe/AppleRating.tsx` zu `InspiScore.tsx` umbenennen
- [x] 7.2 Komponenten-Name `AppleRating` → `InspiScore`, Props-Interface `AppleRatingProps` → `InspiScoreProps`, Typ-Import `AppleRatingType` → `InspiScoreType` anpassen
- [x] 7.3 `AppleIcons`-Subkomponente zu `InspiIcons` umbenennen und Emoji-basierte Darstellung (🍏 / ○) durch `<img src="/images/favicon.png">` ersetzen — gefüllte Köpfe normal, leere Köpfe mit `opacity-25 grayscale` CSS-Klassen
- [x] 7.4 Gesamt-Score-Zeile ("Gesamt:") ebenfalls auf InspiIcons umstellen

## 8. Frontend — Seiten-Integration aktualisieren

- [x] 8.1 In `frontend/src/pages/recipes/RecipeDetailPage.tsx`: Import von `AppleRating` → `InspiScore` und `useAppleRating` → `useInspiScore` ändern, Komponenten-Nutzung aktualisieren

## 9. Verifizierung

- [x] 9.1 Backend-Tests komplett durchlaufen lassen (`uv run python -m pytest backend/recipe/`)
- [x] 9.2 Frontend TypeScript-Kompilierung prüfen (`npx tsc --noEmit` im frontend-Verzeichnis)
- [ ] 9.3 Visuell prüfen, dass Inspi-Köpfe korrekt in gefüllt/ausgegraut dargestellt werden
