## 1. Backend: IngredientSeason Modell

- [x] 1.1 `IngredientSeason`-Modell in `supply/models/` anlegen (ingredient FK, month, is_high_season)
- [x] 1.2 Migration erstellen: `uv run python manage.py makemigrations supply`
- [x] 1.3 IngredientSeason in `supply/models/__init__.py` re-exportieren
- [x] 1.4 Management-Command `seed_ingredient_seasons` zum Befüllen des Saisonkalenders (Top-100-Zutaten)

## 2. Backend: Scoring-Engine

- [x] 2.1 `planner/services/intelligent_suggestions_service.py` anlegen mit `IntelligentSuggestionsService`
- [x] 2.2 Harte Filter implementieren: status=approved+owner=null ODER owner=user, meal_type→recipe_type Mapping, exclude already in plan, nutritional_tags Prüfung
- [x] 2.3 `season_score`-Berechnung: Anteil der Rezept-Zutaten mit IngredientSeason im aktuellen Monat
- [x] 2.4 `popularity_score`-Berechnung: Percentil-Rang des usage_count
- [x] 2.5 `variety_score`-Berechnung: Zutaten-Überschneidung mit bereits geplanten Rezepten
- [x] 2.6 `recency_score`-Berechnung: Tage seit letzter Verwendung durch den User
- [x] 2.7 `budget_score`-Berechnung: Preis-Passung zum Plan-Budget
- [x] 2.8 Scoring-Formel implementieren (gewichtete Summe der 5 Dimensionen)
- [x] 2.9 Kategorisierungs-Logik implementieren (top_picks, variety, discovery je 3)

## 3. Backend: API-Endpunkt

- [x] 3.1 Pydantic-Schema für Response definieren (`IntelligentSuggestionOut`, `IntelligentSuggestionsResponse`)
- [x] 3.2 Endpunkt `GET /api/meal-plans/{plan_id}/meal/{meal_id}/suggestions` in `planner/api/meal_plan.py` registrieren
- [x] 3.3 Auth-Prüfung (Owner/Collaborator), 401/403/404 Handling
- [x] 3.4 Endpunkt-Handler: Context sammeln → Scoring → Kategorisierung → Response

## 4. Backend: KI-Reranking (optional)

- [x] 4.1 Gemini-Pydantic-Schema für Reranking-Response definieren
- [x] 4.2 Prompt konstruieren mit Plan-Kontext (meal_type, Saison, Budget, Tags, bereits geplante Rezepte)
- [x] 4.3 Gemini-Call mit den Top 15 Scoring-Ergebnissen und structured output
- [x] 4.4 Fallback-Logik: bei KI-Fehler → rein algorithmische Kategorisierung
- [x] 4.5 `ai_enhanced` Flag im Response setzen

## 5. Backend: Tests

- [x] 5.1 Tests für IngredientSeason-Modell (create, unique constraint)
- [x] 5.2 Tests für Scoring-Engine (jede Dimension einzeln + Integration)
- [x] 5.3 Tests für Kategorisierungs-Logik (9+ Kandidaten, <9 Kandidaten, 1 Kandidat)
- [x] 5.4 Tests für API-Endpunkt (200, 401, 403, 404)
- [x] 5.5 Tests für KI-Fallback (Gemini nicht erreichbar → algorithmisch)

## 6. Frontend: API-Hook

- [x] 6.1 Zod-Schema definieren (`IntelligentSuggestionsResponse`, `IntelligentSuggestion`)
- [x] 6.2 `useIntelligentSuggestions(planId, mealId, aiEnhance?)` Hook in `frontend-food/src/api/mealPlans.ts`
- [x] 6.3 Hook im `frontend-food/src/schemas/mealPlan.ts` registrieren

## 7. Frontend: RecipeSearchDialog Integration

- [x] 7.1 Vorschlags-Komponente `IntelligentSuggestionsGrid` bauen (3×3 Grid mit Bild, Titel, Badge, reason_text)
- [x] 7.2 `RecipeSearchDialog` erweitern: Vorschläge als Standard-View beim Öffnen, "Suche"-Tab als Alternative
- [x] 7.3 Ladezustand (Skeleton-Grid während API-Call)
- [x] 7.4 Leerzustand (keine Vorschläge verfügbar → "Keine passenden Rezepte gefunden")
- [x] 7.5 Klick auf Vorschlag → RecipePreviewInline (gleicher Flow wie bisher)
- [x] 7.6 Nach Hinzufügen → Vorschläge neu laden (aktualisiert, da Rezept jetzt im Plan)
