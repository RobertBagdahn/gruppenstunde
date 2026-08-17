## 1. Datenmodell-Erweiterung (Backend)

- [x] 1.1 Recipe-Modell erweitern: `owner` (FK zu User, nullable), `forked_from` (FK zu Recipe, nullable, self-referential), `visibility` (CharField: private/group/public, nullable) — Datei: `backend/recipe/models/recipe.py`
- [x] 1.2 Migration erstellen und anwenden: `uv run python manage.py makemigrations recipe && uv run python manage.py migrate`
- [x] 1.3 Composite-Index hinzufügen auf `(owner, visibility, status)` für performante Visibility-Queries
- [x] 1.4 Default-QuerySet in Recipe-Manager anpassen: Standard-Filter für `(owner=null & status=approved) OR (owner=current_user) OR (visibility=public & status=approved)`

## 2. Apfel-Rating Backend-Service

- [x] 2.1 Neuen Service erstellen: `backend/recipe/services/apple_rating_service.py` mit `calculate_apple_rating(recipe)` Funktion
- [x] 2.2 Preis-Dimension implementieren: Durchschnittspreis pro `recipe_type` berechnen (DB-Aggregation), Quartil-Mapping auf 1-5 Äpfel
- [x] 2.3 Gesundheits-Dimension implementieren: Nutri-Score-Klasse zu Äpfel-Mapping (A=5, B=4, C=3, D=2, E=1)
- [x] 2.4 Sättigungs-Dimension implementieren: Energie pro Portion vs. DGE-Referenzwert für Mahlzeitentyp, Ratio-basiertes Scoring
- [x] 2.5 Geschmacks-Dimension implementieren: Gewichteter Composite-Score aus Fett, Zucker, Salz, Ballaststoffe
- [x] 2.6 Pydantic-Schema erstellen: `AppleRatingDimensionOut` (score, label, details), `AppleRatingOut` (price, health, satiety, taste, overall) — Datei: `backend/recipe/schemas/nutrition.py`
- [x] 2.7 API-Endpunkt erstellen: `GET /api/recipes/{recipe_id}/apple-rating/` — Datei: `backend/recipe/api/nutrition.py`
- [x] 2.8 Tests schreiben: `backend/recipe/tests/test_apple_rating.py` — Mindestens: alle 4 Dimensionen, Edge Cases (fehlende Daten), Gesamtberechnung

## 3. Nutri-Score-Verbesserungsvorschläge (Backend)

- [x] 3.1 Neuen Service erstellen: `backend/recipe/services/nutri_improvement_service.py` mit `calculate_nutri_improvements(recipe)` Funktion
- [x] 3.2 Algorithmus implementieren: Für jeden Nutri-Score-Parameter simulieren welche 10%-Verbesserung den größten Score-Effekt hat
- [x] 3.3 Zutaten-Zuordnung: Pro Parameter die Zutat(en) identifizieren, die am meisten beitragen (prozentualer Anteil)
- [x] 3.4 Pydantic-Schema erstellen: `NutriImprovementOut` (parameter, current_value, target_value, affected_ingredients, expected_nutri_class) — Datei: `backend/recipe/schemas/nutrition.py`
- [x] 3.5 API-Endpunkt erstellen: `GET /api/recipes/{recipe_id}/nutri-improvements/` — Datei: `backend/recipe/api/nutrition.py`
- [x] 3.6 Tests schreiben: `backend/recipe/tests/test_nutri_improvements.py` — Edge Cases: Rezept mit Nutri-Score A, Rezept ohne Nährwertdaten

## 4. LLM-Suggestions Backend

- [x] 4.1 Neuen Service erstellen: `backend/recipe/services/suggestion_service.py` — Gemini Flash-Lite Prompt für 3 Zutatentipps basierend auf Rezeptkontext und Ziel-Parameter
- [x] 4.2 Caching implementieren: Response für 24h cachen (Schlüssel: recipe_id + Ziel-Parameter Hash)
- [x] 4.3 Rate-Limiting: Max 10 Requests pro User pro Stunde, 401 für nicht-authentifizierte User
- [x] 4.4 Pydantic-Schema erstellen: `LlmSuggestionOut` (ingredient_name, recommended_amount, unit, reasoning, expected_improvement) — Datei: `backend/recipe/schemas/nutrition.py`
- [x] 4.5 API-Endpunkt erstellen: `POST /api/recipes/{recipe_id}/suggestions/` mit Body `{objective: string}` — Datei: `backend/recipe/api/nutrition.py`
- [x] 4.6 Tests schreiben: `backend/recipe/tests/test_suggestions.py` — Mocking des Gemini-API-Calls

## 5. Personal Recipes Backend

- [x] 5.1 Fork-API erstellen: `POST /api/recipes/{recipe_id}/fork/` — Kopiert Rezept mit allen RecipeItems, setzt owner/forked_from/visibility — Datei: `backend/recipe/api/recipes.py`
- [x] 5.2 My-Recipes-API erstellen: `GET /api/recipes/my-recipes/` — Paginierte Liste mit `owner=current_user` — Datei: `backend/recipe/api/recipes.py`
- [x] 5.3 Visibility-Update-API: `PATCH /api/recipes/{recipe_id}/visibility/` — Nur Owner darf Visibility ändern, public → status=submitted
- [x] 5.4 Recipe-ListOut Schema erweitern: `owner_name`, `forked_from_title`, `visibility`, `recipe_badge` (verified/community/personal) — Datei: `backend/recipe/schemas/recipes.py`
- [x] 5.5 RecipeFilterIn erweitern: `origin` Parameter (all/verified/community/mine) — Datei: `backend/recipe/schemas/recipes.py`
- [x] 5.6 Recipe-List-Query anpassen: Visibility-Filter in der Liste-API berücksichtigen (Default: nur sichtbare Rezepte für aktuellen User)
- [x] 5.7 Tests schreiben: `backend/recipe/tests/test_personal_recipes.py` — Fork, Visibility, Filter, Berechtigungen

## 6. Schema-Sync (Pydantic → Zod)

- [x] 6.1 Zod-Schema: `AppleRatingDimensionSchema`, `AppleRatingSchema` — Datei: `frontend/src/schemas/recipe.ts`
- [x] 6.2 Zod-Schema: `NutriImprovementSchema` — Datei: `frontend/src/schemas/recipe.ts`
- [x] 6.3 Zod-Schema: `LlmSuggestionSchema` — Datei: `frontend/src/schemas/recipe.ts`
- [x] 6.4 Zod-Schema: `RecipeListItemSchema` erweitern um `owner_name`, `forked_from_title`, `visibility`, `recipe_badge` — Datei: `frontend/src/schemas/recipe.ts`
- [x] 6.5 Zod-Schema: `RecipeFilterSchema` erweitern um `origin` Parameter — Datei: `frontend/src/schemas/recipe.ts`

## 7. TanStack Query Hooks (Frontend)

- [x] 7.1 `useAppleRating(recipeId)` Query-Hook — Datei: `frontend/src/api/recipes.ts`
- [x] 7.2 `useNutriImprovements(recipeId)` Query-Hook — Datei: `frontend/src/api/recipes.ts`
- [x] 7.3 `useLlmSuggestions(recipeId, objective)` Mutation-Hook — Datei: `frontend/src/api/recipes.ts`
- [x] 7.4 `useForkRecipe(recipeId)` Mutation-Hook — Datei: `frontend/src/api/recipes.ts`
- [x] 7.5 `useMyRecipes(params)` Query-Hook — Datei: `frontend/src/api/recipes.ts`
- [x] 7.6 `useUpdateVisibility(recipeId)` Mutation-Hook — Datei: `frontend/src/api/recipes.ts`

## 8. Zustand Store für Rezept-Modifikationen (Frontend)

- [x] 8.1 `useRecipeModificationStore` erstellen mit State: `originalItems`, `modifiedItems`, `modifications[]`, `isDirty` — Datei: `frontend/src/store/useRecipeModificationStore.ts`
- [x] 8.2 Actions implementieren: `addItem`, `removeItem`, `updateQuantity`, `scaleToNormPortion`, `reset`, `getModifiedNutrition`
- [x] 8.3 Frontend-Nährwertberechnung: Utility-Funktionen die Nährwerte basierend auf modifizierten Items berechnen — Datei: `frontend/src/utils/nutritionCalculator.ts`
- [x] 8.4 `formatWeight(grams)` Utility erstellen: ≥1000g → kg mit 1 Dezimalstelle, <1000g → ganzzahlig g, <1g → 1 Dezimalstelle g — Datei: `frontend/src/utils/formatWeight.ts`

## 9. Apfel-Rating Frontend-Komponente

- [x] 9.1 `AppleRating` Komponente erstellen: 4 Rating-Boxen (Icon, Name, Äpfel gefüllt/leer, Label) — Datei: `frontend/src/components/recipe/AppleRating.tsx`
- [x] 9.2 Popover mit Details bei Klick/Hover — shadcn/ui Popover nutzen
- [x] 9.3 In `RecipeDetailPage.tsx` integrieren: unter dem Rezeptbild, vor den KPI-Boxen

## 10. Interaktive Hints & Magic Buttons (Frontend)

- [x] 10.1 `HintDetailModal` Komponente erstellen: Modal/Sheet mit Zutat-Analyse, prozentualer Beitrag, Empfehlung, „Anwenden"-Button — Datei: `frontend/src/components/recipe/HintDetailModal.tsx`
- [x] 10.2 Bestehende Hints-Darstellung in RecipeDetailPage anklickbar machen (onClick → öffnet HintDetailModal)
- [x] 10.3 LLM-Suggestions-UI im HintDetailModal: „KI-Vorschläge anfordern"-Button, Loading-State, 3 Vorschläge mit „Hinzufügen"-Button
- [x] 10.4 Portions-Normalisierungs-Hinweis: Automatische Erkennung (>150% DGE), Banner mit „Auf Normportion skalieren"-Button
- [x] 10.5 „Modifiziert"-Indikator: Badge oder farblicher Rahmen wenn `isDirty=true`, „Zurücksetzen"-Button
- [x] 10.6 Leave-Confirmation: `beforeunload`-Event und React Router `useBlocker` wenn Modifikationen vorhanden

## 11. Nutri-Score-Verbesserungen Frontend

- [x] 11.1 `NutriImprovementCards` Komponente: 3 Karten mit Parameter, Richtung, betroffene Zutaten, „Anwenden"-Button — Datei: `frontend/src/components/recipe/NutriImprovementCards.tsx`
- [x] 11.2 In Gesundheits-Analyse-Sektion der RecipeDetailPage integrieren
- [x] 11.3 „Anwenden"-Button: Ändert Zutatmengen im Modification-Store basierend auf Vorschlag

## 12. Rezept-Detailseite Anpassungen (Frontend)

- [x] 12.1 Normportionen-Hinweis einbauen: Erklärtext statt reine Portionenzahl in RecipeDetailPage
- [x] 12.2 Portionen-Badge in RecipeCard entfernen
- [x] 12.3 Gewichtsanzeige mit `formatWeight()` ersetzen — alle Stellen in RecipeDetailPage, Zutatenliste, Einkaufsliste
- [x] 12.4 Autor-Bereich nach unten verschieben: aus der oberen Info-Box entfernen, vor Kommentare positionieren
- [x] 12.5 Referenzwert-Vergleiche: Nährwerte mit prozentualer DGE-Anzeige und Farbcodierung (grün/gelb/rot)
- [x] 12.6 „Als persönliches Rezept speichern"-Button: Nur für authentifizierte User, nutzt Fork-API, Redirect zur neuen Rezeptseite

## 13. Personal Recipes Frontend

- [x] 13.1 `MyRecipesPage` erstellen: Paginierte Liste eigener Rezepte unter `/recipes/my-recipes/` — Datei: `frontend/src/pages/recipes/MyRecipesPage.tsx`
- [x] 13.2 Route registrieren in Router-Konfiguration
- [x] 13.3 Recipe-Badge-Komponente: „Inspi-verifiziert" (grün), „Community" (blau), „Mein Rezept" (gelb) — Datei: `frontend/src/components/recipe/RecipeBadge.tsx`
- [x] 13.4 Badge in RecipeCard und RecipeDetailPage integrieren
- [x] 13.5 Herkunfts-Filter in RecipeFilterSidebar hinzufügen: „Alle", „Inspi-verifiziert", „Community", „Meine Rezepte"
- [x] 13.6 Visibility-UI auf RecipeDetailPage: Dropdown für Owner (privat/Gruppe/öffentlich) mit Bestätigungsdialog

## 14. Tests

- [x] 14.1 Backend: Alle neuen Services mit pytest testen (apple_rating, nutri_improvement, suggestion)
- [x] 14.2 Backend: Alle neuen API-Endpunkte testen (apple-rating, nutri-improvements, suggestions, fork, my-recipes, visibility)
- [x] 14.3 Frontend: `formatWeight()` Utility mit Vitest testen
- [x] 14.4 Frontend: `nutritionCalculator` Utility mit Vitest testen
- [x] 14.5 Frontend: `useRecipeModificationStore` Actions mit Vitest testen
